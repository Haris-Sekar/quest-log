import { ACHIEVEMENTS } from '../data/achievements'
import { BOSSES, bossDefeated } from '../data/bosses'
import { KCAL_TARGET, PROTEIN_TARGET } from '../data/meals'
import { STREAK_MIN, WEIGH_XP } from '../data/quests'
import { levelInfo, RARITY_XP } from '../data/ranks'
import { daysBetween, todayKey } from './dates'
import { mealTotals } from './meals'
import { dayQuestCount } from './stats'
import type { Stats, TrackerState } from './types'

export interface RecapQuest {
  icon: string
  name: string
  done: boolean
}

/** Everything the share card needs, derived once from state + stats. */
export interface RecapData {
  dateLabel: string // "MON 14 JUL 2026"
  dayNo: number
  eyebrow: string // "STREAK DAY BANKED ✓"
  headline: string // "Showed up. Banked it."
  questTotal: number
  questDone: number
  quests: RecapQuest[]
  weight: number | null
  lost: number
  toGo: number
  streak: number
  bestStreak: number
  kcal: number
  kcalCap: number
  protein: number
  proteinFloor: number
  xpToday: number
  level: number
  levelInto: number
  levelSpan: number
  bossName: string | null
  bossGap: number | null
}

const monthDate = (): string => {
  const d = new Date()
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' })
  const mo = d.toLocaleDateString('en-US', { month: 'short' })
  return `${wd} ${d.getDate()} ${mo} ${d.getFullYear()}`.toUpperCase()
}

export const buildRecap = (state: TrackerState, stats: Stats): RecapData => {
  const key = todayKey()
  const day = state.days[key]
  const total = state.quests.length
  const done = dayQuestCount(day, state.quests)
  const bankMin = Math.min(STREAK_MIN, total)
  const banked = total > 0 && done >= bankMin
  const perfect = total > 0 && done === total
  const left = Math.max(0, bankMin - done)

  let eyebrow: string
  let headline: string
  if (perfect) {
    eyebrow = 'PERFECT DAY ✦'
    headline = 'Every quest. Cleared.'
  } else if (banked) {
    eyebrow = 'STREAK DAY BANKED ✓'
    headline = 'Showed up. Banked it.'
  } else if (done > 0) {
    eyebrow = 'GRIND DAY'
    headline = `${left} more to bank it.`
  } else {
    eyebrow = `DAY ${Math.max(1, daysBetween(state.startDate, key) + 1)}`
    headline = "The run's still on, machan."
  }

  // XP earned strictly today: quests done, a weigh-in, and any achievement
  // stamped with today's date.
  let xpToday = 0
  if (day?.q) for (const q of state.quests) if (day.q[q.id]) xpToday += q.xp
  if (day?.weighed) xpToday += WEIGH_XP
  for (const [id, unlocked] of Object.entries(state.ach)) {
    if (unlocked !== key) continue
    const a = ACHIEVEMENTS.find((x) => x.id === id)
    if (a) xpToday += RARITY_XP[a.r]
  }

  const li = levelInfo(stats.xp)
  const meals = mealTotals(state.meals[key])
  const curW = stats.curW ?? state.startWeight
  const toGo = Math.max(0, curW - state.goalWeight)

  const boss = BOSSES.find((b) => !bossDefeated(b, stats.minW)) ?? null

  return {
    dateLabel: monthDate(),
    dayNo: Math.max(1, daysBetween(state.startDate, key) + 1),
    eyebrow,
    headline,
    questTotal: total,
    questDone: done,
    quests: state.quests.map((q) => ({ icon: q.icon, name: q.name, done: Boolean(day?.q?.[q.id]) })),
    weight: stats.curW,
    lost: stats.lost,
    toGo,
    streak: stats.curStreak,
    bestStreak: stats.bestStreak,
    kcal: Math.round(meals.kcal),
    kcalCap: KCAL_TARGET,
    protein: Math.round(meals.protein),
    proteinFloor: PROTEIN_TARGET,
    xpToday,
    level: li.level,
    levelInto: li.into,
    levelSpan: li.span,
    bossName: boss ? boss.name : null,
    bossGap: boss ? Math.max(0, Math.round((curW - boss.w) * 10) / 10) : null,
  }
}
