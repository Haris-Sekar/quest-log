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
