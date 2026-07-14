import type { FC } from 'react'
import {
  IconAwards,
  IconCalendar,
  IconGoals,
  IconMeals,
  IconPlan,
  IconProgress,
  IconTasks,
  IconToday,
} from './icons'

export type TabId =
  | 'today'
  | 'meals'
  | 'tasks'
  | 'calendar'
  | 'goals'
  | 'progress'
  | 'awards'
  | 'plan'

// Nav chrome uses one cohesive line-icon set (see icons.tsx) — no emoji, no
// mismatched Unicode glyphs. Emoji stays in content (quests, awards, streak).
export const TABS: Array<{ id: TabId; Icon: FC; label: string }> = [
  { id: 'today', Icon: IconToday, label: 'Today' },
  { id: 'meals', Icon: IconMeals, label: 'Meals' },
  { id: 'tasks', Icon: IconTasks, label: 'Tasks' },
  { id: 'calendar', Icon: IconCalendar, label: 'Calendar' },
  { id: 'goals', Icon: IconGoals, label: 'Goals' },
  { id: 'progress', Icon: IconProgress, label: 'Progress' },
  { id: 'awards', Icon: IconAwards, label: 'Awards' },
  { id: 'plan', Icon: IconPlan, label: 'Plan' },
]
