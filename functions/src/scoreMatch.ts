/**
 * Recalcula os pontos de todos os palpites de uma partida, em todos os grupos,
 * e atualiza o total de pontos de cada membro.
 *
 * Idempotente: usa o campo `points` já gravado no palpite como valor anterior e
 * aplica apenas o delta no total do membro, de forma que reprocessar a mesma
 * partida não duplica pontos.
 */
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { calculatePoints, DEFAULT_SCORING_CONFIG, Score, ScoringConfig } from "@bolao/scoring";
import { logger } from "firebase-functions/v2";
import type { GroupDoc, MatchDoc } from "./types";

function resolveConfig(group?: Partial<GroupDoc>): ScoringConfig {
  return { ...DEFAULT_SCORING_CONFIG, ...(group?.scoringConfig ?? {}) };
}

export async function scoreMatch(matchId: string): Promise<{ updated: number }> {
  const db = getFirestore();

  const matchSnap = await db.collection("matches").doc(matchId).get();
  if (!matchSnap.exists) {
    logger.warn(`scoreMatch: match ${matchId} inexistente`);
    return { updated: 0 };
  }
  const match = matchSnap.data() as MatchDoc;

  if (match.status !== "finished" || !match.score) {
    logger.info(`scoreMatch: match ${matchId} ainda não finalizado, ignorando`);
    return { updated: 0 };
  }
  const result: Score = match.score;

  // Todos os palpites desta partida (em qualquer grupo).
  const betsSnap = await db
    .collectionGroup("bets")
    .where("matchId", "==", matchId)
    .get();

  if (betsSnap.empty) return { updated: 0 };

  // Cache de config por grupo.
  const groupConfigs = new Map<string, ScoringConfig>();
  async function configForGroup(groupId: string): Promise<ScoringConfig> {
    const cached = groupConfigs.get(groupId);
    if (cached) return cached;
    const g = await db.collection("groups").doc(groupId).get();
    const cfg = resolveConfig(g.data() as GroupDoc | undefined);
    groupConfigs.set(groupId, cfg);
    return cfg;
  }

  let updated = 0;

  for (const betDoc of betsSnap.docs) {
    // Caminho: groups/{groupId}/bets/{betId}
    const groupRef = betDoc.ref.parent.parent;
    if (!groupRef) continue;
    const groupId = groupRef.id;
    const bet = betDoc.data() as {
      userId: string;
      score: Score;
      points?: number;
      scoredAt?: unknown;
    };

    const cfg = await configForGroup(groupId);
    const computed = calculatePoints(bet.score, result, cfg);
    const previous = bet.points ?? 0;
    const delta = computed.total - previous;

    // Estatísticas (idempotentes): só contam na primeira pontuação do palpite.
    const firstTime = bet.scoredAt == null;
    const memberRef = groupRef.collection("members").doc(bet.userId);

    await db.runTransaction(async (tx) => {
      tx.update(betDoc.ref, {
        points: computed.total,
        breakdown: computed.breakdown,
        scoredAt: FieldValue.serverTimestamp(),
      });
      const memberUpdate: Record<string, unknown> = {};
      if (delta !== 0) memberUpdate.totalPoints = FieldValue.increment(delta);
      if (firstTime && computed.exact) memberUpdate.exactCount = FieldValue.increment(1);
      if (firstTime && computed.correctOutcome) memberUpdate.correctCount = FieldValue.increment(1);
      if (Object.keys(memberUpdate).length > 0) {
        tx.set(memberRef, memberUpdate, { merge: true });
      }
    });
    updated++;
  }

  logger.info(`scoreMatch: ${matchId} → ${updated} palpites pontuados`);
  return { updated };
}
