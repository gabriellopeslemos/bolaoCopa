---
name: mata-mata-engine
description: Decisões de arquitetura e progresso do motor de torneio "Mata-mata" do bolão
metadata:
  type: project
---

Feature grande, construída em fases. Decisões acordadas com o usuário (2026-06-14):

- **Avanço de fases:** AUTOMÁTICO ao fim dos jogos da fase (gatilho via Cloud Function, provavelmente estendendo `onMatchWrite`).
- **Jogos→fases:** mapeado pela RODADA da Copa (fase de grupos da Copa → Qualificatória+Grupos; mata-mata da Copa → Eliminatórias; final → Grande Final).
- **Construção:** por fases, começando pela fundação.
- **Algoritmos em aberto (Difficulty Score, Triplo vs Duelo):** eu defino padrões razoáveis e documento; usuário ajusta depois.

Fases (pontos zeram a cada fase): Qualificatória(Seed) → Fase de Grupos(serpentina, divisões de 4) → Eliminatórias(Davi x Golias, Reencontro Adiado, Difficulty Score define Triplo/Duelo) → Repescagem → Grande Final.

**Fundação:** funções puras testadas em `packages/scoring/src/tournament.ts` — `cupRoundOf` (texto e códigos numéricos do intRound), `groupMatchday`, `matchTournamentPhase` (matchday 1 = Qualificatória), `computeSeeds`, `snakeDraw` (boustrophedon, cabeças em grupos distintos), `difficultyScore` (= Σ (N+1-seed) dos adversários), interface `TournamentState`.

**Fatia 1 (feita):** `progressQualifierAllGroups` — Qualificatória completa → Seeds + serpentina, grava `tournament/state` (phase "qualifier"→"groups"). Gatilho em `onMatchWrite`; callable admin `progressTournamentNow`. Regra: cliente lê `tournament/*`, escrita só Admin. App: hook `useTournament`; Ranking usa grupos sorteados; Mata-mata mostra Seeds+grupos.

**Fatia 2 (feita):** (A) RESET por fase — `scoreMatch` grava `member.phasePoints[matchPhase] += delta` (bucket por fase via `matchTournamentPhase(round)`); Ranking lê `phasePoints[fase atual]`. (B) Grupos→Eliminatórias — `progressGroupsToKnockoutAllGroups` (gatilho onMatchWrite quando jogos de "groups" terminam): `classifyAfterGroups` (todos menos o último de cada grupo; lanternas→repescagem) + `drawKnockoutRound1` (Triplos aos de maior Difficulty Score; Davi×Golias por serpentina de força; Reencontro Adiado best-effort via `groupCost`). Estado ganhou `knockout: KnockoutRound` e `repechage: QualifiedParticipant[]`. App: Mata-mata renderiza a chave (Triplo/Duelo) + repescagem. NB: com só 2 grupos é impossível zerar reencontro num Triplo (pigeonhole) — minimiza.

**Fatia 3 (feita):** rodadas seguintes das Eliminatórias. `resolveKnockoutRound` (Duelo: maior ponto avança, perdedor→repescagem; Triplo: 2 avançam, último eliminado de vez; empate por melhor seed; Difficulty Score acumula a força dos adversários da rodada). `drawKnockoutRound(participants, round)` genérico (drawKnockoutRound1 = round 1). Server `progressKnockoutAllGroups`: mapeia bolão-round r ↔ r-ésima rodada de mata-mata da Copa (`orderedCupKnockoutRounds`, ordenadas por kickoff); resolve com os pontos dos palpites daquela rodada; loop interno avança várias rodadas prontas. Estado: `KnockoutRound.complete`, `mainBracketWinner`. Gatilho onMatchWrite phase "knockout". UI mostra vencedor da chave. NB: bolão-rounds > rodadas de mata-mata da Copa disponíveis → trava (limitação). Bug corrigido: `complete` flag evita loop infinito em chave vazia (grupo de 1 membro).

**Fatia 4 (feita):** Repescagem + Grande Final. DECISÃO de design: a Repescagem corre **em PARALELO** à chave principal, consumindo as MESMAS rodadas de mata-mata da Copa (motivo: a Copa tem poucas rodadas de mata-mata; sequencial não sobraria jogo p/ pontuar a repescagem). Funções puras testadas: `resolveRepechageRound` (todos-contra-todos por pontos da rodada; elimina metade de baixo, sobra ceil(n/2); empate por melhor seed) e `resolveFinal` (campeão = maior pontuação na Final da Copa; vice = 2º). Server: `advanceOneCupKnockoutRound` (renomeada de advanceOneKnockoutRound) avança chave principal E repescagem juntas, 1 por rodada da Copa, idempotente via `cupRoundsDone`; perdedores de Duelos "caem" no pool da repescagem da rodada seguinte; repescagem só fecha quando a chave principal acabou e sobra ≤1. `progressFinalAllGroups`/`resolveFinalForGroup` (gatilho onMatchWrite phase "final"; callable inclui `grandFinal`): se a repescagem não fechou (rodadas da Copa esgotaram), escolhe melhor seed do pool remanescente. Estado ganhou `repechageWinner`, `repechageComplete`, `cupRoundsDone`, `champion`, `runnerUp`. Transições: knockout (ambos correndo) → repechage (chave acabou, repescagem segue) → final → done. UI Mata-mata: card de campeão+vice, finalistas da Grande Final, sobrevivente da repescagem, repescagem "em disputa". Simulação 8-part validada (converge sem loop).

**Falta:** `exactCount/correctCount` do member ainda cumulativos (não por fase). `cupRoundOf`/limiares heurísticos — validar com dados reais. Otimizar `onMatchWrite` (varre todos os grupos a cada jogo). Histórico de resultados das rodadas não é persistido (UI só mostra a rodada atual). Limitação documentada: se #rodadas da chave/repescagem > rodadas de mata-mata da Copa, a repescagem é fechada por seed na Grande Final.
