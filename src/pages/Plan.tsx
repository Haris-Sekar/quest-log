import { useState } from 'react'
import { todayKey } from '../state/dates'
import { sanitizeState } from '../state/sanitize'
import type { Stats, TrackerState } from '../state/types'
import { useStore } from '../store'
import { useToast } from '../ui/Toast'

const Settings = ({ state }: { state: TrackerState }) => {
  const { update, mode } = useStore()
  const toast = useToast()
  const [start, setStart] = useState(String(state.startWeight))
  const [goal, setGoal] = useState(String(state.goalWeight))

  const saveSettings = () => {
    const sw = parseFloat(start)
    const gw = parseFloat(goal)
    if (!Number.isFinite(sw) || !Number.isFinite(gw) || sw < 40 || sw > 300 || gw < 40 || gw >= sw) {
      toast('⚠️ Check the numbers', 'Goal must be below start; both 40–300 kg.')
      return
    }
    update((s) => ({ ...s, startWeight: sw, goalWeight: gw }))
    toast('✓ Saved', `Start ${sw} kg → goal ${gw} kg.`)
  }

  const exportData = () => {
    const json = JSON.stringify(state)
    const done = () => toast('📋 Copied to clipboard', 'Paste it somewhere safe.')
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).then(done, () => window.prompt('Copy your backup:', json))
    } else {
      window.prompt('Copy your backup:', json)
    }
  }

  const importData = () => {
    const raw = window.prompt('Paste your exported backup JSON (from the old app or a backup):')
    if (!raw) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || !('days' in parsed)) {
        throw new Error('not a QuestLog backup')
      }
      const clean = sanitizeState(parsed)
      update(() => clean)
      toast('✓ Imported', 'Run restored.')
    } catch {
      toast('⚠️ Import failed', "That didn't look like a QuestLog backup.")
    }
  }

  const reset = () => {
    if (!window.confirm('Reset the entire run? All XP, streaks, weights and achievements will be wiped. Export first if unsure.')) return
    update((s) => ({
      startWeight: s.startWeight,
      goalWeight: s.goalWeight,
      startDate: todayKey(),
      weights: [],
      quests: s.quests,
      days: {},
      meals: {},
      tasks: [],
      taskLog: {},
      ach: {},
    }))
    toast('↺ Fresh run started', "Day 1. Let's go.")
  }

  return (
    <div className="card plan">
      <div className="settings-row">
        <label>
          Start kg{' '}
          <input type="number" step="0.1" min={40} max={300} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Goal kg{' '}
          <input type="number" step="0.1" min={40} max={300} value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>
        <button className="btn ghost" onClick={saveSettings}>
          Save
        </button>
      </div>
      <div className="settings-row">
        <button className="btn ghost" onClick={exportData}>
          Export data
        </button>
        <button className="btn ghost" onClick={importData}>
          Import
        </button>
        <button className="btn danger" onClick={reset}>
          Reset run
        </button>
      </div>
      <p className="fine-print">
        {mode === 'firebase'
          ? 'Data syncs to your account via Firebase — works offline and catches up when you reconnect.'
          : 'Local mode: data lives in this browser only. Add Firebase config (.env) to enable account sync.'}
      </p>
    </div>
  )
}

export const Plan = ({ state }: { state: TrackerState; stats: Stats }) => (
  <div className="page-grid plan-grid">
    <div className="col">
      <div className="eyebrow">The 6 diet rules</div>
      <div className="card plan">
        <ol>
          <li><b>One plate, no seconds.</b></li>
          <li><b>Protein every meal</b> — egg / dal / curd, no exceptions. Ask for extra boiled eggs.</li>
          <li><b>Fried = weekend boss</b>, once a week max. Poori, vada, murukku, appalam, fried rice.</li>
          <li><b>Rice measured</b> — ~200g per meal (one ladle and a half).</li>
          <li><b>Water before meals</b>, 3L a day. Buttermilk over juice.</li>
          <li><b>Sugar off</b> in tea &amp; coffee.</li>
        </ol>
      </div>
      <div className="eyebrow">Reading the canteen menu</div>
      <div className="card plan">
        <table>
          <thead>
            <tr>
              <th className="ok">Default picks</th>
              <th className="no">Skip</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Boiled egg, omelette, dal, sambar, rasam, poriyal, buttermilk, curd, sweet potato, banana</td>
              <td>Poori, vada, bajji, butter murukku, appalam, fried rice, payasam, sweets, juice</td>
            </tr>
            <tr>
              <td colSpan={2}>
                ⚖️ Portion-watch: rice items 200g · idli ×3 · dosa ×2 · chapathi ×2 · pongal &amp; coconut chutney small
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          <b>Day shape:</b> tiffin + 2 eggs → measured lunch + buttermilk → 4pm sweet potato/fruit →
          7pm light dinner + egg + curd → whey at night. ≈ 1,800–2,000 kcal.
        </p>
      </div>
    </div>
    <div className="col">
      <div className="eyebrow">Gym — the week</div>
      <div className="card plan">
        <h3>Phase 0 · Weeks 1–2 — just show up</h3>
        <p>
          Mon / Wed / Sat, 40 min: 10-min walk → 5 machines × 2 easy sets × 12 → 10-min incline
          walk. Leave feeling fresh. Attendance is the only score.
        </p>
        <h3>Phase 1 · Weeks 3–8 — build the base</h3>
        <p>
          3 days full body: leg press, chest press, lat pulldown, seated row, leg curl — 3×12 ·
          plank 3×30s · finish 20-min incline walk. +2.5kg when 12 reps get easy. Off days: 8k
          steps.
        </p>
        <h3>Phase 2 · Months 3–6 — the grind</h3>
        <p>4 days upper/lower split + 25-min cardio · 10k steps daily.</p>
        <p className="warn">
          <b>Hard rule:</b> no running or jumping until ~120kg. Walk, incline, cycle, row — protect
          the knees.
        </p>
        <p>
          <b>The 10-minute rule:</b> on lazy days, go do only 10 treadmill minutes. You're allowed
          to leave after. You won't.
        </p>
      </div>
      <div className="eyebrow">Settings &amp; data</div>
      <Settings state={state} />
    </div>
  </div>
)
