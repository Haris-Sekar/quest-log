import { DEFAULT_QUESTS } from '../data/quests'
import { todayKey } from './dates'
import type { TrackerState } from './types'

export const defaultState = (): TrackerState => ({
  startWeight: 150,
  goalWeight: 90,
  startDate: todayKey(),
  weights: [],
  quests: DEFAULT_QUESTS.map((q) => ({ ...q })),
  days: {},
  meals: {},
  tasks: [],
  taskLog: {},
  ach: {},
})
