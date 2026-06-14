/**
 * Popula partidas de demonstração da Copa do Mundo.
 *
 * Uso (contra o emulador) — use 127.0.0.1 e o mesmo project id do app (bolaocopa-22280):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=bolaocopa-22280 node scripts/seed.mjs
 *
 * Uso (projeto real — precisa de credenciais de admin):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/seed.mjs
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const projectId = process.env.GOOGLE_CLOUD_PROJECT || "demo-bolaocopa";
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

initializeApp(
  saPath
    ? { credential: cert(JSON.parse(readFileSync(saPath, "utf8"))), projectId }
    : { projectId }
);

const db = getFirestore();
const COMP = "world-cup-2026";

const teams = (h, a) => ({ home: { name: h }, away: { name: a } });

const now = Date.now();
const hours = (n) => Timestamp.fromDate(new Date(now + n * 3600_000));

const fixtures = [
  { id: 1, round: "Grupo A · Rodada 1", ...teams("Brasil", "Sérvia"),   kickoff: hours(2),  status: "scheduled", score: null },
  { id: 2, round: "Grupo A · Rodada 1", ...teams("Suíça", "Camarões"),  kickoff: hours(5),  status: "scheduled", score: null },
  { id: 3, round: "Grupo B · Rodada 1", ...teams("Argentina", "México"),kickoff: hours(26), status: "scheduled", score: null },
  { id: 4, round: "Grupo C · Rodada 1", ...teams("França", "Austrália"),kickoff: hours(-2), status: "finished",  score: { home: 4, away: 1 } },
  { id: 5, round: "Grupo C · Rodada 1", ...teams("Dinamarca", "Tunísia"),kickoff: hours(-4),status: "finished",  score: { home: 0, away: 0 } },
];

for (const f of fixtures) {
  const docId = `${COMP}-${f.id}`;
  await db.collection("matches").doc(docId).set({
    competitionId: COMP,
    externalId: f.id,
    round: f.round,
    home: f.home,
    away: f.away,
    kickoff: f.kickoff,
    status: f.status,
    score: f.score,
    updatedAt: Timestamp.now(),
  });
  console.log(`✓ ${docId}: ${f.home.name} x ${f.away.name}`);
}

console.log(`\n${fixtures.length} partidas semeadas em "matches".`);
process.exit(0);
