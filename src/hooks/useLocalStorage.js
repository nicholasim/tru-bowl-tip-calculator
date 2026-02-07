import { useState, useEffect, useCallback, useRef } from 'react'
import { STORAGE_KEYS, userKey } from '../lib/constants'

/**
 * Persist state to localStorage with JSON serialize/deserialize.
 * Re-reads from storage when key changes (e.g. switching users).
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValueState] = useState(() => {
    try {
      const stored = key ? localStorage.getItem(key) : null
      return stored != null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  const skipWriteRef = useRef(false)

  useEffect(() => {
    if (!key) return
    try {
      const stored = localStorage.getItem(key)
      const parsed = stored != null ? JSON.parse(stored) : initialValue
      setValueState(parsed)
      skipWriteRef.current = true
    } catch {
      setValueState(initialValue)
    }
  }, [key])

  useEffect(() => {
    if (!key) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('Failed to persist to localStorage:', e)
    }
  }, [key, value])

  const setValue = useCallback((updater) => {
    setValueState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
  }, [])

  return [value, setValue]
}

/**
 * User-scoped storage. Pass username to get that user's data.
 * Returns null keys when username is missing.
 */
export function useTipCalcStorage(username) {
  const rosterKey = userKey(STORAGE_KEYS.ROSTER, username)
  const periodsKey = userKey(STORAGE_KEYS.PERIODS, username)
  const activeKey = userKey(STORAGE_KEYS.ACTIVE_PERIOD_ID, username)

  const [roster, setRoster] = useLocalStorage(rosterKey ?? 'tipcalc_roster_null', [])
  const [periods, setPeriods] = useLocalStorage(periodsKey ?? 'tipcalc_periods_null', [])
  const [activePeriodId, setActivePeriodId] = useLocalStorage(
    activeKey ?? 'tipcalc_active_null',
    null
  )

  if (!username?.trim()) {
    return {
      roster: [],
      setRoster: () => {},
      periods: [],
      setPeriods: () => {},
      activePeriodId: null,
      setActivePeriodId: () => {},
    }
  }

  return {
    roster,
    setRoster,
    periods,
    setPeriods,
    activePeriodId,
    setActivePeriodId,
  }
}
