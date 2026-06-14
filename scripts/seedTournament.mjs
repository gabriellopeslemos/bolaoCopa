/**
 * Popula um grupo de teste completo para validar o Mata-mata (ver testesMataMata.md).
 *
 * Cria 8 participantes, os jogos de cada fase (Qualificatória, Grupos e 3 de
 * mata-mata) e os palpites — tudo `scheduled`. Você finaliza os jogos fase a
 * fase (Emulator UI ou tela Administração) e acompanha o app.
 *
 * Uso (com o emulador no ar):
 *   # Passe o ID do grupo que você criou no APP (para você ser membro e enxergá-lo):
 *   $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"; $env:GOOGLE_CLOUD_PROJECT="bolaocopa-22280"; node scripts/seedTournament.mjs <GROUP_ID>
 *   # Sem argumento, cria/usa o grupo "mm-test-group" (não fica ligado à sua conta).
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("Defina FIRESTORE_EMULATOR_HOST (ex.: 127.0.0.1:8080) — não rode contra produção.");
  process.exit(1);
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT || "bolaocopa-22280";
const GID = process.argv[2] || "mm-test-group";
const TARGET = 8; // participantes desejados

initializeApp({ projectId });
const db = getFirestore();

const now = Date.now();
const minutes = (m) => Timestamp.fromDate(new Date(now + m * 60_000));

// Palpites por participante (Qualificatória e Grupos). Index 0 acerta o placar
// exato → vira Seed 1. Os demais decaem; do 4º em diante erram (0 ponto).
const Q_RESULT = { home: 2, away: 1 };
const G_RESULT = { home: 1, away: 0 };
const Q_BETS = [[2, 1], [3, 2], [5, 0], [0, 2], [0, 2], [0, 2], [0, 2], [0, 2]];
const G_BETS = [[1, 0], [2, 1], [3, 0], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1]];
const Q_WRONG = [0, 2];
const G_WRONG = [0, 1];

const MATCHES = [
  ["mm-q1", "Grupo A · Rodada 1", minutes(10)],
  ["mm-g1", "Grupo A · Rodada 2", minutes(20)],
  ["mm-k1", "Round of 16", minutes(30)],
  ["mm-k2", "Quarter-final", minutes(40)],
  ["mm-k3", "Semi-final", minutes(50)],
];

// --- Limpa estado de torneio anterior (recomeça o fluxo do zero) ---
await db.doc(`groups/${GID}/tournament/state`).delete().catch(() => {});

// --- Garante o grupo ---
const groupRef = db.doc(`groups/${GID}`);
if (!(await groupRef.get()).exists) {
  await groupRef.set({
    name: "Teste Mata-mata", ownerId: "p1", inviteCode: "MMTEST",
    memberCount: TARGET, createdAt: Timestamp.now(),
  });
}

// --- Participantes: usa os existentes (dono primeiro) e completa até TARGET ---
const existing = (await db.collection(`groups/${GID}/members`).get()).docs;
existing.sort((a, b) => (a.data().role === "owner" ? -1 : 0) - (b.data().role === "owner" ? -1 : 0));
const members = existing.map((d) => ({ uid: d.id, displayName: d.data().displayName ?? "Participante" }));

let fake = 1;
while (members.length < TARGET) {
  let uid;
  do { uid = `p${fake++}`; } while (members.some((m) => m.uid === uid));
  await db.doc(`groups/${GID}/members/${uid}`).set({
    displayName: `Jogador ${members.length + 1}`, role: "member", totalPoints: 0, joinedAt: Timestamp.now(),
  });
  members.push({ uid, displayName: `Jogador ${members.length + 1}` });
}
await groupRef.set({ memberCount: members.length }, { merge: true });

// --- Zera pontos dos membros (recomeço limpo) ---
for (const m of members) {
  await db.doc(`groups/${GID}/members/${m.uid}`).set(
    { totalPoints: 0, phasePoints: {}, exactCount: 0, correctCount: 0 }, { merge: true }
  );
}

// --- Jogos (todos scheduled) ---
for (const [id, round, kickoff] of MATCHES) {
  await db.doc(`matches/${id}`).set({
    competitionId: "world-cup-2026", externalId: id, round,
    home: { name: "Time A" }, away: { name: "Time B" },
    kickoff, status: "scheduled", score: null, updatedAt: Timestamp.now(),
  });
}

// --- Palpites (Qualificatória e Grupos) ---
for (let i = 0; i < members.length; i++) {
  const m = members[i];
  const [qh, qa] = Q_BETS[i] ?? Q_WRONG;
  const [gh, ga] = G_BETS[i] ?? G_WRONG;
  await db.doc(`groups/${GID}/bets/${m.uid}_mm-q1`).set({
    userId: m.uid, displayName: m.displayName, matchId: "mm-q1",
    score: { home: qh, away: qa }, points: 0, createdAt: Timestamp.now(),
  });
  await db.doc(`groups/${GID}/bets/${m.uid}_mm-g1`).set({
    userId: m.uid, displayName: m.displayName, matchId: "mm-g1",
    score: { home: gh, away: ga }, points: 0, createdAt: Timestamp.now(),
  });
}

// --- Aviso: outros jogos de Qualificatória bloqueiam a transição ---
const all = await db.collection("matches").get();
const otherQual = all.docs.filter(
  (d) => !d.id.startsWith("mm-") &&
    /rodada\s*1\b|matchday\s*1\b|^\s*1\s*$/i.test(String(d.data().round ?? "")) &&
    d.data().status !== "finished"
);

console.log(`\n✓ Grupo "${GID}" pronto com ${members.length} participantes e 5 jogos.`);
console.log("  Participantes:", members.map((m) => m.displayName).join(", "));
console.log("\nFinalize os jogos NESTA ORDEM (Emulator UI: status=finished + score):");
console.log(`  1) mm-q1  (Qualificatória) → resultado sugerido ${Q_RESULT.home}x${Q_RESULT.away}`);
console.log(`  2) mm-g1  (Fase de Grupos) → resultado sugerido ${G_RESULT.home}x${G_RESULT.away}`);
console.log("  3) mm-k1, mm-k2, mm-k3 (Eliminatórias) → qualquer placar");
if (otherQual.length) {
  console.log(`\n⚠️  Há ${otherQual.length} outro(s) jogo(s) de Qualificatória NÃO finalizados que vão`);
  console.log("    travar a transição. Finalize-os ou apague:", otherQual.map((d) => d.id).join(", "));
}
console.log("\nAcompanhe nas abas Ranking e Mata-mata (selecione este grupo no Perfil).");
process.exit(0);
