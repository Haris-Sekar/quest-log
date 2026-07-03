import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ACHIEVEMENTS } from './data/achievements'
import { RARITY_XP } from './data/ranks'
import { firebaseConfigured, getFirebaseAuth } from './firebase'
import { sanitizeState } from './state/sanitize'
import { applyAchievements } from './state/stats'
import type { TrackerState } from './state/types'
import type { StorageAdapter } from './storage/adapter'
import { createFirestoreAdapter } from './storage/firestore'
import { createLocalAdapter } from './storage/local'
import { useToast } from './ui/Toast'

export type StoreMode = 'firebase' | 'local'

interface StoreValue {
  mode: StoreMode
  user: User | null
  authReady: boolean
  state: TrackerState | null
  update: (fn: (s: TrackerState) => TrackerState) => void
  signOut: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export const useStore = (): StoreValue => {
  const v = useContext(StoreContext)
  if (!v) throw new Error('useStore must be used inside <StoreProvider>')
  return v
}

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const mode: StoreMode = firebaseConfigured ? 'firebase' : 'local'
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(mode === 'local')
  const [state, setState] = useState<TrackerState | null>(null)
  const stateRef = useRef<TrackerState | null>(null)
  const adapterRef = useRef<StorageAdapter | null>(null)
  const toast = useToast()

  const announce = useCallback(
    (fresh: string[]) => {
      for (const id of fresh) {
        const a = ACHIEVEMENTS.find((x) => x.id === id)
        if (a) toast(`${a.icon} Achievement unlocked — ${a.name}`, `${a.desc} · +${RARITY_XP[a.r]} XP`)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (mode !== 'firebase') return
    return onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u)
      setAuthReady(true)
    })
  }, [mode])

  useEffect(() => {
    if (mode === 'firebase' && !user) {
      setState(null)
      stateRef.current = null
      adapterRef.current = null
      return
    }
    const adapter = mode === 'firebase' && user ? createFirestoreAdapter(user.uid) : createLocalAdapter()
    adapterRef.current = adapter
    return adapter.subscribe(
      (s) => {
        // Imported or synced data may already satisfy achievements — stamp them
        // on arrival. Re-saving converges: the echoed snapshot unlocks nothing.
        const { state: next, fresh } = applyAchievements(s)
        stateRef.current = next
        setState(next)
        if (fresh.length) {
          adapter.save(next).catch((e: unknown) => console.error('Save failed:', e))
          announce(fresh)
        }
      },
      (e) => {
        console.error('Storage error:', e)
        toast('⚠️ Sync problem', 'Changes are kept offline and will retry.')
      },
    )
  }, [mode, user, toast, announce])

  const update = useCallback(
    (fn: (s: TrackerState) => TrackerState) => {
      const cur = stateRef.current
      const adapter = adapterRef.current
      if (!cur || !adapter) return
      const { state: next, fresh } = applyAchievements(sanitizeState(fn(cur)))
      stateRef.current = next
      setState(next)
      adapter.save(next).catch((e: unknown) => {
        console.error('Save failed:', e)
        toast('⚠️ Save failed', 'Will retry when back online.')
      })
      announce(fresh)
    },
    [toast, announce],
  )

  const signOut = useCallback(async () => {
    if (mode === 'firebase') await fbSignOut(getFirebaseAuth())
  }, [mode])

  const value = useMemo(
    () => ({ mode, user, authReady, state, update, signOut }),
    [mode, user, authReady, state, update, signOut],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
