import { useState } from 'react'
import { KCAL_TARGET } from '../data/meals'
import { QUESTS, STREAK_MIN } from '../data/quests'
import { pad2, todayKey } from '../state/dates'
import { mealTotals } from '../state/meals'
import { dayQuestCount } from '../state/stats'
import type { Stats, TrackerState } from '../state/types'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export const Calendar = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const { y, m } = view
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const tk = todayKey()
  const atCurrent = y === now.getFullYear() && m === now.getMonth()
  const monthLabel = new Date(y, m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(<div key={`pad-${i}`} className="cal-day out" />)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${pad2(m + 1)}-${pad2(d)}`
    const day = state.days[key]
    const n = dayQuestCount(day)
    const meals = mealTotals(state.meals[key])
    const kcal = Math.round(meals.kcal)
    const showKcal = meals.items > 0 && key <= tk
    const over = kcal > KCAL_TARGET
    let cls = 'cal-day'
    if (key > tk) cls += ' future'
    else if (key < state.startDate) cls += ' pre'
    else if (n === QUESTS.length) cls += ' perfect'
    else if (n >= STREAK_MIN) cls += ' bank'
    else if (n > 0) cls += ' part'
    if (key === tk) cls += ' today'
    const label = `${key}: ${n} of ${QUESTS.length} quests${showKcal ? `, ${kcal} kcal` : ''}`
    cells.push(
      <div key={key} className={cls} role="img" aria-label={label}>
        <span className="cal-dnum">{d}</span>
        {showKcal && <span className={`cal-kcal${over ? ' over' : ''}`}>{kcal}</span>}
        {day?.weighed && <span className="w-dot" />}
      </div>,
    )
  }

  return (
    <div>
      <div className="cal-head">
        <div>
          <div className="cal-title">{monthLabel}</div>
          <div className="cal-sub">
            🔥 current {stats.curStreak} · best {stats.bestStreak}
          </div>
        </div>
        <div className="cal-nav">
          <button
            aria-label="Previous month"
            onClick={() => setView(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })}
          >
            ‹
          </button>
          <button
            aria-label="Next month"
            disabled={atCurrent}
            onClick={() => setView(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })}
          >
            ›
          </button>
        </div>
      </div>
      <div className="cal-grid">
        {DOW.map((d, i) => (
          <div key={`dow-${i}`} className="cal-dow">
            {d}
          </div>
        ))}
        {cells}
      </div>
      <div className="cal-legend">
        <span>
          <span className="k k-bank" /> streak day (3+)
        </span>
        <span>
          <span className="k k-perfect" /> perfect (6/6)
        </span>
        <span>
          <span className="k k-part" /> partial
        </span>
        <span>
          <span className="k k-weigh" /> weigh-in
        </span>
        <span>
          <span className="k-kcal" /> kcal · <span className="over">over {KCAL_TARGET}</span>
        </span>
      </div>
    </div>
  )
}
