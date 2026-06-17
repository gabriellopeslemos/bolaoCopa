/**
 * Lógica de pontuação do Bolão da Copa.
 *
 * Função pura (sem dependências externas) compartilhada entre o app (preview do
 * potencial de pontos) e as Cloud Functions (cálculo oficial), garantindo que
 * cliente e servidor pontuem exatamente igual.
 *
 * Regras (cumulativas) conforme a tela "Pontos Base":
 *   - Base: 3 pts por acertar o vencedor (ou o empate)
 *   - Bônus Placar Exato:    +5  (acertou os gols dos dois times)
 *   - Bônus Placar Vencedor: +3  (acertou os gols do time vencedor) — só se NÃO acertou o placar exato
 *   - Bônus Diferença de Gols: +2 (acertou o saldo/margem da partida) — só se NÃO acertou o placar exato
 *   - Bônus Placar Perdedor: +1  (acertou os gols do time perdedor) — só se NÃO acertou o placar exato
 *   - Bônus Goleada (extra): +1  (foi goleada e você também previu goleada)
 *
 * Os bônus Placar Vencedor, Diferença de Gols e Placar Perdedor são
 * mutuamente exclusivos com o Placar Exato.
 * Todos os bônus exigem ter acertado o vencedor (resultado 1/X/2). Se o
 * resultado previsto for de lado diferente do real, o palpite vale 0.
 */

export interface Score {
  /** Gols do mandante (time da casa). */
  home: number;
  /** Gols do visitante. */
  away: number;
}

export type Outcome = "home" | "away" | "draw";

export interface ScoringConfig {
  /** Pontos por acertar o vencedor/empate. */
  base: number;
  /** Bônus por acertar o placar exato. */
  exact: number;
  /** Bônus por acertar os gols do time vencedor. */
  winnerScore: number;
  /** Bônus por acertar a diferença de gols (saldo). */
  goalDiff: number;
  /** Bônus por acertar os gols do time perdedor. */
  loserScore: number;
  /** Bônus extra de goleada. */
  rout: number;
  /** Diferença de gols (margem) mínima para ser considerada goleada. */
  routThreshold: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  base: 3,
  exact: 5,
  winnerScore: 3,
  goalDiff: 2,
  loserScore: 1,
  rout: 1,
  routThreshold: 4,
};

export interface PointsBreakdown {
  base: number;
  exact: number;
  winnerScore: number;
  goalDiff: number;
  loserScore: number;
  rout: number;
}

export interface PointsResult {
  total: number;
  /** Pontos por categoria, para exibir detalhamento na UI. */
  breakdown: PointsBreakdown;
  /** Se o palpite acertou o vencedor/empate. */
  correctOutcome: boolean;
  /** Se acertou o placar exato. */
  exact: boolean;
}

const emptyBreakdown = (): PointsBreakdown => ({
  base: 0,
  exact: 0,
  winnerScore: 0,
  goalDiff: 0,
  loserScore: 0,
  rout: 0,
});

/** Resultado 1/X/2 a partir de um placar. */
export function outcome(score: Score): Outcome {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}

function isValidScore(s: Score | null | undefined): s is Score {
  return (
    !!s &&
    Number.isInteger(s.home) &&
    Number.isInteger(s.away) &&
    s.home >= 0 &&
    s.away >= 0
  );
}

/**
 * Calcula os pontos de um palpite contra o resultado real.
 *
 * @param bet     Placar previsto pelo participante.
 * @param result  Placar real (final) da partida.
 * @param config  Configuração de pontos (default = regra da tela).
 */
export function calculatePoints(
  bet: Score,
  result: Score,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): PointsResult {
  const breakdown = emptyBreakdown();

  if (!isValidScore(bet) || !isValidScore(result)) {
    return { total: 0, breakdown, correctOutcome: false, exact: false };
  }

  const correctOutcome = outcome(bet) === outcome(result);
  if (!correctOutcome) {
    return { total: 0, breakdown, correctOutcome: false, exact: false };
  }

  // Acertou o vencedor/empate → pontos base.
  breakdown.base = config.base;

  const exact = bet.home === result.home && bet.away === result.away;
  if (exact) {
    breakdown.exact = config.exact;
  } else {
    // Diferença de gols com sinal (já implica vencedor correto).
    if (bet.home - bet.away === result.home - result.away) {
      breakdown.goalDiff = config.goalDiff;
    }

    const draw = outcome(result) === "draw";
    if (!draw) {
      const resWinnerGoals = Math.max(result.home, result.away);
      const resLoserGoals = Math.min(result.home, result.away);
      const betWinnerGoals = Math.max(bet.home, bet.away);
      const betLoserGoals = Math.min(bet.home, bet.away);

      if (betWinnerGoals === resWinnerGoals) breakdown.winnerScore = config.winnerScore;
      if (betLoserGoals === resLoserGoals) breakdown.loserScore = config.loserScore;
    }
  }

  const draw = outcome(result) === "draw";
  if (!draw) {
    const resMargin = Math.abs(result.home - result.away);
    const betMargin = Math.abs(bet.home - bet.away);
    if (resMargin >= config.routThreshold && betMargin >= config.routThreshold) {
      breakdown.rout = config.rout;
    }
  }

  const total =
    breakdown.base +
    breakdown.exact +
    breakdown.winnerScore +
    breakdown.goalDiff +
    breakdown.loserScore +
    breakdown.rout;

  return { total, breakdown, correctOutcome: true, exact };
}

/** Pontuação máxima possível para um palpite (acerto de placar exato). */
export function maxPossiblePoints(
  bet: Score,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  if (!isValidScore(bet)) return 0;
  return calculatePoints(bet, bet, config).total;
}

/* Mata-mata — fundação do motor de torneio. */
export * from "./tournament";
