import { useState } from 'react'
import './App.css'
import { useTipCalcStorage, useLocalStorage } from './hooks/useLocalStorage'
import { createPayPeriod, formatPeriodRange } from './lib/periodHelpers'
import { STORAGE_KEYS } from './lib/constants'
import { RosterManager } from './components/RosterManager'
import { DayEntry } from './components/DayEntry'
import { PeriodSummary } from './components/PeriodSummary'
import { UserScreen } from './components/UserScreen'

function formatDisplayName(username) {
  return username
    .trim()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function App() {
  const [currentUser, setCurrentUser] = useLocalStorage(STORAGE_KEYS.CURRENT_USER, null)

  const {
    roster,
    setRoster,
    periods,
    setPeriods,
    activePeriodId,
    setActivePeriodId,
  } = useTipCalcStorage(currentUser)

  const [showNewPeriodForm, setShowNewPeriodForm] = useState(false)
  const [newPeriodStart, setNewPeriodStart] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [newPeriodEnd, setNewPeriodEnd] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 13)
    return d.toISOString().slice(0, 10)
  })

  const activePeriod = periods.find((p) => p.id === activePeriodId)

  const handleAddUser = (username) => {
    const trimmed = username.trim()
    if (!trimmed) return
    setCurrentUser(trimmed)
  }

  const handleSwitchUser = () => {
    setCurrentUser(null)
  }

  if (!currentUser) {
    return (
      <div className="app">
        <header className="app-header app-header-minimal">
          <img
            src="/tru-bowl-logo.png"
            alt="TRŪ Bowl Superfood Bar"
            className="app-header-logo"
          />
          <h1>Tip Calculator</h1>
        </header>
        <UserScreen onAddUser={handleAddUser} />
      </div>
    )
  }

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
          <span className="app-header-user">
            {formatDisplayName(currentUser)}
            <button
              type="button"
              onClick={handleSwitchUser}
              className="btn-switch-user"
              aria-label="Switch user"
            >
              Switch user
            </button>
          </span>
        </div>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar">
          <RosterManager roster={roster} setRoster={setRoster} />

          <section className="period-selector">
            <h2>Pay Period</h2>
            {activePeriod ? (
              <p className="period-current">
                <span className="period-current-label">Current:</span>{' '}
                {formatPeriodRange(activePeriod.startDate, activePeriod.endDate)}
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
                    onChange={(e) => setNewPeriodStart(e.target.value)}
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
                        aria-label={`Remove ${formatPeriodRange(p.startDate, p.endDate)}`}
                      >
                        Remove
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
              <PeriodSummary period={activePeriod} roster={roster} />

              <section className="day-entries">
                <h2>Daily Entry</h2>
                {activePeriod.days.map((day, i) => (
                  <DayEntry
                    key={day.date}
                    day={day}
                    roster={roster}
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
