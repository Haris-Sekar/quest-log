import { dateKey } from './dates'
import type { TaskDef, TaskPeriod, TaskValue, TrackerState } from './types'

const parts = (dayKey: string): [number, number, number] => {
  const [y, m, d] = dayKey.split('-').map(Number)
  return [y, m, d]
}

/** Monday-anchored start of the week containing dayKey, as a YYYY-MM-DD key. */
const weekStartKey = (dayKey: string): string => {
  const [y, m, d] = parts(dayKey)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // Mon=0 … Sun=6
  dt.setDate(dt.getDate() - dow)
  return dateKey(dt)
}

const shiftDays = (dayKey: string, delta: number): string => {
  const [y, m, d] = parts(dayKey)
  return dateKey(new Date(y, m - 1, d + delta))
}

/** The storage bucket a task's completion lives in for the given day. */
export const periodKeyFor = (period: TaskPeriod, dayKey: string): string => {
  switch (period) {
    case 'once':
      return 'once'
    case 'daily':
      return `d:${dayKey}`
    case 'weekly':
      return `w:${weekStartKey(dayKey)}`
    case 'monthly':
      return `m:${dayKey.slice(0, 7)}`
  }
}

/** A representative dayKey in the period immediately before the one holding dayKey. */
export const prevPeriodDayKey = (period: TaskPeriod, dayKey: string): string | null => {
  switch (period) {
    case 'once':
      return null
    case 'daily':
      return shiftDays(dayKey, -1)
    case 'weekly':
      return shiftDays(weekStartKey(dayKey), -1) // last day of the previous week
    case 'monthly': {
      const [y, m] = parts(dayKey)
      return dateKey(new Date(y, m - 2, 1)) // first day of the previous month
    }
  }
}

/** Does the raw logged value satisfy the task's completion criteria? */
export const taskValueDone = (task: TaskDef, value: TaskValue | undefined): boolean => {
  if (value === undefined || value === null) return false
  switch (task.kind) {
    case 'toggle':
      return value === true
    case 'number':
      return typeof value === 'number' && task.target !== undefined && value >= task.target
    case 'text':
      return (
        typeof value === 'string' &&
        task.targetText !== undefined &&
        value.trim().toLowerCase() === task.targetText.trim().toLowerCase()
      )
  }
}

const entriesFor = (log: TrackerState['taskLog'], id: string): Record<string, TaskValue> =>
  log[id] ?? {}

/** The value logged for a task in the period containing dayKey. */
export const taskValueOn = (
  task: TaskDef,
  log: TrackerState['taskLog'],
  dayKey: string,
): TaskValue | undefined => entriesFor(log, task.id)[periodKeyFor(task.period, dayKey)]

/** Is the task complete for the period containing dayKey? */
export const taskDoneOn = (task: TaskDef, log: TrackerState['taskLog'], dayKey: string): boolean =>
  taskValueDone(task, taskValueOn(task, log, dayKey))

/** Consecutive completed periods ending at (or just before) the current period. */
export const taskStreak = (task: TaskDef, log: TrackerState['taskLog'], todayKey: string): number => {
  if (task.period === 'once') return 0
  let count = 0
  let dk: string | null = todayKey
  // The current period only counts once it's done; either way we then walk back.
  if (taskDoneOn(task, log, dk)) count += 1
  dk = prevPeriodDayKey(task.period, dk)
  while (dk && taskDoneOn(task, log, dk)) {
    count += 1
    dk = prevPeriodDayKey(task.period, dk)
  }
  return count
}

/** The last `n` periods (oldest → newest) with each period's done state, for reports. */
export const recentPeriods = (
  task: TaskDef,
  log: TrackerState['taskLog'],
  n: number,
  todayKey: string,
): boolean[] => {
  if (task.period === 'once') return []
  const out: boolean[] = []
  let dk: string | null = todayKey
  for (let i = 0; i < n && dk; i += 1) {
    out.unshift(taskDoneOn(task, log, dk))
    dk = prevPeriodDayKey(task.period, dk)
  }
  return out
}

/** Collision-resistant id for a task, with a fallback for older browsers. */
export const newTaskId = (): string => {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID()
  return `t-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}
