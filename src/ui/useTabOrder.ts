import { useCallback, useState } from 'react'
import { TAB_IDS, type TabId } from './tabs'

const KEY = 'questlog.tabOrder'

/** Coerce stored order into a valid, complete TabId[]: drop unknown/duplicate
 *  ids, then append any tabs missing from the saved order (e.g. a tab added in
 *  a later release) in their default position. */
const sanitizeOrder = (raw: unknown): TabId[] => {
  const valid = new Set<string>(TAB_IDS)
  const seen = new Set<string>()
  const out: TabId[] = []
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === 'string' && valid.has(v) && !seen.has(v)) {
        seen.add(v)
        out.push(v as TabId)
      }
    }
  }
  for (const id of TAB_IDS) if (!seen.has(id)) out.push(id)
  return out
}

const load = (): TabId[] => {
  try {
    return sanitizeOrder(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return [...TAB_IDS]
  }
}

/** Persisted (device-local) nav tab order. Returns the order plus setters that
 *  write through to localStorage. */
export const useTabOrder = (): [TabId[], (order: TabId[]) => void, () => void] => {
  const [order, setOrder] = useState<TabId[]>(load)

  const save = useCallback((next: TabId[]) => {
    const clean = sanitizeOrder(next)
    setOrder(clean)
    try {
      localStorage.setItem(KEY, JSON.stringify(clean))
    } catch {
      // ignore — a full/blocked storage just means the order won't persist
    }
  }, [])

  const reset = useCallback(() => {
    setOrder([...TAB_IDS])
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  }, [])

  return [order, save, reset]
}
