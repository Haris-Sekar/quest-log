export type QuestId = 'gym' | 'steps' | 'protein' | 'nofried' | 'water' | 'sleep'

export interface QuestDef {
  id: QuestId
  icon: string
  name: string
  desc: string
  xp: number
}

export interface DayEntry {
  q: Partial<Record<QuestId, boolean>>
  weighed?: boolean
}

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export interface MealTypeDef {
  id: MealType
  icon: string
  label: string
}

/** A single logged food item within a day. Calories/protein are per unit; the
 *  day totals multiply by `qty` (e.g. 3 idli × 40 kcal). */
export interface MealEntry {
  id: string
  type: MealType
  name: string
  kcal: number // calories per unit
  protein: number // grams of protein per unit
  qty: number // count / servings, >= 1
}

export interface MealTotals {
  kcal: number
  protein: number
  items: number
}

/** How often a task repeats. 'once' is a one-off to-do that stays done. */
export type TaskPeriod = 'once' | 'daily' | 'weekly' | 'monthly'

/** How a task is completed: a tap, hitting a number target, or matching text. */
export type TaskKind = 'toggle' | 'number' | 'text'

export interface TaskDef {
  id: string
  title: string
  period: TaskPeriod
  kind: TaskKind
  target?: number // for kind 'number'
  targetText?: string // for kind 'text'
  unit?: string // optional label for number tasks, e.g. "min", "L"
  createdAt: string // YYYY-MM-DD
}

/** The value logged for a task in a given period bucket. */
export type TaskValue = number | string | boolean

export interface WeightEntry {
  d: string // YYYY-MM-DD
  kg: number
}

export interface TrackerState {
  startWeight: number
  goalWeight: number
  startDate: string
  weights: WeightEntry[]
  days: Record<string, DayEntry>
  meals: Record<string, MealEntry[]> // date key -> meals logged that day
  tasks: TaskDef[] // user-created tasks
  taskLog: Record<string, Record<string, TaskValue>> // taskId -> periodKey -> value
  ach: Record<string, string> // achievement id -> unlock date
}

export interface Stats {
  count: Record<QuestId, number>
  perfectDays: number
  curStreak: number
  bestStreak: number
  weights: WeightEntry[]
  minW: number
  curW: number | null
  lost: number
  xp: number
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface AchievementDef {
  id: string
  r: Rarity
  icon: string
  name: string
  desc: string
  chk: (s: TrackerState, t: Stats) => boolean
}

export interface BossDef {
  w: number
  name: string
  tip: string
}
