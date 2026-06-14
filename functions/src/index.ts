/**
 * Cloud Functions do Bolão da Copa.
 *
 *  - syncFixtures        : agendada — sincroniza jogos/placares da API de futebol.
 *  - syncFixturesNow     : callable (admin) — dispara a sincronização sob demanda.
 *  - setMatchResult      : callable (admin) — lança/ajusta placar manualmente.
 *  - onMatchWrite        : trigger Firestore — pontua os palpites quando um jogo finaliza.
 *  - joinGroup           : callable — entrar em um grupo por código de convite.
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";

import { fetchWorldCupEvents } from "./sportsDb";
import { scoreMatch } from "./scoreMatch";
import { sendBetReminders } from "./reminders";
import {
  progressQualifierAllGroups,
  progressGroupsToKnockoutAllGroups,
  progressKnockoutAllGroups,
  progressFinalAllGroups,
} from "./tournament";
import { matchTournamentPhase } from "@bolao/scoring";
import type { MatchDoc } from "./types";

initializeApp();

// Chave do TheSportsDB. A chave free pública "123" funciona (com limites);
// defina SPORTSDB_API_KEY (.env / param) com uma premium p/ o calendário completo.
const SPORTSDB_API_KEY = defineString("SPORTSDB_API_KEY", { default: "123" });

// Copa do Mundo (FIFA World Cup) no TheSportsDB.
const WORLD_CUP_LEAGUE = 4429;
const SEASON = "2026";
const COMPETITION_ID = "world-cup-2026";

/** Faz upsert dos jogos vindos da API no Firestore. */
async function syncFromApi(apiKey: string): Promise<{ synced: number }> {
  const fixtures = await fetchWorldCupEvents({
    apiKey,
    league: WORLD_CUP_LEAGUE,
    season: SEASON,
  });

  const db = getFirestore();
  let synced = 0;

  for (const f of fixtures) {
    const docId = `${COMPETITION_ID}-${f.externalId}`;

    const data: Partial<MatchDoc> = {
      competitionId: COMPETITION_ID,
      externalId: f.externalId,
      round: f.round,
      home: { name: f.home.name, flag: f.home.flag },
      away: { name: f.away.name, flag: f.away.flag },
      kickoff: Timestamp.fromDate(f.kickoff),
      status: f.status,
      // Mantém o placar quando o jogo está ao vivo ou encerrado; null se agendado.
      score: f.status === "scheduled" ? null : f.score,
      updatedAt: Timestamp.now(),
    };

    await db.collection("matches").doc(docId).set(data, { merge: true });
    synced++;
  }

  logger.info(`syncFromApi: ${synced} jogos sincronizados`);
  return { synced };
}

/** Sincronização agendada (a cada 30 min). */
export const syncFixtures = onSchedule(
  { schedule: "every 30 minutes", region: "us-central1" },
  async () => {
    await syncFromApi(SPORTSDB_API_KEY.value());
  }
);

/** Sincronização sob demanda (apenas admin). */
export const syncFixturesNow = onCall(async (req) => {
  await assertAdmin(req.auth?.uid);
  return syncFromApi(SPORTSDB_API_KEY.value());
});

/** Lança/ajusta o placar de um jogo manualmente (fallback sem API). */
export const setMatchResult = onCall(async (req) => {
  await assertAdmin(req.auth?.uid);
  const { matchId, home, away, status } = req.data ?? {};
  if (typeof matchId !== "string" || !Number.isInteger(home) || !Number.isInteger(away)) {
    throw new HttpsError("invalid-argument", "matchId, home e away (inteiros) são obrigatórios.");
  }
  const db = getFirestore();
  await db.collection("matches").doc(matchId).set(
    {
      score: { home, away },
      status: status === "live" ? "live" : "finished",
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
  return { ok: true };
});

/** Lembretes de palpite: roda a cada 15 min e avisa quem não palpitou (~2h antes). */
export const betReminders = onSchedule(
  { schedule: "every 15 minutes", region: "us-central1" },
  async () => {
    await sendBetReminders();
  }
);

/** Dispara os lembretes sob demanda (apenas admin) — útil para testes. */
export const sendRemindersNow = onCall(async (req) => {
  await assertAdmin(req.auth?.uid);
  return sendBetReminders();
});

/** Pontua os palpites quando um jogo é finalizado. */
export const onMatchWrite = onDocumentWritten("matches/{matchId}", async (event) => {
  const after = event.data?.after.data() as MatchDoc | undefined;
  const before = event.data?.before.data() as MatchDoc | undefined;
  if (!after) return;

  const becameFinished =
    after.status === "finished" &&
    !!after.score &&
    (before?.status !== "finished" ||
      before?.score?.home !== after.score.home ||
      before?.score?.away !== after.score.away);

  if (!becameFinished) return;
  await scoreMatch(event.params.matchId);

  // Avança o torneio quando a fase correspondente termina (só conclui quando
  // TODOS os jogos daquela fase estiverem encerrados).
  const phase = matchTournamentPhase(after.round);
  if (phase === "qualifier") await progressQualifierAllGroups();
  else if (phase === "groups") await progressGroupsToKnockoutAllGroups();
  else if (phase === "knockout") await progressKnockoutAllGroups();
  else if (phase === "final") await progressFinalAllGroups();
});

/** Avança o torneio sob demanda (apenas admin) — útil para testes. */
export const progressTournamentNow = onCall(async (req) => {
  await assertAdmin(req.auth?.uid);
  const qualifier = await progressQualifierAllGroups();
  const toKnockout = await progressGroupsToKnockoutAllGroups();
  const knockoutRounds = await progressKnockoutAllGroups();
  const grandFinal = await progressFinalAllGroups();
  return { qualifier, toKnockout, knockoutRounds, grandFinal };
});

/** Entrar em um grupo via código de convite. */
export const joinGroup = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Faça login para entrar em um grupo.");

  const inviteCode = String(req.data?.inviteCode ?? "").trim().toUpperCase();
  if (!inviteCode) throw new HttpsError("invalid-argument", "Código de convite obrigatório.");

  const db = getFirestore();
  const snap = await db
    .collection("groups")
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();

  if (snap.empty) throw new HttpsError("not-found", "Grupo não encontrado para este código.");

  const groupRef = snap.docs[0].ref;
  const groupName = snap.docs[0].data().name as string;
  const userSnap = await db.collection("users").doc(uid).get();
  const displayName =
    (userSnap.data()?.displayName as string | undefined) ||
    req.auth?.token.name ||
    "Participante";

  const memberRef = groupRef.collection("members").doc(uid);
  const alreadyMember = (await memberRef.get()).exists;

  const batch = db.batch();
  batch.set(
    memberRef,
    {
      displayName,
      role: "member",
      totalPoints: 0,
      exactCount: 0,
      correctCount: 0,
      joinedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  // Índice de participações do usuário (usado para listar os grupos).
  batch.set(db.collection("users").doc(uid).collection("memberships").doc(groupRef.id), {
    name: groupName,
    role: "member",
    joinedAt: FieldValue.serverTimestamp(),
  });
  if (!alreadyMember) {
    batch.set(groupRef, { memberCount: FieldValue.increment(1) }, { merge: true });
  }
  await batch.commit();

  return { groupId: groupRef.id, name: groupName };
});

/** Verifica se o usuário é admin (custom claim `admin: true`). */
async function assertAdmin(uid?: string): Promise<void> {
  if (!uid) throw new HttpsError("unauthenticated", "Login necessário.");
  const { getAuth } = await import("firebase-admin/auth");
  const user = await getAuth().getUser(uid);
  if (user.customClaims?.admin !== true) {
    throw new HttpsError("permission-denied", "Apenas administradores.");
  }
}
