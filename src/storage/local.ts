import { defaultState } from '../state/defaults'
import { sanitizeState } from '../state/sanitize'
import type { TrackerState } from '../state/types'
import type { StorageAdapter } from './adapter'

const KEY = 'questlog-150-90-v1'

export const createLocalAdapter = (): StorageAdapter => ({
  subscribe: (onState, onError) => {
    try {
      const raw = localStorage.getItem(KEY)
      onState(raw ? sanitizeState(JSON.parse(raw)) : defaultState())
    } catch (e) {
      onError(e instanceof Error ? e : new Error('Failed to read local data'))
      onState(defaultState())
    }
    return () => {}
  },
  save: async (s: TrackerState) => {
    localStorage.setItem(KEY, JSON.stringify(s))
  },
})
