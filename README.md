# Bolão Copa

App de bolão da Copa do Mundo para Android e iOS, construído com **Expo (React Native)** e **Firebase**.

## Funcionalidades

- Criar grupos com amigos via código de convite
- Fazer palpites nos placares das partidas
- Ranking em tempo real por grupo
- Sistema de pontuação cumulativo (ver abaixo)
- Sincronização automática de jogos via API-Football
- Painel de admin para lançar resultados manualmente

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
/app          → Aplicativo Expo (React Native + TypeScript)
/functions    → Firebase Cloud Functions (TypeScript)
/packages/scoring → Lógica de pontuação (função pura + testes)
firestore.rules   → Regras de segurança do Firestore
firebase.json     → Configuração do Firebase
```

## Pré-requisitos

- Node.js 18+
- Conta no [Firebase](https://firebase.google.com) (gratuita)
- Conta na [API-Football](https://www.api-football.com) (plano free = 100 req/dia)
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
firebase functions:secrets:set FOOTBALL_API_KEY
# Cole sua chave da API-Football quando solicitado
```

### 4. Rodar os testes de pontuação

```bash
npm test --workspace @bolao/scoring
# 14 testes devem passar
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
| API-Football (plano free, placar final) | **R$ 0** (100 req/dia) |
| Expo Go / APK direto | **R$ 0** |
| Google Play (se quiser publicar) | US$ 25 (única vez) |
| Apple App Store (se quiser publicar) | US$ 99/ano |

> Dica: configure um **alerta de orçamento de US$ 1** no Google Cloud para ser avisado
> caso o uso ultrapasse a camada gratuita do Firebase.
