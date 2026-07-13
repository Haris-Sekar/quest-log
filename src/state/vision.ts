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
