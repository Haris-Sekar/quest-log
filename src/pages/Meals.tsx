import { useMemo, useRef, useState } from 'react'
import { KCAL_TARGET, MEAL_LIMITS, MEAL_TYPES, PROTEIN_TARGET } from '../data/meals'
import { nextKey, prevKey, todayKey } from '../state/dates'
import { mealTotals, newMealId } from '../state/meals'
import type { MealEntry, MealType, TrackerState } from '../state/types'
import { analyzeFoodImage, toMealDraft } from '../state/vision'
import { useStore } from '../store'
import { useToast } from '../ui/Toast'

const dayLabel = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

const DayNav = ({ dayKey, onDay }: { dayKey: string; onDay: (k: string) => void }) => {
  const today = todayKey()
  const isToday = dayKey === today
  return (
    <div className="cal-head">
      <div>
        <div className="cal-title">{isToday ? 'Today' : dayLabel(dayKey)}</div>
        <div className="cal-sub">{isToday ? dayLabel(dayKey) : 'Reviewing an earlier day'}</div>
      </div>
      <div className="cal-nav">
        <button aria-label="Previous day" onClick={() => onDay(prevKey(dayKey))}>
          ‹
        </button>
        <button aria-label="Next day" disabled={isToday} onClick={() => onDay(nextKey(dayKey))}>
          ›
        </button>
      </div>
    </div>
  )
}

const Meter = ({
  label,
  value,
  target,
  unit,
  overIsBad,
}: {
  label: string
  value: number
  target: number
  unit: string
  overIsBad: boolean
}) => {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const over = value > target
  const state = over ? (overIsBad ? 'over' : 'hit') : value >= target ? 'hit' : ''
  return (
    <div className="macro">
      <div className="macro-head">
        <span className="macro-label">{label}</span>
        <span className="macro-num">
          {Math.round(value)}
          <small> / {target} {unit}</small>
        </span>
      </div>
      <div className="track">
        <div className={`fill ${state}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const DaySummary = ({ meals }: { meals: MealEntry[] }) => {
  const t = mealTotals(meals)
  return (
    <div className="card">
      <Meter label="Calories" value={t.kcal} target={KCAL_TARGET} unit="kcal" overIsBad />
      <Meter label="Protein" value={t.protein} target={PROTEIN_TARGET} unit="g" overIsBad={false} />
      <div className="macro-foot">
        {t.items === 0
          ? 'Nothing logged yet — add your first item below.'
          : `${t.items} item${t.items > 1 ? 's' : ''} logged across ${new Set(meals.map((m) => m.type)).size} meal${
              new Set(meals.map((m) => m.type)).size > 1 ? 's' : ''
            }.`}
      </div>
    </div>
  )
}

const blankForm = { name: '', kcal: '', protein: '', qty: '1' }

const MealForm = ({ dayKey }: { dayKey: string }) => {
  const { update, mode, user } = useStore()
  const toast = useToast()
  const [type, setType] = useState<MealType>('breakfast')
  const [form, setForm] = useState(blankForm)
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const canScan = mode === 'firebase' && Boolean(user)

  const set = (k: keyof typeof blankForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setScanning(true)
    try {
      const estimate = await analyzeFoodImage(file)
      const draft = toMealDraft(estimate)
      setForm((f) => ({ ...f, ...draft }))
      const est = `${Math.round(Number(draft.kcal))} kcal`
      const tail =
        estimate.confidence === 'low'
          ? 'Rough guess — double-check the numbers.'
          : 'Review the numbers, then add.'
      toast('🔍 Scanned', `${draft.name} · ~${est}. ${tail}`)
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'decode-failed') toast('⚠️ Bad image', "Couldn't read that image file.")
      else if (code === 'empty-result') toast('⚠️ No food found', 'Try another photo or type it in.')
      else toast('⚠️ Scan failed', "Couldn't reach the food AI — enter it manually.")
    } finally {
      setScanning(false)
    }
  }

  const add = () => {
    const name = form.name.trim()
    if (!name) {
      toast('⚠️ Name it first', 'What did you eat? e.g. "3 idli + sambar".')
      return
    }
    const kcal = form.kcal === '' ? 0 : parseFloat(form.kcal)
    const protein = form.protein === '' ? 0 : parseFloat(form.protein)
    const qty = form.qty === '' ? 1 : Math.round(parseFloat(form.qty))
    const bad =
      !Number.isFinite(kcal) ||
      kcal < MEAL_LIMITS.kcal.min ||
      kcal > MEAL_LIMITS.kcal.max ||
      !Number.isFinite(protein) ||
      protein < MEAL_LIMITS.protein.min ||
      protein > MEAL_LIMITS.protein.max ||
      !Number.isFinite(qty) ||
      qty < MEAL_LIMITS.qty.min ||
      qty > MEAL_LIMITS.qty.max
    if (bad) {
      toast('⚠️ Check the numbers', `Cals 0–${MEAL_LIMITS.kcal.max}, protein 0–${MEAL_LIMITS.protein.max}g, count 1–${MEAL_LIMITS.qty.max}.`)
      return
    }
    const entry: MealEntry = {
      id: newMealId(),
      type,
      name: name.slice(0, MEAL_LIMITS.name.max),
      kcal: Math.round(kcal * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      qty,
    }
    update((s) => {
      const list = s.meals[dayKey] ?? []
      return { ...s, meals: { ...s.meals, [dayKey]: [...list, entry] } }
    })
    setForm(blankForm)
    const label = MEAL_TYPES.find((m) => m.id === type)?.label ?? 'Meal'
    toast('🍽️ Logged', `${label}: ${entry.name} · ${Math.round(entry.kcal * entry.qty)} kcal.`)
  }

  return (
    <div className="card meal-form">
      <div className="seg" role="group" aria-label="Meal type">
        {MEAL_TYPES.map((m) => (
          <button
            key={m.id}
            className={`seg-btn${type === m.id ? ' on' : ''}`}
            aria-pressed={type === m.id}
            onClick={() => setType(m.id)}
          >
            <span aria-hidden>{m.icon}</span> {m.label}
          </button>
        ))}
      </div>
      {canScan && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={onPick}
          />
          <button
            type="button"
            className="btn scan-btn"
            disabled={scanning}
            onClick={() => fileRef.current?.click()}
          >
            {scanning ? '⏳ Analyzing…' : '📷 Scan food'}
          </button>
        </>
      )}
      <input
        className="meal-name"
        type="text"
        maxLength={MEAL_LIMITS.name.max}
        placeholder="What did you eat? e.g. 3 idli + sambar"
        aria-label="Food name"
        value={form.name}
        onChange={set('name')}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />
      <div className="meal-nums">
        <label>
          <span>Cals (each)</span>
          <input type="number" inputMode="numeric" min={MEAL_LIMITS.kcal.min} max={MEAL_LIMITS.kcal.max} placeholder="0" value={form.kcal} onChange={set('kcal')} onKeyDown={(e) => e.key === 'Enter' && add()} />
        </label>
        <label>
          <span>Protein g</span>
          <input type="number" inputMode="numeric" min={MEAL_LIMITS.protein.min} max={MEAL_LIMITS.protein.max} placeholder="0" value={form.protein} onChange={set('protein')} onKeyDown={(e) => e.key === 'Enter' && add()} />
        </label>
        <label>
          <span>Count</span>
          <input type="number" inputMode="numeric" min={MEAL_LIMITS.qty.min} max={MEAL_LIMITS.qty.max} value={form.qty} onChange={set('qty')} onKeyDown={(e) => e.key === 'Enter' && add()} />
        </label>
      </div>
      <button className="btn wide" onClick={add}>
        + Add to log
      </button>
    </div>
  )
}

const MealGroup = ({ type, meals, dayKey }: { type: MealType; meals: MealEntry[]; dayKey: string }) => {
  const { update } = useStore()
  const def = MEAL_TYPES.find((m) => m.id === type)
  const t = mealTotals(meals)

  const remove = (id: string) =>
    update((s) => {
      const list = (s.meals[dayKey] ?? []).filter((m) => m.id !== id)
      const next = { ...s.meals }
      if (list.length) next[dayKey] = list
      else delete next[dayKey]
      return { ...s, meals: next }
    })

  return (
    <div className="meal-group">
      <div className="meal-group-head">
        <span className="mg-title">
          <span aria-hidden>{def?.icon}</span> {def?.label}
        </span>
        <span className="mg-total">
          {Math.round(t.kcal)} kcal · {Math.round(t.protein)}g P
        </span>
      </div>
      {meals.map((m) => (
        <div key={m.id} className="meal-item">
          <span className="mi-body">
            <span className="mi-name">
              {m.qty > 1 && <span className="mi-qty">{m.qty}×</span>}
              {m.name}
            </span>
            <span className="mi-macros">
              {Math.round(m.kcal * m.qty)} kcal
              {m.protein > 0 && ` · ${Math.round(m.protein * m.qty)}g protein`}
            </span>
          </span>
          <button className="mi-del" aria-label={`Remove ${m.name}`} onClick={() => remove(m.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

const MealList = ({ meals, dayKey }: { meals: MealEntry[]; dayKey: string }) => {
  const grouped = useMemo(() => {
    return MEAL_TYPES.map((mt) => ({
      type: mt.id,
      items: meals.filter((m) => m.type === mt.id),
    })).filter((g) => g.items.length > 0)
  }, [meals])

  if (!grouped.length) {
    return (
      <div className="card meal-empty">
        No meals logged for this day. Pick a slot above, type what you ate, and hit add.
      </div>
    )
  }
  return (
    <div>
      {grouped.map((g) => (
        <MealGroup key={g.type} type={g.type} meals={g.items} dayKey={dayKey} />
      ))}
    </div>
  )
}

export const Meals = ({ state }: { state: TrackerState }) => {
  const [dayKey, setDayKey] = useState(todayKey())
  const meals = state.meals[dayKey] ?? []

  return (
    <div className="page-grid meals-grid">
      <div className="col">
        <div className="eyebrow">Meal log</div>
        <div className="card">
          <DayNav dayKey={dayKey} onDay={setDayKey} />
        </div>
        <div className="eyebrow">Add an item</div>
        <MealForm dayKey={dayKey} />
      </div>
      <div className="col">
        <div className="eyebrow">Day total</div>
        <DaySummary meals={meals} />
        <div className="eyebrow">Logged</div>
        <MealList meals={meals} dayKey={dayKey} />
      </div>
    </div>
  )
}
