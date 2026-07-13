import type { MealEntry, MealTotals } from './types'

/** Sum a day's meals. Calories/protein are per-unit, so multiply by qty. */
export const mealTotals = (meals: MealEntry[] | undefined): MealTotals => {
  if (!meals?.length) return { kcal: 0, protein: 0, items: 0 }
  return meals.reduce<MealTotals>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal * m.qty,
      protein: acc.protein + m.protein * m.qty,
      items: acc.items + m.qty,
    }),
    { kcal: 0, protein: 0, items: 0 },
  )
}

/** Collision-resistant id for a meal entry, with a fallback for older browsers. */
export const newMealId = (): string => {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID()
  return `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}
