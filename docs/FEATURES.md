# QuestLog — Feature Inventory (design brief)

## Concept
A **gamified personal weight-loss + habit tracker** framed as an RPG "run." One user, a start
weight and a goal weight (default **150 kg → 90 kg**, configurable), progressing toward a real-life
deadline. Every healthy action earns **XP**; the user gains **levels & ranks**, unlocks
**achievements**, and defeats **weight-milestone "bosses."** Mobile-first PWA with a distinct
desktop layout. Tamil/South-Indian lifestyle flavor (canteen food, idli/dosa/sambar,
"kalyanam"/wedding framing).

## Global HUD (persistent header)
- Level badge (number), rank name + level, XP progress bar (`into / span`), current-streak chip.

## Navigation — 8 tabs
`⚔️ Today · 🍽️ Meals · 📋 Tasks · 📅 Calendar · 🎯 Goals · 📈 Progress · 🏆 Awards · 📜 Plan`
(Mobile: bottom nav. Desktop: multi-column dashboard with side rails.)

---

### 1. ⚔️ Today
- "Day N of the run" date line.
- **Weigh-in** card: shows current kg; log a weight (40–300 kg), **+25 XP**, once/day; weekly
  weigh-in nudge; first-weigh-in prompt.
- **Daily quests** list — tap to complete, each grants XP. Default 6: Gym (30), 8k Steps (20),
  Protein every meal (15), Dodged fried (15), 3L water (10), In bed by 11:30 (10).
- Quests are **fully editable (CRUD)**: icon, name, description, XP; add/remove up to 20.
- **Day meter**: quests done / total; **banks a "streak day" at ≥3 quests**; "perfect day" = all
  quests.
- Desktop rail: current streak, best streak, kg lost, kg to goal, perfect days.

### 2. 🍽️ Meals
- Per-day nav (can't go into the future).
- **Day summary meters**: Calories (target 2000, over = bad) and Protein (target 110 g, floor to
  hit).
- **Add item** form: meal type (Breakfast/Lunch/Snack/Dinner), name, calories (each), protein (g),
  count.
- **📷 Scan food** (AI): snap/pick a photo → Gemini estimates description + total calories +
  protein → prefills the form; low-confidence "double-check" nudge. Photo never stored.
- **Logged list** grouped by meal type, per-item + per-group totals, delete items.
- Derived stats: logged days, protein-target days, on-calorie days, avg kcal.

### 3. 📋 Tasks
- Create custom tasks: **period** (To-do / Daily / Weekly / Monthly) × **kind** (Tap /
  Number+target+unit / Text-match).
- Track completion per period bucket; view reports/history.

### 4. 📅 Calendar
- Month grid: streak days colored, calories-per-day shown, weigh-in markers.

### 5. 🎯 Goals
- **Auto-tracked** milestone goals (nothing to tick — hit criteria and they complete), each with a
  progress bar + label: Reach goal weight · Lose 30 kg (halfway) · 14-day streak · 50 gym
  sessions · Protein 110 g × 30 days · 20 on-target calorie days · 30 fried-free days.

### 6. 📈 Progress
- Stat row: current kg, kg lost, kg to go.
- **Weight line chart** ("the only graph that matters").
- **Boss ladder**: 6 bosses at 140/130/120/110/100/90 kg, each with a name + tip, in states
  **LOCKED / IN FIGHT / DEFEATED** (tied to lowest weight reached).

### 7. 🏆 Awards
- Achievements grid (**23** total), unlocked count, rarity tiers **common/rare/epic/legendary**
  (50/100/200/400 XP), unlock date; locked shown as 🔒. Themes: first weigh-in, gym counts
  (10/50/100), streaks (3/7/15/30/60), fried-free, water, steps, weight milestones, kg-lost.

### 8. 📜 Plan
- Static reference: **6 diet rules**, canteen menu (default picks vs skip, portion guide, day
  shape ~1,800–2,000 kcal), **gym plan** (Phase 0/1/2 + hard rules).
- **Settings & data**: edit start/goal weight; export backup (JSON→clipboard); import backup;
  **reset run**.

---

## Cross-cutting systems
- **XP & leveling:** cumulative threshold `50·k·(k+1)`; 10 ranks (Rookie → Grinder → Challenger →
  Contender → Warrior → Elite → Veteran → Champion → Boss Slayer → Legend).
- **Streaks:** current + best; day banked at ≥3 quests.
- **Achievements & bosses** auto-unlock with a toast.
- **Feedback:** toast notifications (logged / unlocked / errors).
- **Data & auth:** Firebase Google sign-in + Firestore sync (offline-capable), **or** local-only
  mode (localStorage) when Firebase isn't configured; state sanitized on load; import/export.

## Data model (context for the designer)
`startWeight, goalWeight, startDate, weights[], quests[], days{date→{questsDone, weighed}},
meals{date→items[]}, tasks[], taskLog{}, achievements{id→date}`

## States worth designing
Empty (no weigh-in / meals / quests / tasks), loading (photo scanning, auth), signed-out/local-mode
banner, error toasts, over-target vs on-target meters, locked vs unlocked awards, active vs
defeated boss, edit modes (quests, tasks).

## Current look & tone (change or keep — your call)
Dark, neon/arcade RPG aesthetic; fonts **Orbitron / Rajdhani / Share Tech Mono**; playful gamer
copy; mobile-first with a richer desktop dashboard.

## Hand-off tip
Ask the designer for a **design system first** (color, type scale, and the shared components —
buttons, cards, meters/progress bars, tab bar, toasts, grids), since nearly every screen reuses
cards + meters + XP bars.
