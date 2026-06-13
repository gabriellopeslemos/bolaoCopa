# Bolão Copa

App de bolão da Copa do Mundo para Android e iOS, construído com **Expo (React Native)** e **Firebase**.

## Funcionalidades

- Criar grupos com amigos via código de convite (compartilhável)
- Fazer palpites nos placares com seletor +/− e preview de pontos ao vivo
- Ranking por grupo com pódio (medalhas), avatares e estatísticas
- Sistema de pontuação cumulativo (ver abaixo)
- Sincronização automática de jogos via TheSportsDB
- Painel de admin para lançar resultados manualmente
- Login persistente, tema escuro, tipografia Inter, ícones, gradientes e haptics

## Design / UX

- **Tema escuro premium** com acento verde (mesma identidade da tela de pontos)
- **Tipografia Inter** (`@expo-google-fonts/inter`) em todos os pesos
- **Design system** próprio em `app/components/ui` (Button, Card, Input, Avatar,
  Text, Screen, EmptyState, Skeleton, FadeIn)
- Micro-interações: animação de entrada das listas, escala/haptic nos botões,
  pull-to-refresh, skeletons de carregamento e estados vazios ilustrados
- Ícones vetoriais (`@expo/vector-icons` / Ionicons) e gradientes (`expo-linear-gradient`)

## Sistema de Pontuação

| Critério | Pontos |
|---|---|
| Base: acertar o vencedor / empate | 3 |
| Bônus: Placar Exato | +5 |
| Bônus: Placar Vencedor | +3 |
| Bônus: Diferença de Gols | +2 |
| Bônus: Placar Perdedor | +1 |
| Bônus: Goleada (extra, ≥ 4 gols de diferença) | +1 |

Os bônus são cumulativos e só contam se você acertou o vencedor/empate.
Placar exato = todos os bônus ativados = máximo de 14 pts (ou 15 com goleada).

## Estrutura

```
/app                  → Aplicativo Expo (React Native + TypeScript)
  /app                → Rotas (expo-router): (auth), (tabs), group/*
  /components/ui      → Design system (Button, Card, Input, Avatar, …)
  /components         → MatchCard, ScoreStepper, TeamCrest, ScoringRulesCard
  /lib                → firebase, data (hooks React Query), theme, types
/functions            → Firebase Cloud Functions (TypeScript)
/packages/scoring     → Lógica de pontuação (função pura + testes)
/tests                → Testes das regras do Firestore (emulador)
/scripts/seed.mjs     → Popula jogos de demonstração
firestore.rules       → Regras de segurança do Firestore
firebase.json         → Configuração do Firebase
```

### Modelo de dados (Firestore)

```
users/{uid}                          perfil
users/{uid}/memberships/{groupId}    índice dos grupos do usuário (para listar)
groups/{groupId}                     nome, dono, inviteCode, memberCount
groups/{groupId}/members/{uid}       pontos denormalizados (ranking) + estatísticas
groups/{groupId}/bets/{uid_matchId}  palpite (score, points, breakdown)
matches/{matchId}                    partidas (times, kickoff, status, score)
```

## Pré-requisitos

- Node.js 18+
- Conta no [Firebase](https://firebase.google.com) (gratuita)
- (Opcional) Chave premium do [TheSportsDB](https://www.thesportsdb.com/api.php) — a chave free pública `123` já funciona para começar
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- [Expo Go](https://expo.dev/go) no celular para testar sem build nativo

## Configuração

### 1. Criar o projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um projeto novo
3. Ative: **Authentication** (Email/senha + Google), **Firestore** e **Functions** (exige plano Blaze — gratuito até os limites)
4. Adicione um **App Web** → copie o objeto `firebaseConfig`

### 2. Configurar o app

```bash
cd app
cp .env.example .env.local
# Edite .env.local com os valores do firebaseConfig
```

### 3. Configurar as Cloud Functions

```bash
firebase login
firebase use --add          # selecione seu projeto
```

> A sincronização usa o **TheSportsDB** com a chave free pública `123` por
> padrão — não precisa configurar nada. Para o calendário completo sem limites,
> defina o param `SPORTSDB_API_KEY` com uma chave premium (em `functions/.env`
> ou via `firebase functions:config`).

### 4. Rodar os testes

```bash
# Lógica de pontuação (14 testes unitários)
npm test

# Regras de segurança do Firestore (13 testes no emulador — requer Java)
npm run test:rules
```

### 4b. Popular jogos de demonstração (opcional)

```bash
# Suba o emulador em outro terminal: firebase emulators:start --only firestore
FIRESTORE_EMULATOR_HOST=localhost:8080 GOOGLE_CLOUD_PROJECT=demo-bolaocopa \
  node scripts/seed.mjs
```

### 5. Rodar o app em desenvolvimento

```bash
cd app
npm start
# Escaneie o QR code com o Expo Go no celular
```

### 6. Fazer deploy das regras e functions

```bash
# Da raiz do projeto
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

## Testar sem API de futebol

Crie jogos manualmente no Firestore Console na coleção `matches`, com a estrutura:

```json
{
  "competitionId": "world-cup-2026",
  "home": { "name": "Brasil" },
  "away": { "name": "Argentina" },
  "kickoff": <Timestamp futuro>,
  "status": "scheduled",
  "score": null
}
```

Depois do jogo, use o painel Admin no app (Perfil → Administração → Lançar resultado)
para definir o placar — isso dispara a Cloud Function `onMatchWrite` que pontua todos
os palpites automaticamente.

## Tornar alguém admin

No Firebase Console → Authentication → selecione o usuário → adicione Custom Claim:

```json
{ "admin": true }
```

Ou via Firebase Admin SDK:
```js
admin.auth().setCustomUserClaims(uid, { admin: true })
```

## Build para distribuição (sem publicar nas lojas)

### Android (APK direto — envie pelo WhatsApp/link)

```bash
cd app
npx eas build --platform android --profile preview
# Baixe o .apk gerado e compartilhe com os amigos
```

### iOS

```bash
# Requer macOS + conta Apple Developer (US$ 99/ano) para instalar fora do Expo Go
npx eas build --platform ios --profile preview
```

### Publicar nas lojas (opcional)

- **Google Play:** taxa única de US$ 25
- **Apple App Store:** US$ 99/ano

## Custos para uso entre amigos

| Item | Custo esperado |
|---|---|
| Firebase (Auth / Firestore / Functions / Push) | **R$ 0** (dentro da camada grátis) |
| TheSportsDB (chave free pública `123`) | **R$ 0** |
| Expo Go / APK direto | **R$ 0** |
| Google Play (se quiser publicar) | US$ 25 (única vez) |
| Apple App Store (se quiser publicar) | US$ 99/ano |

> Dica: configure um **alerta de orçamento de US$ 1** no Google Cloud para ser avisado
> caso o uso ultrapasse a camada gratuita do Firebase.
