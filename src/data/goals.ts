import { mealDayStats } from '../state/meals'
import type { Stats, TrackerState } from '../state/types'
import { KCAL_TARGET, PROTEIN_TARGET } from './meals'

export interface GoalProgress {
  current: number
  target: number
  done: boolean
  /** Human-readable progress, e.g. "4 / 14 days" or "141.0 → 90 kg". */
  label: string
}

export interface GoalDef {
  id: string
  icon: string
  name: string
  desc: string
  progress: (s: TrackerState, t: Stats) => GoalProgress
}

const clamp = (n: number, max: number): number => Math.min(n, max)

/**
 * Auto-tracked milestone goals. Each derives its progress from existing
 * tracker data (weigh-ins, quest counts, streaks) and the meal log, so there
 * is nothing to tick off by hand — hit the criteria and the goal completes.
 */
export const GOALS: GoalDef[] = [
  {
    id: 'weight',
    icon: '🏆',
    name: 'Reach goal weight',
    desc: 'The final boss — land on your target on the scale.',
    progress: (s, t) => {
      const total = Math.max(0.1, s.startWeight - s.goalWeight)
      const done = t.curW !== null && t.curW <= s.goalWeight
      return {
        current: clamp(t.lost, total),
        target: total,
        done,
        label: `${(t.curW ?? s.startWeight).toFixed(1)} → ${s.goalWeight} kg`,
      }
    },
  },
  {
    id: 'lose30',
    icon: '🚀',
    name: 'Halfway — lose 30 kg',
    desc: 'Thirty kilograms down from the starting weight.',
    progress: (_s, t) => ({
      current: clamp(t.lost, 30),
      target: 30,
      done: t.lost >= 30,
      label: `${t.lost.toFixed(1)} / 30 kg lost`,
    }),
  },
  {
    id: 'streak14',
    icon: '🔥',
    name: '14-day streak',
    desc: 'Two weeks of banked days without a break.',
    progress: (_s, t) => ({
      current: clamp(t.bestStreak, 14),
      target: 14,
      done: t.bestStreak >= 14,
      label: `${t.bestStreak} / 14 days`,
    }),
  },
  {
    id: 'gym50',
    icon: '🏋️',
    name: '50 gym sessions',
    desc: 'Show up fifty times — the habit is the win.',
    progress: (_s, t) => ({
      current: clamp(t.count.gym, 50),
      target: 50,
      done: t.count.gym >= 50,
      label: `${t.count.gym} / 50 sessions`,
    }),
  },
  {
    id: 'protein30',
    icon: '🥚',
    name: `Protein ${PROTEIN_TARGET}g × 30 days`,
    desc: `Log ${PROTEIN_TARGET}g+ of protein on thirty days.`,
    progress: (s) => {
      const d = mealDayStats(s.meals).proteinDays
      return { current: clamp(d, 30), target: 30, done: d >= 30, label: `${d} / 30 days` }
    },
  },
  {
    id: 'calorie20',
    icon: '🍽️',
    name: '20 on-target calorie days',
    desc: `Finish a logged day at or under ${KCAL_TARGET} kcal, twenty times.`,
    progress: (s) => {
      const d = mealDayStats(s.meals).onCalorieDays
      return { current: clamp(d, 20), target: 20, done: d >= 20, label: `${d} / 20 days` }
    },
  },
  {
    id: 'fried30',
    icon: '🛡️',
    name: '30 fried-free days',
    desc: 'Dodge the fried counter on thirty days.',
    progress: (_s, t) => ({
      current: clamp(t.count.nofried, 30),
      target: 30,
      done: t.count.nofried >= 30,
      label: `${t.count.nofried} / 30 days`,
    }),
  },
]

/** Percentage complete (0–100, integer) for a goal's progress. */
export const goalPct = (p: GoalProgress): number =>
  p.target <= 0 ? (p.done ? 100 : 0) : Math.min(100, Math.round((p.current / p.target) * 100))
