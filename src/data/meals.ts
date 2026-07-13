import type { MealTypeDef } from '../state/types'

/** The four slots a day's food falls into, in the order they're eaten. */
export const MEAL_TYPES: MealTypeDef[] = [
  { id: 'breakfast', icon: '🍳', label: 'Breakfast' },
  { id: 'lunch', icon: '🍛', label: 'Lunch' },
  { id: 'snack', icon: '🍎', label: 'Snack' },
  { id: 'dinner', icon: '🌙', label: 'Dinner' },
]

/** Daily calorie ceiling — the upper bound of the 1,800–2,000 diet target. */
export const KCAL_TARGET = 2000

/** Daily protein floor — protects muscle in the deficit (DIET-PLAN.md). */
export const PROTEIN_TARGET = 110

/** Guard rails for user-entered numbers, shared by the form and sanitizer. */
export const MEAL_LIMITS = {
  kcal: { min: 0, max: 5000 },
  protein: { min: 0, max: 500 },
  qty: { min: 1, max: 99 },
  name: { max: 80 },
} as const
