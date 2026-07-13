# Meal Photo Scan — Design

**Date:** 2026-07-13
**Status:** Approved for planning
**Feature:** In the Meals tab, capture or pick a food photo, send it to Gemini via Firebase
AI Logic, and prefill the meal form with an estimated description, calories, and protein.

---

## 1. Goal

Reduce the friction of logging a meal. Instead of typing a name and guessing macros, the user
snaps a photo of their plate; Gemini returns a short description plus total calorie and protein
estimates; these drop into the existing meal form for the user to review, correct, and add.

Non-goals (YAGNI):
- No itemized breakdown of a plate — one photo produces **one** combined estimate.
- No auto-logging — the user always confirms via the existing Add button.
- No photo storage — images are used transiently and discarded.
- No history of scanned photos, no re-analysis, no editing a photo after capture.

---

## 2. Context

QuestLog is a client-only React + Vite app deployed to Firebase Hosting. There is **no backend**
and no Cloud Functions. State persists to Firestore (when signed in) or `localStorage` (local
mode), through a storage-adapter abstraction in `src/store.tsx`.

A meal entry today is:

```ts
interface MealEntry {
  id: string
  type: MealType        // 'breakfast' | 'lunch' | 'snack' | 'dinner'
  name: string
  kcal: number          // calories per unit
  protein: number       // grams of protein per unit
  qty: number           // count / servings, >= 1
}
```

Entries are created in `MealForm` inside `src/pages/Meals.tsx` and written via `store.update()`.
Config comes from `VITE_*` env vars, which are baked into the shipped client bundle — so no raw
secret can live in app code.

---

## 3. Key decisions

| Decision | Choice | Why |
|----------|--------|-----|
| API access | **Firebase AI Logic** (`firebase/ai`) | Reuses the Firebase SDK already bundled; no raw Gemini key in the client; secured by App Check. No server code to write or maintain. |
| Result flow | **Prefill the form, user confirms** | AI macro estimates are rough; the user must be able to correct before saving. |
| Items per photo | **One combined entry** | Matches how a user logs "lunch" as one line; fits the existing form with zero model changes. |
| Image source | **Camera + gallery** | `<input type="file" accept="image/*" capture="environment">` — camera-first on mobile, gallery/file everywhere. |
| Photo persistence | **Never stored** | Privacy; also avoids Firestore's 1 MB doc limit. Image is read into memory, sent, discarded. |
| Model | `gemini-2.5-flash` | Fast, cheap, multimodal; adequate for food estimation. |
| Output format | Gemini **structured output** (`responseSchema`) | Strict JSON back, no prose parsing. |

---

## 4. Architecture

Nothing about how meals are **stored or totaled** changes. This feature only *feeds* the existing
form. `MealEntry`, `mealTotals`, the store, and Firestore are untouched.

### Data flow

```
[📷 Scan food] tap
  → hidden file input (camera + gallery)
  → compressImage(file)                 // src/state/image.ts
  → analyzeFoodImage(compressed)         // src/state/vision.ts  -> FoodEstimate
  → toMealDraft(estimate)                // clamp + truncate + qty=1
  → prefill MealForm { name, kcal, protein, qty:'1' }
  → user reviews / edits
  → existing Add button → store.update()  (UNCHANGED)
```

### New module: `src/state/vision.ts` (~120 lines)

- Lazily initializes Firebase AI Logic:
  `getAI(app, { backend: new GoogleAIBackend() })` →
  `getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { responseMimeType, responseSchema } })`.
  Lazy so the AI SDK code loads only on first scan, keeping the initial bundle small.
- Exposes:

  ```ts
  export interface FoodEstimate {
    description: string
    kcal: number
    protein: number
    confidence: 'low' | 'medium' | 'high'
  }

  export async function analyzeFoodImage(file: File): Promise<FoodEstimate>

  // Pure — unit tested. Clamps to MEAL_LIMITS, truncates name, forces qty 1.
  export function toMealDraft(e: FoodEstimate): {
    name: string; kcal: string; protein: string; qty: string
  }
  ```

- Prompt: instruct Gemini to identify the food visible on the plate and estimate the **total**
  calories and **total** protein grams for the whole portion shown, returning a short description
  (≤ 80 chars, to fit the `name` field) and a confidence level. Return via `responseSchema` as:

  ```jsonc
  {
    "description": "string",
    "kcal": "number",     // total for the portion
    "protein": "number",  // grams, total for the portion
    "confidence": "low | medium | high"
  }
  ```

### New module: `src/state/image.ts` (~40 lines)

- `compressImage(file: File): Promise<{ base64: string; mimeType: string }>`
- Draws the image to a canvas, downscaled so the longest edge ≤ 1024px, exports JPEG at
  quality ~0.8, returns base64 (no data-URI prefix) + mime type for the Gemini inline-data part.
- Throws a typed error on decode failure; caller surfaces a friendly toast.

### Edit: `src/firebase.ts`

- Initialize **App Check** (reCAPTCHA v3 provider in production; debug token in dev) so the AI
  Logic endpoint cannot be abused by anyone who finds the app URL.
- Add a lazy `getAI`/model accessor (or expose the initialized `app` for `vision.ts` to use).
- New env var documented in `.env.example`: `VITE_RECAPTCHA_SITE_KEY` for App Check.

### Edit: `src/pages/Meals.tsx` (`MealForm`)

- Add a **"📷 Scan food"** button above the name input, plus a hidden
  `<input type="file" accept="image/*" capture="environment">`.
- New local state: `scanning: boolean`. Reuses existing `form` state for prefill.
- On file selected: set `scanning`, run compress → analyze → `toMealDraft` → merge into `form`.
- While scanning: button shows spinner + "Analyzing…" and is disabled; the rest of the form stays
  editable (manual entry always works).
- On success: fire a toast — `🔍 Scanned · <description> · ~<kcal> kcal`. If `confidence === 'low'`,
  append "Rough guess — double-check the numbers." Nothing is auto-added.
- The scan button is **only rendered when `mode === 'firebase'` and the user is signed in**
  (AI Logic + App Check require the Firebase app). Hidden in local mode.

---

## 5. Error handling (fail soft — manual entry must never break)

- `analyzeFoodImage` and `compressImage` are wrapped in try/catch in `MealForm`.
- Distinct, friendly toasts:
  - Not available (local mode / signed out): button hidden, so not reachable; defensive toast
    "Sign in to use photo scan" if invoked anyway.
  - Network / quota / SDK error: "Couldn't reach the food AI — enter it manually."
  - Empty or unparseable result: "Couldn't read that photo — try another or type it in."
  - Image decode / compression failure: "Couldn't read that image file."
- Every number from Gemini is **clamped to `MEAL_LIMITS`** in `toMealDraft` before it reaches the
  form, so a hallucinated value (e.g. 99,999 kcal) cannot land in the field.
- `description` is trimmed and truncated to `MEAL_LIMITS.name.max` (80).
- `scanning` is always reset in a `finally` block.

---

## 6. Testing

- **Unit** (`src/state/vision.test.ts`, Vitest — mirrors existing `meals.test.ts`): test the pure
  `toMealDraft` helper.
  - Clamps kcal/protein above `MEAL_LIMITS.max` down to max.
  - Clamps negative/NaN to 0 (or min).
  - Truncates a > 80-char description.
  - Always sets `qty` to `'1'`.
  - Rounds to one decimal (matching the form's existing behavior).
- The Firebase AI network call is thin glue kept isolated in `vision.ts`; not unit-tested (would
  only test the SDK). Structured so it is mockable if we later add an integration test.
- **Manual verification**: `npm run dev` — camera capture on phone, gallery pick on desktop;
  confirm prefill, low-confidence nudge, and each error toast (airplane mode for network error).

---

## 7. Files touched

| File | Change |
|------|--------|
| `src/state/vision.ts` | **new** — `FoodEstimate`, `analyzeFoodImage`, `toMealDraft` |
| `src/state/image.ts` | **new** — `compressImage` |
| `src/state/vision.test.ts` | **new** — unit tests for `toMealDraft` |
| `src/pages/Meals.tsx` | edit — scan button, hidden input, scanning state, prefill wiring |
| `src/firebase.ts` | edit — App Check init, AI model accessor |
| `.env.example` | edit — document `VITE_RECAPTCHA_SITE_KEY` |
| `package.json` | possible minor `firebase` bump for the `firebase/ai` entry point (≥ 11.6) |

---

## 8. One-time setup (user, outside code)

1. Upgrade the Firebase project to the **Blaze** plan.
2. Enable the **Firebase AI Logic** product in the Firebase console (Gemini Developer API backend).
3. Register **App Check** with a reCAPTCHA v3 site key; put it in `.env` as
   `VITE_RECAPTCHA_SITE_KEY`. Add a debug token for local development.
