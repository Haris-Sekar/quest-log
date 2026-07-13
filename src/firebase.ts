import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAI, getGenerativeModel, GoogleAIBackend, Schema, type GenerativeModel } from 'firebase/ai'

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

let appCheckStarted = false

/** Start App Check once, if a reCAPTCHA site key is configured. In dev, set a
 *  debug token so localhost passes without a real reCAPTCHA challenge. */
const ensureAppCheck = (fbApp: FirebaseApp): void => {
  if (appCheckStarted) return
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined
  if (!siteKey) return
  if (import.meta.env.DEV) {
    // @ts-expect-error — debug flag read by the App Check SDK at init time
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(fbApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
  appCheckStarted = true
}

let foodModel: GenerativeModel | null = null

/** The Gemini model used for food-photo estimation, via Firebase AI Logic.
 *  Structured output: returns strict JSON matching FoodEstimate. Lazy so the
 *  AI SDK only loads on first scan. Requires Firebase to be configured. */
export const getFoodModel = (): GenerativeModel => {
  const fbApp = ensureApp()
  ensureAppCheck(fbApp)
  if (!foodModel) {
    const ai = getAI(fbApp, { backend: new GoogleAIBackend() })
    foodModel = getGenerativeModel(ai, {
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: Schema.object({
          properties: {
            description: Schema.string(),
            kcal: Schema.number(),
            protein: Schema.number(),
            confidence: Schema.enumString({ enum: ['low', 'medium', 'high'] }),
          },
        }),
      },
    })
  }
  return foodModel
}
