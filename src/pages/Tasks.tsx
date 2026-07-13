import { useState } from 'react'
import { TASK_KINDS, TASK_LIMITS, TASK_PERIODS } from '../data/tasks'
import { todayKey } from '../state/dates'
import {
  newTaskId,
  periodKeyFor,
  recentPeriods,
  taskDoneOn,
  taskStreak,
  taskValueOn,
} from '../state/tasks'
import type { TaskDef, TaskKind, TaskPeriod, TaskValue, TrackerState } from '../state/types'
import { useStore } from '../store'
import { useToast } from '../ui/Toast'

// ── Shared store mutations ──────────────────────────────────────────────────

const useTaskActions = () => {
  const { update } = useStore()

  const setValue = (task: TaskDef, value: TaskValue | undefined) =>
    update((s) => {
      const pk = periodKeyFor(task.period, todayKey())
      const cur = { ...(s.taskLog[task.id] ?? {}) }
      if (value === undefined || value === '') delete cur[pk]
      else cur[pk] = value
      const log = { ...s.taskLog }
      if (Object.keys(cur).length) log[task.id] = cur
      else delete log[task.id]
      return { ...s, taskLog: log }
    })

  const remove = (id: string) =>
    update((s) => {
      const log = { ...s.taskLog }
      delete log[id]
      return { ...s, tasks: s.tasks.filter((t) => t.id !== id), taskLog: log }
    })

  const add = (task: TaskDef) => update((s) => ({ ...s, tasks: [...s.tasks, task] }))

  return { setValue, remove, add }
}

// ── Create form ─────────────────────────────────────────────────────────────

const TaskForm = () => {
  const { add } = useTaskActions()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState<TaskPeriod>('daily')
  const [kind, setKind] = useState<TaskKind>('toggle')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [text, setText] = useState('')

  const submit = () => {
    const t = title.trim()
    if (!t) {
      toast('⚠️ Name the task', 'e.g. "10k steps" or "Read 30 pages".')
      return
    }
    const task: TaskDef = {
      id: newTaskId(),
      title: t.slice(0, TASK_LIMITS.title.max),
      period,
      kind,
      createdAt: todayKey(),
    }
    if (kind === 'number') {
      const n = parseFloat(target)
      if (!Number.isFinite(n) || n < TASK_LIMITS.target.min || n > TASK_LIMITS.target.max) {
        toast('⚠️ Set a target number', `Between ${TASK_LIMITS.target.min} and ${TASK_LIMITS.target.max}.`)
        return
      }
      task.target = Math.round(n * 10) / 10
      if (unit.trim()) task.unit = unit.trim().slice(0, TASK_LIMITS.unit.max)
    }
    if (kind === 'text') {
      const tt = text.trim()
      if (!tt) {
        toast('⚠️ Set the target text', 'The task completes when your entry matches it.')
        return
      }
      task.targetText = tt.slice(0, TASK_LIMITS.text.max)
    }
    add(task)
    setTitle('')
    setTarget('')
    setUnit('')
    setText('')
    toast('✓ Task added', task.title)
  }

  return (
    <div className="card task-form">
      <input
        className="task-title-input"
        type="text"
        maxLength={TASK_LIMITS.title.max}
        placeholder="New task — what do you want to track?"
        aria-label="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <div className="task-form-row">
        <div className="seg" role="group" aria-label="Repeat">
          {TASK_PERIODS.map((p) => (
            <button
              key={p.id}
              className={`seg-btn${period === p.id ? ' on' : ''}`}
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="task-form-row">
        <div className="seg" role="group" aria-label="Completion type">
          {TASK_KINDS.map((k) => (
            <button
              key={k.id}
              className={`seg-btn${kind === k.id ? ' on' : ''}`}
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
            >
              <span aria-hidden>{k.icon}</span> {k.label}
            </button>
          ))}
        </div>
      </div>
      {kind === 'number' && (
        <div className="task-form-row task-targets">
          <label>
            <span>Target</span>
            <input type="number" inputMode="decimal" placeholder="10" value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </label>
          <label>
            <span>Unit (optional)</span>
            <input type="text" maxLength={TASK_LIMITS.unit.max} placeholder="min, L, pages…" value={unit} onChange={(e) => setUnit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </label>
        </div>
      )}
      {kind === 'text' && (
        <div className="task-form-row task-targets">
          <label className="grow">
            <span>Target text (match to complete)</span>
            <input type="text" maxLength={TASK_LIMITS.text.max} placeholder="e.g. DONE" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </label>
        </div>
      )}
      <button className="btn wide" onClick={submit}>
        + Add task
      </button>
    </div>
  )
}

// ── Per-task completion control (for the current period) ─────────────────────

const NumberControl = ({ task, value }: { task: TaskDef; value: TaskValue | undefined }) => {
  const { setValue } = useTaskActions()
  const [draft, setDraft] = useState(typeof value === 'number' ? String(value) : '')
  const done = taskDoneOn(task, { [task.id]: { [periodKeyFor(task.period, todayKey())]: value ?? '' } }, todayKey())
  const commit = () => {
    if (draft.trim() === '') return setValue(task, undefined)
    const n = parseFloat(draft)
    if (Number.isFinite(n)) setValue(task, Math.round(n * 10) / 10)
  }
  return (
    <div className="tc-number">
      <input
        type="number"
        inputMode="decimal"
        aria-label={`${task.title} value`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span className={`tc-target${done ? ' done' : ''}`}>
        / {task.target}
        {task.unit ? ` ${task.unit}` : ''}
      </span>
    </div>
  )
}

const TextControl = ({ task, value }: { task: TaskDef; value: TaskValue | undefined }) => {
  const { setValue } = useTaskActions()
  const [draft, setDraft] = useState(typeof value === 'string' ? value : '')
  const done = taskDoneOn(task, { [task.id]: { [periodKeyFor(task.period, todayKey())]: draft } }, todayKey())
  return (
    <div className="tc-text">
      <input
        type="text"
        aria-label={`${task.title} entry`}
        placeholder={`match: ${task.targetText}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setValue(task, draft)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      {done && <span className="tc-check on">✓</span>}
    </div>
  )
}

const TaskRow = ({ task, log }: { task: TaskDef; log: TrackerState['taskLog'] }) => {
  const { setValue, remove } = useTaskActions()
  const value = taskValueOn(task, log, todayKey())
  const done = taskDoneOn(task, log, todayKey())
  const streak = taskStreak(task, log, todayKey())

  return (
    <div className={`task-row${done ? ' done' : ''}`}>
      {task.kind === 'toggle' ? (
        <button
          className="task-tap"
          aria-pressed={done}
          aria-label={`Mark ${task.title} ${done ? 'not done' : 'done'}`}
          onClick={() => setValue(task, done ? undefined : true)}
        >
          <span className="task-check">✓</span>
        </button>
      ) : (
        <span className={`task-dot${done ? ' done' : ''}`} aria-hidden>
          {done ? '✓' : '•'}
        </span>
      )}
      <span className="task-body">
        <span className="task-name">{task.title}</span>
        {task.period !== 'once' && streak > 0 && (
          <span className="task-streak">🔥 {streak} {task.period === 'daily' ? 'd' : task.period === 'weekly' ? 'w' : 'mo'}</span>
        )}
      </span>
      {task.kind === 'number' && <NumberControl task={task} value={value} />}
      {task.kind === 'text' && <TextControl task={task} value={value} />}
      <button className="task-del" aria-label={`Delete ${task.title}`} onClick={() => remove(task.id)}>
        ✕
      </button>
    </div>
  )
}

// ── Reports ──────────────────────────────────────────────────────────────────

const HISTORY_LEN = 7

const ReportSection = ({ tasks, log }: { tasks: TaskDef[]; log: TrackerState['taskLog'] }) => {
  const tk = todayKey()
  const recurring = tasks.filter((t) => t.period !== 'once')

  const tiles = TASK_PERIODS.map((p) => {
    const list = tasks.filter((t) => t.period === p.id)
    if (!list.length) return null
    const done = list.filter((t) => taskDoneOn(t, log, tk)).length
    return { label: p.label, done, total: list.length }
  }).filter((x): x is { label: string; done: number; total: number } => x !== null)

  return (
    <div>
      <div className="report-tiles">
        {tiles.map((t) => (
          <div key={t.label} className="report-tile">
            <b>
              {t.done}
              <small> / {t.total}</small>
            </b>
            <span>{t.label}</span>
          </div>
        ))}
      </div>
      {recurring.length > 0 && (
        <div className="report-hist">
          {recurring.map((task) => {
            const cells = recentPeriods(task, log, HISTORY_LEN, tk)
            return (
              <div key={task.id} className="rh-row">
                <span className="rh-name">{task.title}</span>
                <span className="rh-cells">
                  {cells.map((c, i) => (
                    <span key={i} className={`rh-cell${c ? ' done' : ''}`} />
                  ))}
                </span>
              </div>
            )
          })}
          <div className="rh-legend">last {HISTORY_LEN} periods · newest right</div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const Tasks = ({ state }: { state: TrackerState }) => {
  const tk = todayKey()
  const groups = TASK_PERIODS.map((p) => ({
    period: p,
    list: state.tasks.filter((t) => t.period === p.id),
  })).filter((g) => g.list.length > 0)

  return (
    <div className="page-grid tasks-grid">
      <div className="col">
        <div className="eyebrow">New task</div>
        <TaskForm />
      </div>
      <div className="col">
        <div className="eyebrow">Your tasks</div>
        {groups.length === 0 ? (
          <div className="card meal-empty">
            No tasks yet. Add one on the left — tap-to-complete, hit a number, or match a text
            target, on any cadence.
          </div>
        ) : (
          groups.map((g) => {
            const done = g.list.filter((t) => taskDoneOn(t, state.taskLog, tk)).length
            return (
              <div key={g.period.id} className="task-group">
                <div className="task-group-head">
                  <span className="tg-title">{g.period.label}</span>
                  <span className="tg-count">
                    {done} / {g.list.length} this {g.period.unitLabel}
                  </span>
                </div>
                {g.list.map((t) => (
                  <TaskRow key={t.id} task={t} log={state.taskLog} />
                ))}
              </div>
            )
          })
        )}
        {state.tasks.length > 0 && (
          <>
            <div className="eyebrow">Reports</div>
            <ReportSection tasks={state.tasks} log={state.taskLog} />
          </>
        )}
      </div>
    </div>
  )
}
