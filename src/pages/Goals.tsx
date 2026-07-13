import { GOALS, goalPct, type GoalDef } from '../data/goals'
import type { Stats, TrackerState } from '../state/types'

const StreakBanner = ({ stats }: { stats: Stats }) => (
  <div className="card goal-streak">
    <span className="gs-flame" aria-hidden>
      🔥
    </span>
    <div className="gs-body">
      <span className="gs-num">
        {stats.curStreak} <small>day{stats.curStreak === 1 ? '' : 's'}</small>
      </span>
      <span className="gs-sub">current streak · best {stats.bestStreak}</span>
    </div>
    <div className="gs-note">
      {stats.curStreak > 0
        ? 'Keep the chain alive on the Calendar tab.'
        : 'Bank 3+ quests today to start a streak.'}
    </div>
  </div>
)

const GoalCard = ({ goal, state, stats }: { goal: GoalDef; state: TrackerState; stats: Stats }) => {
  const p = goal.progress(state, stats)
  const pct = goalPct(p)
  return (
    <div className={`goal${p.done ? ' done' : ''}`}>
      <div className="goal-top">
        <span className="goal-icon" aria-hidden>
          {goal.icon}
        </span>
        <span className="goal-body">
          <span className="goal-name">{goal.name}</span>
          <span className="goal-desc">{goal.desc}</span>
        </span>
        <span className="goal-state">{p.done ? '✓' : `${pct}%`}</span>
      </div>
      <div className="goal-track">
        <div className={`goal-fill${p.done ? ' done' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="goal-label">{p.label}</div>
    </div>
  )
}

export const Goals = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const done = GOALS.filter((g) => g.progress(state, stats).done).length
  return (
    <div className="goals-page">
      <div className="eyebrow">Goals · {done} / {GOALS.length} completed</div>
      <StreakBanner stats={stats} />
      <div className="goal-list">
        {GOALS.map((g) => (
          <GoalCard key={g.id} goal={g} state={state} stats={stats} />
        ))}
      </div>
    </div>
  )
}
