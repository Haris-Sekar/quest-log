import { levelInfo } from '../data/ranks'
import type { Stats } from '../state/types'

export const Hud = ({ stats, onReorder }: { stats: Stats; onReorder?: () => void }) => {
  const li = levelInfo(stats.xp)
  return (
    <div className="hud-inner">
      <div className="lvl-badge">{li.level}</div>
      <div className="hud-mid">
        <div className="rank-line">
          <span className="rank-name">
            {li.rank} · Lv {li.level}
          </span>
          <span className="xp-num">
            {li.into} / {li.span} XP
          </span>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${Math.min(100, (li.into / li.span) * 100)}%` }} />
        </div>
      </div>
      <div className="streak-chip">
        <span className="flame" aria-hidden>
          🔥
        </span>
        <b>{stats.curStreak}</b>
        <span>streak</span>
      </div>
      {onReorder && (
        <button className="hud-reorder" aria-label="Reorder tabs" onClick={onReorder}>
          ⇅
        </button>
      )}
    </div>
  )
}
