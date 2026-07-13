import type { QuestDef } from '../state/types'

/** The starting quest set. Ids stay stable so milestone achievements/goals
 *  (gym sessions, fried-free days, water, steps) keep tracking them. */
export const DEFAULT_QUESTS: QuestDef[] = [
  { id: 'gym', icon: '🏋️', name: 'Gym session', desc: 'Show up. 40 minutes counts.', xp: 30 },
  { id: 'steps', icon: '👟', name: '8,000 steps', desc: 'Pace calls, basement loops, evening walk.', xp: 20 },
  { id: 'protein', icon: '🥚', name: 'Protein every meal', desc: 'Egg / dal / curd at all three meals.', xp: 15 },
  { id: 'nofried', icon: '🛡️', name: 'Dodged the fried stuff', desc: 'No poori, vada, murukku, appalam.', xp: 15 },
  { id: 'water', icon: '💧', name: '3L of water', desc: "Buttermilk counts. Juice doesn't.", xp: 10 },
  { id: 'sleep', icon: '😴', name: 'In bed by 11:30', desc: 'Sleep is a fat-loss stat, not a luxury.', xp: 10 },
]

export const WEIGH_XP = 25

/** Quests per day needed to bank a streak day (capped at the quest count). */
export const STREAK_MIN = 3

export const QUEST_LIMITS = {
  name: { max: 40 },
  desc: { max: 80 },
  icon: { max: 4 },
  xp: { min: 0, max: 500 },
  max: 20, // most quests a player can have
} as const

/** Collision-resistant id for a custom quest. */
export const newQuestId = (): string => {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return `q-${c.randomUUID()}`
  return `q-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}
