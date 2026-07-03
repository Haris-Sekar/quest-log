import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

/** True when the required Firebase env vars are present (see .env.example). */
export const firebaseConfigured: boolean = Boolean(
  cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId,
)

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

const ensureApp = (): FirebaseApp => {
  if (!firebaseConfigured) throw new Error('Firebase is not configured — copy .env.example to .env and fill it in.')
  if (!app) app = initializeApp(cfg as Record<string, string>)
  return app
}

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) authInstance = getAuth(ensureApp())
  return authInstance
}

export const getDb = (): Firestore => {
  if (!dbInstance) {
    dbInstance = initializeFirestore(ensureApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  }
  return dbInstance
}

export const googleProvider = new GoogleAuthProvider()
