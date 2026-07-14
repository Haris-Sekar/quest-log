import { daysBetween, todayKey } from '../state/dates'

/** The real-life run deadline — the kalyanam (wedding). Edit this to the actual
 *  date; the desktop rail shows a live "N days out" countdown from it. */
export const KALYANAM_DATE = '2028-01-01'

/** Whole days from today until the deadline (never negative). */
export const daysToKalyanam = (): number => Math.max(0, daysBetween(todayKey(), KALYANAM_DATE))
