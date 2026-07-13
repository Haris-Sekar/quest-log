# Meal Photo Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user photograph a plate in the Meals tab and have Gemini prefill the meal form with an estimated description, calories, and protein.

**Architecture:** A new pure mapping layer (`vision.ts`) and image helper (`image.ts`) sit between a hidden file input in `MealForm` and the existing meal form state. The photo is compressed client-side, sent to Gemini through Firebase AI Logic (`firebase/ai`, secured by App Check), and the structured JSON result is clamped and dropped into the existing form fields. Nothing about how meals are stored or totaled changes — the feature only *feeds* the current form; the user confirms with the existing Add button.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Firebase 11.10 (`firebase/ai`, `firebase/app-check`), Gemini `gemini-2.5-flash`.

## Global Constraints

- **Firebase version:** already `firebase@^11.0.0` resolving to `11.10.0` — `firebase/ai` and `firebase/app-check` are present. **No version bump needed.**
- **No raw Gemini key in code** — access is only via `firebase/ai` (Firebase AI Logic).
- **Photo is never persisted** — no Firestore, no localStorage; read into memory, sent, discarded.
- **Manual entry must never break** — every AI path fails soft with a toast; the form stays usable.
- **All numbers clamped to `MEAL_LIMITS`** (`src/data/meals.ts`) before touching the form: `kcal` 0–5000, `protein` 0–500, `qty` 1–99, `name` max 80 chars.
- **Feature hidden unless `mode === 'firebase'` and a user is signed in** (AI Logic + App Check need the Firebase app).
- **Immutability:** update form state with spreads, never mutate (repo convention).
- **No `console.log`** in shipped code (repo convention; `console.error` in catch blocks is fine, matching `store.tsx`).
- **Toast signature:** `toast(title: string, body?: string)` from `src/ui/Toast.tsx` (see existing usage in `Meals.tsx`).
- **Model:** `gemini-2.5-flash`. **Structured output** via `responseMimeType: 'application/json'` + `responseSchema`.

---

### Task 1: Pure meal-draft mapping (`toMealDraft` + `FoodEstimate`)

The logic worth locking down with tests: turning a raw Gemini estimate into safe form values.

**Files:**
- Create: `src/state/vision.ts`
- Test: `src/state/vision.test.ts`

**Interfaces:**
- Consumes: `MEAL_LIMITS` from `src/data/meals.ts`.
- Produces:
  - `interface FoodEstimate { description: string; kcal: number; protein: number; confidence: 'low' | 'medium' | 'high' }`
  - `interface MealDraft { name: string; kcal: string; protein: string; qty: string }`
  - `function toMealDraft(e: FoodEstimate): MealDraft` — clamps `kcal`/`protein` into `MEAL_LIMITS` (NaN/negative → min, over-max → max), rounds to one decimal, truncates `description` to `MEAL_LIMITS.name.max`, forces `qty` to `'1'`. Numbers returned as strings to match the form's `useState` shape (`blankForm`).

- [ ] **Step 1: Write the failing test**

Create `src/state/vision.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toMealDraft, type FoodEstimate } from './vision'

const est = (over: Partial<FoodEstimate> = {}): FoodEstimate => ({
  description: 'Idli with sambar',
  kcal: 320,
  protein: 12,
  confidence: 'medium',
  ...over,
})

describe('toMealDraft', () => {
  it('maps a normal estimate to string form fields with qty 1', () => {
    expect(toMealDraft(est())).toEqual({
      name: 'Idli with sambar',
      kcal: '320',
      protein: '12',
      qty: '1',
    })
  })

  it('clamps values above MEAL_LIMITS down to the max', () => {
    const d = toMealDraft(est({ kcal: 99999, protein: 9999 }))
    expect(d.kcal).toBe('5000')
    expect(d.protein).toBe('500')
  })

  it('clamps negative or NaN numbers up to 0', () => {
    const d = toMealDraft(est({ kcal: -50, protein: Number.NaN }))
    expect(d.kcal).toBe('0')
    expect(d.protein).toBe('0')
  })

  it('rounds to one decimal place', () => {
    expect(toMealDraft(est({ kcal: 320.567, protein: 12.44 })).kcal).toBe('320.6')
  })

  it('truncates a description longer than 80 characters', () => {
    const long = 'a'.repeat(200)
    expect(toMealDraft(est({ description: long })).name.length).toBe(80)
  })

  it('trims whitespace from the description', () => {
    expect(toMealDraft(est({ description: '  Dosa  ' })).name).toBe('Dosa')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/state/vision.test.ts`
Expected: FAIL — `Failed to resolve import "./vision"` / `toMealDraft is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/state/vision.ts`:

```ts
import { MEAL_LIMITS } from '../data/meals'

export interface FoodEstimate {
  description: string
  kcal: number
  protein: number
  confidence: 'low' | 'medium' | 'high'
}

export interface MealDraft {
  name: string
  kcal: string
  protein: string
  qty: string
}

/** Clamp a possibly-bad number into [min, max], rounding to one decimal.
 *  NaN/Infinity fall back to min. */
const clamp = (n: number, min: number, max: number): number => {
  if (!Number.isFinite(n)) return min
  const bounded = Math.min(max, Math.max(min, n))
  return Math.round(bounded * 10) / 10
}

/** Turn a raw Gemini estimate into safe, form-ready string fields.
 *  Pure: no network, no side effects. */
export const toMealDraft = (e: FoodEstimate): MealDraft => ({
  name: e.description.trim().slice(0, MEAL_LIMITS.name.max),
  kcal: String(clamp(e.kcal, MEAL_LIMITS.kcal.min, MEAL_LIMITS.kcal.max)),
  protein: String(clamp(e.protein, MEAL_LIMITS.protein.min, MEAL_LIMITS.protein.max)),
  qty: '1',
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/state/vision.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/vision.ts src/state/vision.test.ts
git commit -m "feat: add toMealDraft mapping for meal photo scan"
```

---

### Task 2: Image compression helper (`compressImage` + pure `fitWithin`)

**Files:**
- Create: `src/state/image.ts`
- Test: `src/state/image.test.ts`

**Interfaces:**
- Produces:
  - `function fitWithin(w: number, h: number, max: number): { w: number; h: number }` — pure. Scales dimensions so the longest edge ≤ `max`, preserving aspect ratio and rounding to integers; never upscales.
  - `interface InlineImage { base64: string; mimeType: string }`
  - `async function compressImage(file: File): Promise<InlineImage>` — decodes the file, downscales via `fitWithin(_, _, 1024)`, draws to a canvas, exports JPEG at quality 0.8, returns base64 **without** the `data:...;base64,` prefix plus `mimeType: 'image/jpeg'`. Throws `Error('decode-failed')` if the image cannot be loaded.

Note: `compressImage` uses canvas/`Image`, which aren't available in the Vitest (node) env — only the pure `fitWithin` is unit-tested. `compressImage` is verified during Task 5 manual testing.

- [ ] **Step 1: Write the failing test**

Create `src/state/image.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fitWithin } from './image'

describe('fitWithin', () => {
  it('leaves an image already within bounds unchanged', () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ w: 800, h: 600 })
  })

  it('scales a wide image so the longest edge equals max', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ w: 1024, h: 768 })
  })

  it('scales a tall image so the height equals max', () => {
    expect(fitWithin(3000, 4000, 1024)).toEqual({ w: 768, h: 1024 })
  })

  it('never upscales a small image', () => {
    expect(fitWithin(200, 100, 1024)).toEqual({ w: 200, h: 100 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/state/image.test.ts`
Expected: FAIL — `Failed to resolve import "./image"` / `fitWithin is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/state/image.ts`:

```ts
/** Longest-edge cap for images sent to Gemini — keeps tokens and upload small. */
const MAX_EDGE = 1024
const JPEG_QUALITY = 0.8

export interface InlineImage {
  base64: string
  mimeType: string
}

/** Scale (w, h) so the longest edge is at most `max`, preserving aspect ratio.
 *  Never upscales. Pure. */
export const fitWithin = (w: number, h: number, max: number): { w: number; h: number } => {
  const longest = Math.max(w, h)
  if (longest <= max) return { w, h }
  const scale = max / longest
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

/** Decode an image file, downscale, and return base64 JPEG for a Gemini
 *  inline-data part. Throws Error('decode-failed') if the file can't be read. */
export const compressImage = (file: File): Promise<InlineImage> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight, MAX_EDGE)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('decode-failed'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      const base64 = dataUrl.split(',')[1] ?? ''
      resolve({ base64, mimeType: 'image/jpeg' })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode-failed'))
    }
    img.src = url
  })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/state/image.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/image.ts src/state/image.test.ts
git commit -m "feat: add client-side image compression for meal scan"
```

---

### Task 3: Firebase App Check + Gemini model accessor

**Files:**
- Modify: `src/firebase.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: existing private `ensureApp()` and `firebaseConfigured` in `src/firebase.ts`.
- Produces: `function getFoodModel(): GenerativeModel` — lazily starts App Check (if `VITE_RECAPTCHA_SITE_KEY` is set), creates the Firebase AI Logic model on the Google AI backend with the `FoodEstimate` `responseSchema`, and memoizes it.

No unit test — this is Firebase configuration glue. Verified by `npm run build` (typecheck) here and by manual scan in Task 5.

- [ ] **Step 1: Add App Check + AI model accessor to `src/firebase.ts`**

Add these imports at the top of `src/firebase.ts` (alongside the existing imports):

```ts
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAI, getGenerativeModel, GoogleAIBackend, Schema, type GenerativeModel } from 'firebase/ai'
```

Append to the end of `src/firebase.ts`:

```ts
let appCheckStarted = false

/** Start App Check once, if a reCAPTCHA site key is configured. In dev, set a
 *  debug token so localhost passes without a real reCAPTCHA challenge. */
const ensureAppCheck = (fbApp: FirebaseApp): void => {
  if (appCheckStarted) return
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined
  if (!siteKey) return
  if (import.meta.env.DEV) {
    // @ts-expect-error — debug flag read by the App Check SDK at init time
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(fbApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
  appCheckStarted = true
}

let foodModel: GenerativeModel | null = null

/** The Gemini model used for food-photo estimation, via Firebase AI Logic.
 *  Structured output: returns strict JSON matching FoodEstimate. Lazy so the
 *  AI SDK only loads on first scan. Requires Firebase to be configured. */
export const getFoodModel = (): GenerativeModel => {
  const fbApp = ensureApp()
  ensureAppCheck(fbApp)
  if (!foodModel) {
    const ai = getAI(fbApp, { backend: new GoogleAIBackend() })
    foodModel = getGenerativeModel(ai, {
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: Schema.object({
          properties: {
            description: Schema.string(),
            kcal: Schema.number(),
            protein: Schema.number(),
            confidence: Schema.enumString({ enum: ['low', 'medium', 'high'] }),
          },
        }),
      },
    })
  }
  return foodModel
}
```

Note: `ensureApp` is already defined as a private `const` in this file and returns `FirebaseApp`; `FirebaseApp` is already imported at the top. `getFoodModel` is added in the same file specifically so it can reach `ensureApp`.

- [ ] **Step 2: Document the new env var in `.env.example`**

Append to `.env.example`:

```
# App Check reCAPTCHA v3 site key — Firebase Console → App Check → Apps → reCAPTCHA v3.
# Required for the meal photo-scan feature (protects the Gemini/AI Logic endpoint).
# Leave blank to run without App Check (fine for local dev with a debug token).
VITE_RECAPTCHA_SITE_KEY=
```

- [ ] **Step 3: Verify it typechecks and builds**

Run: `npm run build`
Expected: PASS — no TypeScript errors, `dist/` produced.

- [ ] **Step 4: Commit**

```bash
git add src/firebase.ts .env.example
git commit -m "feat: add App Check and Gemini model accessor via Firebase AI Logic"
```

---

### Task 4: Gemini call (`analyzeFoodImage`)

**Files:**
- Modify: `src/state/vision.ts`

**Interfaces:**
- Consumes: `getFoodModel()` from `src/firebase.ts` (Task 3); `compressImage`, `InlineImage` from `src/state/image.ts` (Task 2).
- Produces: `async function analyzeFoodImage(file: File): Promise<FoodEstimate>` — compresses the file, calls Gemini with a food-estimation prompt + inline image, parses the structured JSON, and returns a validated `FoodEstimate`. Throws `Error('empty-result')` if the model returns nothing parseable; lets other errors (network/quota) propagate for the caller to catch.

No unit test — this is network glue over the SDK (the pure mapping is already covered in Task 1). Verified by `npm run build` here and manual scan in Task 5.

- [ ] **Step 1: Add the prompt constant and `analyzeFoodImage` to `src/state/vision.ts`**

Add imports at the top of `src/state/vision.ts`:

```ts
import { getFoodModel } from '../firebase'
import { compressImage } from './image'
```

Append to `src/state/vision.ts`:

```ts
const PROMPT = [
  'You are a nutrition estimator. Look at the food in this photo.',
  'Identify the dish(es) visible and estimate the TOTAL calories and TOTAL',
  'grams of protein for the whole portion shown (not per item).',
  'Return: description (a short label, max 80 characters, e.g.',
  '"3 idli + sambar"), kcal (total calories), protein (total grams), and',
  'confidence (low if the food is unclear or hard to size, high if obvious).',
].join(' ')

/** Send a food photo to Gemini and get back a single combined estimate.
 *  Throws Error('empty-result') on an unparseable/empty response; network and
 *  quota errors propagate to the caller. */
export const analyzeFoodImage = async (file: File): Promise<FoodEstimate> => {
  const { base64, mimeType } = await compressImage(file)
  const model = getFoodModel()
  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: base64, mimeType } },
  ])
  const text = result.response.text()
  if (!text) throw new Error('empty-result')

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('empty-result')
  }

  const raw = parsed as Partial<FoodEstimate>
  if (typeof raw.description !== 'string') throw new Error('empty-result')
  const confidence: FoodEstimate['confidence'] =
    raw.confidence === 'low' || raw.confidence === 'high' ? raw.confidence : 'medium'
  return {
    description: raw.description,
    kcal: Number(raw.kcal),
    protein: Number(raw.protein),
    confidence,
  }
}
```

Note: `kcal`/`protein` are coerced with `Number(...)` and may be `NaN` here — `toMealDraft` (Task 1) clamps `NaN` to the minimum, so the form never receives a bad value.

- [ ] **Step 2: Verify it typechecks and builds**

Run: `npm run build`
Expected: PASS — no TypeScript errors.

- [ ] **Step 3: Verify the existing pure tests still pass**

Run: `npm test -- src/state/vision.test.ts`
Expected: PASS (6 tests) — adding `analyzeFoodImage` must not break `toMealDraft`.

- [ ] **Step 4: Commit**

```bash
git add src/state/vision.ts
git commit -m "feat: add analyzeFoodImage Gemini call for meal photo scan"
```

---

### Task 5: MealForm scan UI + wiring

**Files:**
- Modify: `src/pages/Meals.tsx` (the `MealForm` component, lines ~90–182)
- Modify: `src/styles.css` (add scan-button styles)

**Interfaces:**
- Consumes: `analyzeFoodImage`, `toMealDraft` from `src/state/vision.ts`; `useStore()` (for `mode`, `user`) and `useToast()` — both already imported/used in this file.

- [ ] **Step 1: Wire scan state and handler into `MealForm`**

In `src/pages/Meals.tsx`, add to the imports at the top:

```ts
import { useRef } from 'react'
import { analyzeFoodImage, toMealDraft } from '../state/vision'
```

(Merge `useRef` into the existing `import { useMemo, useState } from 'react'` line so it reads `import { useMemo, useRef, useState } from 'react'`.)

Inside `MealForm`, replace the current destructure:

```ts
  const { update } = useStore()
```

with:

```ts
  const { update, mode, user } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const canScan = mode === 'firebase' && Boolean(user)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setScanning(true)
    try {
      const draft = toMealDraft(await analyzeFoodImage(file))
      setForm((f) => ({ ...f, ...draft }))
      const est = `${Math.round(Number(draft.kcal))} kcal`
      toast('🔍 Scanned', `${draft.name} · ~${est}. Review the numbers, then add.`)
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'decode-failed') toast('⚠️ Bad image', "Couldn't read that image file.")
      else if (code === 'empty-result') toast('⚠️ No food found', 'Try another photo or type it in.')
      else toast('⚠️ Scan failed', "Couldn't reach the food AI — enter it manually.")
    } finally {
      setScanning(false)
    }
  }
```

- [ ] **Step 2: Add the scan button + hidden input to the JSX**

In `MealForm`'s returned JSX, immediately after the `<div className="seg" ...>...</div>` meal-type selector block and before the `<input className="meal-name" ... />`, insert:

```tsx
      {canScan && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onPick}
          />
          <button
            type="button"
            className="btn scan-btn"
            disabled={scanning}
            onClick={() => fileRef.current?.click()}
          >
            {scanning ? '⏳ Analyzing…' : '📷 Scan food'}
          </button>
        </>
      )}
```

- [ ] **Step 3: Add scan-button styles to `src/styles.css`**

Append:

```css
.scan-btn {
  width: 100%;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.scan-btn:disabled {
  opacity: 0.6;
  cursor: progress;
}
```

- [ ] **Step 4: Verify it typechecks and builds**

Run: `npm run build`
Expected: PASS — no TypeScript errors, `dist/` produced.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — all existing tests plus the two new files (Tasks 1 & 2) green.

- [ ] **Step 6: Manual verification**

Run: `npm run dev` and open the Meals tab **while signed in** (Firebase mode).
- Confirm the **📷 Scan food** button appears above the food-name field.
- On desktop: click it, pick a food image → fields prefill, toast fires.
- On phone (same LAN via `--host`): the button offers camera + gallery.
- Confirm the button is **absent** in local/signed-out mode.
- Airplane mode → scan → "Couldn't reach the food AI" toast; form still usable.

(App Check note: for local dev, register the debug token printed in the browser console under Firebase Console → App Check → Apps → Manage debug tokens, or leave `VITE_RECAPTCHA_SITE_KEY` blank to skip App Check entirely in dev.)

- [ ] **Step 7: Commit**

```bash
git add src/pages/Meals.tsx src/styles.css
git commit -m "feat: add photo scan button to meal form"
```

---

## Self-Review

**Spec coverage:**
- Firebase AI Logic access, no raw key → Task 3 (`getFoodModel` via `getAI`/`GoogleAIBackend`). ✓
- Prefill form, user confirms → Task 5 (`setForm(...draft)`, existing Add button untouched). ✓
- One combined entry → Task 4 prompt ("TOTAL … whole portion"), `qty: '1'` in Task 1. ✓
- Camera + gallery → Task 5 (`accept="image/*" capture="environment"`). ✓
- Photo never stored → only passed through `compressImage` → `generateContent`; never written to store. ✓
- `gemini-2.5-flash` + structured output → Task 3 (`responseSchema`). ✓
- Compress client-side (≤1024px, JPEG 0.8) → Task 2. ✓
- App Check (reCAPTCHA v3 prod, debug token dev) + `VITE_RECAPTCHA_SITE_KEY` → Task 3. ✓
- Clamp to `MEAL_LIMITS`, truncate name → Task 1. ✓
- Fail soft, distinct toasts (network / empty / decode) → Task 5. ✓
- Hidden unless firebase mode + signed in → Task 5 (`canScan`). ✓
- Unit tests for the pure mapping → Task 1 (`vision.test.ts`); bonus `fitWithin` → Task 2. ✓
- No firebase bump needed (11.10.0 ships `firebase/ai`) → Global Constraints. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `FoodEstimate` (Task 1) is the single return type of `analyzeFoodImage` (Task 4) and input to `toMealDraft` (Task 1); `MealDraft` fields (`name/kcal/protein/qty` strings) match `blankForm` in `Meals.tsx` and the spread `setForm((f) => ({ ...f, ...draft }))`. `getFoodModel` (Task 3) → consumed in Task 4. `compressImage`/`InlineImage` (Task 2) → consumed in Task 4. Confidence narrowed to the same `'low'|'medium'|'high'` union throughout. ✓
