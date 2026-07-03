import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDb } from '../firebase'
import { defaultState } from '../state/defaults'
import { sanitizeState } from '../state/sanitize'
import type { TrackerState } from '../state/types'
import type { StorageAdapter } from './adapter'

export const createFirestoreAdapter = (uid: string): StorageAdapter => {
  const ref = doc(getDb(), 'users', uid)
  return {
    subscribe: (onState, onError) => {
      // Create the doc on first sign-in so the snapshot always has data.
      getDoc(ref)
        .then((snap) => {
          if (!snap.exists()) {
            return setDoc(ref, { ...defaultState(), updatedAt: serverTimestamp() })
          }
        })
        .catch((e: unknown) =>
          onError(e instanceof Error ? e : new Error('Could not initialise your data')),
        )
      return onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) onState(sanitizeState(snap.data()))
        },
        (e) => onError(e instanceof Error ? e : new Error('Sync failed')),
      )
    },
    save: async (s: TrackerState) => {
      await setDoc(ref, { ...s, updatedAt: serverTimestamp() })
    },
  }
}
