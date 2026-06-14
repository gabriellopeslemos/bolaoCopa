/**
 * Avanço do mata-mata — FATIA 1: Qualificatória → Fase de Grupos.
 *
 * Quando TODOS os jogos da Qualificatória (1ª rodada da fase de grupos)
 * terminam, calcula os Seeds de cada grupo (a partir dos pontos dos palpites
 * naqueles jogos) e sorteia os grupos por serpentina, persistindo em
 * `groups/{groupId}/tournament/state`. Idempotente: só roda enquanto o grupo
 * ainda está na fase "qualifier".
 */
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
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
  cupRoundOf,
  matchTournamentPhase,
  type SeedInput,
  type TournamentState,
  type QualifiedParticipant,
} from "@bolao/scoring";
import type { MatchDoc, BetDoc } from "./types";

/** Avança a Qualificatória → Fase de Grupos de todos os grupos, se já completa. */
export async function progressQualifierAllGroups(): Promise<{ advanced: number }> {
  const db = getFirestore();

  const matchesSnap = await db.collection("matches").get();
  const qualifiers = matchesSnap.docs.filter(
    (d) => matchTournamentPhase((d.data() as MatchDoc).round) === "qualifier"
  );
  // Sem jogos de Qualificatória ou ainda há jogos por terminar: não avança.
  if (qualifiers.length === 0) return { advanced: 0 };
  if (!qualifiers.every((d) => (d.data() as MatchDoc).status === "finished")) {
    return { advanced: 0 };
  }

  const qualifierIds = new Set(qualifiers.map((d) => d.id));
  const groupsSnap = await db.collection("groups").get();

  let advanced = 0;
  for (const groupDoc of groupsSnap.docs) {
    if (await seedAndDrawGroup(db, groupDoc.id, qualifierIds)) advanced++;
  }
  return { advanced };
}

/** Semeia e sorteia os grupos de um bolão. Retorna true se avançou de fato. */
async function seedAndDrawGroup(
  db: Firestore,
  groupId: string,
  qualifierIds: Set<string>
): Promise<boolean> {
  const stateRef = db.doc(`groups/${groupId}/tournament/state`);
  const state = (await stateRef.get()).data() as TournamentState | undefined;
  const phase = state?.phase ?? "qualifier";
  if (phase !== "qualifier") return false; // já avançou

  const [membersSnap, betsSnap] = await Promise.all([
    db.collection(`groups/${groupId}/members`).get(),
    db.collection(`groups/${groupId}/bets`).get(),
  ]);
  if (membersSnap.empty) return false;

  // Pontos da Qualificatória por membro (somando os palpites nos jogos da 1ª rodada).
  const agg = new Map<string, { points: number; exact: number }>();
  for (const betDoc of betsSnap.docs) {
    const b = betDoc.data() as BetDoc;
    if (!qualifierIds.has(b.matchId)) continue;
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
  const groups = snakeDraw(seeds, 4);

  const next: TournamentState = {
    phase: "groups",
    seeds,
    groups,
    updatedAt: Date.now(),
  };
  await stateRef.set(next);

  logger.info(
    `tournament[${groupId}]: Qualificatória → Grupos (${seeds.length} seeds, ${groups.length} grupos)`
  );
  return true;
}

/* ------------------------------------------------------------------ */
/* Fatia 2: Fase de Grupos → Eliminatórias                             */
/* ------------------------------------------------------------------ */

/** Avança a Fase de Grupos → Eliminatórias de todos os grupos, se já completa. */
export async function progressGroupsToKnockoutAllGroups(): Promise<{ advanced: number }> {
  const db = getFirestore();

  const matchesSnap = await db.collection("matches").get();
  const groupMatches = matchesSnap.docs.filter(
    (d) => matchTournamentPhase((d.data() as MatchDoc).round) === "groups"
  );
  if (groupMatches.length === 0) return { advanced: 0 };
  if (!groupMatches.every((d) => (d.data() as MatchDoc).status === "finished")) {
    return { advanced: 0 };
  }

  const groupMatchIds = new Set(groupMatches.map((d) => d.id));
  const groupsSnap = await db.collection("groups").get();

  let advanced = 0;
  for (const groupDoc of groupsSnap.docs) {
    if (await buildKnockoutForGroup(db, groupDoc.id, groupMatchIds)) advanced++;
  }
  return { advanced };
}

/** Classifica e sorteia a 1ª rodada das Eliminatórias de um bolão. */
async function buildKnockoutForGroup(
  db: Firestore,
  groupId: string,
  groupMatchIds: Set<string>
): Promise<boolean> {
  const stateRef = db.doc(`groups/${groupId}/tournament/state`);
  const state = (await stateRef.get()).data() as TournamentState | undefined;
  if (state?.phase !== "groups" || !state.groups?.length) return false;

  // Pontos da Fase de Grupos por membro (palpites nos jogos dessa fase).
  const betsSnap = await db.collection(`groups/${groupId}/bets`).get();
  const points: Record<string, number> = {};
  for (const betDoc of betsSnap.docs) {
    const b = betDoc.data() as BetDoc;
    if (!groupMatchIds.has(b.matchId)) continue;
    points[b.userId] = (points[b.userId] ?? 0) + (b.points ?? 0);
  }

  const { qualified, repechage } = classifyAfterGroups(state.groups, points);
  const knockout = drawKnockoutRound1(qualified);

  const next: TournamentState = {
    ...state,
    phase: "knockout",
    knockout,
    repechage, // pool inicial da repescagem = lanternas dos grupos
    repechageComplete: false,
    cupRoundsDone: 0,
    updatedAt: Date.now(),
  };
  await stateRef.set(next);

  logger.info(
    `tournament[${groupId}]: Grupos → Eliminatórias (${qualified.length} classificados, ` +
      `${repechage.length} na repescagem, ${knockout.matchups.length} confrontos)`
  );
  return true;
}

/* ------------------------------------------------------------------ */
/* Fatia 3: rodadas seguintes das Eliminatórias                        */
/* ------------------------------------------------------------------ */

interface CupKnockoutRound {
  label: string;
  ids: Set<string>;
  allFinished: boolean;
  firstKickoff: number;
}

/** Rodadas do mata-mata da Copa presentes em `matches`, ordenadas por kickoff. */
function orderedCupKnockoutRounds(matchDocs: FirebaseFirestore.QueryDocumentSnapshot[]): CupKnockoutRound[] {
  const byRound = new Map<string, CupKnockoutRound>();
  for (const d of matchDocs) {
    const m = d.data() as MatchDoc;
    if (cupRoundOf(m.round) !== "knockout") continue;
    const label = String(m.round ?? "");
    const e =
      byRound.get(label) ?? { label, ids: new Set<string>(), allFinished: true, firstKickoff: Infinity };
    e.ids.add(d.id);
    if (m.status !== "finished") e.allFinished = false;
    const k = (m.kickoff as FirebaseFirestore.Timestamp)?.toMillis?.() ?? 0;
    e.firstKickoff = Math.min(e.firstKickoff, k);
    byRound.set(label, e);
  }
  return [...byRound.values()].sort((a, b) => a.firstKickoff - b.firstKickoff);
}

/** Avança as Eliminatórias de todos os grupos conforme as rodadas da Copa terminam. */
export async function progressKnockoutAllGroups(): Promise<{ advanced: number }> {
  const db = getFirestore();
  const matchesSnap = await db.collection("matches").get();
  const cupRounds = orderedCupKnockoutRounds(matchesSnap.docs);
  if (cupRounds.length === 0) return { advanced: 0 };

  const groupsSnap = await db.collection("groups").get();
  let advanced = 0;
  for (const groupDoc of groupsSnap.docs) {
    let any = false;
    // Resolve quantas rodadas estiverem prontas nesta passada.
    while (await advanceOneCupKnockoutRound(db, groupDoc.id, cupRounds)) any = true;
    if (any) advanced++;
  }
  return { advanced };
}

/**
 * Avança UMA rodada de mata-mata da Copa, processando a chave principal e a
 * Repescagem EM PARALELO (ambas pontuam a mesma rodada da Copa). Idempotente via
 * `cupRoundsDone`. Retorna true se processou uma rodada (há mais por processar).
 */
async function advanceOneCupKnockoutRound(
  db: Firestore,
  groupId: string,
  cupRounds: CupKnockoutRound[]
): Promise<boolean> {
  const stateRef = db.doc(`groups/${groupId}/tournament/state`);
  const state = (await stateRef.get()).data() as TournamentState | undefined;
  if (!state || (state.phase !== "knockout" && state.phase !== "repechage")) return false;
  if (!state.knockout) return false;

  const mainDecided = state.knockout.complete === true;
  const repDecided = state.repechageComplete === true;
  if (mainDecided && repDecided) return false; // era do mata-mata já resolvida

  const i = state.cupRoundsDone ?? 0;
  const cupRound = cupRounds[i]; // i-ésima rodada de mata-mata da Copa
  if (!cupRound || !cupRound.allFinished) return false;

  // Pontos de cada participante nessa rodada da Copa.
  const betsSnap = await db.collection(`groups/${groupId}/bets`).get();
  const points: Record<string, number> = {};
  for (const betDoc of betsSnap.docs) {
    const b = betDoc.data() as BetDoc;
    if (cupRound.ids.has(b.matchId)) points[b.userId] = (points[b.userId] ?? 0) + (b.points ?? 0);
  }

  const N = state.seeds?.length ?? state.knockout.matchups.flatMap((m) => m.players).length;
  const next: TournamentState = { ...state, cupRoundsDone: i + 1, updatedAt: Date.now() };

  // --- Chave principal ---
  let droppers: typeof state.repechage = [];
  if (!mainDecided && state.knockout.matchups.length > 0) {
    const res = resolveKnockoutRound(state.knockout, points, N);
    droppers = res.toRepechage; // perdedores de Duelos caem na repescagem
    if (res.survivors.length <= 1) {
      next.mainBracketWinner = res.survivors[0] ?? null;
      next.knockout = { ...state.knockout, complete: true };
      logger.info(`tournament[${groupId}]: chave principal definida (vencedor ${next.mainBracketWinner?.uid ?? "—"})`);
    } else {
      next.knockout = drawKnockoutRound(res.survivors, state.knockout.round + 1);
      logger.info(
        `tournament[${groupId}]: Eliminatórias rodada ${state.knockout.round}→${state.knockout.round + 1} ` +
          `(${res.survivors.length} avançam, ${res.toRepechage.length} à repescagem)`
      );
    }
  } else if (!mainDecided) {
    // Chave vazia (ex.: grupo de 1 membro) → encerra sem mover ninguém.
    next.mainBracketWinner = state.mainBracketWinner ?? null;
    next.knockout = { ...state.knockout, complete: true };
  }

  // --- Repescagem (em paralelo, mesma rodada da Copa) ---
  let pool = state.repechage ?? [];
  if (!repDecided && pool.length > 1) {
    pool = resolveRepechageRound(pool, points).survivors;
  }
  pool = [...pool, ...(droppers ?? [])]; // novos perdedores entram para a próxima rodada
  next.repechage = pool;

  // A repescagem só pode terminar quando a chave principal acabou (não há mais
  // perdedores para cair) e sobrou ≤ 1 contendor.
  const mainNowDecided = next.knockout?.complete === true;
  if (!repDecided && mainNowDecided && pool.length <= 1) {
    next.repechageWinner = pool[0] ?? null;
    next.repechageComplete = true;
    next.repechage = [];
    logger.info(`tournament[${groupId}]: repescagem definida (sobrevivente ${next.repechageWinner?.uid ?? "—"})`);
  }

  // --- Transições de fase ---
  if (next.knockout?.complete && next.repechageComplete) next.phase = "final";
  else if (next.knockout?.complete) next.phase = "repechage"; // chave acabou, repescagem segue

  await stateRef.set(next);
  return true;
}

/* ------------------------------------------------------------------ */
/* Fatia 4: Grande Final                                               */
/* ------------------------------------------------------------------ */

/** Resolve a Grande Final de todos os grupos quando os jogos da Final da Copa terminam. */
export async function progressFinalAllGroups(): Promise<{ advanced: number }> {
  const db = getFirestore();
  const matchesSnap = await db.collection("matches").get();
  const finals = matchesSnap.docs.filter(
    (d) => cupRoundOf((d.data() as MatchDoc).round) === "final"
  );
  if (finals.length === 0) return { advanced: 0 };
  if (!finals.every((d) => (d.data() as MatchDoc).status === "finished")) return { advanced: 0 };

  const finalIds = new Set(finals.map((d) => d.id));
  const groupsSnap = await db.collection("groups").get();
  let advanced = 0;
  for (const groupDoc of groupsSnap.docs) {
    if (await resolveFinalForGroup(db, groupDoc.id, finalIds)) advanced++;
  }
  return { advanced };
}

async function resolveFinalForGroup(
  db: Firestore,
  groupId: string,
  finalIds: Set<string>
): Promise<boolean> {
  const stateRef = db.doc(`groups/${groupId}/tournament/state`);
  const state = (await stateRef.get()).data() as TournamentState | undefined;
  if (!state || state.phase === "done") return false; // já decidido
  // Só decide a Final quando a chave principal terminou.
  if (state.knockout?.complete !== true) return false;

  // Fecha a Repescagem se ainda em disputa (rodadas de mata-mata da Copa
  // esgotaram antes de sobrar 1) — escolhe o melhor seed remanescente.
  let repWinner = state.repechageWinner ?? null;
  if (!state.repechageComplete) {
    const pool = state.repechage ?? [];
    repWinner = pool.length ? [...pool].sort((a, b) => a.seed - b.seed)[0] : null;
  }

  const finalists = [state.mainBracketWinner, repWinner].filter(
    (p): p is QualifiedParticipant => !!p
  );

  // Pontos dos jogos da Final da Copa por participante.
  const betsSnap = await db.collection(`groups/${groupId}/bets`).get();
  const points: Record<string, number> = {};
  for (const betDoc of betsSnap.docs) {
    const b = betDoc.data() as BetDoc;
    if (finalIds.has(b.matchId)) points[b.userId] = (points[b.userId] ?? 0) + (b.points ?? 0);
  }

  const { champion, runnerUp } = resolveFinal(finalists, points);
  const next: TournamentState = {
    ...state,
    phase: "done",
    repechageWinner: repWinner,
    repechageComplete: true,
    repechage: [],
    champion,
    runnerUp,
    updatedAt: Date.now(),
  };
  await stateRef.set(next);
  logger.info(`tournament[${groupId}]: Grande Final decidida (campeão ${champion?.uid ?? "—"})`);
  return true;
}
