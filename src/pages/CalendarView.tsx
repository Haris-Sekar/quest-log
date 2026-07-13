import { mealDayStats } from '../state/meals'
import type { Stats, TrackerState } from '../state/types'
import { Calendar } from '../ui/Calendar'

const Summary = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const m = mealDayStats(state.meals)
  return (
    <div className="stat-row">
      <div className="stat">
        <b>{stats.curStreak}</b>
        <span>current streak</span>
      </div>
      <div className="stat">
        <b>{stats.bestStreak}</b>
        <span>best streak</span>
      </div>
      <div className="stat">
        <b>{m.loggedDays ? m.avgKcal : '—'}</b>
        <span>avg kcal / day</span>
      </div>
    </div>
  )
}

export const CalendarView = ({ state, stats }: { state: TrackerState; stats: Stats }) => (
  <div>
    <div className="eyebrow">The run so far</div>
    <Summary state={state} stats={stats} />
    <div className="eyebrow">The chain — don't break it</div>
    <div className="card">
      <Calendar state={state} stats={stats} />
    </div>
  </div>
)
