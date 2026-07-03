import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { getFirebaseAuth, googleProvider } from '../firebase'

const FRIENDLY: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': "That email doesn't look right.",
  'auth/email-already-in-use': 'Account exists — switch to "Sign in".',
  'auth/weak-password': 'Password needs at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts — wait a minute and retry.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
}

const friendly = (e: unknown): string => {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : ''
  return FRIENDLY[code] ?? 'Sign-in failed. Check your connection and try again.'
}

export const SignIn = () => {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of 6+ characters.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const auth = getFirebaseAuth()
      if (mode === 'in') await signInWithEmailAndPassword(auth, email.trim(), password)
      else await createUserWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider)
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="signin-wrap">
      <div className="signin card">
        <div className="signin-logo">⚔️</div>
        <h1>QuestLog</h1>
        <p className="signin-sub">150 → 90. Player login.</p>
        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="signin-error">{error}</div>}
          <button className="btn wide" type="submit" disabled={busy}>
            {busy ? '…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button className="btn ghost wide" onClick={google} disabled={busy}>
          Continue with Google
        </button>
        <button
          className="signin-switch"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in')
            setError('')
          }}
        >
          {mode === 'in' ? 'New player? Create an account' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
