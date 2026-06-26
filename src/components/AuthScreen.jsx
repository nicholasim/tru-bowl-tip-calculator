import { useState } from 'react'
import { signInWithUsername, signUpWithUsername } from '../lib/auth'

export function AuthScreen({ onContinueAsGuest }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      setError('Enter a username and password.')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUpWithUsername(trimmedUsername, password)
      } else {
        await signInWithUsername(trimmedUsername, password)
      }
      // On success, the useAuth session listener picks up the new session
      // and the app switches into authenticated mode automatically.
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="user-screen">
      <div className="user-screen-card">
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Create Account
          </button>
        </div>

        <p className="user-screen-hint">
          {mode === 'login'
            ? 'Log in to access your tip data from any device.'
            : 'Create an account to save your tip data to the cloud.'}
        </p>

        <form onSubmit={handleSubmit} className="user-screen-form">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoFocus
            aria-label="Username"
            className="user-screen-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-label="Password"
            className="user-screen-input"
          />
          {mode === 'signup' && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              aria-label="Confirm password"
              className="user-screen-input"
            />
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="user-screen-continue" disabled={submitting}>
            {submitting
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Logging in…'
              : mode === 'signup'
                ? 'Create Account'
                : 'Log In'}
          </button>
        </form>

        <div className="auth-guest-divider">
          <span>or</span>
        </div>

        <button type="button" className="auth-guest-button" onClick={onContinueAsGuest}>
          Continue as Guest
        </button>
        <p className="auth-guest-hint">
          Guest data stays on this device only and isn&apos;t saved to the cloud.
        </p>
      </div>
    </div>
  )
}
