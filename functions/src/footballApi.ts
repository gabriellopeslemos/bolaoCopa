/**
 * Client mínimo da API-Football (api-sports.io) para buscar os jogos e
 * placares da Copa do Mundo.
 *
 * O app NUNCA chama esta API diretamente — apenas as Cloud Functions, que
 * guardam o resultado no Firestore. A chave fica em um secret (FOOTBALL_API_KEY).
 *
 * Docs: https://www.api-football.com/documentation-v3
 * League id da Copa do Mundo (FIFA World Cup) na API-Football = 1.
 */

const BASE_URL = "https://v3.football.api-sports.io";

export interface ApiFixture {
  fixture: {
    id: number;
    date: string; // ISO
    status: { short: string }; // NS, 1H, HT, 2H, FT, AET, PEN ...
  };
  league: { id: number; season: number; round: string };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
}

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

export function mapStatus(short: string): "scheduled" | "live" | "finished" {
  if (FINISHED_STATUSES.has(short)) return "finished";
  if (LIVE_STATUSES.has(short)) return "live";
  return "scheduled";
}

export async function fetchFixtures(params: {
  apiKey: string;
  league: number;
  season: number;
}): Promise<ApiFixture[]> {
  const url = `${BASE_URL}/fixtures?league=${params.league}&season=${params.season}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": params.apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });

  if (!res.ok) {
    throw new Error(`API-Football HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { response?: ApiFixture[]; errors?: unknown };
  if (json.errors && Object.keys(json.errors as object).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }
  return json.response ?? [];
}
