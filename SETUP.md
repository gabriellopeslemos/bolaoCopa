# Guia de Configuração — Bolão Copa (via Console)

Passo a passo para colocar o backend (Firebase + TheSportsDB) no ar, focado no
**Console** do Firebase/Google Cloud. Os poucos passos que exigem o terminal
estão marcados com 🖥️ **(terminal)**.

> Plano escolhido: **Blaze**. Ele mantém toda a camada gratuita — com o uso de um
> bolão entre amigos o custo fica em **R$ 0**. O passo 6 cria um alerta de
> orçamento de US$ 1 como proteção.

---

## Checklist rápido

- [ ] 1. Criar o projeto Firebase
- [ ] 2. Ativar Authentication (só Email/senha por enquanto)
- [ ] 3. Criar o Firestore
- [ ] 4. Registrar o App Web e copiar o `firebaseConfig`
- [ ] 5. Ativar o plano Blaze
- [ ] 6. Criar o alerta de orçamento de US$ 1
- [ ] 7. (Opcional) Chave premium do TheSportsDB
- [ ] 8. Preencher o `app/.env.local`
- [ ] 9. 🖥️ Conectar a CLI e fazer o deploy (rules + functions)
- [ ] 10. Tornar-se admin (custom claim)
- [ ] 11. Rodar o app

---

## 1. Criar o projeto Firebase

1. Acesse **https://console.firebase.google.com**.
2. Clique em **Adicionar projeto** (ou *Create a project*).
3. Dê um nome (ex.: `bolao-copa`). Anote o **ID do projeto** gerado — você vai
   usar depois (ex.: `bolao-copa-1a2b3`).
4. Google Analytics é **opcional** — pode desativar para simplificar.
5. **Criar projeto** e aguardar.

## 2. Ativar Authentication

1. No menu lateral: **Build → Authentication** → botão **Get started**.
2. Aba **Sign-in method** → **Add new provider**.
3. Ative **Email/Password**:
   - Ligue a primeira chave (*Email/Password*). Salvar.

> **Google login:** **não ative agora.** O app ainda não implementa login com
> Google na interface (as funções existem em `app/lib/auth.ts`, mas nenhuma tela
> as usa e não há pacote de OAuth instalado). Ative só **Email/senha**.
>
> Se ativar o Google, o Firebase mostra um aviso pedindo a **impressão digital
> SHA-1**. **Ignore** — esse aviso só vale para apps **Android nativos**. Este
> projeto usa o Firebase **JS SDK** dentro do Expo Go, então você registra um
> **App Web** (passo 4), que não pede SHA-1.

## 3. Criar o Firestore

1. Menu lateral: **Build → Firestore Database** → **Create database**.
2. Local (location): escolha um próximo (ex.: `southamerica-east1` — São Paulo).
   > ⚠️ A localização do Firestore **não pode ser mudada depois**.
3. Modo de regras: escolha **Production mode** (as regras seguras deste repo serão
   enviadas no passo 9). Pode confirmar — o app só vai funcionar de verdade após o
   deploy das `firestore.rules`.
4. **Criar**.

## 4. Registrar o App Web e copiar o `firebaseConfig`

1. No Console, clique na **engrenagem ⚙️ → Configurações do projeto**
   (*Project settings*).
2. Role até **Seus apps** (*Your apps*) → clique no ícone **Web `</>`**.
3. Apelido do app: ex.: `bolao-web`. **Não** marque "Firebase Hosting".
   Clique em **Registrar app**.
4. A tela mostra um objeto `firebaseConfig` parecido com:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "bolao-copa-1a2b3.firebaseapp.com",
     projectId: "bolao-copa-1a2b3",
     storageBucket: "bolao-copa-1a2b3.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abc123",
   };
   ```
5. **Mantenha essa tela aberta** (ou copie os 6 valores) — eles vão no passo 8.

## 5. Ativar o plano Blaze

1. No Console, canto inferior esquerdo do menu: **Upgrade** (ou
   engrenagem ⚙️ → **Uso e faturamento / Usage and billing** → aba **Details & settings**).
2. Escolha o plano **Blaze (Pay as you go)** → **Select plan**.
3. Vincule (ou crie) uma **conta de faturamento do Google Cloud**:
   - Informe país, dados e **cartão de crédito**.
   > Cadastrar o cartão **não gera cobrança**. Só haveria cobrança se o uso
   > ultrapassasse a camada gratuita — o que não acontece nessa escala.
4. Confirme o upgrade.

## 6. Criar o alerta de orçamento de US$ 1 (proteção)

1. Acesse **https://console.cloud.google.com/billing**.
2. Selecione a **conta de faturamento** vinculada no passo 5.
3. Menu lateral → **Budgets & alerts** (Orçamentos e alertas) → **Create budget**.
4. **Scope (Escopo)**:
   - *Projects*: selecione **somente o projeto do bolão**.
   - Pode deixar serviços/etiquetas no padrão (todos).
5. **Amount (Valor)**:
   - *Budget type*: **Specified amount**.
   - *Target amount*: **1** (US$ 1,00).
6. **Actions / Thresholds (Limiares)**: deixe os padrões **50% / 90% / 100%**.
   - Marque **Email alerts to billing admins and users**.
7. **Finish / Salvar**.
   > Você receberá e-mail ao cruzar US$ 0,50 / US$ 0,90 / US$ 1,00. O alerta
   > **avisa**, não bloqueia — mas, no seu uso, chegar a US$ 0,50 já seria um sinal
   > para investigar.

## 7. (Opcional) Chave premium do TheSportsDB

A sincronização usa o **TheSportsDB**. A **chave free pública `123` já vem
configurada por padrão** — você não precisa criar conta nem cadastrar secret
nenhum para começar.

> O app sincroniza a Copa do Mundo (league `4429`, season `2026`) a cada 30 min,
> combinando o calendário da temporada com os próximos jogos e os resultados mais
> recentes.

A única limitação da chave free é que o **calendário da temporada** retorna no
máximo ~15 jogos por vez. Se quiser o calendário completo da Copa de uma só vez:

1. Assine o **Patreon** do TheSportsDB (**https://www.thesportsdb.com/api.php**)
   para obter uma **chave premium**.
2. Guarde a chave — você a define no passo 9 (param `SPORTSDB_API_KEY`).

## 8. Preencher o `app/.env.local`

1. Copie o exemplo (🖥️ terminal, na raiz do projeto):
   ```bash
   cd app
   cp .env.example .env.local
   ```
2. Edite `app/.env.local` com os 6 valores do `firebaseConfig` (passo 4):
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=bolao-copa-1a2b3.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=bolao-copa-1a2b3
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=bolao-copa-1a2b3.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123
   ```
   > Esses valores são **públicos por natureza** (vão embutidos no app). A
   > segurança real vem das regras do Firestore (passo 9), não de esconder a chave.

## 9. 🖥️ Conectar a CLI e fazer o deploy

> Estes passos **não têm equivalente no Console** — o envio das regras/functions
> é feito pela Firebase CLI.

1. Instale a CLI (uma vez só):
   ```bash
   npm install -g firebase-tools
   ```
2. Faça login (abre o navegador):
   ```bash
   firebase login
   ```
3. Na **raiz do projeto**, selecione o projeto criado no passo 1:
   ```bash
   firebase use --add
   # escolha o projeto e dê um alias, ex.: "default"
   ```
4. (Opcional) Só se você tem uma **chave premium** do TheSportsDB (passo 7),
   defina o param antes do deploy criando `functions/.env`:
   ```bash
   echo "SPORTSDB_API_KEY=suachavepremium" > functions/.env
   ```
   > Sem isso, a sincronização usa a chave free pública `123` automaticamente.
5. Faça o deploy das regras, índices e functions:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   firebase deploy --only functions
   ```
   > O primeiro deploy de functions pode pedir para habilitar APIs do Google Cloud
   > (Cloud Build, Artifact Registry) — aceite. Isso também usa a camada gratuita.

## 10. Tornar-se admin (custom claim)

O painel de admin (lançar resultado, forçar sync) é liberado pelo custom claim
`admin: true`. O Console do Firebase **não** tem tela para editar custom claims,
então use um destes caminhos:

**Opção A — script local rápido (🖥️ terminal):**
1. No Console: ⚙️ → **Configurações do projeto → Contas de serviço** →
   **Gerar nova chave privada** → baixa um `serviceAccount.json`.
   > Trate esse arquivo como senha — **não** faça commit dele.
2. Pegue seu **UID**: Console → **Authentication → Users** → copie o *User UID*
   da sua conta (faça login no app pelo menos uma vez antes, para a conta existir).
3. Rode um script pontual (ajuste o caminho do JSON e o UID):
   ```bash
   node -e "const a=require('firebase-admin');a.initializeApp({credential:a.credential.cert(require('./serviceAccount.json'))});a.auth().setCustomUserClaims('SEU_UID_AQUI',{admin:true}).then(()=>{console.log('ok');process.exit(0)})"
   ```
4. **Deslogue e logue de novo** no app para o claim entrar em vigor.

**Opção B — via gcloud / Identity Platform:** se você usa o Identity Platform no
Google Cloud, dá para editar claims pela API de administração. A Opção A é mais
simples para um projeto pessoal.

## 11. Rodar o app

```bash
cd app
npm install      # se ainda não rodou
npm start        # escaneie o QR code com o Expo Go no celular
```

---

## Rodar o app localmente (detalhe)

O app é feito com **Expo** (React Native). Você pode rodá-lo de três formas:

### Opção A — Celular físico via Expo Go (mais simples)

1. Instale o **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)).
2. Certifique-se de que o celular está **na mesma rede Wi-Fi** que o computador.
3. Rode:
   ```bash
   cd app
   npm start
   ```
4. Escaneie o **QR code** exibido no terminal com o Expo Go (Android) ou com a câmera (iOS).

> Se a conexão falhar por causa de rede, tente `npm start -- --tunnel` para rotear via
> servidor Expo (requer conta no expo.dev).

### Opção B — Navegador (web)

```bash
cd app
npm run web
```

Abre em `http://localhost:8081`. Útil para iterar rápido em telas sem precisar de celular.
Algumas APIs nativas (notificações, haptics) não funcionam no browser — use com moderação.

### Opção C — Emulador Android / Simulador iOS

```bash
cd app
npm run android   # abre no emulador Android (Android Studio instalado)
npm run ios       # abre no simulador iOS (apenas macOS com Xcode)
```

> No Windows, apenas `npm run android` funciona. O Xcode é macOS-only.

### Pré-requisitos

| Ferramenta | Instalação |
|---|---|
| Node.js 20+ | https://nodejs.org |
| Expo CLI | já vem com `expo` nas dependências — não precisa instalar globalmente |
| Java 17+ | necessário só para emulador Android (Android Studio inclui) |
| `app/.env.local` | preenchido conforme o passo 8 |

### Variáveis de ambiente relevantes para desenvolvimento

```
# Aponta o app para os emuladores locais do Firebase (passo da seção de emuladores)
EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true
```

Deixe a variável vazia ou ausente para usar o Firebase de produção.

---

## Popular dados de jogos via API

### Opção A — Painel admin do app (produção / emulador)

Com o app rodando e sua conta com o claim `admin: true` (passo 10):

1. Abra o app → aba **Perfil** → seção **Administração**.
2. Toque em **Sincronizar agora**.

Isso chama a Cloud Function `syncFixturesNow`, que busca os jogos e placares
da Copa do Mundo diretamente na API TheSportsDB e faz upsert na coleção
`matches`.

> Com o emulador no ar (`firebase emulators:start`) a função chama a API real
> do TheSportsDB — portanto exige conexão com a internet e a chave configurada
> em `functions/.env`.

---

### Opção B — Script de seed (desenvolvimento local, sem API externa)

O script `scripts/seed.mjs` insere partidas fictícias diretamente no Firestore,
sem depender da TheSportsDB. Ideal para rodar offline ou com o emulador.

**Pré-requisito:** dependências das functions instaladas.

```bash
cd functions
npm install
```

**Contra o emulador local** (emulador deve estar no ar):

```powershell
# PowerShell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
$env:GOOGLE_CLOUD_PROJECT="<SEU_PROJECT_ID>"   # ex: bolaocopa-22280
node ../scripts/seed.mjs
```

```bash
# bash / Git Bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=<SEU_PROJECT_ID> node ../scripts/seed.mjs
```

**Contra o projeto real** (requer `serviceAccount.json` do passo 10-A):

```bash
GOOGLE_APPLICATION_CREDENTIALS=../serviceAccount.json node ../scripts/seed.mjs
```

O script cria 5 partidas de demonstração na coleção `matches`:

| ID | Confronto | Situação |
|---|---|---|
| `world-cup-2026-1` | Brasil × Sérvia | agendado (+2h) |
| `world-cup-2026-2` | Suíça × Camarões | agendado (+5h) |
| `world-cup-2026-3` | Argentina × México | agendado (+26h) |
| `world-cup-2026-4` | França × Austrália | finalizado 4×1 |
| `world-cup-2026-5` | Dinamarca × Tunísia | finalizado 0×0 |

Os kickoffs são relativos ao momento em que o script é executado.

---

### Opção C — Script de seed para o Mata-mata (testes avançados)

O script `scripts/seedTournament.mjs` cria um grupo de teste completo com
8 participantes, jogos de todas as fases (qualificatória, grupos, eliminatória)
e palpites — tudo `scheduled`. Use para validar o motor de pontuação e o
avanço do mata-mata fase a fase.

**Apenas contra o emulador** (o script recusa rodar contra produção):

```powershell
# PowerShell — passe o GROUP_ID que você criou no app (opcional)
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
$env:GOOGLE_CLOUD_PROJECT="<SEU_PROJECT_ID>"
node ../scripts/seedTournament.mjs <GROUP_ID>
```

Sem `<GROUP_ID>`, cria o grupo `mm-test-group` (não vinculado à sua conta).

Depois de executar, finalize os jogos **nesta ordem** via Emulator UI
(`localhost:4000`) ou pela tela Administração do app:

1. `mm-q1` (Qualificatória)
2. `mm-g1` (Fase de Grupos)
3. `mm-k1`, `mm-k2`, `mm-k3` (Eliminatórias)

Acompanhe a pontuação e o avanço nas abas **Ranking** e **Mata-mata**.

---

## Testar sem a API de futebol

Se quiser validar sem depender da sincronização, crie jogos manualmente no
**Firestore Console** → coleção `matches` → **Add document**:

```json
{
  "competitionId": "world-cup-2026",
  "home": { "name": "Brasil" },
  "away": { "name": "Argentina" },
  "kickoff": "<Timestamp futuro>",
  "status": "scheduled",
  "score": null
}
```

Depois do "jogo", use **Perfil → Administração → Lançar resultado** no app para
definir o placar — isso dispara a Cloud Function `onMatchWrite`, que pontua todos
os palpites automaticamente.

---

## Desenvolvimento local das Firebase Functions

Para iterar nas functions sem fazer deploy a cada mudança, use o **Firebase Emulator Suite**.

> Pré-requisito: Java 11+ instalado (`java -version`). O emulador do Firestore
> precisa do JDK — baixe em **https://adoptium.net** se não tiver.

### 1. Instalar dependências das functions

```bash
cd functions
npm install
```

### 2. Criar o `functions/.env` com as variáveis de ambiente

```bash
# na pasta functions/
cp .env.example .env   # se existir, ou crie manualmente:
echo "SPORTSDB_API_KEY=123" > .env
```

> Use `123` (chave free pública) para desenvolvimento local.

### 3. Configurar o emulador (uma vez só)

Na **raiz do projeto**, inicie a configuração interativa:

```bash
firebase init emulators
```

Selecione ao menos:
- **Functions Emulator** (porta padrão: `5001`)
- **Firestore Emulator** (porta padrão: `8080`)

Isso gera/atualiza o bloco `"emulators"` em `firebase.json`.

### 4. Iniciar os emuladores

```bash
# na raiz do projeto
firebase emulators:start
```

O terminal mostra as URLs de cada emulador. A UI de inspeção fica em
`http://localhost:4000` por padrão.

### 5. Apontar o app para os emuladores

Em `app/.env.local`, adicione (ou descomente) as variáveis abaixo:

```
EXPO_PUBLIC_FIREBASE_USE_EMULATOR=true
```

O arquivo `app/lib/firebase.ts` (ou equivalente de inicialização) deve checar
essa variável e conectar os SDKs ao emulador local. Exemplo de configuração:

```ts
if (process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

> Remova ou deixe vazia a variável para voltar ao Firebase de produção.

### 6. Chamar uma function manualmente (opcional)

Com o emulador rodando, você pode invocar uma function HTTP/callable via curl:

```bash
# example: sync fixtures
curl -X POST http://localhost:5001/<PROJECT_ID>/us-central1/syncFixtures
```

Substitua `<PROJECT_ID>` pelo ID do projeto Firebase (ex.: `bolao-copa-1a2b3`).

### Dicas de desenvolvimento local

| Situação | Ação |
|---|---|
| Mudou o código de uma function | Recompile (`npm run build` em `functions/`) — o emulador recarrega automaticamente em watch mode |
| Quer watch mode | `cd functions && npm run build -- --watch` em terminal separado |
| Inspecionar Firestore local | Abra `http://localhost:4000` → aba **Firestore** |
| Ver logs das functions | Terminal do `firebase emulators:start` ou aba **Logs** em `localhost:4000` |
| Resetar dados do emulador | Reinicie o emulador (Ctrl+C e `firebase emulators:start` de novo) |

---

## Verificação final

| Item | Onde conferir |
|---|---|
| Auth ativo | Console → Authentication → Sign-in method (Email + Google verdes) |
| Firestore criado | Console → Firestore Database mostra o banco |
| Regras no ar | Console → Firestore → aba **Rules** (deve bater com `firestore.rules`) |
| Functions no ar | Console → **Functions** lista `syncFixtures`, `onMatchWrite`, etc. |
| Sincronização | App → Perfil → Administração → **Sincronizar agora** (traz os jogos da Copa) |
| Orçamento | console.cloud.google.com/billing → Budgets & alerts |
| Admin | App → aba Perfil mostra a seção **Administração** |
