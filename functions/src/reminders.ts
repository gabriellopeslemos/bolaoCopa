/**
 * Lembretes de palpite (feature 3).
 *
 * ~2h antes de cada jogo, avisa quem ainda NÃO palpitou. Para cada partida
 * agendada cujo início está a até 2h e que ainda não teve lembretes enviados,
 * percorre os grupos e notifica os membros sem palpite que tenham um Expo push
 * token registrado. Marca a partida com `remindersSentAt` para não repetir.
 */
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { MatchDoc } from "./types";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const REMINDER_LEAD_MS = 2 * 60 * 60 * 1000; // dispara quando faltam <= 2h

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function isExpoToken(t: unknown): t is string {
  return (
    typeof t === "string" &&
    (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["))
  );
}

/** Envia as mensagens em lotes de 100 (limite da API do Expo). */
async function sendExpoPush(messages: ExpoMessage[]): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        logger.warn(`Expo push retornou ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      logger.error("Falha ao enviar push para o Expo", err as Error);
    }
  }
}

export async function sendBetReminders(): Promise<{ matches: number; notified: number }> {
  const db = getFirestore();
  const now = Timestamp.now();
  const horizon = Timestamp.fromMillis(now.toMillis() + REMINDER_LEAD_MS);

  const matchesSnap = await db
    .collection("matches")
    .where("status", "==", "scheduled")
    .where("kickoff", ">", now)
    .where("kickoff", "<=", horizon)
    .get();

  // Pula jogos que já tiveram lembretes (evita duplicar entre execuções).
  const pending = matchesSnap.docs.filter(
    (d) => !(d.data() as MatchDoc & { remindersSentAt?: unknown }).remindersSentAt
  );
  if (pending.length === 0) return { matches: 0, notified: 0 };

  let notified = 0;
  for (const matchDoc of pending) {
    const match = matchDoc.data() as MatchDoc;
    notified += await remindMatch(db, matchDoc.id, match);
    await matchDoc.ref.set({ remindersSentAt: Timestamp.now() }, { merge: true });
  }

  logger.info(`sendBetReminders: ${pending.length} jogos, ${notified} lembretes`);
  return { matches: pending.length, notified };
}

async function remindMatch(
  db: FirebaseFirestore.Firestore,
  matchId: string,
  match: MatchDoc
): Promise<number> {
  // Quem já palpitou neste jogo (em qualquer grupo): chave "groupId:userId".
  const betsSnap = await db.collectionGroup("bets").where("matchId", "==", matchId).get();
  const alreadyBet = new Set(
    betsSnap.docs
      .map((b) => {
        const groupId = b.ref.parent.parent?.id;
        const userId = (b.data() as { userId?: string }).userId;
        return groupId && userId ? `${groupId}:${userId}` : null;
      })
      .filter((k): k is string => k !== null)
  );

  // Cache de token por usuário (um usuário pode estar em vários grupos).
  const tokenCache = new Map<string, string | null>();
  async function tokenFor(uid: string): Promise<string | null> {
    const cached = tokenCache.get(uid);
    if (cached !== undefined) return cached;
    const snap = await db.collection("users").doc(uid).get();
    const raw = snap.data()?.expoPushToken;
    const token = isExpoToken(raw) ? raw : null;
    tokenCache.set(uid, token);
    return token;
  }

  const messages: ExpoMessage[] = [];
  const groupsSnap = await db.collection("groups").get();

  for (const groupDoc of groupsSnap.docs) {
    const groupName = (groupDoc.data() as { name?: string }).name ?? "seu bolão";
    const membersSnap = await groupDoc.ref.collection("members").get();
    for (const memberDoc of membersSnap.docs) {
      const uid = memberDoc.id;
      if (alreadyBet.has(`${groupDoc.id}:${uid}`)) continue;
      const token = await tokenFor(uid);
      if (!token) continue;
      messages.push({
        to: token,
        title: "⏰ Faltam ~2h!",
        body: `Você ainda não palpitou em ${match.home.name} x ${match.away.name} no bolão "${groupName}".`,
        data: { type: "bet-reminder", groupId: groupDoc.id, matchId },
      });
    }
  }

  await sendExpoPush(messages);
  return messages.length;
}
