import type { TrackerState } from '../state/types'

/**
 * Storage behind the store: Firestore when configured, localStorage otherwise.
 * subscribe() must emit the initial value and every later change; it returns
 * an unsubscribe function.
 */
export interface StorageAdapter {
  subscribe: (onState: (s: TrackerState) => void, onError: (e: Error) => void) => () => void
  save: (s: TrackerState) => Promise<void>
}
