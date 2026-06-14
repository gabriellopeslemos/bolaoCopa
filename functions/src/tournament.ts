/**
 * Avanço do mata-mata — MODELO POR CONTAGEM DE JOGOS.
 *
 * As etapas são definidas pela POSIÇÃO do jogo na lista de todos os jogos da
 * competição ordenada por kickoff (Copa 2026, 104 jogos):
 *   - Etapa 1 (jogos 1–8)   → Qualificatória (Seeds + serpentina).
 *   - Etapa 2 (9–36)        → Fase de Grupos (último de cada grupo → repescagem).
 *   - Etapa 3 (37–72)       → Eliminatória (chave) + Repescagem EM PARALELO.
 *   - Etapa 4 (73–104)      → Grande Final (corrida de pontos → 1 campeão).
 *
 * Tudo é dirigido por `progressTournamentAllGroups`, idempotente: o estado em
 * `groups/{groupId}/tournament/state` só avança quando TODOS os jogos da fatia
 * correspondente terminam. Os pontos de cada etapa vêm dos palpites nos jogos
 * daquela etapa (lidos direto de `bets`).
 */
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  computeSeeds,
  snakeDraw,
  classifyAfterGroups,
  drawKnockoutRound1,
  drawKnockoutRound,
  resolveKnockoutRound,
  resolveRepechageRound,
  resolveFinal,
  bracketRoundsToTarget,
  stageMatchIds,
  type SeedInput,
  type TournamentState,
  type QualifiedParticipant,
} from "@bolao/scoring";
import type { MatchDoc, BetDoc } from "./types";

/**
 * Quantos sobreviventes da chave principal entram na Grande Final (default
 * razoável, ajustável). Mantém "finalistas" no plural em vez de reduzir a 1.
 */
const FINALISTS_TARGET = 4;
/** Tamanho dos grupos na Fase de Grupos. */
const GROUP_SIZE = 4;

function kickoffMs(m: MatchDoc): number {
  const k = m.kickoff as FirebaseFirestore.Timestamp | undefined;
  return k?.toMillis?.() ?? 0;
}

interface StageInfo {
  /** IDs dos jogos de cada etapa, em ordem de kickoff. */
  byStage: Record<1 | 2 | 3 | 4, string[]>;
  /** IDs dos jogos já finalizados. */
  finished: Set<string>;
}

/** Lê `matches` e separa os IDs por etapa (ordenados por kickoff). */
async function loadStages(db: Firestore): Promise<StageInfo> {
  const snap = await db.collection("matches").get();
  const all = snap.docs.map((d) => {
    const m = d.data() as MatchDoc;
    return { id: d.id, kickoffMs: kickoffMs(m), finished: m.status === "finished" };
  });
  return {
    byStage: stageMatchIds(all.map((m) => ({ id: m.id, kickoffMs: m.kickoffMs }))),
    finished: new Set(all.filter((m) => m.finished).map((m) => m.id)),
  };
}

const allFinished = (ids: string[], finished: Set<string>) =>
  ids.length > 0 && ids.every((id) => finished.has(id));

/** Soma os pontos dos palpites de cada usuário restritos a um conjunto de jogos. */
async function pointsForMatches(
  db: Firestore,
  groupId: string,
  ids: Set<string>
): Promise<Record<string, number>> {
  const betsSnap = await db.collection(`groups/${groupId}/bets`).get();
  const points: Record<string, number> = {};
  for (const betDoc of betsSnap.docs) {
    const b = betDoc.data() as BetDoc;
    if (ids.has(b.matchId)) points[b.userId] = (points[b.userId] ?? 0) + (b.points ?? 0);
  }
  return points;
}

/* ------------------------------------------------------------------ */
/* Driver                                                              */
/* ------------------------------------------------------------------ */

/** Avança o mata-mata de todos os grupos o quanto for possível. */
export async function progressTournamentAllGroups(): Promise<{ advanced: number }> {
  const db = getFirestore();
  const stages = await loadStages(db);
  const groupsSnap = await db.collection("groups").get();

  let advanced = 0;
  for (const groupDoc of groupsSnap.docs) {
    let any = false;
    // Um único jogo pode destravar várias etapas; avança até não mudar mais.
    while (await advanceGroupOnce(db, groupDoc.id, stages)) any = true;
    if (any) advanced++;
  }
  return { advanced };
}

async function advanceGroupOnce(db: Firestore, groupId: string, stages: StageInfo): Promise<boolean> {
  const stateRef = db.doc(`groups/${groupId}/tournament/state`);
  const state = ((await stateRef.get()).data() as TournamentState | undefined) ?? { phase: "qualifier" };

  switch (state.phase ?? "qualifier") {
    case "qualifier":
      return stage1Seeds(db, groupId, state, stages, stateRef);
    case "groups":
      return stage2Knockout(db, groupId, state, stages, stateRef);
    case "knockout":
      return stage3Round(db, groupId, state, stages, stateRef);
    case "repechage": // segurança: tratado dentro da Etapa 3
      return stage3Round(db, groupId, state, stages, stateRef);
    case "final":
      return stage4Final(db, groupId, state, stages, stateRef);
    default:
      return false; // "done"
  }
}

/* ------------------------------------------------------------------ */
/* Etapa 1 — Seeds + serpentina                                        */
/* ------------------------------------------------------------------ */

async function stage1Seeds(
  db: Firestore,
  groupId: string,
  state: TournamentState,
  stages: StageInfo,
  stateRef: DocumentReference
): Promise<boolean> {
  const ids = stages.byStage[1];
  if (!allFinished(ids, stages.finished)) return false;

  const idSet = new Set(ids);
  const [membersSnap, betsSnap] = await Promise.all([
    db.collection(`groups/${groupId}/members`).get(),
    db.collection(`groups/${groupId}/bets`).get(),
  ]);
  if (membersSnap.empty) return false;

  // Pontos + placares exatos da Etapa 1 por membro (desempate dos seeds).
  const agg = new Map<string, { points: number; exact: number }>();
  for (const betDoc of betsSnap.docs) {
    const b = betDoc.data() as BetDoc;
    if (!idSet.has(b.matchId)) continue;
    const cur = agg.get(b.userId) ?? { points: 0, exact: 0 };
    cur.points += b.points ?? 0;
    if (b.breakdown?.exact) cur.exact += 1;
    agg.set(b.userId, cur);
  }

  const participants: SeedInput[] = membersSnap.docs.map((m) => {
    const a = agg.get(m.id);
    return {
      uid: m.id,
      displayName: (m.data().displayName as string) ?? "Participante",
      points: a?.points ?? 0,
      exactCount: a?.exact ?? 0,
    };
  });

  const seeds = computeSeeds(participants);
  const groups = snakeDraw(seeds, GROUP_SIZE);
  const next: TournamentState = { ...state, phase: "groups", seeds, groups, updatedAt: Date.now() };
  await stateRef.set(next);
  logger.info(`tournament[${groupId}]: Etapa 1 → Fase de Grupos (${seeds.length} seeds, ${groups.length} grupos)`);
  return true;
}

/* ------------------------------------------------------------------ */
/* Etapa 2 — Fase de Grupos → monta a chave e o pool de repescagem     */
/* ------------------------------------------------------------------ */

async function stage2Knockout(
  db: Firestore,
  groupId: string,
  state: TournamentState,
  stages: StageInfo,
  stateRef: DocumentReference
): Promise<boolean> {
  const ids = stages.byStage[2];
  if (!allFinished(ids, stages.finished)) return false;
  if (!state.groups?.length) return false;

  const points = await pointsForMatches(db, groupId, new Set(ids));
  const { qualified, repechage } = classifyAfterGroups(state.groups, points);

  // Se já estamos no alvo (poucos classificados), a chave já está "pronta":
  // todos os classificados são finalistas (nenhuma rodada de eliminação a fazer).
  const mainAtTarget = qualified.length <= FINALISTS_TARGET;
  const knockout = mainAtTarget
    ? { round: 1, matchups: [], complete: true }
    : drawKnockoutRound1(qualified);

  // Nº de rodadas da Etapa 3: o suficiente para a chave atingir o alvo E para a
  // repescagem reduzir até 1 (fatia os 36 jogos em rodadas iguais). O pool da
  // repescagem cresce com os eliminados da chave (≈ qualified - alvo), por isso o
  // dimensionamento considera o total potencial + 1 rodada de folga.
  const maxPool = repechage.length + Math.max(0, qualified.length - FINALISTS_TARGET);
  const stage3Count = stages.byStage[3].length || 36;
  const R = Math.min(
    stage3Count,
    Math.max(
      1,
      bracketRoundsToTarget(qualified.length, FINALISTS_TARGET),
      Math.ceil(Math.log2(Math.max(2, maxPool))) + 1
    )
  );

  const next: TournamentState = {
    ...state,
    phase: "knockout",
    knockout,
    repechage,
    repechageComplete: false,
    cupRoundsDone: 0,
    knockoutRounds: R,
    finalists: mainAtTarget ? qualified : undefined,
    updatedAt: Date.now(),
  };
  await stateRef.set(next);
  logger.info(
    `tournament[${groupId}]: Etapa 2 → Eliminatória (${qualified.length} classificados, ` +
      `${repechage.length} na repescagem, ${R} rodadas)`
  );
  return true;
}

/* ------------------------------------------------------------------ */
/* Etapa 3 — Eliminatória + Repescagem (em paralelo), uma rodada/fatia */
/* ------------------------------------------------------------------ */

async function stage3Round(
  db: Firestore,
  groupId: string,
  state: TournamentState,
  stages: StageInfo,
  stateRef: DocumentReference
): Promise<boolean> {
  if (!state.knockout) return false;

  const mainDone = state.knockout.complete === true;
  const repDone = state.repechageComplete === true;

  // Ambos terminaram → fecha a Etapa 3 e vai para a Grande Final.
  if (mainDone && repDone) {
    if (state.phase === "final") return false;
    return closeStage3(state, stateRef, groupId);
  }

  const stage3 = stages.byStage[3];
  const R = Math.max(1, state.knockoutRounds ?? 1);
  const k = state.cupRoundsDone ?? 0;

  // Rodadas planejadas esgotadas mas algo não fechou → força o fechamento.
  if (k >= R) return forceCloseStage3(state, stateRef, groupId);

  const chunk = Math.max(1, Math.floor(stage3.length / R));
  const lo = k * chunk;
  const hi = k === R - 1 ? stage3.length : (k + 1) * chunk;
  const roundIds = stage3.slice(lo, hi);
  if (!allFinished(roundIds, stages.finished)) return false; // a fatia ainda não terminou

  const points = await pointsForMatches(db, groupId, new Set(roundIds));
  const N = state.seeds?.length ?? state.knockout.matchups.flatMap((m) => m.players).length;
  const next: TournamentState = { ...state, cupRoundsDone: k + 1, updatedAt: Date.now() };

  // --- Chave principal (uma rodada) ---
  let droppers: QualifiedParticipant[] = [];
  if (!mainDone && state.knockout.matchups.length > 0) {
    const res = resolveKnockoutRound(state.knockout, points, N);
    // Etapa 3: TODOS os eliminados (duelos e triplos) vão para a repescagem.
    droppers = [...res.toRepechage, ...res.eliminated];
    if (res.survivors.length <= FINALISTS_TARGET) {
      next.knockout = { round: state.knockout.round, matchups: [], complete: true };
      next.finalists = res.survivors; // sobreviventes da chave (parte dos finalistas)
      logger.info(`tournament[${groupId}]: chave principal definida (${res.survivors.length} finalistas)`);
    } else {
      next.knockout = drawKnockoutRound(res.survivors, state.knockout.round + 1);
    }
  }

  // --- Repescagem (uma redução, em paralelo) ---
  let pool = state.repechage ?? [];
  if (!repDone && pool.length > 1) pool = resolveRepechageRound(pool, points).survivors;
  pool = [...pool, ...droppers]; // novos eliminados entram para a próxima rodada
  next.repechage = pool;

  // Repescagem só fecha quando a chave acabou (sem mais eliminados) e sobra ≤ 1.
  if (!repDone && next.knockout?.complete === true && pool.length <= 1) {
    next.repechageWinner = pool[0] ?? null;
    next.repechageComplete = true;
    next.repechage = [];
    logger.info(`tournament[${groupId}]: repescagem definida (sobrevivente ${next.repechageWinner?.uid ?? "—"})`);
  }

  // Ambos fechados nesta rodada → monta finalistas e vai para a Grande Final.
  if (next.knockout?.complete === true && next.repechageComplete === true) {
    assembleFinalists(next);
    next.phase = "final";
  }

  await stateRef.set(next);
  return true;
}

/** Junta sobreviventes da chave + sobrevivente da repescagem em `finalists`. */
function assembleFinalists(state: TournamentState): void {
  const fromBracket = state.finalists ?? [];
  const finalists = [...fromBracket];
  if (state.repechageWinner) finalists.push(state.repechageWinner);
  state.finalists = finalists;
}

/** Fecha a Etapa 3 quando chave e repescagem já terminaram (sem rodada nova). */
async function closeStage3(
  state: TournamentState,
  stateRef: DocumentReference,
  groupId: string
): Promise<boolean> {
  const next: TournamentState = { ...state, phase: "final", updatedAt: Date.now() };
  assembleFinalists(next);
  await stateRef.set(next);
  logger.info(`tournament[${groupId}]: Etapa 3 → Grande Final (${next.finalists?.length ?? 0} finalistas)`);
  return true;
}

/**
 * Fechamento forçado da Etapa 3 (rodadas planejadas esgotaram antes de tudo
 * resolver): sobreviventes atuais da chave viram finalistas; a repescagem é
 * decidida pelo melhor seed remanescente.
 */
async function forceCloseStage3(
  state: TournamentState,
  stateRef: DocumentReference,
  groupId: string
): Promise<boolean> {
  const next: TournamentState = { ...state, phase: "final", updatedAt: Date.now() };

  if (next.knockout && next.knockout.complete !== true) {
    const survivors = next.knockout.matchups.flatMap((m) => m.players);
    next.knockout = { round: next.knockout.round, matchups: [], complete: true };
    next.finalists = survivors;
  }
  if (next.repechageComplete !== true) {
    const pool = next.repechage ?? [];
    next.repechageWinner = pool.length ? [...pool].sort((a, b) => a.seed - b.seed)[0] : null;
    next.repechageComplete = true;
    next.repechage = [];
  }
  assembleFinalists(next);
  await stateRef.set(next);
  logger.info(`tournament[${groupId}]: Etapa 3 fechada (forçado) — ${next.finalists?.length ?? 0} finalistas`);
  return true;
}

/* ------------------------------------------------------------------ */
/* Etapa 4 — Grande Final (corrida de pontos nos 32 jogos)             */
/* ------------------------------------------------------------------ */

async function stage4Final(
  db: Firestore,
  groupId: string,
  state: TournamentState,
  stages: StageInfo,
  stateRef: DocumentReference
): Promise<boolean> {
  const ids = stages.byStage[4];
  if (!allFinished(ids, stages.finished)) return false;

  const finalists = state.finalists ?? [];
  if (finalists.length === 0) {
    await stateRef.set({ ...state, phase: "done", champion: null, runnerUp: null, updatedAt: Date.now() });
    logger.info(`tournament[${groupId}]: Grande Final sem finalistas (encerrado sem campeão)`);
    return true;
  }

  const points = await pointsForMatches(db, groupId, new Set(ids));
  const { champion, runnerUp } = resolveFinal(finalists, points);
  await stateRef.set({ ...state, phase: "done", champion, runnerUp, updatedAt: Date.now() });
  logger.info(`tournament[${groupId}]: Grande Final decidida (campeão ${champion?.uid ?? "—"})`);
  return true;
}
