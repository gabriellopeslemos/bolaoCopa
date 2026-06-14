/**
 * Motor do Mata-mata — FUNDAÇÃO (funções puras, testáveis).
 *
 * Cobre o que é determinístico e independente de Firestore:
 *   - Fases do torneio e o mapeamento "rodada da Copa → fase".
 *   - Qualificatória: cálculo dos Seeds a partir dos pontos acumulados.
 *   - Fase de Grupos: sorteio em serpentina (snake) em grupos de 4.
 *   - Difficulty Score (definido e documentado; usado nas Eliminatórias).
 *
 * As fases avançam AUTOMATICAMENTE quando os jogos da fase terminam (a camada
 * de Cloud Functions chama estas funções). Os pontos zeram a cada fase.
 *
 * Próximas iterações (não inclusas aqui): persistência em
 * `groups/{groupId}/tournament/state`, gatilho em onMatchWrite, chaveamento das
 * Eliminatórias (Davi x Golias / Reencontro Adiado / Triplos vs Duelos),
 * Repescagem e Grande Final.
 */

/** Fases do mata-mata. Ao ENTRAR em cada fase, os pontos são zerados. */
export type TournamentPhase =
  | "qualifier" // Qualificatória — define os Seeds
  | "groups"    // Fase de Grupos — divisões de 4 (serpentina)
  | "knockout"  // Eliminatórias — chave principal (triplos/duelos)
  | "repechage" // Repescagem
  | "final"     // Grande Final
  | "done";

/**
 * Mapeia o campo `round` do jogo (texto vindo da API) para a "bucket" de fase
 * da Copa. "Pela rodada da Copa": a fase de grupos da Copa alimenta a
 * Qualificatória + Fase de Grupos do bolão; o mata-mata da Copa alimenta as
 * Eliminatórias; a final da Copa alimenta a Grande Final.
 *
 * É uma heurística sobre os rótulos comuns (TheSportsDB / PT-BR). É o ponto de
 * integração a validar contra os dados reais — ajuste os padrões se necessário.
 */
export type CupRound = "group" | "knockout" | "final";

export function cupRoundOf(round: string | undefined): CupRound {
  const r = (round ?? "").toLowerCase().trim();

  // Códigos numéricos do TheSportsDB (intRound): fase de grupos = rodadas
  // pequenas (1,2,3...); mata-mata usa códigos altos (125 = oitavas, 150 =
  // quartas, 160/170 = semis, 200 = final). É o ponto a validar com dados reais.
  if (r !== "" && /^\d+$/.test(r)) {
    const n = Number(r);
    if (n >= 200) return "final";
    if (n >= 100) return "knockout";
    return "group";
  }

  // Rótulos textuais. Eliminatórias primeiro: "Oitavas de FINAL"/"Semi-FINAL"
  // contêm "final".
  if (/semi|quarter|quartas|oitavas|round of 16|last 16|eighth|knockout|elimina/.test(r)) {
    return "knockout";
  }
  if (/\bfinal\b/.test(r)) return "final";
  // Fase de grupos (rótulos: "Group A", "Grupo C · Rodada 1", "Matchday 2"...).
  return "group";
}

/** Fase do MATA-MATA que um jogo alimenta (mais fino que CupRound). */
export type MatchTournamentPhase = "qualifier" | "groups" | "knockout" | "final";

/**
 * Extrai o número da rodada da fase de grupos, se houver:
 *   "Grupo A · Rodada 1" → 1 · "Matchday 2" → 2 · "3" → 3 · "Round of 16" → null.
 * Limita a 1..20 e ignora códigos de mata-mata (≥100, 3+ dígitos).
 */
export function groupMatchday(round: string | undefined): number | null {
  if (!round) return null;
  const m =
    round.match(/(?:rodada|matchday|round)\s*(\d+)/i) ?? round.match(/^\s*(\d{1,2})\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 20 ? n : null;
}

/**
 * Mapeia um jogo da Copa para a fase do mata-mata que ele alimenta.
 * Decisão "pela rodada da Copa": a 1ª rodada da fase de grupos é a
 * Qualificatória (define os Seeds); as demais rodadas de grupos são a Fase de
 * Grupos; o mata-mata da Copa alimenta as Eliminatórias; a final, a Grande Final.
 */
export function matchTournamentPhase(round: string | undefined): MatchTournamentPhase {
  const cup = cupRoundOf(round);
  if (cup === "knockout") return "knockout";
  if (cup === "final") return "final";
  return groupMatchday(round) === 1 ? "qualifier" : "groups";
}

/* ------------------------------------------------------------------ */
/* 1. Qualificatória — Seeds                                           */
/* ------------------------------------------------------------------ */

export interface SeedInput {
  uid: string;
  displayName?: string;
  /** Pontos acumulados na Qualificatória. */
  points: number;
  /** Critério de desempate (placares exatos na Qualificatória). */
  exactCount?: number;
}

export interface Seeded extends SeedInput {
  /** 1 = melhor (cabeça de chave nº 1). */
  seed: number;
}

/**
 * Calcula os Seeds: ordena por pontos (desc), desempata por placares exatos
 * (desc) e, por fim, por uid (asc, determinístico). Seed 1 é o mais forte.
 */
export function computeSeeds(participants: SeedInput[]): Seeded[] {
  return [...participants]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const ea = a.exactCount ?? 0;
      const eb = b.exactCount ?? 0;
      if (eb !== ea) return eb - ea;
      return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
    })
    .map((p, i) => ({ ...p, seed: i + 1 }));
}

/* ------------------------------------------------------------------ */
/* 2. Fase de Grupos — sorteio em serpentina                           */
/* ------------------------------------------------------------------ */

export interface DrawGroup {
  /** "A", "B", "C", ... */
  id: string;
  /** Membros na ordem em que entraram (do melhor seed ao pior do grupo). */
  members: Seeded[];
}

function groupLabel(i: number): string {
  // A..Z e depois A1, B1, ... (raro ter tantos grupos).
  return i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26)}`;
}

/**
 * Distribuição em serpentina (boustrophedon) por Seed em grupos de `groupSize`.
 *
 * Nº de grupos = ceil(N / groupSize). Os `numGroups` melhores seeds são os
 * cabeças de chave e caem em grupos DISTINTOS (linha 0). A cada "linha" o
 * sentido inverte (→, ←, →, ...), equilibrando a força total dos grupos.
 *
 * Ex.: 8 participantes, grupos de 4 → 2 grupos:
 *   seeds 1,2 (→) | 4,3 (←) | 5,6 (→) | 8,7 (←)
 *   Grupo A: 1,4,5,8   Grupo B: 2,3,6,7
 */
export function snakeDraw(seeded: Seeded[], groupSize = 4): DrawGroup[] {
  const ordered = [...seeded].sort((a, b) => a.seed - b.seed);
  const n = ordered.length;
  if (n === 0) return [];

  const numGroups = Math.max(1, Math.ceil(n / groupSize));
  const groups: DrawGroup[] = Array.from({ length: numGroups }, (_, i) => ({
    id: groupLabel(i),
    members: [],
  }));

  ordered.forEach((p, idx) => {
    const row = Math.floor(idx / numGroups);
    const col = idx % numGroups;
    const g = row % 2 === 0 ? col : numGroups - 1 - col;
    groups[g].members.push(p);
  });

  return groups;
}

/* ------------------------------------------------------------------ */
/* 3. Difficulty Score (usado nas Eliminatórias)                       */
/* ------------------------------------------------------------------ */

/**
 * Difficulty Score (definição adotada, ajustável): mede o quão difíceis foram
 * os adversários enfrentados. Cada adversário contribui com sua "força de seed"
 * = (N + 1 - seed), de modo que enfrentar o seed nº 1 vale N pontos e o pior
 * vale 1. Maior Difficulty Score = caminho mais duro → prioridade para cair em
 * confrontos Triplos (em vez de Duelos) nas Eliminatórias.
 */
export function difficultyScore(opponentSeeds: number[], totalParticipants: number): number {
  return opponentSeeds.reduce((sum, seed) => sum + (totalParticipants + 1 - seed), 0);
}

/* ------------------------------------------------------------------ */
/* 4. Eliminatórias — classificação pós-grupos e sorteio da 1ª rodada  */
/* ------------------------------------------------------------------ */

/** Participante classificado para a chave (ou lanterna, rumo à Repescagem). */
export interface QualifiedParticipant {
  uid: string;
  displayName?: string;
  /** Grupo de origem na Fase de Grupos. */
  groupId: string;
  /** Colocação no grupo (1 = primeiro). */
  placement: number;
  /** Seed da Qualificatória. */
  seed: number;
  /** Difficulty Score (força dos adversários do grupo). */
  difficulty: number;
}

export type Matchup =
  | { kind: "duel"; players: QualifiedParticipant[] }   // 1x1 — vencedor avança
  | { kind: "triple"; players: QualifiedParticipant[] }; // 3 jogam — 2 avançam

export interface KnockoutRound {
  /** 1 = primeira rodada das Eliminatórias. */
  round: number;
  matchups: Matchup[];
  /** true quando a chave principal terminou (sobrou ≤ 1 participante). */
  complete?: boolean;
}

/**
 * Classifica ao fim da Fase de Grupos: dentro de cada grupo sorteado, ordena por
 * pontos da fase (desc; desempate por melhor seed). Todos avançam, menos o
 * ÚLTIMO de cada grupo (lanterna), que vai para a Repescagem.
 */
export function classifyAfterGroups(
  groups: DrawGroup[],
  pointsByUid: Record<string, number>
): { qualified: QualifiedParticipant[]; repechage: QualifiedParticipant[] } {
  const N = groups.reduce((n, g) => n + g.members.length, 0);
  const qualified: QualifiedParticipant[] = [];
  const repechage: QualifiedParticipant[] = [];

  for (const g of groups) {
    const ranked = [...g.members].sort(
      (a, b) => (pointsByUid[b.uid] ?? 0) - (pointsByUid[a.uid] ?? 0) || a.seed - b.seed
    );
    ranked.forEach((m, i) => {
      const mates = ranked.filter((x) => x.uid !== m.uid).map((x) => x.seed);
      const p: QualifiedParticipant = {
        uid: m.uid,
        displayName: m.displayName,
        groupId: g.id,
        placement: i + 1,
        seed: m.seed,
        difficulty: difficultyScore(mates, N),
      };
      if (ranked.length > 1 && i === ranked.length - 1) repechage.push(p);
      else qualified.push(p);
    });
  }
  return { qualified, repechage };
}

const isPowerOfTwo = (n: number) => n >= 1 && (n & (n - 1)) === 0;

/**
 * Número de Triplos na 1ª rodada das Eliminatórias (regra adotada, ajustável):
 * o MENOR `t` (mesma paridade de M, com 3t ≤ M) que torne os sobreviventes
 * S = (M + t)/2 uma potência de 2 — assim a chave converge limpa para a final.
 * Se nenhum valor de S for potência de 2, usa o mínimo por paridade (M % 2).
 *
 * Lembrete: num Triplo 2 de 3 avançam (≈67%); num Duelo 1 de 2 (50%). Logo o
 * Triplo é o caminho mais fácil — por isso é o "prêmio" de quem teve grupo duro.
 */
export function triploCount(M: number): number {
  for (let t = M % 2; 3 * t <= M; t += 2) {
    if (isPowerOfTwo((M + t) / 2)) return t;
  }
  return M % 2;
}

function serpentine<T>(ordered: T[], numGroups: number): T[][] {
  const groups: T[][] = Array.from({ length: numGroups }, () => []);
  ordered.forEach((p, idx) => {
    const row = Math.floor(idx / numGroups);
    const col = idx % numGroups;
    groups[row % 2 === 0 ? col : numGroups - 1 - col].push(p);
  });
  return groups;
}

/** Custo de "reencontro": quantos jogadores a mais do que grupos distintos há no
 *  confronto. 0 = todos de grupos diferentes; 1 = um par do mesmo grupo; etc. */
const groupCost = (players: QualifiedParticipant[]) =>
  players.length - new Set(players.map((p) => p.groupId)).size;

/** Reencontro Adiado (best-effort): troca jogadores entre confrontos do mesmo
 *  tipo para reduzir rivais do mesmo grupo. Com poucos grupos pode ser
 *  impossível zerar (ex.: Triplo com só 2 grupos de origem), então minimiza. */
function avoidSameGroup(matchups: Matchup[]): void {
  for (let pass = 0; pass < matchups.length * 3 + 1; pass++) {
    let improved = false;
    for (let i = 0; i < matchups.length && !improved; i++) {
      for (let j = i + 1; j < matchups.length && !improved; j++) {
        if (matchups[i].kind !== matchups[j].kind) continue;
        const A = matchups[i].players;
        const B = matchups[j].players;
        for (let pi = 0; pi < A.length && !improved; pi++) {
          for (let pj = 0; pj < B.length && !improved; pj++) {
            const na = A.slice();
            const nb = B.slice();
            [na[pi], nb[pj]] = [nb[pj], na[pi]];
            const before = groupCost(A) + groupCost(B);
            const after = groupCost(na) + groupCost(nb);
            if (after < before) {
              matchups[i] = { kind: matchups[i].kind, players: na };
              matchups[j] = { kind: matchups[j].kind, players: nb };
              improved = true;
            }
          }
        }
      }
    }
    if (!improved) break;
  }
}

/**
 * Sorteio da 1ª rodada das Eliminatórias, aplicando as 3 regras:
 *  - Difficulty Score: os de maior dificuldade ganham os Triplos (caminho mais fácil).
 *  - Davi x Golias: dentro de cada confronto, pareia os mais fortes com os mais fracos.
 *  - Reencontro Adiado: evita (best-effort) rivais do mesmo grupo da fase anterior.
 *
 * "Força" (power) = colocação no grupo (1º > 2º > 3º), desempatada por melhor seed.
 */
/** Atalho para a 1ª rodada das Eliminatórias. */
export function drawKnockoutRound1(qualified: QualifiedParticipant[]): KnockoutRound {
  return drawKnockoutRound(qualified, 1);
}

/** Sorteia uma rodada das Eliminatórias (1ª ou seguintes) — mesma lógica e regras. */
export function drawKnockoutRound(qualified: QualifiedParticipant[], round: number): KnockoutRound {
  const M = qualified.length;
  if (M < 2) return { round, matchups: [] };

  const byPower = [...qualified].sort((a, b) => a.placement - b.placement || a.seed - b.seed);
  const powerRank = new Map(byPower.map((p, i) => [p.uid, i])); // 0 = mais forte
  const rank = (p: QualifiedParticipant) => powerRank.get(p.uid) ?? 0;

  const t = triploCount(M);
  const byDifficulty = [...qualified].sort(
    (a, b) => b.difficulty - a.difficulty || rank(a) - rank(b)
  );
  const triploPlayers = byDifficulty.slice(0, 3 * t).sort((a, b) => rank(a) - rank(b));
  const duelPlayers = byDifficulty.slice(3 * t).sort((a, b) => rank(a) - rank(b));

  const matchups: Matchup[] = [];
  // Triplos: serpentina por força → cada triplo recebe forte/médio/fraco (Davi x Golias).
  for (const grp of serpentine(triploPlayers, t)) {
    if (grp.length) matchups.push({ kind: "triple", players: grp });
  }
  // Duelos: mais forte contra mais fraco.
  for (let i = 0, j = duelPlayers.length - 1; i < j; i++, j--) {
    matchups.push({ kind: "duel", players: [duelPlayers[i], duelPlayers[j]] });
  }

  avoidSameGroup(matchups);
  return { round, matchups };
}

/* ------------------------------------------------------------------ */
/* Resolução de uma rodada das Eliminatórias                           */
/* ------------------------------------------------------------------ */

export interface KnockoutResolution {
  /** Quem avança, com o Difficulty Score já acrescido dos adversários da rodada. */
  survivors: QualifiedParticipant[];
  /** Perdedores de Duelos — vão para a Repescagem. */
  toRepechage: QualifiedParticipant[];
  /** Perdedores de Triplos — eliminados de vez (não vão à Repescagem). */
  eliminated: QualifiedParticipant[];
  results: { kind: "duel" | "triple"; advanced: string[]; out: string[] }[];
}

/**
 * Resolve uma rodada com os pontos de cada participante naquela rodada:
 *  - Duelo: o de maior pontuação avança; o perdedor vai à Repescagem.
 *  - Triplo: os 2 melhores avançam; o último é eliminado de vez.
 * Empate: melhor seed (menor) avança. O Difficulty Score de quem avança recebe
 * a força dos adversários que enfrentou na rodada (acumula ao longo da fase).
 */
export function resolveKnockoutRound(
  round: KnockoutRound,
  pointsByUid: Record<string, number>,
  totalParticipants: number
): KnockoutResolution {
  const survivors: QualifiedParticipant[] = [];
  const toRepechage: QualifiedParticipant[] = [];
  const eliminated: QualifiedParticipant[] = [];
  const results: KnockoutResolution["results"] = [];

  for (const m of round.matchups) {
    const ranked = [...m.players].sort(
      (a, b) => (pointsByUid[b.uid] ?? 0) - (pointsByUid[a.uid] ?? 0) || a.seed - b.seed
    );
    const slots = m.kind === "triple" ? 2 : 1;
    const advanced = ranked.slice(0, slots);
    const out = ranked.slice(slots);

    for (const a of advanced) {
      const add = m.players
        .filter((p) => p.uid !== a.uid)
        .reduce((s, o) => s + (totalParticipants + 1 - o.seed), 0);
      survivors.push({ ...a, difficulty: a.difficulty + add });
    }
    if (m.kind === "duel") toRepechage.push(...out);
    else eliminated.push(...out);

    results.push({ kind: m.kind, advanced: advanced.map((p) => p.uid), out: out.map((p) => p.uid) });
  }

  return { survivors, toRepechage, eliminated, results };
}

/* ------------------------------------------------------------------ */
/* Modelo de dados persistido (documentação da forma do estado)        */
/* ------------------------------------------------------------------ */

/** Estado do torneio, persistido em `groups/{groupId}/tournament/state`. */
export interface TournamentState {
  phase: TournamentPhase;
  /** Seeds definidos ao fim da Qualificatória (ausente antes disso). */
  seeds?: Seeded[];
  /** Grupos sorteados (serpentina) na Fase de Grupos. */
  groups?: DrawGroup[];
  /** Chave principal das Eliminatórias (a partir do fim da Fase de Grupos). */
  knockout?: KnockoutRound;
  /** Vencedor da chave principal (definido quando sobra 1) — vai à Grande Final. */
  mainBracketWinner?: QualifiedParticipant | null;
  /** Lanternas dos grupos + perdedores de Duelos, na Repescagem. */
  repechage?: QualifiedParticipant[];
  /** Epoch ms da última atualização. */
  updatedAt?: number;
}
