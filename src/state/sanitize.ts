import { MEAL_LIMITS, MEAL_TYPES } from '../data/meals'
import { newMealId } from './meals'
import { DATE_RE } from './dates'
import { defaultState } from './defaults'
import type { MealEntry, MealType, TrackerState } from './types'

const num = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 10) / 10 : fallback
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const MEAL_TYPE_IDS = new Set<string>(MEAL_TYPES.map((m) => m.id))

const sanitizeMeal = (raw: unknown): MealEntry | null => {
  if (!isRecord(raw)) return null
  const type = typeof raw.type === 'string' && MEAL_TYPE_IDS.has(raw.type) ? (raw.type as MealType) : 'snack'
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MEAL_LIMITS.name.max) : ''
  if (!name) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newMealId(),
    type,
    name,
    kcal: num(raw.kcal, MEAL_LIMITS.kcal.min, MEAL_LIMITS.kcal.max, 0),
    protein: num(raw.protein, MEAL_LIMITS.protein.min, MEAL_LIMITS.protein.max, 0),
    qty: Math.round(num(raw.qty, MEAL_LIMITS.qty.min, MEAL_LIMITS.qty.max, 1)),
  }
}

const sanitizeMeals = (parsed: unknown): TrackerState['meals'] => {
  if (!isRecord(parsed)) return {}
  const out: TrackerState['meals'] = {}
  for (const [key, list] of Object.entries(parsed)) {
    if (!DATE_RE.test(key) || !Array.isArray(list)) continue
    const clean = list.map(sanitizeMeal).filter((m): m is MealEntry => m !== null)
    if (clean.length) out[key] = clean
  }
  return out
}

/**
 * Coerce untrusted input (storage, imported backups, remote docs) into a safe
 * TrackerState: only validated numbers and date keys survive.
 */
export const sanitizeState = (parsed: unknown): TrackerState => {
  const d = defaultState()
  if (!isRecord(parsed)) return d
  const start = num(parsed.startWeight, 40, 300, d.startWeight)
  const weightsRaw = Array.isArray(parsed.weights) ? parsed.weights : []
  return {
    startWeight: start,
    goalWeight: Math.min(num(parsed.goalWeight, 40, 300, d.goalWeight), start - 0.1),
    startDate:
      typeof parsed.startDate === 'string' && DATE_RE.test(parsed.startDate)
        ? parsed.startDate
        : d.startDate,
    weights: weightsRaw
      .filter((w): w is Record<string, unknown> => isRecord(w) && typeof w.d === 'string' && DATE_RE.test(w.d))
      .map((w) => ({ d: w.d as string, kg: num(w.kg, 40, 300, NaN) }))
      .filter((w) => Number.isFinite(w.kg))
      .sort((a, b) => (a.d < b.d ? -1 : 1)),
    days: isRecord(parsed.days) ? (parsed.days as TrackerState['days']) : {},
    meals: sanitizeMeals(parsed.meals),
    ach: isRecord(parsed.ach) ? (parsed.ach as TrackerState['ach']) : {},
  }
}
