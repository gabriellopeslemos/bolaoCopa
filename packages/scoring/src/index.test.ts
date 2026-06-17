import { describe, it, expect } from "vitest";
import {
  calculatePoints,
  maxPossiblePoints,
  outcome,
  DEFAULT_SCORING_CONFIG,
} from "./index";

describe("outcome", () => {
  it("identifica vitória do mandante, visitante e empate", () => {
    expect(outcome({ home: 2, away: 1 })).toBe("home");
    expect(outcome({ home: 0, away: 3 })).toBe("away");
    expect(outcome({ home: 1, away: 1 })).toBe("draw");
  });
});

describe("calculatePoints — base", () => {
  it("zera quando erra o vencedor", () => {
    const r = calculatePoints({ home: 0, away: 1 }, { home: 2, away: 0 });
    expect(r.total).toBe(0);
    expect(r.correctOutcome).toBe(false);
  });

  it("dá apenas a base quando acerta o vencedor mas erra todo o resto", () => {
    // Palpite 1x0 (margem 1), resultado 3x1 (margem 2): acerta só o vencedor.
    const r = calculatePoints({ home: 1, away: 0 }, { home: 3, away: 1 });
    expect(r.breakdown.base).toBe(3);
    expect(r.breakdown.exact).toBe(0);
    expect(r.breakdown.winnerScore).toBe(0);
    expect(r.breakdown.goalDiff).toBe(0);
    expect(r.breakdown.loserScore).toBe(0);
    expect(r.total).toBe(3);
  });
});

describe("calculatePoints — bônus isolados", () => {
  it("placar exato dá base + exato (sem acumular os outros bônus)", () => {
    // 2x1 exato: base3 + exato5 = 8 (vencedor/saldo/perdedor não acumulam com exato)
    const r = calculatePoints({ home: 2, away: 1 }, { home: 2, away: 1 });
    expect(r.exact).toBe(true);
    expect(r.total).toBe(8);
    expect(r.breakdown).toEqual({
      base: 3,
      exact: 5,
      winnerScore: 0,
      goalDiff: 0,
      loserScore: 0,
      rout: 0,
    });
  });

  it("acerta gols do vencedor mas não do perdedor", () => {
    // Palpite 2x0, resultado 2x1: vencedor(2) certo, saldo errado, perdedor errado.
    const r = calculatePoints({ home: 2, away: 0 }, { home: 2, away: 1 });
    expect(r.breakdown.base).toBe(3);
    expect(r.breakdown.winnerScore).toBe(3);
    expect(r.breakdown.goalDiff).toBe(0);
    expect(r.breakdown.loserScore).toBe(0);
    expect(r.total).toBe(6);
  });

  it("acerta a diferença de gols mas não o placar exato", () => {
    // Palpite 2x1 (saldo +1), resultado 3x2 (saldo +1): vencedor errado, perdedor errado, saldo certo.
    const r = calculatePoints({ home: 2, away: 1 }, { home: 3, away: 2 });
    expect(r.breakdown.base).toBe(3);
    expect(r.breakdown.goalDiff).toBe(2);
    expect(r.breakdown.winnerScore).toBe(0);
    expect(r.breakdown.loserScore).toBe(0);
    expect(r.total).toBe(5);
  });

  it("acerta gols do perdedor mas não do vencedor", () => {
    // Palpite 1x0, resultado 3x0: perdedor(0) certo, vencedor errado, saldo errado.
    const r = calculatePoints({ home: 1, away: 0 }, { home: 3, away: 0 });
    expect(r.breakdown.base).toBe(3);
    expect(r.breakdown.loserScore).toBe(1);
    expect(r.breakdown.winnerScore).toBe(0);
    expect(r.breakdown.goalDiff).toBe(0);
    expect(r.total).toBe(4);
  });
});

describe("calculatePoints — goleada", () => {
  it("dá bônus de goleada quando ambos têm margem >= limiar", () => {
    // Palpite 5x0 (margem 5), resultado 4x0 (margem 4): vencedor errado,
    // perdedor(0) certo, saldo errado, mas ambos são goleada (>=4).
    const r = calculatePoints({ home: 5, away: 0 }, { home: 4, away: 0 });
    expect(r.breakdown.rout).toBe(DEFAULT_SCORING_CONFIG.rout);
    expect(r.breakdown.loserScore).toBe(1);
    expect(r.total).toBe(3 + 1 + 1); // base + perdedor + goleada
  });

  it("não dá goleada quando o palpite não previu goleada", () => {
    // Palpite 1x0 (margem 1), resultado 4x0 (margem 4).
    const r = calculatePoints({ home: 1, away: 0 }, { home: 4, away: 0 });
    expect(r.breakdown.rout).toBe(0);
  });

  it("placar exato de goleada dá base + exato + goleada", () => {
    // 4x0 exato: base3 + exato5 + goleada1 = 9 (vencedor/saldo/perdedor não acumulam)
    const r = calculatePoints({ home: 4, away: 0 }, { home: 4, away: 0 });
    expect(r.total).toBe(9);
  });
});

describe("calculatePoints — empates", () => {
  it("acertar empate dá base + saldo (saldo 0)", () => {
    // Palpite 0x0, resultado 2x2: empate certo, saldo 0 certo, sem exato.
    const r = calculatePoints({ home: 0, away: 0 }, { home: 2, away: 2 });
    expect(r.correctOutcome).toBe(true);
    expect(r.breakdown.base).toBe(3);
    expect(r.breakdown.goalDiff).toBe(2);
    expect(r.breakdown.winnerScore).toBe(0);
    expect(r.breakdown.loserScore).toBe(0);
    expect(r.total).toBe(5);
  });

  it("empate exato dá base + exato (sem saldo)", () => {
    // 1x1 exato: base3 + exato5 = 8 (saldo não acumula com exato)
    const r = calculatePoints({ home: 1, away: 1 }, { home: 1, away: 1 });
    expect(r.total).toBe(8);
  });
});

describe("calculatePoints — entradas inválidas", () => {
  it("zera com gols negativos ou não inteiros", () => {
    expect(calculatePoints({ home: -1, away: 0 }, { home: 1, away: 0 }).total).toBe(0);
    expect(calculatePoints({ home: 1.5, away: 0 }, { home: 1, away: 0 }).total).toBe(0);
  });
});

describe("maxPossiblePoints", () => {
  it("retorna o total de um acerto exato do próprio palpite", () => {
    expect(maxPossiblePoints({ home: 2, away: 1 })).toBe(8);
    expect(maxPossiblePoints({ home: 4, away: 0 })).toBe(9); // com goleada
    expect(maxPossiblePoints({ home: 1, away: 1 })).toBe(8); // empate
  });
});
