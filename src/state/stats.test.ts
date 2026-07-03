import { describe, expect, it } from 'vitest'
import { levelInfo } from '../data/ranks'
import { dateKey, prevKey, todayKey } from './dates'
import { defaultState } from './defaults'
import { sanitizeState } from './sanitize'
import { applyAchievements, computeStats, dayQuestCount } from './stats'
import type { TrackerState } from './types'

const dayOffset = (offset: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return dateKey(d)
}

const withDays = (offsets: number[], quests: string[]): TrackerState => {
  const s = defaultState()
  const days: TrackerState['days'] = {}
  for (const o of offsets) {
    days[dayOffset(o)] = { q: Object.fromEntries(quests.map((q) => [q, true])) }
  }
  return { ...s, days }
}

describe('computeStats — streaks', () => {
  it('counts a fresh state as zero streak and zero xp', () => {
    const t = computeStats(defaultState())
    expect(t.curStreak).toBe(0)
    expect(t.bestStreak).toBe(0)
    expect(t.xp).toBe(0)
  })

  it('banks a streak day only at 3+ quests', () => {
    expect(dayQuestCount({ q: { gym: true, steps: true } })).toBe(2)
    const two = computeStats(withDays([0], ['gym', 'steps']))
    expect(two.curStreak).toBe(0)
    const three = computeStats(withDays([0], ['gym', 'steps', 'water']))
    expect(three.curStreak).toBe(1)
  })

  it('keeps the current streak alive when today is not yet banked', () => {
    const t = computeStats(withDays([-2, -1], ['gym', 'steps', 'water']))
    expect(t.curStreak).toBe(2)
  })

  it('breaks the streak on a gap and tracks best separately', () => {
    const t = computeStats(withDays([-5, -4, -3, -1], ['gym', 'steps', 'water']))
    expect(t.curStreak).toBe(1)
    expect(t.bestStreak).toBe(3)
  })
})

describe('computeStats — weight and xp', () => {
  it('derives lost/min/current from weigh-ins', () => {
    const s: TrackerState = {
      ...defaultState(),
      weights: [
        { d: '2026-06-01', kg: 150 },
        { d: '2026-06-15', kg: 146.5 },
        { d: '2026-06-08', kg: 148 },
      ],
    }
    const t = computeStats(s)
    expect(t.curW).toBe(146.5)
    expect(t.minW).toBe(146.5)
    expect(t.lost).toBe(3.5)
  })

  it('sums quest xp and weigh-in xp', () => {
    const key = todayKey()
    const s: TrackerState = {
      ...defaultState(),
      days: { [key]: { q: { gym: true, water: true }, weighed: true } },
    }
    expect(computeStats(s).xp).toBe(30 + 10 + 25)
  })
})

describe('levelInfo', () => {
  it('starts at level 1 with a 100 xp span', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, rank: 'Rookie', into: 0, span: 100 })
  })
  it('levels up exactly at the threshold', () => {
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100).level).toBe(2)
    expect(levelInfo(300).level).toBe(3)
  })
})

describe('applyAchievements', () => {
  it('unlocks first weigh-in and boss achievements', () => {
    const s: TrackerState = { ...defaultState(), weights: [{ d: '2026-07-01', kg: 139.5 }] }
    const { state, fresh } = applyAchievements(s)
    expect(fresh).toContain('scale')
    expect(fresh).toContain('b140')
    expect(fresh).toContain('lost10')
    expect(state.ach.scale).toBeTruthy()
  })

  it('never re-unlocks or removes stamped achievements', () => {
    const first = applyAchievements({ ...defaultState(), weights: [{ d: '2026-07-01', kg: 145 }] })
    const again = applyAchievements(first.state)
    expect(again.fresh).toEqual([])
    expect(again.state.ach.scale).toBe(first.state.ach.scale)
  })
})

describe('sanitizeState', () => {
  it('returns defaults for garbage input', () => {
    expect(sanitizeState(null).startWeight).toBe(150)
    expect(sanitizeState('nonsense').goalWeight).toBe(90)
  })

  it('drops invalid weights and clamps out-of-range numbers', () => {
    const s = sanitizeState({
      startWeight: '<script>alert(1)</script>',
      goalWeight: 500,
      weights: [
        { d: '2026-07-01', kg: 149 },
        { d: 'not-a-date', kg: 100 },
        { d: '2026-07-02', kg: 9999 },
      ],
    })
    expect(s.startWeight).toBe(150)
    expect(s.goalWeight).toBe(90)
    expect(s.weights).toEqual([{ d: '2026-07-01', kg: 149 }])
  })

  it('keeps goal strictly below start', () => {
    const s = sanitizeState({ startWeight: 100, goalWeight: 120 })
    expect(s.goalWeight).toBeLessThan(s.startWeight)
  })
})

describe('date helpers', () => {
  it('prevKey crosses month boundaries', () => {
    expect(prevKey('2026-07-01')).toBe('2026-06-30')
    expect(prevKey('2026-01-01')).toBe('2025-12-31')
  })
})
