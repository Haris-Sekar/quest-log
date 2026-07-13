import { MEAL_LIMITS } from '../data/meals'
import { getFoodModel } from '../firebase'
import { compressImage } from './image'

export interface FoodEstimate {
  description: string
  kcal: number
  protein: number
  confidence: 'low' | 'medium' | 'high'
}

export interface MealDraft {
  name: string
  kcal: string
  protein: string
  qty: string
}

/** Clamp a possibly-bad number into [min, max], rounding to one decimal.
 *  NaN/Infinity fall back to min. */
const clamp = (n: number, min: number, max: number): number => {
  if (!Number.isFinite(n)) return min
  const bounded = Math.min(max, Math.max(min, n))
  return Math.round(bounded * 10) / 10
}

/** Turn a raw Gemini estimate into safe, form-ready string fields.
 *  Pure: no network, no side effects. */
export const toMealDraft = (e: FoodEstimate): MealDraft => ({
  name: e.description.trim().slice(0, MEAL_LIMITS.name.max),
  kcal: String(clamp(e.kcal, MEAL_LIMITS.kcal.min, MEAL_LIMITS.kcal.max)),
  protein: String(clamp(e.protein, MEAL_LIMITS.protein.min, MEAL_LIMITS.protein.max)),
  qty: '1',
})

const PROMPT = [
  'You are a nutrition estimator. Look at the food in this photo.',
  'Identify the dish(es) visible and estimate the TOTAL calories and TOTAL',
  'grams of protein for the whole portion shown (not per item).',
  'Return: description (a short label, max 80 characters, e.g.',
  '"3 idli + sambar"), kcal (total calories), protein (total grams), and',
  'confidence (low if the food is unclear or hard to size, high if obvious).',
].join(' ')

/** Send a food photo to Gemini and get back a single combined estimate.
 *  Throws Error('empty-result') on an unparseable/empty response; network and
 *  quota errors propagate to the caller. */
export const analyzeFoodImage = async (file: File): Promise<FoodEstimate> => {
  const { base64, mimeType } = await compressImage(file)
  const model = await getFoodModel()
  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: base64, mimeType } },
  ])
  const text = result.response.text()
  if (!text) throw new Error('empty-result')

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('empty-result')
  }

  if (parsed === null || typeof parsed !== 'object') throw new Error('empty-result')
  const raw = parsed as Partial<FoodEstimate>
  if (typeof raw.description !== 'string') throw new Error('empty-result')
  const confidence: FoodEstimate['confidence'] =
    raw.confidence === 'low' || raw.confidence === 'high' ? raw.confidence : 'medium'
  return {
    description: raw.description,
    kcal: Number(raw.kcal),
    protein: Number(raw.protein),
    confidence,
  }
}
