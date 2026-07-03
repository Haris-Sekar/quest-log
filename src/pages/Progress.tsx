import { BOSSES, bossDefeated } from '../data/bosses'
import type { Stats, TrackerState } from '../state/types'
import { Chart } from '../ui/Chart'

const StatRow = ({ state, stats }: { state: TrackerState; stats: Stats }) => (
  <div className="stat-row">
    <div className="stat">
      <b>{stats.curW !== null ? stats.curW.toFixed(1) : '—'}</b>
      <span>current kg</span>
    </div>
    <div className="stat">
      <b className="down">{stats.lost.toFixed(1)}</b>
      <span>kg lost</span>
    </div>
    <div className="stat">
      <b>
        {stats.curW !== null
          ? Math.max(0, stats.curW - state.goalWeight).toFixed(1)
          : (state.startWeight - state.goalWeight).toFixed(1)}
      </b>
      <span>kg to go</span>
    </div>
  </div>
)

const BossLadder = ({ stats }: { stats: Stats }) => {
  let activeAssigned = false
  return (
    <div className="card">
      {BOSSES.map((b) => {
        const dead = bossDefeated(b, stats.minW)
        let cls = 'locked'
        let label = 'LOCKED'
        if (dead) {
          cls = 'dead'
          label = 'DEFEATED'
        } else if (!activeAssigned) {
          cls = 'active'
          label = 'IN FIGHT'
          activeAssigned = true
        }
        return (
          <div key={b.w} className={`boss ${cls}`}>
            <span className="b-w">{b.w}</span>
            <span>
              <span className="b-name">{b.name}</span>
              <span className="b-tip">{b.tip}</span>
            </span>
            <span className="b-state">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export const Progress = ({ state, stats }: { state: TrackerState; stats: Stats }) => (
  <div>
    <div className="eyebrow">The run</div>
    <StatRow state={state} stats={stats} />
    <div className="page-grid progress-grid">
      <div className="col">
        <div className="eyebrow">Weight — the only graph that matters</div>
        <div className="card">
          <Chart state={state} stats={stats} />
        </div>
      </div>
      <div className="col">
        <div className="eyebrow">Boss ladder</div>
        <BossLadder stats={stats} />
      </div>
    </div>
  </div>
)
