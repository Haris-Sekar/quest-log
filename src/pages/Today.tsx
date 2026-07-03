import { useState } from 'react'
import { QUESTS, STREAK_MIN, WEIGH_XP } from '../data/quests'
import { daysBetween, todayKey } from '../state/dates'
import { dayQuestCount } from '../state/stats'
import type { QuestId, Stats, TrackerState } from '../state/types'
import { useStore } from '../store'
import { Calendar } from '../ui/Calendar'
import { useToast } from '../ui/Toast'

const WeighIn = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const { update } = useStore()
  const toast = useToast()
  const [value, setValue] = useState('')
  const key = todayKey()
  const weighedToday = Boolean(state.days[key]?.weighed)

  const log = () => {
    const kg = parseFloat(value)
    if (!Number.isFinite(kg) || kg < 40 || kg > 300) {
      toast("⚠️ That doesn't look right", 'Enter a weight between 40 and 300 kg.')
      return
    }
    update((s) => ({
      ...s,
      weights: [...s.weights.filter((w) => w.d !== key), { d: key, kg: Math.round(kg * 10) / 10 }],
      days: { ...s.days, [key]: { ...(s.days[key] ?? { q: {} }), weighed: true } },
    }))
    setValue('')
    toast('⚖️ Weigh-in logged', `+${WEIGH_XP} XP · see the line move on Progress.`)
  }

  return (
    <div className="card">
      <div className="weigh">
        <div className="weigh-now">
          <b>{(stats.curW ?? state.startWeight).toFixed(1)}</b> kg
          <small>weekly · morning · before food</small>
        </div>
        {weighedToday ? (
          <span className="logged-tag">✓ logged today</span>
        ) : (
          <div className="weigh-form">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={40}
              max={300}
              placeholder="kg"
              aria-label="Weight in kg"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && log()}
            />
            <button className="btn" onClick={log}>
              Log +{WEIGH_XP}xp
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const Nudge = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const key = todayKey()
  if (!state.weights.length) {
    return (
      <div className="card nudge">
        <b>⚖️ Quest available: Face the Scale</b>
        <p>
          Log your first weigh-in above. Every run starts with knowing the starting point — the
          number is data, not judgement.
        </p>
      </div>
    )
  }
  const last = stats.weights[stats.weights.length - 1].d
  const stale = daysBetween(last, key)
  if (stale >= 7 && !state.days[key]?.weighed) {
    return (
      <div className="card nudge">
        <b>⚖️ Weekly weigh-in due</b>
        <p>Last logged {stale} days ago. Morning, after toilet, before food.</p>
      </div>
    )
  }
  return null
}

const QuestList = ({ state }: { state: TrackerState }) => {
  const { update } = useStore()
  const key = todayKey()
  const day = state.days[key]

  const toggle = (id: QuestId) =>
    update((s) => {
      const cur = s.days[key] ?? { q: {} }
      const q = { ...cur.q }
      if (q[id]) delete q[id]
      else q[id] = true
      return { ...s, days: { ...s.days, [key]: { ...cur, q } } }
    })

  return (
    <div>
      {QUESTS.map((q) => {
        const done = Boolean(day?.q?.[q.id])
        return (
          <button
            key={q.id}
            className={`quest${done ? ' done' : ''}`}
            aria-pressed={done}
            onClick={() => toggle(q.id)}
          >
            <span className="q-icon">{q.icon}</span>
            <span className="q-body">
              <span className="q-name">{q.name}</span>
              <span className="q-desc">{q.desc}</span>
            </span>
            <span className="q-xp">
              {done ? '+' : ''}
              {q.xp} XP
            </span>
            <span className="q-check">✓</span>
          </button>
        )
      })}
    </div>
  )
}

const DayMeter = ({ state }: { state: TrackerState }) => {
  const n = dayQuestCount(state.days[todayKey()])
  const banked = n >= STREAK_MIN
  const left = STREAK_MIN - n
  return (
    <div className="card">
      <div className="day-meter">
        <div className="track">
          <div className="fill" style={{ width: `${(n / QUESTS.length) * 100}%` }} />
        </div>
        <span className="label">
          {n} / {QUESTS.length}
        </span>
      </div>
      <div className={`streak-note${banked ? ' safe' : ''}`}>
        {banked
          ? '🔥 Streak day banked. See you tomorrow.'
          : `Complete ${left} more quest${left > 1 ? 's' : ''} to bank today as a streak day.`}
      </div>
    </div>
  )
}

export const Today = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const dayNo = Math.max(1, daysBetween(state.startDate, todayKey()) + 1)
  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
  return (
    <div className="page-grid today-grid">
      <div className="col">
        <div className="date-line">
          {dateLabel} · Day {dayNo} of the run
        </div>
        <div className="eyebrow">Weigh-in</div>
        <WeighIn state={state} stats={stats} />
        <Nudge state={state} stats={stats} />
        <div className="eyebrow">Daily quests</div>
        <QuestList state={state} />
        <DayMeter state={state} />
      </div>
      <div className="col">
        <div className="eyebrow">The chain — don't break it</div>
        <div className="card">
          <Calendar state={state} stats={stats} />
        </div>
      </div>
    </div>
  )
}
