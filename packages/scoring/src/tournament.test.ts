import { describe, it, expect } from "vitest";
import {
  cupRoundOf,
  groupMatchday,
  matchTournamentPhase,
  computeSeeds,
  snakeDraw,
  difficultyScore,
  classifyAfterGroups,
  triploCount,
  drawKnockoutRound1,
  drawKnockoutRound,
  resolveKnockoutRound,
  resolveRepechageRound,
  resolveFinal,
  type SeedInput,
  type DrawGroup,
  type QualifiedParticipant,
  type KnockoutRound,
} from "./tournament";

describe("cupRoundOf", () => {
  it("classifica fase de grupos", () => {
    expect(cupRoundOf("Group A")).toBe("group");
    expect(cupRoundOf("Grupo C")).toBe("group");
    expect(cupRoundOf("Matchday 2")).toBe("group");
    expect(cupRoundOf("1")).toBe("group");
    expect(cupRoundOf(undefined)).toBe("group");
  });

  it("classifica eliminatórias", () => {
    expect(cupRoundOf("Round of 16")).toBe("knockout");
    expect(cupRoundOf("Quarter-final")).toBe("knockout");
    expect(cupRoundOf("Semi-final")).toBe("knockout");
    expect(cupRoundOf("Oitavas de final")).toBe("knockout");
  });

  it("classifica a final (sem confundir com semi/quartas)", () => {
    expect(cupRoundOf("Final")).toBe("final");
    expect(cupRoundOf("Grande Final")).toBe("final");
    expect(cupRoundOf("Semi-final")).not.toBe("final");
  });

  it("entende os códigos numéricos do TheSportsDB (intRound)", () => {
    expect(cupRoundOf("1")).toBe("group");
    expect(cupRoundOf("3")).toBe("group");
    expect(cupRoundOf("125")).toBe("knockout"); // oitavas
    expect(cupRoundOf("150")).toBe("knockout"); // quartas
    expect(cupRoundOf("200")).toBe("final");
  });
});

describe("groupMatchday", () => {
  it("extrai o número da rodada de grupos", () => {
    expect(groupMatchday("Grupo A · Rodada 1")).toBe(1);
    expect(groupMatchday("Matchday 2")).toBe(2);
    expect(groupMatchday("3")).toBe(3);
  });
  it("ignora mata-mata e textos sem rodada", () => {
    expect(groupMatchday("Round of 16")).toBeNull();
    expect(groupMatchday("125")).toBeNull();
    expect(groupMatchday(undefined)).toBeNull();
  });
});

describe("matchTournamentPhase", () => {
  it("1ª rodada da fase de grupos = Qualificatória", () => {
    expect(matchTournamentPhase("Grupo A · Rodada 1")).toBe("qualifier");
    expect(matchTournamentPhase("1")).toBe("qualifier");
  });
  it("demais rodadas de grupos = Fase de Grupos", () => {
    expect(matchTournamentPhase("Grupo A · Rodada 2")).toBe("groups");
    expect(matchTournamentPhase("3")).toBe("groups");
  });
  it("mata-mata e final", () => {
    expect(matchTournamentPhase("Round of 16")).toBe("knockout");
    expect(matchTournamentPhase("125")).toBe("knockout");
    expect(matchTournamentPhase("Final")).toBe("final");
    expect(matchTournamentPhase("200")).toBe("final");
  });
});

describe("computeSeeds", () => {
  const base: SeedInput[] = [
    { uid: "c", points: 10 },
    { uid: "a", points: 30 },
    { uid: "b", points: 20 },
  ];

  it("ordena por pontos desc e atribui seed 1 ao melhor", () => {
    const s = computeSeeds(base);
    expect(s.map((x) => x.uid)).toEqual(["a", "b", "c"]);
    expect(s.map((x) => x.seed)).toEqual([1, 2, 3]);
  });

  it("desempata por placares exatos e depois por uid", () => {
    const s = computeSeeds([
      { uid: "z", points: 10, exactCount: 1 },
      { uid: "y", points: 10, exactCount: 3 },
      { uid: "x", points: 10, exactCount: 1 },
    ]);
    expect(s.map((x) => x.uid)).toEqual(["y", "x", "z"]);
  });

  it("não muta a entrada", () => {
    const input = [...base];
    computeSeeds(input);
    expect(input).toEqual(base);
  });
});

describe("snakeDraw", () => {
  function seeds(n: number) {
    return computeSeeds(
      Array.from({ length: n }, (_, i) => ({ uid: `p${i + 1}`, points: 1000 - i }))
    );
  }

  it("8 participantes em grupos de 4 → 2 grupos equilibrados (serpentina)", () => {
    const groups = snakeDraw(seeds(8), 4);
    expect(groups.map((g) => g.id)).toEqual(["A", "B"]);
    expect(groups[0].members.map((m) => m.seed)).toEqual([1, 4, 5, 8]);
    expect(groups[1].members.map((m) => m.seed)).toEqual([2, 3, 6, 7]);
  });

  it("os cabeças de chave caem em grupos distintos", () => {
    const groups = snakeDraw(seeds(12), 4); // 3 grupos → 3 cabeças
    const heads = groups.map((g) => g.members[0].seed).sort((a, b) => a - b);
    expect(heads).toEqual([1, 2, 3]);
  });

  it("número de grupos = ceil(N/groupSize) e cobre todos", () => {
    const groups = snakeDraw(seeds(10), 4);
    expect(groups.length).toBe(3);
    const total = groups.reduce((n, g) => n + g.members.length, 0);
    expect(total).toBe(10);
  });

  it("lista vazia → nenhum grupo", () => {
    expect(snakeDraw([], 4)).toEqual([]);
  });
});

describe("difficultyScore", () => {
  it("enfrentar seeds altos (nº 1) pesa mais", () => {
    const N = 8;
    // Enfrentou os seeds 1 e 2 → (8+1-1) + (8+1-2) = 8 + 7 = 15.
    expect(difficultyScore([1, 2], N)).toBe(15);
    // Enfrentou os seeds 7 e 8 → 2 + 1 = 3.
    expect(difficultyScore([7, 8], N)).toBe(3);
  });

  it("sem adversários → 0", () => {
    expect(difficultyScore([], 8)).toBe(0);
  });
});

describe("classifyAfterGroups", () => {
  // 2 grupos de 4; seeds 1..8 distribuídos.
  const groups: DrawGroup[] = [
    { id: "A", members: [1, 4, 5, 8].map((s) => ({ uid: `u${s}`, displayName: `P${s}`, points: 0, seed: s })) },
    { id: "B", members: [2, 3, 6, 7].map((s) => ({ uid: `u${s}`, displayName: `P${s}`, points: 0, seed: s })) },
  ];
  // Pontos da fase de grupos (maior = melhor colocado).
  const points: Record<string, number> = {
    u1: 30, u4: 20, u5: 10, u8: 5, // Grupo A: u8 é lanterna
    u2: 25, u3: 18, u6: 12, u7: 4, // Grupo B: u7 é lanterna
  };

  it("classifica todos menos o último de cada grupo", () => {
    const { qualified, repechage } = classifyAfterGroups(groups, points);
    expect(qualified.length).toBe(6);
    expect(repechage.map((p) => p.uid).sort()).toEqual(["u7", "u8"]);
  });

  it("registra colocação e Difficulty Score dos adversários do grupo", () => {
    const { qualified } = classifyAfterGroups(groups, points);
    const u1 = qualified.find((p) => p.uid === "u1")!;
    expect(u1.placement).toBe(1);
    // adversários do u1 no grupo A: seeds 4,5,8 → (8+1-4)+(8+1-5)+(8+1-8) = 5+4+1 = 10
    expect(u1.difficulty).toBe(10);
  });
});

describe("triploCount", () => {
  it("escolhe t que torna os sobreviventes potência de 2", () => {
    expect(triploCount(8)).toBe(0);  // 4 duelos → 4 sobreviventes
    expect(triploCount(6)).toBe(2);  // 2 triplos → 4 sobreviventes
    expect(triploCount(12)).toBe(4); // 4 triplos → 8 sobreviventes
  });
  it("cai no mínimo por paridade quando não há potência de 2", () => {
    expect(triploCount(9)).toBe(1); // ímpar precisa de ao menos 1 triplo
  });
});

describe("drawKnockoutRound1", () => {
  function qualified(n: number): QualifiedParticipant[] {
    // n participantes em grupos de 3 fictícios, seeds 1..n.
    return Array.from({ length: n }, (_, i) => ({
      uid: `u${i + 1}`,
      groupId: String.fromCharCode(65 + Math.floor(i / 3)),
      placement: (i % 3) + 1,
      seed: i + 1,
      difficulty: n - i, // os primeiros têm maior dificuldade
    }));
  }

  it("usa só duelos quando M leva a uma chave limpa (M=8)", () => {
    const r = drawKnockoutRound1(qualified(8));
    expect(r.matchups.every((m) => m.kind === "duel")).toBe(true);
    expect(r.matchups.length).toBe(4);
  });

  it("inclui cada participante exatamente uma vez", () => {
    const r = drawKnockoutRound1(qualified(6));
    const uids = r.matchups.flatMap((m) => m.players.map((p) => p.uid)).sort();
    expect(uids).toEqual(["u1", "u2", "u3", "u4", "u5", "u6"]);
  });

  it("dá Triplos aos de maior Difficulty Score (M=6 → 2 triplos)", () => {
    const r = drawKnockoutRound1(qualified(6));
    expect(r.matchups.filter((m) => m.kind === "triple").length).toBe(2);
    expect(r.matchups.every((m) => m.kind === "triple")).toBe(true);
  });

  it("Reencontro Adiado: com 3 grupos, os Triplos ficam sem repetição de grupo", () => {
    // 6 classificados, 3 grupos (A,B,C) com 2 cada → 2 Triplos de 3.
    const players: QualifiedParticipant[] = [];
    ["A", "B", "C"].forEach((g, gi) => {
      for (let k = 0; k < 2; k++) {
        players.push({ uid: `${g}${k}`, groupId: g, placement: k + 1, seed: gi * 2 + k + 1, difficulty: 1 });
      }
    });
    const r = drawKnockoutRound1(players);
    expect(r.matchups.every((m) => m.kind === "triple")).toBe(true);
    for (const m of r.matchups) {
      const gids = new Set(m.players.map((p) => p.groupId));
      expect(gids.size).toBe(m.players.length); // 3 grupos distintos por triplo
    }
  });

  it("Reencontro Adiado: evita rivais do mesmo grupo nos duelos", () => {
    // 4 jogadores, 2 grupos (A,B) → deve dar 2 duelos sem repetir grupo.
    const players: QualifiedParticipant[] = [
      { uid: "a1", groupId: "A", placement: 1, seed: 1, difficulty: 1 },
      { uid: "a2", groupId: "A", placement: 2, seed: 4, difficulty: 1 },
      { uid: "b1", groupId: "B", placement: 1, seed: 2, difficulty: 1 },
      { uid: "b2", groupId: "B", placement: 2, seed: 3, difficulty: 1 },
    ];
    const r = drawKnockoutRound1(players);
    for (const m of r.matchups) {
      const gids = m.players.map((p) => p.groupId);
      expect(new Set(gids).size).toBe(gids.length);
    }
  });
});

describe("resolveKnockoutRound", () => {
  const p = (uid: string, seed: number, difficulty = 0): QualifiedParticipant =>
    ({ uid, groupId: "X", placement: 1, seed, difficulty });

  it("Duelo: vencedor avança, perdedor vai à Repescagem", () => {
    const round: KnockoutRound = { round: 1, matchups: [{ kind: "duel", players: [p("a", 1), p("b", 2)] }] };
    const res = resolveKnockoutRound(round, { a: 10, b: 5 }, 8);
    expect(res.survivors.map((x) => x.uid)).toEqual(["a"]);
    expect(res.toRepechage.map((x) => x.uid)).toEqual(["b"]);
    expect(res.eliminated).toEqual([]);
  });

  it("Triplo: 2 avançam, o último é eliminado (não vai à Repescagem)", () => {
    const round: KnockoutRound = {
      round: 1,
      matchups: [{ kind: "triple", players: [p("a", 1), p("b", 2), p("c", 3)] }],
    };
    const res = resolveKnockoutRound(round, { a: 10, b: 8, c: 3 }, 8);
    expect(res.survivors.map((x) => x.uid).sort()).toEqual(["a", "b"]);
    expect(res.eliminated.map((x) => x.uid)).toEqual(["c"]);
    expect(res.toRepechage).toEqual([]);
  });

  it("empate resolve pelo melhor seed", () => {
    const round: KnockoutRound = { round: 1, matchups: [{ kind: "duel", players: [p("a", 5), p("b", 2)] }] };
    const res = resolveKnockoutRound(round, { a: 7, b: 7 }, 8);
    expect(res.survivors.map((x) => x.uid)).toEqual(["b"]); // seed 2 < 5
  });

  it("acumula Difficulty Score com a força dos adversários enfrentados", () => {
    const round: KnockoutRound = { round: 1, matchups: [{ kind: "duel", players: [p("a", 1, 5), p("b", 3)] }] };
    const res = resolveKnockoutRound(round, { a: 10, b: 1 }, 8);
    // adversário b tem seed 3 → força (8+1-3)=6; difficulty de 'a' = 5 + 6 = 11.
    expect(res.survivors[0].difficulty).toBe(11);
  });

  it("encadeia rodadas: 4 duelos → 4 sobreviventes → próxima rodada", () => {
    const players = Array.from({ length: 8 }, (_, i) => p(`u${i + 1}`, i + 1));
    const r1 = drawKnockoutRound(players, 1);
    const pts = Object.fromEntries(players.map((x, i) => [x.uid, 100 - i])); // u1 melhor
    const res = resolveKnockoutRound(r1, pts, 8);
    expect(res.survivors.length).toBe(4);
    const r2 = drawKnockoutRound(res.survivors, 2);
    expect(r2.round).toBe(2);
    expect(r2.matchups.flatMap((m) => m.players).length).toBe(4);
  });
});

describe("resolveRepechageRound", () => {
  const p = (uid: string, seed: number): QualifiedParticipant =>
    ({ uid, groupId: "X", placement: 1, seed, difficulty: 0 });

  it("elimina a metade de baixo (sobra ceil(n/2))", () => {
    const contenders = [p("a", 1), p("b", 2), p("c", 3), p("d", 4)];
    const { survivors, eliminated } = resolveRepechageRound(contenders, {
      a: 10, b: 8, c: 5, d: 1,
    });
    expect(survivors.map((x) => x.uid)).toEqual(["a", "b"]);
    expect(eliminated.map((x) => x.uid)).toEqual(["c", "d"]);
  });

  it("ímpar: sobra um a mais (ceil) — n=3 mantém 2", () => {
    const { survivors, eliminated } = resolveRepechageRound(
      [p("a", 1), p("b", 2), p("c", 3)],
      { a: 5, b: 9, c: 1 }
    );
    expect(survivors.map((x) => x.uid)).toEqual(["b", "a"]);
    expect(eliminated.map((x) => x.uid)).toEqual(["c"]);
  });

  it("empate na pontuação resolve pelo melhor seed", () => {
    const { survivors } = resolveRepechageRound([p("a", 5), p("b", 2)], { a: 7, b: 7 });
    expect(survivors.map((x) => x.uid)).toEqual(["b"]); // seed 2 < 5
  });

  it("1 contendor → ele mesmo sobrevive (é o vencedor da repescagem)", () => {
    const { survivors, eliminated } = resolveRepechageRound([p("a", 1)], {});
    expect(survivors.map((x) => x.uid)).toEqual(["a"]);
    expect(eliminated).toEqual([]);
  });

  it("converge até sobrar 1 ao longo das rodadas", () => {
    let pool = [p("a", 1), p("b", 2), p("c", 3), p("d", 4), p("e", 5)];
    // 5 → 3 → 2 → 1
    const rounds = [3, 2, 1];
    for (const expected of rounds) {
      pool = resolveRepechageRound(
        pool,
        Object.fromEntries(pool.map((x, i) => [x.uid, pool.length - i]))
      ).survivors;
      expect(pool.length).toBe(expected);
    }
  });
});

describe("resolveFinal", () => {
  const p = (uid: string, seed: number): QualifiedParticipant =>
    ({ uid, groupId: "X", placement: 1, seed, difficulty: 0 });

  it("o de maior pontuação é o campeão; o outro, vice", () => {
    const { champion, runnerUp } = resolveFinal([p("a", 2), p("b", 1)], { a: 12, b: 9 });
    expect(champion?.uid).toBe("a");
    expect(runnerUp?.uid).toBe("b");
  });

  it("empate resolve pelo melhor seed", () => {
    const { champion } = resolveFinal([p("a", 5), p("b", 3)], { a: 8, b: 8 });
    expect(champion?.uid).toBe("b");
  });

  it("um único finalista é campeão direto", () => {
    const { champion, runnerUp } = resolveFinal([p("a", 1)], {});
    expect(champion?.uid).toBe("a");
    expect(runnerUp).toBeNull();
  });

  it("sem finalistas → sem campeão", () => {
    expect(resolveFinal([], {})).toEqual({ champion: null, runnerUp: null });
  });
});
