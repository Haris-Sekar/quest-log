import type { Rarity } from '../state/types'

export const RANKS = [
  'Rookie', 'Grinder', 'Challenger', 'Contender', 'Warrior',
  'Elite', 'Veteran', 'Champion', 'Boss Slayer', 'Legend',
] as const

export const RARITY_XP: Record<Rarity, number> = {
  common: 50,
  rare: 100,
  epic: 200,
  legendary: 400,
}

/** Cumulative XP required to reach level k+1 (k = 0-based level index). */
export const levelThreshold = (k: number): number => 50 * k * (k + 1)

export interface LevelInfo {
  level: number
  rank: string
  into: number
  span: number
}

export const levelInfo = (xp: number): LevelInfo => {
  let k = 0
  while (xp >= levelThreshold(k + 1)) k += 1
  return {
    level: k + 1,
    rank: RANKS[Math.min(k, RANKS.length - 1)],
    into: xp - levelThreshold(k),
    span: levelThreshold(k + 1) - levelThreshold(k),
  }
}
