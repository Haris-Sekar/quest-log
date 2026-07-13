import { describe, expect, it } from 'vitest'
import { defaultState } from '../state/defaults'
import { computeStats } from '../state/stats'
import type { MealEntry, TrackerState } from '../state/types'
import { GOALS, goalPct } from './goals'

const find = (id: string) => {
  const g = GOALS.find((x) => x.id === id)
  if (!g) throw new Error(`no goal ${id}`)
  return g
}

const evalGoal = (id: string, s: TrackerState) => find(id).progress(s, computeStats(s))

const meal = (over: Partial<MealEntry>): MealEntry => ({
  id: 'x', type: 'lunch', name: 'f', kcal: 0, protein: 0, qty: 1, ...over,
})

describe('goals — weight', () => {
  it('tracks kg lost toward the start→goal span and completes at goal', () => {
    const base: TrackerState = { ...defaultState(), startWeight: 150, goalWeight: 90 }
    const none = evalGoal('weight', base)
    expect(none.target).toBe(60)
    expect(none.done).toBe(false)

    const atGoal = evalGoal('weight', { ...base, weights: [{ d: '2026-07-01', kg: 90 }] })
    expect(atGoal.done).toBe(true)
  })
})

describe('goals — streak (merged in)', () => {
  it('completes the 14-day streak goal only at 14+', () => {
    const s = defaultState()
    // fabricate a best streak via stats by stamping consecutive qualifying days
    const days: TrackerState['days'] = {}
    for (let i = 1; i <= 14; i++) {
      days[`2026-06-${String(i).padStart(2, '0')}`] = { q: { gym: true, steps: true, water: true } }
    }
    const p = evalGoal('streak14', { ...s, days })
    expect(p.current).toBe(14)
    expect(p.done).toBe(true)
  })
})

describe('goals — meal-derived', () => {
  it('counts protein-target days for the protein goal', () => {
    const s: TrackerState = {
      ...defaultState(),
      meals: {
        '2026-07-10': [meal({ protein: 120, kcal: 1500 })],
        '2026-07-11': [meal({ protein: 50, kcal: 1500 })],
      },
    }
    const p = evalGoal('protein30', s)
    expect(p.current).toBe(1)
    expect(p.target).toBe(30)
    expect(p.done).toBe(false)
  })
})

describe('goalPct', () => {
  it('clamps to 0–100 and honors done for zero-target goals', () => {
    expect(goalPct({ current: 5, target: 10, done: false, label: '' })).toBe(50)
    expect(goalPct({ current: 20, target: 10, done: true, label: '' })).toBe(100)
    expect(goalPct({ current: 0, target: 0, done: true, label: '' })).toBe(100)
  })
})
