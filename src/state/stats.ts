import { ACHIEVEMENTS } from '../data/achievements'
import { QUESTS, STREAK_MIN, WEIGH_XP } from '../data/quests'
import { RARITY_XP } from '../data/ranks'
import { prevKey, todayKey } from './dates'
import type { DayEntry, QuestId, Stats, TrackerState } from './types'

export const dayQuestCount = (day: DayEntry | undefined): number =>
  day?.q ? QUESTS.filter((q) => day.q[q.id]).length : 0

export const qualifies = (day: DayEntry | undefined): boolean =>
  dayQuestCount(day) >= STREAK_MIN

const questCounts = (s: TrackerState): { count: Record<QuestId, number>; perfectDays: number } => {
  const count = Object.fromEntries(QUESTS.map((q) => [q.id, 0])) as Record<QuestId, number>
  let perfectDays = 0
  for (const day of Object.values(s.days)) {
    if (!day?.q) continue
    let n = 0
    for (const q of QUESTS) {
      if (day.q[q.id]) {
        count[q.id] += 1
        n += 1
      }
    }
    if (n === QUESTS.length) perfectDays += 1
  }
  return { count, perfectDays }
}

const currentStreak = (s: TrackerState): number => {
  let cur = 0
  let k = todayKey()
  if (qualifies(s.days[k])) cur = 1
  k = prevKey(k)
  while (qualifies(s.days[k])) {
    cur += 1
    k = prevKey(k)
  }
  return cur
}

const bestStreak = (s: TrackerState, floor: number): number => {
  let best = floor
  const keys = Object.keys(s.days)
    .filter((d) => qualifies(s.days[d]))
    .sort()
  let run = 0
  let prev: string | null = null
  for (const d of keys) {
    run = prev !== null && prevKey(d) === prev ? run + 1 : 1
    if (run > best) best = run
    prev = d
  }
  return best
}

const totalXp = (s: TrackerState): number => {
  let xp = 0
  for (const day of Object.values(s.days)) {
    if (day?.q) for (const q of QUESTS) if (day.q[q.id]) xp += q.xp
    if (day?.weighed) xp += WEIGH_XP
  }
  for (const id of Object.keys(s.ach)) {
    const a = ACHIEVEMENTS.find((x) => x.id === id)
    if (a) xp += RARITY_XP[a.r]
  }
  return xp
}

export const computeStats = (s: TrackerState): Stats => {
  const { count, perfectDays } = questCounts(s)
  const cur = currentStreak(s)
  const weights = [...s.weights].sort((a, b) => (a.d < b.d ? -1 : 1))
  const minW = weights.length ? Math.min(...weights.map((w) => w.kg)) : s.startWeight
  return {
    count,
    perfectDays,
    curStreak: cur,
    bestStreak: bestStreak(s, cur),
    weights,
    minW,
    curW: weights.length ? weights[weights.length - 1].kg : null,
    lost: Math.max(0, s.startWeight - minW),
    xp: totalXp(s),
  }
}

/** Stamp any newly earned achievements. Returns the ids unlocked by this pass. */
export const applyAchievements = (
  s: TrackerState,
): { state: TrackerState; fresh: string[] } => {
  const t = computeStats(s)
  const fresh = ACHIEVEMENTS.filter((a) => !s.ach[a.id] && a.chk(s, t))
  if (!fresh.length) return { state: s, fresh: [] }
  const stamp = todayKey()
  const ach = { ...s.ach, ...Object.fromEntries(fresh.map((a) => [a.id, stamp])) }
  return { state: { ...s, ach }, fresh: fresh.map((a) => a.id) }
}
