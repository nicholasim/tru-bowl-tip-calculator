import { useState, useEffect, useRef } from 'react'
import './App.css'
import { useTipCalcStorage } from './hooks/useLocalStorage'
import { useAuth } from './hooks/useAuth'
import { useSupabaseTipCalcStorage } from './hooks/useSupabaseStorage'
import { signOut } from './lib/auth'
import { clearLocalGuestData } from './lib/migrateLocalData'
import { createPayPeriod, defaultEndDate, formatPeriodRange } from './lib/periodHelpers'
import { RosterManager } from './components/RosterManager'
import { DayEntry } from './components/DayEntry'
import { PeriodSummary } from './components/PeriodSummary'
import { AuthScreen } from './components/AuthScreen'

const GUEST_NAME = 'Guest'

function formatDisplayName(username) {
  return username
    .trim()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function App() {
  const { user, profile, loading: authLoading } = useAuth()
  const isAuthenticated = !!user

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
  } = active

  // Always display the roster alphabetically, regardless of insertion order.
  const sortedRoster = [...roster].sort((a, b) => a.name.localeCompare(b.name))

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
    await signOut()
    setGuestMode(false)
  }

  const handleResetUser = () => {
    if (!window.confirm('Clear all data for this user? Roster and pay periods will be reset.')) return
    setRoster([])
    setPeriods([])
    setActivePeriodId(null)
  }

  const minimalHeader = (
    <header className="app-header app-header-minimal">
      <img
        src="/tru-bowl-logo.png"
        alt="TRŪ Bowl Superfood Bar"
        className="app-header-logo"
      />
      <h1>Tip Calculator</h1>
    </header>
  )

  if (authLoading) {
    return (
      <div className="app">
        {minimalHeader}
        <p className="empty-state">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated && !guestMode) {
    return (
      <div className="app">
        {minimalHeader}
        <AuthScreen onContinueAsGuest={handleContinueAsGuest} />
      </div>
    )
  }

  if (isAuthenticated && cloudStorage.loading) {
    return (
      <div className="app">
        {minimalHeader}
        <p className="empty-state">Loading your data…</p>
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

  const handleRemovePeriod = (periodId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this pay period? This will permanently remove all tip entries for this period.'
    )
    if (!confirmed) return

    setPeriods((prev) => prev.filter((p) => p.id !== periodId))
    if (activePeriodId === periodId) {
      const remaining = periods.filter((p) => p.id !== periodId)
      setActivePeriodId(remaining[0]?.id ?? null)
    }
  }

  const pastPeriods = periods.filter((p) => p.id !== activePeriodId)

  return (
    <div className="app">
      <header className="app-header">
        <img
          src="/tru-bowl-logo.png"
          alt="TRŪ Bowl Superfood Bar"
          className="app-header-logo"
        />
        <div className="app-header-titles">
          <h1>Tip Calculator</h1>
          <span className="app-header-user" ref={userMenuRef}>
            <span className="app-header-username">
              {displayName ? formatDisplayName(displayName) : ''}
            </span>

            <span className="app-header-actions">
              <button
                type="button"
                onClick={handleResetUser}
                className="btn-reset-user"
                aria-label="Reset user data"
              >
                Reset
              </button>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="btn-switch-user"
                  aria-label="Sign out"
                >
                  Sign out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSwitchUser}
                  className="btn-switch-user"
                  aria-label="Switch user"
                >
                  Switch user
                </button>
              )}
            </span>

            <button
              type="button"
              className="app-header-menu-toggle"
              aria-label="More options"
              aria-haspopup="true"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              ⋮
            </button>

            {userMenuOpen && (
              <div className="app-header-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
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
          </span>
        </div>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar">
          <RosterManager roster={sortedRoster} setRoster={setRoster} />

          <section className="period-selector">
            <h2>Pay Period</h2>
            {activePeriod ? (
              <p className="period-current">
                <span>
                  <span className="period-current-label">Current:</span>{' '}
                  {formatPeriodRange(activePeriod.startDate, activePeriod.endDate)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePeriod(activePeriod.id)}
                  className="period-current-remove"
                  aria-label={`Delete ${formatPeriodRange(activePeriod.startDate, activePeriod.endDate)}`}
                >
                  Delete
                </button>
              </p>
            ) : (
              <p className="period-none">No pay period selected.</p>
            )}
            <button
              type="button"
              onClick={() => setShowNewPeriodForm((v) => !v)}
              className="btn-new-period"
            >
              {showNewPeriodForm ? 'Cancel' : 'New pay period'}
            </button>
            {showNewPeriodForm && (
              <form onSubmit={handleCreatePeriod} className="new-period-form">
                <label>
                  Start date
                  <input
                    type="date"
                    value={newPeriodStart}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={newPeriodEnd}
                    min={newPeriodStart}
                    onChange={(e) => setNewPeriodEnd(e.target.value)}
                  />
                </label>
                <button type="submit">Create</button>
              </form>
            )}
            {pastPeriods.length > 0 && (
              <div className="period-past">
                <h3>Past pay periods</h3>
                <ul className="period-past-list">
                  {pastPeriods.map((p) => (
                    <li key={p.id} className="period-past-item">
                      <button
                        type="button"
                        onClick={() => setActivePeriodId(p.id)}
                        className="period-past-open"
                      >
                        {formatPeriodRange(p.startDate, p.endDate)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePeriod(p.id)}
                        className="period-past-remove"
                        aria-label={`Delete ${formatPeriodRange(p.startDate, p.endDate)}`}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </aside>

        <main className="app-main">
          {!activePeriod ? (
            <p className="empty-state">
              Create or select a pay period to start entering tips.
            </p>
          ) : (
            <>
              <PeriodSummary period={activePeriod} roster={sortedRoster} />

              <section className="day-entries">
                <h2>Daily Entry</h2>
                {activePeriod.days.map((day, i) => (
                  <DayEntry
                    key={day.date}
                    day={day}
                    roster={sortedRoster}
                    onUpdate={(updated) => handleUpdateDay(i, updated)}
                  />
                ))}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
