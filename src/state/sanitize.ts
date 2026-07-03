import { DATE_RE } from './dates'
import { defaultState } from './defaults'
import type { TrackerState } from './types'

const num = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 10) / 10 : fallback
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

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
    ach: isRecord(parsed.ach) ? (parsed.ach as TrackerState['ach']) : {},
  }
}
