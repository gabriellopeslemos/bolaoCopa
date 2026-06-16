/**
 * Client da API do TheSportsDB para buscar os próximos jogos e os resultados
 * da Copa do Mundo de 2026.
 *
 * O app NUNCA chama esta API diretamente — apenas as Cloud Functions, que
 * normalizam o resultado e gravam no Firestore (coleção `matches`).
 *
 * Docs:    https://www.thesportsdb.com/documentation
 * Liga:    FIFA World Cup → idLeague = 4429
 * Temporada (parâmetro `s`): "2026"
 * Chave:   a chave free pública é "123" (limitada). Defina SPORTSDB_API_KEY
 *          com uma chave premium para o calendário completo sem limites.
 *
 * Endpoints usados (todos retornam o mesmo formato de "event"):
 *   - eventsseason.php?id=&s=   calendário da temporada (agendados + resultados)
 *   - eventsnextleague.php?id=  próximos jogos da liga
 *   - eventspastleague.php?id=  jogos recentes já encerrados
 *
 * Combinamos os três e deduplicamos por idEvent para que, mesmo com a chave
 * free, tenhamos os próximos jogos e os resultados mais recentes.
 */

const BASE_URL = "https://www.thesportsdb.com/api/v1/json";

export type MatchStatus = "scheduled" | "live" | "finished";

/** Formato bruto de um evento retornado pelo TheSportsDB (campos relevantes). */
export interface SportsDbEvent {
  idEvent: string;
  strEvent?: string;
  strSeason?: string;
  idLeague?: string;
  intRound?: string | null;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  strTimestamp?: string | null; // ISO em UTC, ex.: "2026-06-11T19:00:00"
  dateEvent?: string | null; // "2026-06-11"
  strTime?: string | null; // "19:00:00"
  strStatus?: string | null; // "NS", "1H", "HT", "2H", "FT", "AET", "PEN"...
  strPostponed?: string | null; // "yes" | "no"
}

/** Fixture normalizado, pronto para virar um documento de partida. */
export interface NormalizedFixture {
  externalId: number;
  round?: string;
  home: { name: string; flag?: string };
  away: { name: string; flag?: string };
  kickoff: Date;
  status: MatchStatus;
  score: { home: number; away: number } | null;
}

const FINISHED_STATUSES = new Set([
  "FT",
  "AET",
  "AP", // After Penalties
  "PEN",
  "Match Finished",
  "After Extra Time",
]);
const LIVE_STATUSES = new Set([
  "1H",
  "2H",
  "HT",
  "ET",
  "BT",
  "P",
  "LIVE",
  "Live",
  "In Play",
]);

/** Converte o `strStatus`/`strPostponed` do TheSportsDB no nosso status. */
export function mapStatus(
  strStatus?: string | null,
  strPostponed?: string | null
): MatchStatus {
  const s = (strStatus ?? "").trim();
  if (FINISHED_STATUSES.has(s)) return "finished";
  if (LIVE_STATUSES.has(s)) return "live";
  // "NS", "TBD", "", postergado, etc. → ainda não começou.
  return "scheduled";
}

/** Lê os gols como inteiros; retorna null se algum lado não tiver placar. */
export function parseScore(
  home?: string | null,
  away?: string | null
): { home: number; away: number } | null {
  if (home == null || away == null || home === "" || away === "") return null;
  const h = Number.parseInt(home, 10);
  const a = Number.parseInt(away, 10);
  if (Number.isNaN(h) || Number.isNaN(a)) return null;
  return { home: h, away: a };
}

/**
 * Resolve o horário de início. O `strTimestamp` do TheSportsDB é UTC mas vem
 * sem o sufixo "Z"; sem ele o JS interpretaria como horário local. Garantimos
 * UTC e caímos para `dateEvent` + `strTime` quando o timestamp falta.
 */
export function parseKickoff(ev: SportsDbEvent): Date {
  const ts = ev.strTimestamp?.trim();
  if (ts) {
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(ts);
    return new Date(hasTz ? ts : `${ts}Z`);
  }
  if (ev.dateEvent) {
    const time = ev.strTime && ev.strTime !== "00:00:00" ? ev.strTime : "00:00:00";
    return new Date(`${ev.dateEvent}T${time}Z`);
  }
  return new Date(NaN);
}

// Margem de segurança: 3h cobre 90min + prorrogação + pênaltis + atraso de API.
const MATCH_MAX_DURATION_MS = 3 * 60 * 60 * 1000;

/** Normaliza um evento bruto; retorna null se for inválido (sem id ou data). */
export function normalizeEvent(ev: SportsDbEvent): NormalizedFixture | null {
  const externalId = Number.parseInt(ev.idEvent, 10);
  if (Number.isNaN(externalId)) return null;

  const kickoff = parseKickoff(ev);
  if (Number.isNaN(kickoff.getTime())) return null;

  let status = mapStatus(ev.strStatus, ev.strPostponed);
  const score = parseScore(ev.intHomeScore, ev.intAwayScore);

  // A API free do TheSportsDB frequentemente fica presa em "2H" e nunca muda
  // para "FT". Se o jogo está "live", tem placar e o kickoff foi há mais de 3h,
  // o jogo certamente terminou — forçamos "finished".
  if (
    status === "live" &&
    score !== null &&
    Date.now() - kickoff.getTime() > MATCH_MAX_DURATION_MS
  ) {
    status = "finished";
  }

  return {
    externalId,
    round: ev.intRound ? String(ev.intRound) : undefined,
    home: { name: ev.strHomeTeam, flag: ev.strHomeTeamBadge ?? undefined },
    away: { name: ev.strAwayTeam, flag: ev.strAwayTeamBadge ?? undefined },
    kickoff,
    status,
    score,
  };
}

async function getEvents(path: string): Promise<SportsDbEvent[]> {
  const res = await fetch(`${BASE_URL}/${path}`);
  if (!res.ok) {
    throw new Error(`TheSportsDB HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { events?: SportsDbEvent[] | null };
  // A API retorna { events: null } quando não há resultados — não é erro.
  return json.events ?? [];
}

/** "Riqueza" de um evento p/ escolher a melhor cópia ao deduplicar. */
function richness(ev: SportsDbEvent): number {
  const status = mapStatus(ev.strStatus, ev.strPostponed);
  const hasScore = parseScore(ev.intHomeScore, ev.intAwayScore) !== null;
  return (hasScore ? 2 : 0) + (status === "finished" ? 1 : 0);
}

/**
 * Busca os jogos da Copa: calendário da temporada + próximos + recém-encerrados,
 * combinados e deduplicados por idEvent (mantendo a cópia com placar/status mais
 * completos).
 */
export async function fetchWorldCupEvents(params: {
  apiKey: string;
  league: number;
  season: string;
}): Promise<NormalizedFixture[]> {
  const { apiKey, league, season } = params;

  const [seasonEvents, nextEvents, pastEvents] = await Promise.all([
    getEvents(`${apiKey}/eventsseason.php?id=${league}&s=${season}`),
    getEvents(`${apiKey}/eventsnextleague.php?id=${league}`),
    getEvents(`${apiKey}/eventspastleague.php?id=${league}`),
  ]);

  const byId = new Map<string, SportsDbEvent>();
  for (const ev of [...seasonEvents, ...pastEvents, ...nextEvents]) {
    if (!ev?.idEvent) continue;
    const existing = byId.get(ev.idEvent);
    if (!existing || richness(ev) > richness(existing)) {
      byId.set(ev.idEvent, ev);
    }
  }

  return [...byId.values()]
    .map(normalizeEvent)
    .filter((f): f is NormalizedFixture => f !== null);
}
