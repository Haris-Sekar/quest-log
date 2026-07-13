import { MEAL_LIMITS, MEAL_TYPES } from '../data/meals'
import { DEFAULT_QUESTS, QUEST_LIMITS, newQuestId } from '../data/quests'
import { TASK_KINDS, TASK_LIMITS, TASK_PERIODS } from '../data/tasks'
import { newMealId } from './meals'
import { newTaskId } from './tasks'
import { DATE_RE } from './dates'
import { defaultState } from './defaults'
import type { MealEntry, MealType, QuestDef, TaskDef, TaskKind, TaskPeriod, TaskValue, TrackerState } from './types'

const num = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 10) / 10 : fallback
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

// Shared default, used by task sanitization for the createdAt fallback.
const d0 = defaultState()

const MEAL_TYPE_IDS = new Set<string>(MEAL_TYPES.map((m) => m.id))

const sanitizeMeal = (raw: unknown): MealEntry | null => {
  if (!isRecord(raw)) return null
  const type = typeof raw.type === 'string' && MEAL_TYPE_IDS.has(raw.type) ? (raw.type as MealType) : 'snack'
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MEAL_LIMITS.name.max) : ''
  if (!name) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newMealId(),
    type,
    name,
    kcal: num(raw.kcal, MEAL_LIMITS.kcal.min, MEAL_LIMITS.kcal.max, 0),
    protein: num(raw.protein, MEAL_LIMITS.protein.min, MEAL_LIMITS.protein.max, 0),
    qty: Math.round(num(raw.qty, MEAL_LIMITS.qty.min, MEAL_LIMITS.qty.max, 1)),
  }
}

const sanitizeMeals = (parsed: unknown): TrackerState['meals'] => {
  if (!isRecord(parsed)) return {}
  const out: TrackerState['meals'] = {}
  for (const [key, list] of Object.entries(parsed)) {
    if (!DATE_RE.test(key) || !Array.isArray(list)) continue
    const clean = list.map(sanitizeMeal).filter((m): m is MealEntry => m !== null)
    if (clean.length) out[key] = clean
  }
  return out
}

const sanitizeQuest = (raw: unknown): QuestDef | null => {
  if (!isRecord(raw)) return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, QUEST_LIMITS.name.max) : ''
  if (!name) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newQuestId(),
    icon: typeof raw.icon === 'string' && raw.icon.trim() ? raw.icon.trim().slice(0, QUEST_LIMITS.icon.max) : '⭐',
    name,
    desc: typeof raw.desc === 'string' ? raw.desc.trim().slice(0, QUEST_LIMITS.desc.max) : '',
    xp: Math.round(num(raw.xp, QUEST_LIMITS.xp.min, QUEST_LIMITS.xp.max, 10)),
  }
}

const sanitizeQuests = (parsed: unknown): QuestDef[] => {
  // Absent field (older saves / imports) → seed the defaults. An explicit list
  // (even after edits) is respected, deduped by id, and capped.
  if (parsed === undefined) return DEFAULT_QUESTS.map((q) => ({ ...q }))
  if (!Array.isArray(parsed)) return DEFAULT_QUESTS.map((q) => ({ ...q }))
  const seen = new Set<string>()
  const out: QuestDef[] = []
  for (const raw of parsed) {
    const q = sanitizeQuest(raw)
    if (!q || seen.has(q.id)) continue
    seen.add(q.id)
    out.push(q)
    if (out.length >= QUEST_LIMITS.max) break
  }
  return out
}

const TASK_PERIOD_IDS = new Set<string>(TASK_PERIODS.map((p) => p.id))
const TASK_KIND_IDS = new Set<string>(TASK_KINDS.map((k) => k.id))

const sanitizeTask = (raw: unknown): TaskDef | null => {
  if (!isRecord(raw)) return null
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, TASK_LIMITS.title.max) : ''
  if (!title) return null
  const period = (typeof raw.period === 'string' && TASK_PERIOD_IDS.has(raw.period) ? raw.period : 'once') as TaskPeriod
  const kind = (typeof raw.kind === 'string' && TASK_KIND_IDS.has(raw.kind) ? raw.kind : 'toggle') as TaskKind
  const task: TaskDef = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newTaskId(),
    title,
    period,
    kind,
    createdAt:
      typeof raw.createdAt === 'string' && DATE_RE.test(raw.createdAt) ? raw.createdAt : d0.startDate,
  }
  if (kind === 'number') {
    task.target = num(raw.target, TASK_LIMITS.target.min, TASK_LIMITS.target.max, 1)
    if (typeof raw.unit === 'string' && raw.unit.trim()) task.unit = raw.unit.trim().slice(0, TASK_LIMITS.unit.max)
  }
  if (kind === 'text') {
    task.targetText = typeof raw.targetText === 'string' ? raw.targetText.trim().slice(0, TASK_LIMITS.text.max) : ''
  }
  return task
}

const sanitizeTasks = (parsed: unknown): { tasks: TaskDef[]; ids: Set<string> } => {
  const tasks = (Array.isArray(parsed) ? parsed : [])
    .map(sanitizeTask)
    .filter((t): t is TaskDef => t !== null)
  return { tasks, ids: new Set(tasks.map((t) => t.id)) }
}

const sanitizeTaskLog = (parsed: unknown, validIds: Set<string>): TrackerState['taskLog'] => {
  if (!isRecord(parsed)) return {}
  const out: TrackerState['taskLog'] = {}
  for (const [id, buckets] of Object.entries(parsed)) {
    if (!validIds.has(id) || !isRecord(buckets)) continue
    const clean: Record<string, TaskValue> = {}
    for (const [pk, v] of Object.entries(buckets)) {
      if (typeof v === 'boolean' || typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) {
        clean[pk] = v
      }
    }
    if (Object.keys(clean).length) out[id] = clean
  }
  return out
}

/**
 * Coerce untrusted input (storage, imported backups, remote docs) into a safe
 * TrackerState: only validated numbers and date keys survive.
 */
export const sanitizeState = (parsed: unknown): TrackerState => {
  const d = defaultState()
  if (!isRecord(parsed)) return d
  const start = num(parsed.startWeight, 40, 300, d.startWeight)
  const weightsRaw = Array.isArray(parsed.weights) ? parsed.weights : []
  const { tasks, ids } = sanitizeTasks(parsed.tasks)
  return {
    startWeight: start,
    goalWeight: Math.min(num(parsed.goalWeight, 40, 300, d.goalWeight), start - 0.1),
    startDate:
      typeof parsed.startDate === 'string' && DATE_RE.test(parsed.startDate)
        ? parsed.startDate
        : d.startDate,
    weights: weightsRaw
      .filter((w): w is Record<string, unknown> => isRecord(w) && typeof w.d === 'string' && DATE_RE.test(w.d))
      .map((w) => ({ d: w.d as string, kg: num(w.kg, 40, 300, NaN) }))
      .filter((w) => Number.isFinite(w.kg))
      .sort((a, b) => (a.d < b.d ? -1 : 1)),
    quests: sanitizeQuests(parsed.quests),
    days: isRecord(parsed.days) ? (parsed.days as TrackerState['days']) : {},
    meals: sanitizeMeals(parsed.meals),
    tasks,
    taskLog: sanitizeTaskLog(parsed.taskLog, ids),
    ach: isRecord(parsed.ach) ? (parsed.ach as TrackerState['ach']) : {},
  }
}
