import type { TaskKind, TaskPeriod } from '../state/types'

export interface PeriodDef {
  id: TaskPeriod
  label: string // section heading, e.g. "Daily"
  unitLabel: string // per-bucket noun, e.g. "day"
}

export const TASK_PERIODS: PeriodDef[] = [
  { id: 'once', label: 'To-do', unitLabel: 'task' },
  { id: 'daily', label: 'Daily', unitLabel: 'day' },
  { id: 'weekly', label: 'Weekly', unitLabel: 'week' },
  { id: 'monthly', label: 'Monthly', unitLabel: 'month' },
]

export interface KindDef {
  id: TaskKind
  icon: string
  label: string
}

export const TASK_KINDS: KindDef[] = [
  { id: 'toggle', icon: '☑️', label: 'Tap' },
  { id: 'number', icon: '🔢', label: 'Number' },
  { id: 'text', icon: '🔤', label: 'Text' },
]

export const TASK_LIMITS = {
  title: { max: 80 },
  target: { min: 0, max: 1_000_000 },
  unit: { max: 12 },
  text: { max: 60 },
} as const
