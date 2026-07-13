import { describe, expect, it } from 'vitest'
import { sanitizeState } from './sanitize'
import {
  periodKeyFor,
  prevPeriodDayKey,
  recentPeriods,
  taskDoneOn,
  taskStreak,
  taskValueDone,
} from './tasks'
import type { TaskDef, TrackerState } from './types'

const task = (over: Partial<TaskDef> = {}): TaskDef => ({
  id: 't1',
  title: 'Task',
  period: 'daily',
  kind: 'toggle',
  createdAt: '2026-07-01',
  ...over,
})

describe('periodKeyFor', () => {
  it('buckets by period', () => {
    expect(periodKeyFor('once', '2026-07-13')).toBe('once')
    expect(periodKeyFor('daily', '2026-07-13')).toBe('d:2026-07-13')
    expect(periodKeyFor('monthly', '2026-07-13')).toBe('m:2026-07')
    // 2026-07-13 is a Monday → week start is itself
    expect(periodKeyFor('weekly', '2026-07-13')).toBe('w:2026-07-13')
    // 2026-07-16 (Thu) belongs to the same week
    expect(periodKeyFor('weekly', '2026-07-16')).toBe('w:2026-07-13')
  })
})

describe('prevPeriodDayKey', () => {
  it('steps back one period, or null for once', () => {
    expect(prevPeriodDayKey('once', '2026-07-13')).toBeNull()
    expect(prevPeriodDayKey('daily', '2026-07-13')).toBe('2026-07-12')
    expect(periodKeyFor('weekly', prevPeriodDayKey('weekly', '2026-07-13')!)).toBe('w:2026-07-06')
    expect(periodKeyFor('monthly', prevPeriodDayKey('monthly', '2026-07-13')!)).toBe('m:2026-06')
  })
})

describe('taskValueDone', () => {
  it('handles each kind', () => {
    expect(taskValueDone(task({ kind: 'toggle' }), true)).toBe(true)
    expect(taskValueDone(task({ kind: 'toggle' }), undefined)).toBe(false)
    const num = task({ kind: 'number', target: 10 })
    expect(taskValueDone(num, 9)).toBe(false)
    expect(taskValueDone(num, 10)).toBe(true)
    const txt = task({ kind: 'text', targetText: 'Focus' })
    expect(taskValueDone(txt, '  focus ')).toBe(true) // case + space insensitive
    expect(taskValueDone(txt, 'nope')).toBe(false)
  })
})

describe('taskStreak & recentPeriods', () => {
  it('counts consecutive completed daily periods ending today', () => {
    const t = task({ id: 't1', period: 'daily', kind: 'toggle' })
    const log: TrackerState['taskLog'] = {
      t1: { 'd:2026-07-13': true, 'd:2026-07-12': true, 'd:2026-07-10': true },
    }
    // today done, yesterday done, gap on the 11th breaks it
    expect(taskStreak(t, log, '2026-07-13')).toBe(2)
    expect(taskDoneOn(t, log, '2026-07-11')).toBe(false)
    // last 4 periods oldest→newest are the 10th, 11th, 12th, 13th
    const cells = recentPeriods(t, log, 4, '2026-07-13')
    expect(cells).toEqual([true, false, true, true]) // 10 ✓, 11 ✗, 12 ✓, 13 ✓
  })

  it('returns 0 streak and empty history for one-off tasks', () => {
    const t = task({ period: 'once' })
    expect(taskStreak(t, {}, '2026-07-13')).toBe(0)
    expect(recentPeriods(t, {}, 7, '2026-07-13')).toEqual([])
  })
})

describe('sanitizeState — tasks & taskLog', () => {
  it('keeps valid tasks, drops untitled ones, and coerces enums', () => {
    const { tasks } = sanitizeState({
      tasks: [
        { id: 'a', title: 'Steps', period: 'daily', kind: 'number', target: 10000, unit: 'steps' },
        { title: '', period: 'daily', kind: 'toggle' }, // untitled -> dropped
        { title: 'Weird', period: 'yearly', kind: 'blob' }, // bad enums -> once/toggle
      ],
    })
    expect(tasks).toHaveLength(2)
    expect(tasks[0]).toMatchObject({ id: 'a', kind: 'number', target: 10000, unit: 'steps' })
    expect(tasks[1]).toMatchObject({ title: 'Weird', period: 'once', kind: 'toggle' })
  })

  it('drops log entries for unknown task ids and bad value types', () => {
    const { taskLog } = sanitizeState({
      tasks: [{ id: 'a', title: 'T', period: 'daily', kind: 'toggle' }],
      taskLog: {
        a: { 'd:2026-07-13': true, 'd:2026-07-12': { nope: 1 }, 'd:2026-07-11': 5 },
        ghost: { 'd:2026-07-13': true }, // orphan -> dropped
      },
    })
    expect(Object.keys(taskLog)).toEqual(['a'])
    expect(taskLog.a).toEqual({ 'd:2026-07-13': true, 'd:2026-07-11': 5 })
  })
})
