# ⚔️ QuestLog — 150 → 90

Gamified weight-loss tracker: daily quests, XP and ranks, streak calendar, boss ladder every 10kg, and 23 achievements. Built with React + TypeScript + Vite, synced with Firebase Auth + Firestore. Mobile gets a bottom-tab HUD layout; desktop gets a sidebar dashboard.

The plans it tracks live in [DIET-PLAN.md](./DIET-PLAN.md) and [GYM-PLAN.md](./GYM-PLAN.md).

## Run it

```bash
npm install
npm run dev      # local mode — works immediately, data in this browser only
```

Without Firebase config the app runs in **local mode** (no login, localStorage). To enable accounts + sync:

## Firebase setup (one time, ~5 minutes)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (e.g. `questlog`) — Analytics not needed.
2. **Build → Authentication → Get started** → enable **Email/Password** and **Google**.
3. **Build → Firestore Database → Create database** → production mode, region `asia-south1` (Mumbai).
4. Firestore → **Rules** tab → paste the contents of [`firestore.rules`](./firestore.rules) → Publish.
5. Project settings (gear) → **Your apps → Web app (`</>`)** → register → copy the config values.
6. `cp .env.example .env` and fill in the six `VITE_FIREBASE_*` values → restart `npm run dev`.

Moving your data from the old single-file app: open it → Plan → **Export data**, then in this app → Plan → **Import**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm test` | Unit tests (streaks, XP, achievements, sanitization) |
| `npm run preview` | Serve the production build locally |

## Deploy (optional)

Any static host works (`dist/` after `npm run build`). For Firebase Hosting:

```bash
npm i -g firebase-tools
firebase login
firebase init hosting   # public dir: dist, SPA: yes
npm run build && firebase deploy
```

Then open the URL on your phone → Chrome menu → **Add to Home screen**.

## Architecture notes

- `src/state/` — pure logic: stats, streaks, XP, sanitization (unit-tested, no React).
- `src/data/` — quest, achievement, boss, and rank definitions.
- `src/storage/` — one interface (`adapter.ts`), two backends: Firestore (offline-persistent) and localStorage.
- `src/store.tsx` — auth + state context; every update is sanitized, achievement-checked, then persisted.
- All remote/imported data passes through `sanitizeState` before touching the UI.
- Firestore stores one document per user (`users/{uid}`); rules restrict access to the owner.
