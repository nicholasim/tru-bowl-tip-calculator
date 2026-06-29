'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Check, Loader2, MoreVertical, Plus, Trash2, X } from 'lucide-react'
import { useTipCalcStorage } from '@/hooks/useLocalStorage'
import { useAuth } from '@/hooks/useAuth'
import { useSupabaseTipCalcStorage } from '@/hooks/useSupabaseStorage'
import { useTheme } from '@/hooks/useTheme'
import { signOut } from '@/lib/auth'
import { clearLocalGuestData } from '@/lib/migrateLocalData'
import { createPayPeriod, defaultEndDate, formatPeriodRange } from '@/lib/periodHelpers'
import { RosterManager } from '@/components/RosterManager'
import { DayEntry } from '@/components/DayEntry'
import { PeriodSummary } from '@/components/PeriodSummary'
import { AuthScreen } from '@/components/AuthScreen'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const GUEST_NAME = 'Guest'

const SAVE_STATUS_DISPLAY = {
  saving: { label: 'Saving…', icon: Loader2, spin: true },
  saved: { label: 'Saved', icon: Check },
  error: { label: 'Save failed', icon: AlertTriangle },
}

function formatDisplayName(username) {
  return username
    .trim()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function App() {
  const { user, profile, loading: authLoading } = useAuth()
  const isAuthenticated = !!user
  const { theme, toggleTheme } = useTheme()

  const [guestMode, setGuestMode] = useState(false)

  const guestStorage = useTipCalcStorage(guestMode ? GUEST_NAME : null)
  const cloudStorage = useSupabaseTipCalcStorage(isAuthenticated ? user.id : null)
  const active = isAuthenticated ? cloudStorage : guestStorage

  const {
    roster,
    setRoster,
    periods,
    setPeriods,
    activePeriodId,
    setActivePeriodId,
    saveStatus,
    flush,
    cancelPendingSyncs,
  } = active

  // Always display the roster alphabetically, regardless of insertion order.
  const sortedRoster = [...roster].sort((a, b) => a.name.localeCompare(b.name))

  // 'idle' has no entry in SAVE_STATUS_DISPLAY, so the badge is intentionally
  // hidden until the first save attempt (and again ~2s after a save settles).
  const saveStatusInfo = SAVE_STATUS_DISPLAY[saveStatus]
  const SaveStatusIcon = saveStatusInfo?.icon

  const [showNewPeriodForm, setShowNewPeriodForm] = useState(false)
  const [newPeriodStart, setNewPeriodStart] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [newPeriodEnd, setNewPeriodEnd] = useState(() => defaultEndDate(newPeriodStart))

  // Keep the end date in sync with the start date so a stale end date (from
  // before the start was changed) can't silently span into extra months.
  // A manually-picked end date is preserved as long as it's still >= start.
  const handleStartDateChange = (value) => {
    setNewPeriodStart(value)
    setNewPeriodEnd((prevEnd) => (prevEnd && prevEnd >= value ? prevEnd : defaultEndDate(value)))
  }

  const activePeriod = periods.find((p) => p.id === activePeriodId)

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Re-show the failed-save banner each time a *new* error occurs, even if
  // the user already dismissed a previous one. Adjusted during render (not
  // in an effect) since it's just resetting state in response to a prop
  // change, per https://react.dev/learn/you-might-not-need-an-effect.
  const [saveBannerDismissed, setSaveBannerDismissed] = useState(false)
  const [prevSaveStatus, setPrevSaveStatus] = useState(saveStatus)
  if (saveStatus !== prevSaveStatus) {
    setPrevSaveStatus(saveStatus)
    if (saveStatus === 'error') setSaveBannerDismissed(false)
  }

  // Closes the mobile header menu when the user taps anywhere outside it,
  // since the menu has no other dismiss affordance on touch devices.
  useEffect(() => {
    if (!userMenuOpen) return
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  const handleContinueAsGuest = () => {
    // Every guest session starts fresh, with no leftover data from a
    // previous guest or prior session.
    clearLocalGuestData()
    setGuestMode(true)
  }

  const handleSwitchUser = () => {
    setGuestMode(false)
  }

  const handleSignOut = async () => {
    // Read saveStatus now (synchronously, before any await) so an error from
    // a write that already finished isn't missed -- flush()'s return value
    // only covers writes still in flight at the moment it's called.
    const hadErrorAlready = cloudStorage.saveStatus === 'error'
    cloudStorage.cancelPendingSyncs?.()
    const flushedClean = await cloudStorage.flush?.()
    if (hadErrorAlready || flushedClean === false) {
      const proceed = window.confirm(
        'A save failed. Sign out anyway? Unsaved changes may be lost.'
      )
      if (!proceed) return
    }
    await signOut()
    setGuestMode(false)
  }

  const handleResetUser = async () => {
    if (!window.confirm('Clear all data for this user? Roster and pay periods will be reset.')) return
    cancelPendingSyncs?.()
    setRoster([])
    setPeriods([])
    setActivePeriodId(null)
    await flush?.()
  }

  const minimalHeader = (
    <header className="flex items-center justify-center gap-4 border-b-2 border-primary/50 bg-brand-charcoal px-4 py-4">
      <img
        src="/tru-bowl-logo.png"
        alt="TRŪ Bowl Superfood Bar"
        className="h-10 w-auto object-contain"
      />
      <h1 className="m-0 text-xl font-bold tracking-tight text-primary">Tip Calculator</h1>
    </header>
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        {minimalHeader}
        <p className="m-6 rounded-xl border-2 border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          Loading…
        </p>
      </div>
    )
  }

  if (!isAuthenticated && !guestMode) {
    return (
      <div className="min-h-screen bg-background">
        {minimalHeader}
        <AuthScreen onContinueAsGuest={handleContinueAsGuest} />
      </div>
    )
  }

  if (isAuthenticated && cloudStorage.loading) {
    return (
      <div className="min-h-screen bg-background">
        {minimalHeader}
        <p className="m-6 rounded-xl border-2 border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          Loading your data…
        </p>
      </div>
    )
  }

  const displayName = isAuthenticated ? (profile?.username ?? '') : GUEST_NAME

  const handleCreatePeriod = (e) => {
    e.preventDefault()
    const period = createPayPeriod(newPeriodStart, newPeriodEnd)
    setPeriods((prev) => [period, ...prev])
    setActivePeriodId(period.id)
    setShowNewPeriodForm(false)
  }

  const handleUpdateDay = (dayIndex, updatedDay) => {
    if (!activePeriod) return
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== activePeriod.id) return p
        const days = [...p.days]
        days[dayIndex] = updatedDay
        return { ...p, days }
      })
    )
  }

  const handleRemovePeriod = async (periodId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this pay period? This will permanently remove all tip entries for this period.'
    )
    if (!confirmed) return

    cancelPendingSyncs?.(periodId)
    setPeriods((prev) => prev.filter((p) => p.id !== periodId))
    if (activePeriodId === periodId) {
      const remaining = periods.filter((p) => p.id !== periodId)
      setActivePeriodId(remaining[0]?.id ?? null)
    }
    await flush?.()
  }

  const pastPeriods = periods.filter((p) => p.id !== activePeriodId)

  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b-2 border-primary/50 bg-brand-charcoal px-4 py-3 sm:gap-5 sm:px-8">
        <img
          src="/tru-bowl-logo.png"
          alt="TRŪ Bowl Superfood Bar"
          className="h-9 w-auto object-contain sm:h-12"
        />
        <div className="flex flex-1 flex-wrap items-baseline gap-3">
          <h1 className="m-0 text-lg font-bold tracking-tight text-primary sm:text-2xl">
            Tip Calculator
          </h1>

          <div ref={userMenuRef} className="relative ml-auto flex items-center gap-2 sm:gap-3">
            {saveStatusInfo && (
              <Badge
                variant={saveStatus === 'error' ? 'destructive' : 'secondary'}
                className={saveStatus === 'error' ? 'gap-1' : 'gap-1 bg-white/10 text-white'}
              >
                <SaveStatusIcon className={saveStatusInfo.spin ? 'size-3.5 animate-spin' : 'size-3.5'} />
                {saveStatusInfo.label}
              </Badge>
            )}
            <Badge variant="secondary" className="bg-white/10 text-white">
              {displayName ? formatDisplayName(displayName) : ''}
            </Badge>

            <div className="hidden items-center gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetUser}
                aria-label="Reset user data"
                className="border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white"
              >
                Reset
              </Button>
              {isAuthenticated ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white"
                >
                  Sign out
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchUser}
                  aria-label="Switch user"
                  className="border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white"
                >
                  Switch user
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white sm:hidden"
              aria-label="More options"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              <MoreVertical className="size-5" />
            </Button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-2 flex min-w-[160px] flex-col overflow-hidden rounded-md border border-border bg-popover shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="min-h-11 px-4 py-2 text-left text-sm text-popover-foreground hover:bg-accent"
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleResetUser()
                  }}
                >
                  Reset
                </button>
                {isAuthenticated ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="min-h-11 px-4 py-2 text-left text-sm text-popover-foreground hover:bg-accent"
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleSignOut()
                    }}
                  >
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="min-h-11 px-4 py-2 text-left text-sm text-popover-foreground hover:bg-accent"
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleSwitchUser()
                    }}
                  >
                    Switch user
                  </button>
                )}
              </div>
            )}

            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {saveStatus === 'error' && !saveBannerDismissed && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive sm:px-8"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            Save failed. Check your connection and try again.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSaveBannerDismissed(true)}
            aria-label="Dismiss save error"
            className="size-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 p-4 sm:flex-row sm:gap-6 sm:p-8">
        <aside className="flex flex-col gap-4 sm:w-[300px] sm:flex-none">
          <RosterManager roster={sortedRoster} setRoster={setRoster} />

          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Pay Period</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {activePeriod ? (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-semibold text-muted-foreground">Current:</span>{' '}
                    {formatPeriodRange(activePeriod.startDate, activePeriod.endDate)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePeriod(activePeriod.id)}
                    aria-label={`Delete ${formatPeriodRange(activePeriod.startDate, activePeriod.endDate)}`}
                    className="shrink-0 text-brand-pink hover:bg-brand-pink/10 hover:text-brand-pink-dark"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pay period selected.</p>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewPeriodForm((v) => !v)}
                className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                {showNewPeriodForm ? (
                  <>
                    <X className="size-4" /> Cancel
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> New pay period
                  </>
                )}
              </Button>

              {showNewPeriodForm && (
                <form onSubmit={handleCreatePeriod} className="flex flex-col gap-3 border-t border-border pt-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-period-start">Start date</Label>
                    <Input
                      id="new-period-start"
                      type="date"
                      value={newPeriodStart}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-period-end">End date</Label>
                    <Input
                      id="new-period-end"
                      type="date"
                      value={newPeriodEnd}
                      min={newPeriodStart}
                      onChange={(e) => setNewPeriodEnd(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create
                  </Button>
                </form>
              )}

              {pastPeriods.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-border pt-3">
                  <h3 className="m-0 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Past pay periods
                  </h3>
                  <ul className="m-0 flex list-none flex-col p-0">
                    {pastPeriods.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 border-b border-border py-1 last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => setActivePeriodId(p.id)}
                          className="min-h-11 flex-1 rounded-md px-2 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {formatPeriodRange(p.startDate, p.endDate)}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePeriod(p.id)}
                          aria-label={`Delete ${formatPeriodRange(p.startDate, p.endDate)}`}
                          className="shrink-0 text-brand-pink hover:bg-brand-pink/10 hover:text-brand-pink-dark"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0 flex-1">
          {!activePeriod ? (
            <p className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              Create or select a pay period to start entering tips.
            </p>
          ) : (
            <>
              <PeriodSummary period={activePeriod} roster={sortedRoster} />

              <section className="mt-6">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground before:inline-block before:h-3.5 before:w-[3px] before:rounded-sm before:bg-primary">
                  Daily Entry
                </h2>
                <div className="flex flex-col gap-4">
                  {activePeriod.days.map((day, i) => (
                    <DayEntry
                      key={day.date}
                      day={day}
                      roster={sortedRoster}
                      onUpdate={(updated) => handleUpdateDay(i, updated)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
