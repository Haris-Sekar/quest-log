import { todayKey } from './dates'
import type { TrackerState } from './types'

export const defaultState = (): TrackerState => ({
  startWeight: 150,
  goalWeight: 90,
  startDate: todayKey(),
  weights: [],
  days: {},
  meals: {},
  ach: {},
})
