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

export interface TabDef {
  id: TabId
  Icon: FC
  label: string
}

// Default order. Nav chrome uses one cohesive line-icon set (see icons.tsx) —
// no emoji, no mismatched Unicode glyphs. The live order is user-reorderable
// and persisted (see useTabOrder).
export const TABS: TabDef[] = [
  { id: 'today', Icon: IconToday, label: 'Today' },
  { id: 'meals', Icon: IconMeals, label: 'Meals' },
  { id: 'tasks', Icon: IconTasks, label: 'Tasks' },
  { id: 'calendar', Icon: IconCalendar, label: 'Calendar' },
  { id: 'goals', Icon: IconGoals, label: 'Goals' },
  { id: 'progress', Icon: IconProgress, label: 'Progress' },
  { id: 'awards', Icon: IconAwards, label: 'Awards' },
  { id: 'plan', Icon: IconPlan, label: 'Plan' },
]

export const TAB_IDS: TabId[] = TABS.map((t) => t.id)

export const TAB_MAP: Record<TabId, TabDef> = Object.fromEntries(
  TABS.map((t) => [t.id, t]),
) as Record<TabId, TabDef>
