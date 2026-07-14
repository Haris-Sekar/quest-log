import { useState } from 'react'
import { daysToKalyanam, KALYANAM_DATE } from '../data/deadline'
import { QUEST_LIMITS, STREAK_MIN, WEIGH_XP, newQuestId } from '../data/quests'
import { daysBetween, todayKey } from '../state/dates'
import { dayQuestCount } from '../state/stats'
import type { QuestDef, QuestId, Stats, TrackerState } from '../state/types'
import { ShareModal } from '../ui/ShareModal'
import { useStore } from '../store'
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
  const [editing, setEditing] = useState(false)
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

  const patchQuest = (id: QuestId, patch: Partial<QuestDef>) =>
    update((s) => ({ ...s, quests: s.quests.map((q) => (q.id === id ? { ...q, ...patch } : q)) }))

  const addQuest = () =>
    update((s) =>
      s.quests.length >= QUEST_LIMITS.max
        ? s
        : { ...s, quests: [...s.quests, { id: newQuestId(), icon: '⭐', name: 'New quest', desc: '', xp: 10 }] },
    )

  const removeQuest = (id: QuestId) =>
    update((s) => ({ ...s, quests: s.quests.filter((q) => q.id !== id) }))

  return (
    <>
      <div className="eyebrow eyebrow-row">
        <span>Daily quests</span>
        <button className="eyebrow-action" onClick={() => setEditing((e) => !e)}>
          {editing ? '✓ Done' : '✎ Edit'}
        </button>
      </div>
      {editing ? (
        <div className="quest-edit-list">
          {state.quests.map((q) => (
            <QuestEditRow key={q.id} quest={q} onChange={patchQuest} onRemove={removeQuest} />
          ))}
          {state.quests.length < QUEST_LIMITS.max && (
            <button className="btn ghost wide" onClick={addQuest}>
              + Add quest
            </button>
          )}
        </div>
      ) : (
        <div>
          {state.quests.length === 0 ? (
            <div className="card meal-empty">No quests yet — tap ✎ Edit to add your own.</div>
          ) : (
            state.quests.map((q) => {
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
                    {q.desc && <span className="q-desc">{q.desc}</span>}
                  </span>
                  <span className="q-xp">
                    {done ? '+' : ''}
                    {q.xp} XP
                  </span>
                  <span className="q-check">✓</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </>
  )
}

const QuestEditRow = ({
  quest,
  onChange,
  onRemove,
}: {
  quest: QuestDef
  onChange: (id: QuestId, patch: Partial<QuestDef>) => void
  onRemove: (id: QuestId) => void
}) => {
  const [icon, setIcon] = useState(quest.icon)
  const [name, setName] = useState(quest.name)
  const [desc, setDesc] = useState(quest.desc)
  const [xp, setXp] = useState(String(quest.xp))

  const commit = () => {
    const x = Math.round(parseFloat(xp))
    onChange(quest.id, {
      icon: icon.trim() || '⭐',
      name: name.trim() || quest.name,
      desc: desc.trim(),
      xp: Number.isFinite(x) ? Math.max(QUEST_LIMITS.xp.min, Math.min(QUEST_LIMITS.xp.max, x)) : quest.xp,
    })
  }

  return (
    <div className="quest-edit">
      <div className="qe-row1">
        <input className="qe-icon" value={icon} maxLength={QUEST_LIMITS.icon.max} aria-label="Icon" onChange={(e) => setIcon(e.target.value)} onBlur={commit} />
        <input className="qe-name" value={name} maxLength={QUEST_LIMITS.name.max} aria-label="Quest name" onChange={(e) => setName(e.target.value)} onBlur={commit} />
        <input className="qe-xp" type="number" inputMode="numeric" value={xp} aria-label="XP" onChange={(e) => setXp(e.target.value)} onBlur={commit} />
        <span className="qe-xp-lbl">xp</span>
        <button className="qe-del" aria-label={`Delete ${quest.name}`} onClick={() => onRemove(quest.id)}>
          ✕
        </button>
      </div>
      <input
        className="qe-desc"
        value={desc}
        maxLength={QUEST_LIMITS.desc.max}
        placeholder="Short description (optional)"
        aria-label="Quest description"
        onChange={(e) => setDesc(e.target.value)}
        onBlur={commit}
      />
    </div>
  )
}

const DayMeter = ({ state }: { state: TrackerState }) => {
  const total = state.quests.length
  const n = dayQuestCount(state.days[todayKey()], state.quests)
  const bankMin = Math.min(STREAK_MIN, total)
  const banked = total > 0 && n >= bankMin
  const perfect = total > 0 && n === total
  const left = Math.max(0, bankMin - n)

  const label =
    total === 0 ? 'NO QUESTS YET' : perfect ? 'PERFECT DAY ✦' : banked ? 'STREAK BANKED ✓' : `${left} MORE TO BANK`
  const labelCls = perfect ? ' perfect' : banked ? ' safe' : ''

  return (
    <div className="card">
      <div className="day-meter-head">
        <span className={`day-meter-lbl${labelCls}`}>{label}</span>
        <span className="day-meter-count">
          {n} / {total}
        </span>
      </div>
      <div className="day-segs" role="img" aria-label={`${n} of ${total} quests done`}>
        {total === 0 ? (
          <div className="seg-cell" />
        ) : (
          state.quests.map((q, i) => <div key={q.id} className={`seg-cell${i < n ? ' on' : ''}`} />)
        )}
      </div>
      <div className={`streak-note${banked ? ' safe' : ''}`}>
        {total === 0
          ? 'Add a quest to start banking streak days.'
          : perfect
            ? '🔥 Perfect day, machan. Every quest cleared.'
            : banked
              ? '🔥 Streak day banked. See you tomorrow.'
              : `Complete ${left} more quest${left > 1 ? 's' : ''} to bank today as a streak day.`}
      </div>
    </div>
  )
}

const RailStat = ({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: number | string
  unit?: string
  accent?: boolean
}) => (
  <div className="rail-stat">
    <span className="rs-label">{label}</span>
    <span className={`rs-val${accent ? ' accent' : ''}`}>
      {value}
      {unit && <small> {unit}</small>}
    </span>
  </div>
)

/** Desktop-only side panel — hidden on mobile via CSS, so the phone view is unchanged. */
const TodayRail = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const toGo =
    stats.curW !== null
      ? Math.max(0, stats.curW - state.goalWeight)
      : state.startWeight - state.goalWeight
  return (
    <aside className="today-rail">
      <div className="eyebrow">Run stats</div>
      <div className="card rail-card">
        <RailStat label="Current streak" value={stats.curStreak} unit="days" accent />
        <RailStat label="Best streak" value={stats.bestStreak} unit="days" />
        <RailStat label="Kg lost" value={stats.lost.toFixed(1)} unit="kg" accent />
        <RailStat label="Kg to goal" value={toGo.toFixed(1)} unit="kg" />
        <RailStat label="Perfect days" value={stats.perfectDays} />
      </div>
      <div className="card deadline-card">
        <div className="deadline-title">Target Date - {KALYANAM_DATE}</div>
        <div className="deadline-num">{daysToKalyanam()}</div>
        <div className="deadline-sub">days out</div>
      </div>
    </aside>
  )
}

export const Today = ({ state, stats }: { state: TrackerState; stats: Stats }) => {
  const [sharing, setSharing] = useState(false)
  const dayNo = Math.max(1, daysBetween(state.startDate, todayKey()) + 1)
  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
  return (
    <div className="today-page">
      <div className="today-main">
        <div className="date-line">
          {dateLabel} · Day {dayNo} of the run
        </div>
        <div className="eyebrow">Weigh-in</div>
        <WeighIn state={state} stats={stats} />
        <Nudge state={state} stats={stats} />
        <QuestList state={state} />
        <DayMeter state={state} />
        <button className="btn wide" onClick={() => setSharing(true)}>
          ↗ Share today's run
        </button>
      </div>
      <TodayRail state={state} stats={stats} />
      {sharing && <ShareModal state={state} stats={stats} onClose={() => setSharing(false)} />}
    </div>
  )
}
