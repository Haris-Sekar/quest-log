import { ACHIEVEMENTS } from '../data/achievements'
import { RARITY_XP } from '../data/ranks'
import type { TrackerState } from '../state/types'

export const Awards = ({ state }: { state: TrackerState }) => {
  const unlocked = Object.keys(state.ach).length
  const sorted = [...ACHIEVEMENTS].sort(
    (a, b) => (state.ach[b.id] ? 1 : 0) - (state.ach[a.id] ? 1 : 0),
  )
  return (
    <div>
      <div className="eyebrow">
        Achievements · {unlocked} / {ACHIEVEMENTS.length}
      </div>
      <div className="ach-grid">
        {sorted.map((a) => {
          const got = state.ach[a.id]
          return (
            <div key={a.id} className={`ach r-${a.r}${got ? '' : ' locked'}`}>
              <div className="a-icon">{got ? a.icon : '🔒'}</div>
              <div className="a-name">{a.name}</div>
              <div className="a-desc">{a.desc}</div>
              <div className="a-meta">
                {a.r} · {RARITY_XP[a.r]} xp
                {got ? ` · ${got}` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
