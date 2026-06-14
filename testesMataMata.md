# Testes manuais — Mata-mata

Roteiro para validar **na mão** todo o processo do torneio construído até aqui
(Fatias 1–3): Ranking em divisões, reset de pontos por fase, Qualificatória →
Seeds, Fase de Grupos (serpentina), Eliminatórias (Triplos/Duelos) e Repescagem.

> As regras de cálculo já têm 46 testes automatizados + smoke tests no emulador.
> Este roteiro foca em **ver o fluxo funcionando ponta a ponta** no app e no banco.

---

## 0. Pré-requisitos e setup

1. **Build atualizado** (os gatilhos rodam no emulador de Functions com o código
   COMPILADO — sempre rebuilde após mudar código):
   ```powershell
   npm run build:scoring
   npm --prefix functions run build
   ```
2. **Suba os emuladores COM functions** (sem `functions` os gatilhos do torneio
   não disparam):
   ```powershell
   firebase emulators:start --only auth,firestore,functions
   ```
3. **App** apontando para o emulador (`app/.env` com `EXPO_PUBLIC_USE_EMULATOR=1`):
   ```powershell
   cd app; npx expo start -c
   ```
4. **Emulator UI** (inspeção/edição direta do banco): http://127.0.0.1:4000/firestore

> ⚠️ Depois de QUALQUER alteração no código das functions, refaça `npm --prefix
> functions run build` e reinicie os emuladores, senão os gatilhos rodam a versão antiga.

---

## 1. Referência: qual jogo alimenta qual fase

A fase é deduzida do campo `round` do jogo (função `matchTournamentPhase`):

| `round` do jogo (exemplos)                 | Fase do mata-mata     |
| ------------------------------------------ | --------------------- |
| `Grupo A · Rodada 1`, `Matchday 1`, `1`    | **Qualificatória**    |
| `Grupo A · Rodada 2/3`, `2`, `3`           | **Fase de Grupos**    |
| `Round of 16`, `Oitavas`, `Quarter-final`, `Semi-final`, `125`, `150` | **Eliminatórias** |
| `Final`, `200`                             | Grande Final (futuro) |

**Regras de ouro:**
- Uma transição só acontece quando **TODOS** os jogos daquela fase estão
  `status: "finished"` (na coleção `matches` inteira — os jogos são globais).
- O ranking mostra os pontos da **fase atual** (cada fase tem seu bucket
  `phasePoints` → ao mudar de fase, "zera").
- O estado do torneio é por grupo, em `groups/{groupId}/tournament/state`.

---

## 2. Como avançar uma fase (disparar os gatilhos)

Qualquer um dos dois faz o gatilho `onMatchWrite` rodar (pontua palpites +
avança o torneio):

- **Pela Emulator UI (mais rápido):** abra `matches/{id}`, mude `status` para
  `finished` e preencha `score` = `{ home: X, away: Y }`. Salvar dispara tudo.
- **Pelo app (tela Administração):** precisa do claim de admin. "Lançar
  resultado manual" → informe o ID da partida e o placar.

> Atalho de admin: o callable `progressTournamentNow` força a reavaliação de
> todas as fases (útil se você editou jogos sem disparar o gatilho).

---

## 3. Preparar os dados de teste

A ideia: **1 grupo** com **8 participantes** (2 divisões de 4) e jogos de cada
fase. Você cria o grupo pelo app (você vira o 1º membro) e adiciona os demais
participantes "fictícios" direto na Emulator UI — o motor funciona com qualquer
membro, sendo conta real ou não.

### 3.1. Crie o grupo
- No app: aba **Perfil → Bolão ativo → Criar bolão** (ex.: "Teste MM").
- Anote o `groupId` (veja em `groups` na Emulator UI). Abaixo chamado `GID`.

### 3.2. Adicione 7 participantes (Emulator UI)
Em `groups/{GID}/members`, crie os docs `p2`…`p8` (o seu usuário já é um membro).
Para cada um:
```
displayName: "Jogador 2"   (3, 4, …)
role: "member"
totalPoints: 0
```
(Para ver **2 divisões** no Ranking você precisa de pelo menos 5 membros; com 8
ficam 2 divisões cheias.)

### 3.3. Crie os jogos (Emulator UI → coleção `matches`)
Crie 1 jogo de Qualificatória, 1 de Grupos e 2 de Eliminatórias. Campos de cada
doc (use IDs fáceis como `mm-q1`, `mm-g1`, `mm-k1`, `mm-k2`):

| ID      | round                 | status      | score        | kickoff           |
| ------- | --------------------- | ----------- | ------------ | ----------------- |
| `mm-q1` | `Grupo A · Rodada 1`  | `scheduled` | `null`       | daqui a ~10 min   |
| `mm-g1` | `Grupo A · Rodada 2`  | `scheduled` | `null`       | depois do q1      |
| `mm-k1` | `Round of 16`         | `scheduled` | `null`       | depois            |
| `mm-k2` | `Quarter-final`       | `scheduled` | `null`       | por último        |

Demais campos: `competitionId: "world-cup-2026"`, `home: { name: "Time A" }`,
`away: { name: "Time B" }`. O `kickoff` é um Timestamp (na UI, tipo *timestamp*).

> ⚠️ Se já houver jogos antigos com `round` "… Rodada 1" no emulador, eles também
> contam como Qualificatória e precisam estar `finished` para a fase avançar.
> Para um teste limpo, finalize-os também ou apague-os.

### 3.4. Crie os palpites
Os palpites definem os pontos. Só precisam de palpites os jogos de **Qualificatória**
e **Fase de Grupos** (nas Eliminatórias, sem palpite, o empate em 0 é resolvido
pelo melhor seed). Em `groups/{GID}/bets`, crie um doc por membro/jogo, com **ID
no formato `{uid}_{matchId}`** (ex.: `p2_mm-q1`):
```
userId: "p2"
matchId: "mm-q1"
score: { home: 1, away: 0 }   // varie por membro para gerar pontos diferentes
points: 0                      // será calculado ao finalizar o jogo
```
Dica para gerar um ranking claro: faça **um** membro acertar o placar exato do
jogo e os demais errarem — esse membro fica em 1º (Seed 1).

---

## 4. Cenários de teste

Marque `[x]` conforme validar.

### T1 — Ranking em divisões de 4 (antes do torneio)
- [ ] Com ≥5 membros, abra a aba **Ranking**.
- **Esperado:** os membros aparecem agrupados em **Divisão A, B, …**, 4 por
  divisão, ordenados por pontos; o **4º de cada divisão** (lanterna) aparece com
  o número em vermelho. Antes de pontuar, todos com 0 pts.

### T2 — Palpite e pontuação por fase
- [ ] Crie os palpites do `mm-q1` (passo 3.4).
- [ ] Finalize `mm-q1` (status `finished` + `score`, passo 2).
- **Esperado:**
  - [ ] No Ranking, os pontos aparecem (quem acertou mais sobe).
  - [ ] Na Emulator UI, os membros ganham `phasePoints.qualifier` e os palpites
        recebem `points`/`breakdown`.

### T3 — Qualificatória → Seeds + Grupos (serpentina)
- [ ] Garanta que **todos** os jogos de Qualificatória estão `finished`.
- [ ] Abra a aba **Mata-mata**.
- **Esperado:**
  - [ ] Chip "Fase atual: **Fase de Grupos**".
  - [ ] Seção **Seeds (resultado da Qualificatória)** — lista ordenada (Seed 1 =
        quem fez mais pontos).
  - [ ] Seção **Grupos sorteados (serpentina)** — com 8 membros: Grupo A com
        seeds [1, 4, 5, 8] e Grupo B com [2, 3, 6, 7] (cabeças de chave 1 e 2 em
        grupos distintos).
  - [ ] No Ranking, as divisões agora são os **grupos sorteados** (cabeçalho
        "Grupo A/B") e o subtítulo vira "grupos sorteados".
  - [ ] (Banco) `groups/{GID}/tournament/state` com `phase: "groups"`, `seeds`,
        `groups`.

### T4 — Reset de pontos por fase
- [ ] Observe que, ao entrar na Fase de Grupos, o Ranking mostra os pontos da
      **fase de grupos** (não os da Qualificatória).
- [ ] Crie palpites no `mm-g1` e finalize-o.
- **Esperado:** os pontos do Ranking refletem só o `mm-g1` (a Qualificatória não
  soma aqui). Na Emulator UI, o membro tem `phasePoints.qualifier` **e**
  `phasePoints.groups` separados; `totalPoints` continua somando tudo.

### T5 — Fase de Grupos → Eliminatórias
- [ ] Garanta que **todos** os jogos de Grupos (`mm-g1`, …) estão `finished`.
- [ ] Abra a aba **Mata-mata**.
- **Esperado:**
  - [ ] Chip "Fase atual: **Eliminatórias**".
  - [ ] Seção **Eliminatórias · 1ª rodada** com cartões **TRIPLO**/**DUELO**
        (cada jogador com seed, colocação e grupo).
  - [ ] Com 8 participantes: 6 classificados → **2 Triplos** (M=6); cada Triplo
        diz "2 de 3 avançam".
  - [ ] Seção **Repescagem** com os 2 **lanternas** (últimos de cada grupo).
  - [ ] (Banco) `state.phase: "knockout"`, `state.knockout.matchups`,
        `state.repechage`.

### T6 — Avanço das Eliminatórias (rodadas seguintes)
- [ ] Finalize `mm-k1` (a 1ª rodada de mata-mata da Copa, por kickoff).
- **Esperado:** a chave avança uma rodada — os vencedores formam a próxima
  (rodada 2). Perdedores de **Duelo** entram na **Repescagem**; perdedores de
  **Triplo** somem (eliminados de vez).
- [ ] Finalize `mm-k2` (próxima rodada).
- **Esperado:** continua avançando. Quando sobra **1**, aparece o cartão
  🏆 **Vencedor da chave principal** ("Classificado para a Grande Final").
- [ ] (Banco) `state.mainBracketWinner` preenchido e `state.knockout.complete: true`.

> Como nas Eliminatórias deste roteiro não há palpites, os confrontos resolvem
> pelo **melhor seed** — então o vencedor da chave tende a ser o Seed 1.

### T7 — Difficulty Score / Triplos (conceitual)
- [ ] Na 1ª rodada, confira que quem teve **grupo mais forte** (adversários de
      seed alto) tende a cair em **Triplo** (caminho mais fácil: 2 de 3 avançam).
- [ ] Reencontro Adiado: com 3+ grupos, os confrontos evitam rivais do mesmo
      grupo. (Com só 2 grupos, um Triplo sempre repete grupo — é matematicamente
      inevitável; o sistema apenas minimiza.)

---

## 5. Reexecutar / limpar

- Para refazer do zero um grupo: apague `groups/{GID}/tournament/state` (e, se
  quiser, zere `phasePoints`/`totalPoints` dos membros e os `points` dos palpites)
  e finalize os jogos de novo.
- Para limpar tudo: **reinicie o emulador** (dados são efêmeros) e refaça a seed.

---

## 6. Problemas comuns

- **Nada avança ao finalizar um jogo:** o emulador de **functions** não está no
  ar, ou o build está velho → `npm --prefix functions run build` e reinicie com
  `--only auth,firestore,functions`.
- **A fase não vira:** ainda há jogo daquela fase com `status` ≠ `finished`
  (lembre dos jogos antigos/demo com "Rodada 1").
- **App mostra dados de outro projeto:** confirme `GOOGLE_CLOUD_PROJECT` da seed
  igual ao `projectId` do app (`bolaocopa-22280`) e reinicie o app com `-c`.
- **Seeds/grupos não aparecem na Mata-mata:** a Qualificatória ainda não terminou
  por completo, ou o `tournament/state` ainda está em `phase: "qualifier"`.

---

## 7. Limitações conhecidas (esperado, não é bug)

- A **Grande Final** e o **motor da Repescagem** (redistribuir e ir afunilando)
  ainda não estão implementados — a Repescagem hoje só **acumula** os eliminados.
- Se a chave precisar de mais rodadas do que há rodadas de mata-mata da Copa, ela
  **trava** (faltam jogos para pontuar).
- `cupRoundOf` é heurística sobre os textos de `round` — valide com os rótulos
  reais do TheSportsDB quando integrar os jogos de verdade.
