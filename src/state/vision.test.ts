import { describe, expect, it } from 'vitest'
import { toMealDraft, type FoodEstimate } from './vision'

const est = (over: Partial<FoodEstimate> = {}): FoodEstimate => ({
  description: 'Idli with sambar',
  kcal: 320,
  protein: 12,
  confidence: 'medium',
  ...over,
})

describe('toMealDraft', () => {
  it('maps a normal estimate to string form fields with qty 1', () => {
    expect(toMealDraft(est())).toEqual({
      name: 'Idli with sambar',
      kcal: '320',
      protein: '12',
      qty: '1',
    })
  })

  it('clamps values above MEAL_LIMITS down to the max', () => {
    const d = toMealDraft(est({ kcal: 99999, protein: 9999 }))
    expect(d.kcal).toBe('5000')
    expect(d.protein).toBe('500')
  })

  it('clamps negative or NaN numbers up to 0', () => {
    const d = toMealDraft(est({ kcal: -50, protein: Number.NaN }))
    expect(d.kcal).toBe('0')
    expect(d.protein).toBe('0')
  })

  it('rounds to one decimal place', () => {
    expect(toMealDraft(est({ kcal: 320.567, protein: 12.44 })).kcal).toBe('320.6')
  })

  it('truncates a description longer than 80 characters', () => {
    const long = 'a'.repeat(200)
    expect(toMealDraft(est({ description: long })).name.length).toBe(80)
  })

  it('trims whitespace from the description', () => {
    expect(toMealDraft(est({ description: '  Dosa  ' })).name).toBe('Dosa')
  })

  it('keeps values exactly at the limits unchanged', () => {
    const d = toMealDraft(est({ kcal: 5000, protein: 500 }))
    expect(d.kcal).toBe('5000')
    expect(d.protein).toBe('500')
  })

  it('keeps a description of exactly 80 characters', () => {
    const exact = 'a'.repeat(80)
    expect(toMealDraft(est({ description: exact })).name).toBe(exact)
  })
})
