# Bolão Copa

A World Cup prediction / pick'em app for Android and iOS, built with **Expo (React Native)** and **Firebase**.

## Features

- Create groups with friends via shareable invite codes
- Submit score predictions with a +/− stepper and live points preview
- Per-group ranking with podium (medals), avatars, and statistics
- Cumulative points scoring system (see below)
- Automatic match sync via TheSportsDB
- Admin panel to enter results manually
- Knockout bracket (mata-mata) progression
- Persistent login, dark theme, Inter typography, icons, gradients, and haptics

## Design / UX

- **Premium dark theme** with Street Orange accent (`#FF4500`)
- **Inter typography** (`@expo-google-fonts/inter`) across all weights
- **Custom design system** in `app/components/ui` (Button, Card, Input, Avatar, Text, Screen, EmptyState, Skeleton, FadeIn)
- Micro-interactions: list entry animations, scale/haptic on buttons, pull-to-refresh, loading skeletons, and illustrated empty states
- Vector icons (`@expo/vector-icons` / Ionicons) and gradients (`expo-linear-gradient`)

## Scoring System

| Criterion | Points |
|---|---|
| Base: correct winner / draw | 3 |
| Bonus: Exact Score | +5 |
| Bonus: Winner's Score | +3 |
| Bonus: Goal Difference | +2 |
| Bonus: Loser's Score | +1 |
| Bonus: Rout (≥ 4 goal difference) | +1 |

Bonuses are cumulative and only apply if you got the winner/draw correct.
Exact score = all bonuses active = maximum of 14 pts (or 15 with a rout).

Groups can override the scoring config via `groups/{groupId}.scoringConfig` (partial override).

## Repository Structure

This is an **npm workspaces monorepo**:

```
/app                  → Expo React Native app (expo-router, React Query, Firebase SDK)
  /app                → Routes (expo-router): (auth), (tabs), group/*
  /components/ui      → Design system (Button, Card, Input, Avatar, …)
  /components         → MatchCard, ScoreStepper, TeamCrest, ScoringRulesCard
  /lib                → firebase, data (React Query hooks), theme, types
/functions            → Firebase Cloud Functions (TypeScript, Node 20)
/packages/scoring     → Shared pure scoring logic (used by app and functions)
/tests                → Firestore security rules tests (vitest + Firebase emulator)
/scripts/seed.mjs     → Seeds demo match data
firestore.rules       → Firestore security rules
firebase.json         → Firebase project config
```

### Firestore Data Model

```
users/{uid}                           user profile
users/{uid}/memberships/{groupId}     index of groups the user belongs to
groups/{groupId}                      name, ownerId, inviteCode, memberCount, scoringConfig
groups/{groupId}/members/{uid}        denormalized points + stats (ranking)
groups/{groupId}/bets/{uid_matchId}   prediction (score, points, breakdown)
groups/{groupId}/tournament/state     knockout bracket state
matches/{matchId}                     match data (teams, kickoff, status, score)
```

Key security invariants enforced by `firestore.rules`:
- Predictions lock **5 minutes before kickoff** — no late picks
- Other members' picks are hidden until predictions lock for that match
- `points` and `totalPoints` are never writable by clients — only Cloud Functions (Admin SDK) can update them

## Prerequisites

- Node.js 18+
- A [Firebase](https://firebase.google.com) account (free)
- (Optional) Premium [TheSportsDB](https://www.thesportsdb.com/api.php) API key — the free public key `123` works to get started
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- [Expo Go](https://expo.dev/go) on your phone for testing without a native build

## Setup

### 1. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable: **Authentication** (Email/password + Google), **Firestore**, and **Functions** (requires Blaze plan — free within limits)
4. Add a **Web App** → copy the `firebaseConfig` object

### 2. Configure the app

```bash
cd app
cp .env.example .env.local
# Edit .env.local with your firebaseConfig values
```

### 3. Configure Cloud Functions

```bash
firebase login
firebase use --add   # select your project
```

> Match sync uses **TheSportsDB** with the free public key `123` by default — no extra configuration needed. For the full fixture calendar without rate limits, set the `SPORTSDB_API_KEY` param to a premium key (in `functions/.env` or via `firebase functions:config`).

### 4. Run tests

```bash
# Scoring logic (14 unit tests)
npm test

# Firestore security rules (13 tests on emulator — requires Java)
npm run test:rules
```

### 4b. Seed demo matches (optional)

Start the emulators in another terminal. You need **auth + firestore + functions** (not just firestore):

```bash
firebase emulators:start --only auth,firestore,functions
```

Then seed the matches. Use `127.0.0.1` (not `localhost`) and the **same project id as the app** (`bolaocopa-22280`), otherwise the data lands in a different namespace and the app won't see it:

```powershell
# PowerShell:
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"; $env:GOOGLE_CLOUD_PROJECT="bolaocopa-22280"; node scripts/seed.mjs
```

Check the data in the Emulator UI: http://127.0.0.1:4000/firestore

### 5. Run the app in development

```bash
cd app
npm start            # or: npx expo start -c  (clears the bundler cache)

# Scan the QR code with Expo Go, or press "w" to open in the browser
```

> The app connects to emulators when `EXPO_PUBLIC_USE_EMULATOR=1` is set in `app/.env`.
> `EXPO_PUBLIC_*` variables are bundled at dev-server startup — if you change `.env`, restart with `npx expo start -c`.

### 6. Deploy rules and functions

```bash
# From the project root
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
```

## Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `syncFixtures` | Scheduled (every 30 min) | Syncs match data from TheSportsDB API |
| `syncFixturesNow` | Callable (admin only) | On-demand sync |
| `setMatchResult` | Callable (admin only) | Manual score entry |
| `onMatchWrite` | Firestore trigger on `matches/{id}` | Scores all predictions when a match becomes `finished`; then advances knockout bracket |
| `betReminders` | Scheduled (every 15 min) | Push notifications ~2h before kickoff |
| `joinGroup` | Callable | Validates invite code, adds user to group |
| `progressTournamentNow` | Callable (admin only) | On-demand bracket advance |

Admin access is gated by the Firebase custom claim `{ "admin": true }`.

## Testing Without a Football API

Create matches manually in Firestore Console under the `matches` collection:

```json
{
  "competitionId": "world-cup-2026",
  "home": { "name": "Brazil" },
  "away": { "name": "Argentina" },
  "kickoff": "<future Timestamp>",
  "status": "scheduled",
  "score": null
}
```

After the match, use the Admin panel in the app (Profile → Administration → Enter result) to set the score — this triggers the `onMatchWrite` Cloud Function that scores all predictions automatically.

## Making Someone an Admin

In Firebase Console → Authentication → select the user → add Custom Claim:

```json
{ "admin": true }
```

Or via Firebase Admin SDK:
```js
admin.auth().setCustomUserClaims(uid, { admin: true })
```

## Building for Distribution (without publishing to stores)

### Android (direct APK — share via WhatsApp/link)

```bash
cd app
npx eas build --platform android --profile preview
# Download the generated .apk and share it with friends
```

### iOS

```bash
# Requires macOS + Apple Developer account (US$ 99/year) to install outside Expo Go
npx eas build --platform ios --profile preview
```

### Publishing to stores (optional)

- **Google Play:** one-time fee of US$ 25
- **Apple App Store:** US$ 99/year

## Costs for Friend Groups

| Item | Expected Cost |
|---|---|
| Firebase (Auth / Firestore / Functions / Push) | **$0** (within free tier) |
| TheSportsDB (free public key `123`) | **$0** |
| Expo Go / direct APK | **$0** |
| Google Play (if publishing) | US$ 25 (one-time) |
| Apple App Store (if publishing) | US$ 99/year |

> Tip: set a **US$ 1 budget alert** in Google Cloud to be notified if usage exceeds the Firebase free tier.
