import type { BossDef } from '../state/types'

export const BOSSES: BossDef[] = [
  { w: 140, name: 'The Gatekeeper', tip: 'Mostly water weight — strike fast.' },
  { w: 130, name: 'The Couch Demon', tip: 'Weak against 8k daily steps.' },
  { w: 120, name: 'The Midnight Snacker', tip: 'Dies to 7pm dinners.' },
  { w: 110, name: 'The Plateau Golem', tip: 'Slow fight. Trust the process.' },
  { w: 100, name: 'The Century Titan', tip: 'Break into double digits.' },
  { w: 90, name: 'The Target — Final Boss', tip: 'Target achieved. GG.' },
]

/** The 90kg finale counts as defeated at exactly 90; every other boss needs strictly below. */
export const bossDefeated = (boss: BossDef, minWeight: number): boolean =>
  boss.w === 90 ? minWeight <= boss.w : minWeight < boss.w
