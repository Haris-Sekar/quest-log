import { describe, expect, it } from 'vitest'
import { mealDayStats, mealTotals, newMealId } from './meals'
import { sanitizeState } from './sanitize'
import type { MealEntry, TrackerState } from './types'

const meal = (over: Partial<MealEntry> = {}): MealEntry => ({
  id: 'x',
  type: 'lunch',
  name: 'Idli',
  kcal: 40,
  protein: 2,
  qty: 1,
  ...over,
})

describe('mealTotals', () => {
  it('returns zeros for empty or missing lists', () => {
    expect(mealTotals(undefined)).toEqual({ kcal: 0, protein: 0, items: 0 })
    expect(mealTotals([])).toEqual({ kcal: 0, protein: 0, items: 0 })
  })

  it('multiplies per-unit calories and protein by quantity', () => {
    const totals = mealTotals([
      meal({ kcal: 40, protein: 2, qty: 3 }), // 3 idli
      meal({ kcal: 78, protein: 6, qty: 2 }), // 2 eggs
    ])
    expect(totals.kcal).toBe(40 * 3 + 78 * 2)
    expect(totals.protein).toBe(2 * 3 + 6 * 2)
    expect(totals.items).toBe(5)
  })
})

describe('mealDayStats', () => {
  const meals: TrackerState['meals'] = {
    // 110g protein hit, under 2000 kcal
    '2026-07-10': [meal({ kcal: 500, protein: 55, qty: 1 }), meal({ kcal: 400, protein: 60, qty: 1 })],
    // under calories but protein short
    '2026-07-11': [meal({ kcal: 1200, protein: 40, qty: 1 })],
    // over calories, protein ok
    '2026-07-12': [meal({ kcal: 2200, protein: 120, qty: 1 })],
    '2026-07-13': [], // empty -> ignored
  }

  it('counts logged, protein-target, and on-calorie days and averages kcal', () => {
    const s = mealDayStats(meals)
    expect(s.loggedDays).toBe(3)
    expect(s.proteinDays).toBe(2) // 07-10 (115g) and 07-12 (120g)
    expect(s.onCalorieDays).toBe(2) // 07-10 (900) and 07-11 (1200)
    expect(s.avgKcal).toBe(Math.round((900 + 1200 + 2200) / 3))
  })

  it('returns zeros when nothing is logged', () => {
    expect(mealDayStats({})).toEqual({ loggedDays: 0, proteinDays: 0, onCalorieDays: 0, avgKcal: 0 })
  })
})

describe('newMealId', () => {
  it('produces unique, non-empty ids', () => {
    const a = newMealId()
    const b = newMealId()
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
  })
})

describe('sanitizeState — meals', () => {
  it('defaults to an empty object when meals are missing or malformed', () => {
    expect(sanitizeState({}).meals).toEqual({})
    expect(sanitizeState({ meals: 'nope' }).meals).toEqual({})
  })

  it('keeps valid entries and drops invalid keys, unnamed items, and bad numbers', () => {
    const { meals } = sanitizeState({
      meals: {
        '2026-07-13': [
          { id: 'a', type: 'breakfast', name: '3 idli', kcal: 40, protein: 2, qty: 3 },
          { type: 'lunch', name: '', kcal: 100, protein: 5, qty: 1 }, // no name -> dropped
          { type: 'dinner', name: 'Overshoot', kcal: 99999, protein: -5, qty: 500 }, // clamped
        ],
        'not-a-date': [{ type: 'lunch', name: 'ghost', kcal: 1, protein: 1, qty: 1 }],
      },
    })
    expect(Object.keys(meals)).toEqual(['2026-07-13'])
    const day = meals['2026-07-13']
    expect(day).toHaveLength(2)
    expect(day[0]).toEqual({ id: 'a', type: 'breakfast', name: '3 idli', kcal: 40, protein: 2, qty: 3 })
    // out-of-range numbers fall back to safe defaults; qty clamps out then defaults
    expect(day[1].kcal).toBe(0)
    expect(day[1].protein).toBe(0)
    expect(day[1].qty).toBe(1)
    expect(day[1].id).toBeTruthy() // missing id gets generated
  })

  it('coerces an unknown meal type to snack and omits empty days', () => {
    const { meals } = sanitizeState({
      meals: {
        '2026-07-13': [{ name: 'Mystery', type: 'brunch', kcal: 50, protein: 1, qty: 1 }],
        '2026-07-14': [{ name: '', kcal: 10, protein: 0, qty: 1 }], // all dropped -> day omitted
      },
    })
    expect(meals['2026-07-13'][0].type).toBe('snack')
    expect(meals['2026-07-14']).toBeUndefined()
  })
})
