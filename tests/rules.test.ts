/**
 * Testes das regras de segurança do Firestore, executados contra o emulador.
 * Rode com:  npm run test:rules
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc, setDoc, getDoc, collection, getDocs,
  writeBatch, Timestamp, query, where,
} from "firebase/firestore";
import { beforeAll, afterAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const ALICE = "alice";
const BOB = "bob";
const GROUP = "g1";
const FUTURE_MATCH = "m_future"; // começa amanhã (apostas abertas)
const SOON_MATCH = "m_soon";     // começa em 2 min (apostas já fechadas pelo corte de 5 min)
const PAST_MATCH = "m_past";     // já terminou

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-bolaocopa",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => env && (await env.cleanup()));

beforeEach(async () => {
  await env.clearFirestore();
  // Seed via admin (sem regras): grupo com Alice como dona + Bob como membro, e duas partidas.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "groups", GROUP), {
      name: "Bolão", ownerId: ALICE, inviteCode: "ABC123", memberCount: 2,
    });
    await setDoc(doc(db, "groups", GROUP, "members", ALICE), {
      displayName: "Alice", role: "owner", totalPoints: 0,
    });
    await setDoc(doc(db, "groups", GROUP, "members", BOB), {
      displayName: "Bob", role: "member", totalPoints: 0,
    });
    await setDoc(doc(db, "matches", FUTURE_MATCH), {
      competitionId: "wc", home: { name: "BRA" }, away: { name: "ARG" },
      kickoff: Timestamp.fromDate(new Date(Date.now() + 86_400_000)),
      status: "scheduled", score: null,
    });
    await setDoc(doc(db, "matches", SOON_MATCH), {
      competitionId: "wc", home: { name: "ESP" }, away: { name: "POR" },
      kickoff: Timestamp.fromDate(new Date(Date.now() + 2 * 60_000)),
      status: "scheduled", score: null,
    });
    await setDoc(doc(db, "matches", PAST_MATCH), {
      competitionId: "wc", home: { name: "FRA" }, away: { name: "GER" },
      kickoff: Timestamp.fromDate(new Date(Date.now() - 86_400_000)),
      status: "finished", score: { home: 2, away: 1 },
    });
    // Palpites já existentes (semeados pelo admin) para testar a visibilidade.
    await setDoc(doc(db, "groups", GROUP, "bets", `${ALICE}_${FUTURE_MATCH}`), {
      userId: ALICE, matchId: FUTURE_MATCH, score: { home: 2, away: 1 }, points: 0,
    });
    await setDoc(doc(db, "groups", GROUP, "bets", `${ALICE}_${PAST_MATCH}`), {
      userId: ALICE, matchId: PAST_MATCH, score: { home: 0, away: 0 }, points: 0,
    });
    await setDoc(doc(db, "groups", GROUP, "bets", `${BOB}_${FUTURE_MATCH}`), {
      userId: BOB, matchId: FUTURE_MATCH, score: { home: 1, away: 1 }, points: 0,
    });
  });
});

function db(uid: string | null) {
  return uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
}

describe("Grupos e membros", () => {
  it("membro lê o grupo; não-membro é negado", async () => {
    await assertSucceeds(getDoc(doc(db(ALICE), "groups", GROUP)));
    await assertFails(getDoc(doc(db("intruder"), "groups", GROUP)));
  });

  it("usuário não autenticado é sempre negado", async () => {
    await assertFails(getDoc(doc(db(null), "groups", GROUP)));
  });

  it("membro lê o ranking; não-membro não", async () => {
    await assertSucceeds(getDocs(collection(db(BOB), "groups", GROUP, "members")));
    await assertFails(getDocs(collection(db("intruder"), "groups", GROUP, "members")));
  });

  it("ninguém pode alterar pontos de um membro pelo cliente", async () => {
    await assertFails(
      setDoc(doc(db(ALICE), "groups", GROUP, "members", ALICE), { totalPoints: 999 }, { merge: true })
    );
  });
});

describe("Criação de grupo (batch)", () => {
  it("usuário cria grupo sendo dono + membro + índice de participação", async () => {
    const d = db("carol");
    const batch = writeBatch(d);
    batch.set(doc(d, "groups", "g2"), {
      name: "Novo", ownerId: "carol", inviteCode: "XYZ999", memberCount: 1,
    });
    batch.set(doc(d, "groups", "g2", "members", "carol"), {
      displayName: "Carol", role: "owner", totalPoints: 0,
    });
    batch.set(doc(d, "users", "carol", "memberships", "g2"), { name: "Novo", role: "owner" });
    await assertSucceeds(batch.commit());
  });

  it("não pode criar grupo em nome de outro dono", async () => {
    await assertFails(
      setDoc(doc(db("carol"), "groups", "g3"), { name: "x", ownerId: ALICE, inviteCode: "Q" })
    );
  });
});

describe("Índice de participações", () => {
  it("usuário lê o próprio índice, mas não o de outro", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", ALICE, "memberships", GROUP), { name: "Bolão", role: "owner" });
    });
    await assertSucceeds(getDocs(collection(db(ALICE), "users", ALICE, "memberships")));
    await assertFails(getDocs(collection(db(BOB), "users", ALICE, "memberships")));
  });
});

describe("Palpites", () => {
  it("membro cria palpite antes do início com points=0", async () => {
    await assertSucceeds(
      setDoc(doc(db(BOB), "groups", GROUP, "bets", `${BOB}_${FUTURE_MATCH}`), {
        userId: BOB, matchId: FUTURE_MATCH, score: { home: 1, away: 0 }, points: 0,
      })
    );
  });

  it("não pode palpitar depois do início (jogo finalizado)", async () => {
    await assertFails(
      setDoc(doc(db(BOB), "groups", GROUP, "bets", `${BOB}_${PAST_MATCH}`), {
        userId: BOB, matchId: PAST_MATCH, score: { home: 1, away: 0 }, points: 0,
      })
    );
  });

  it("não pode palpitar a menos de 5 min do início (feature 2)", async () => {
    await assertFails(
      setDoc(doc(db(BOB), "groups", GROUP, "bets", `${BOB}_${SOON_MATCH}`), {
        userId: BOB, matchId: SOON_MATCH, score: { home: 1, away: 0 }, points: 0,
      })
    );
  });

  it("não pode enviar palpite já com pontos", async () => {
    await assertFails(
      setDoc(doc(db(BOB), "groups", GROUP, "bets", `${BOB}_${FUTURE_MATCH}`), {
        userId: BOB, matchId: FUTURE_MATCH, score: { home: 1, away: 0 }, points: 10,
      })
    );
  });

  it("não pode criar palpite em nome de outro usuário", async () => {
    await assertFails(
      setDoc(doc(db(BOB), "groups", GROUP, "bets", `${ALICE}_${FUTURE_MATCH}`), {
        userId: ALICE, matchId: FUTURE_MATCH, score: { home: 1, away: 0 }, points: 0,
      })
    );
  });

  it("membro lê sempre o próprio palpite, mesmo com apostas abertas", async () => {
    await assertSucceeds(getDoc(doc(db(BOB), "groups", GROUP, "bets", `${BOB}_${FUTURE_MATCH}`)));
  });

  it("não vê o palpite de outro enquanto as apostas estão abertas (feature 4)", async () => {
    await assertFails(getDoc(doc(db(BOB), "groups", GROUP, "bets", `${ALICE}_${FUTURE_MATCH}`)));
  });

  it("vê o palpite de outro quando as apostas fecharam (feature 4)", async () => {
    await assertSucceeds(getDoc(doc(db(BOB), "groups", GROUP, "bets", `${ALICE}_${PAST_MATCH}`)));
  });

  it("consulta por matchId revela todos quando o jogo já fechou", async () => {
    await assertSucceeds(
      getDocs(query(
        collection(db(BOB), "groups", GROUP, "bets"),
        where("matchId", "==", PAST_MATCH)
      ))
    );
  });
});

describe("Partidas", () => {
  it("autenticado lê partidas; cliente não escreve", async () => {
    await assertSucceeds(getDoc(doc(db(BOB), "matches", FUTURE_MATCH)));
    await assertFails(
      setDoc(doc(db(BOB), "matches", FUTURE_MATCH), { status: "finished", score: { home: 9, away: 0 } }, { merge: true })
    );
  });
});
