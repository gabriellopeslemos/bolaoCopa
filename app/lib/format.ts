import type { Timestamp } from "firebase/firestore";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function toDate(ts?: Timestamp | null): Date | null {
  if (!ts) return null;
  if (typeof (ts as Timestamp).toDate === "function") return (ts as Timestamp).toDate();
  return null;
}

export function formatKickoff(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${WEEKDAYS[d.getDay()]} ${day}/${month} · ${hh}:${mm}`;
}

export function formatShortDate(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${hh}:${mm}`;
}

export const STATUS_META: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Aberto", color: "#7FA593" },
  live: { label: "AO VIVO", color: "#EF4444" },
  finished: { label: "Encerrado", color: "#7FA593" },
};

/** Antecedência com que os palpites fecham antes do início do jogo (5 min). */
export const BET_LOCK_LEAD_MS = 5 * 60 * 1000;

/**
 * Apostas abertas: jogo agendado e faltando MAIS de 5 min para o início.
 * Espelha a função `matchIsOpen` das regras do Firestore. Quando esta função
 * retorna `false`, os palpites estão bloqueados e os de todos ficam visíveis.
 */
export function isBettingOpen(match: { status: string; kickoff?: Timestamp | null }): boolean {
  if (match.status !== "scheduled") return false;
  const d = toDate(match.kickoff);
  if (!d) return false;
  return d.getTime() - Date.now() > BET_LOCK_LEAD_MS;
}
