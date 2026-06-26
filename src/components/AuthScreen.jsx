import { useState } from 'react'
import { signInWithUsername, signUpWithUsername } from '../lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const glassInputClass =
  'border-white/15 bg-black/20 text-white placeholder:text-white/40 focus-visible:border-primary focus-visible:ring-primary/40 focus-visible:shadow-[0_0_0_3px_rgba(53,191,176,0.25)]'

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
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden bg-brand-charcoal p-4 sm:p-8">
      {/* Decorative brand-colored glow - the login screen keeps this fixed
          dark look regardless of the app's light/dark theme setting. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(53,191,176,0.20),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(215,107,169,0.20),transparent_55%)]"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
        <div role="tablist" className="mb-5 flex gap-1 rounded-lg bg-black/30 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={cn(
              'min-h-10 flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
              mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-white/70 hover:text-white'
            )}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={cn(
              'min-h-10 flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
              mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-white/70 hover:text-white'
            )}
            onClick={() => switchMode('signup')}
          >
            Create Account
          </button>
        </div>

        <p className="mb-6 text-sm text-white/70">
          {mode === 'login'
            ? 'Log in to access your tip data from any device.'
            : 'Create an account to save your tip data to the cloud.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoFocus
            aria-label="Username"
            className={glassInputClass}
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-label="Password"
            className={glassInputClass}
          />
          {mode === 'signup' && (
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              aria-label="Confirm password"
              className={glassInputClass}
            />
          )}

          {error && (
            <p className="text-sm font-medium text-brand-pink" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Logging in…'
              : mode === 'signup'
                ? 'Create Account'
                : 'Log In'}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-white/50">
          <span className="h-px flex-1 bg-white/15" />
          <span>or</span>
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onContinueAsGuest}
          className="w-full border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white"
        >
          Continue as Guest
        </Button>
        <p className="mt-2 text-center text-xs text-white/50">
          One time use.
        </p>
      </div>
    </div>
  )
}
