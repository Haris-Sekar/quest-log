import { KCAL_TARGET, PROTEIN_TARGET } from '../data/meals'
import type { MealEntry, MealTotals, TrackerState } from './types'

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

export interface MealDayStats {
  loggedDays: number // days with at least one item
  proteinDays: number // logged days that met the protein target
  onCalorieDays: number // logged days at or under the calorie target
  avgKcal: number // mean daily calories across logged days (0 if none)
}

/** Aggregate meal history across all days — used by goals and the calendar. */
export const mealDayStats = (meals: TrackerState['meals']): MealDayStats => {
  let loggedDays = 0
  let proteinDays = 0
  let onCalorieDays = 0
  let totalKcal = 0
  for (const list of Object.values(meals)) {
    const t = mealTotals(list)
    if (t.items === 0) continue
    loggedDays += 1
    totalKcal += t.kcal
    if (t.protein >= PROTEIN_TARGET) proteinDays += 1
    if (t.kcal <= KCAL_TARGET) onCalorieDays += 1
  }
  return {
    loggedDays,
    proteinDays,
    onCalorieDays,
    avgKcal: loggedDays ? Math.round(totalKcal / loggedDays) : 0,
  }
}

/** Collision-resistant id for a meal entry, with a fallback for older browsers. */
export const newMealId = (): string => {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID()
  return `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}
