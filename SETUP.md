# Guia de Configuração — Bolão Copa (via Console)

Passo a passo para colocar o backend (Firebase + API-Football) no ar, focado no
**Console** do Firebase/Google Cloud. Os poucos passos que exigem o terminal
estão marcados com 🖥️ **(terminal)**.

> Plano escolhido: **Blaze**. Ele mantém toda a camada gratuita — com o uso de um
> bolão entre amigos o custo fica em **R$ 0**. O passo 6 cria um alerta de
> orçamento de US$ 1 como proteção.

---

## Checklist rápido

- [ ] 1. Criar o projeto Firebase
- [ ] 2. Ativar Authentication (Email/senha + Google)
- [ ] 3. Criar o Firestore
- [ ] 4. Registrar o App Web e copiar o `firebaseConfig`
- [ ] 5. Ativar o plano Blaze
- [ ] 6. Criar o alerta de orçamento de US$ 1
- [ ] 7. Obter a chave da API-Football
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
4. Ative **Google**:
   - Selecione **Google** → ligue *Enable*.
   - Defina um **nome público do app** e um **e-mail de suporte**.
   - Salvar.

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

## 7. Obter a chave da API-Football

1. Crie conta em **https://www.api-football.com** (plano **Free** = 100 req/dia).
   - Alternativamente via RapidAPI; o importante é obter a **API key**.
2. No painel da conta, copie sua **API Key**. Guarde — vai no passo 9.
   > O app sincroniza a Copa do Mundo (league `1`, season `2026`) a cada 30 min.
   > 48 syncs/dia cabe folgado nas 100 req/dia.

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

> Estes passos **não têm equivalente no Console** — a chave da API-Football (secret)
> e o envio das regras/functions são feitos pela Firebase CLI.

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
4. Cadastre o secret da API-Football (cola a chave do passo 7 quando pedir):
   ```bash
   firebase functions:secrets:set FOOTBALL_API_KEY
   ```
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

## Testar sem a API de futebol

Se quiser validar antes de configurar a API-Football, crie jogos manualmente no
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

## Verificação final

| Item | Onde conferir |
|---|---|
| Auth ativo | Console → Authentication → Sign-in method (Email + Google verdes) |
| Firestore criado | Console → Firestore Database mostra o banco |
| Regras no ar | Console → Firestore → aba **Rules** (deve bater com `firestore.rules`) |
| Functions no ar | Console → **Functions** lista `syncFixtures`, `onMatchWrite`, etc. |
| Secret cadastrado | 🖥️ `firebase functions:secrets:access FOOTBALL_API_KEY` |
| Orçamento | console.cloud.google.com/billing → Budgets & alerts |
| Admin | App → aba Perfil mostra a seção **Administração** |
