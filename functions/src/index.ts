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
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";

import { fetchFixtures, mapStatus } from "./footballApi";
import { scoreMatch } from "./scoreMatch";
import type { MatchDoc } from "./types";

initializeApp();

const FOOTBALL_API_KEY = defineSecret("FOOTBALL_API_KEY");

// Copa do Mundo (FIFA World Cup) na API-Football.
const WORLD_CUP_LEAGUE = 1;
const SEASON = 2026;
const COMPETITION_ID = "world-cup-2026";

/** Faz upsert dos jogos vindos da API no Firestore. */
async function syncFromApi(apiKey: string): Promise<{ synced: number }> {
  const fixtures = await fetchFixtures({
    apiKey,
    league: WORLD_CUP_LEAGUE,
    season: SEASON,
  });

  const db = getFirestore();
  let synced = 0;

  for (const f of fixtures) {
    const status = mapStatus(f.fixture.status.short);
    const hasScore = f.goals.home !== null && f.goals.away !== null;
    const docId = `${COMPETITION_ID}-${f.fixture.id}`;

    const data: Partial<MatchDoc> = {
      competitionId: COMPETITION_ID,
      externalId: f.fixture.id,
      round: f.league.round,
      home: { name: f.teams.home.name, flag: f.teams.home.logo },
      away: { name: f.teams.away.name, flag: f.teams.away.logo },
      kickoff: Timestamp.fromDate(new Date(f.fixture.date)),
      status,
      score:
        status === "finished" && hasScore
          ? { home: f.goals.home as number, away: f.goals.away as number }
          : status === "live" && hasScore
            ? { home: f.goals.home as number, away: f.goals.away as number }
            : null,
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
  { schedule: "every 30 minutes", secrets: [FOOTBALL_API_KEY], region: "us-central1" },
  async () => {
    await syncFromApi(FOOTBALL_API_KEY.value());
  }
);

/** Sincronização sob demanda (apenas admin). */
export const syncFixturesNow = onCall(
  { secrets: [FOOTBALL_API_KEY] },
  async (req) => {
    await assertAdmin(req.auth?.uid);
    return syncFromApi(FOOTBALL_API_KEY.value());
  }
);

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
  const userSnap = await db.collection("users").doc(uid).get();
  const displayName =
    (userSnap.data()?.displayName as string | undefined) ||
    req.auth?.token.name ||
    "Participante";

  await groupRef.collection("members").doc(uid).set(
    {
      displayName,
      role: "member",
      totalPoints: 0,
      joinedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { groupId: groupRef.id, name: snap.docs[0].data().name };
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
