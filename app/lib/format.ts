import type { Timestamp } from "firebase/firestore";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const BRT_OFFSET_MS = -3 * 60 * 60 * 1000; // UTC-3

function toDate(ts?: Timestamp | null): Date | null {
  if (!ts) return null;
  if (typeof (ts as Timestamp).toDate === "function") return (ts as Timestamp).toDate();
  return null;
}

/** Converte uma Date UTC para o fuso de Brasília (UTC-3), retornando um Date
 *  cujos getUTCHours/getUTCMinutes equivalem ao horário local BRT. */
function toBrasiliaDate(d: Date): Date {
  return new Date(d.getTime() + BRT_OFFSET_MS);
}

/** Hora do jogo no horário de Brasília, ex: "14:30". */
export function formatBrasiliaTime(ts?: Timestamp | null): string {
  const d = toDate(ts);
  if (!d) return "";
  const brt = toBrasiliaDate(d);
  const hh = String(brt.getUTCHours()).padStart(2, "0");
  const mm = String(brt.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Tempo restante até o kickoff, ex: "em 2h 30min" / "em 45min".
 *  Retorna null se já passou ou se a diferença é desprezível. */
export function formatCountdown(ts?: Timestamp | null): string | null {
  const d = toDate(ts);
  if (!d) return null;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return null;
  const totalMin = Math.floor(diffMs / 60_000);
  if (totalMin < 1) return "em menos de 1 min";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `em ${m}min`;
  if (m === 0) return `em ${h}h`;
  return `em ${h}h ${m}min`;
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
