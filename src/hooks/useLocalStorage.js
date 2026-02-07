import { useState, useEffect, useCallback } from 'react'
import { STORAGE_KEYS } from '../lib/constants'

/**
 * Persist state to localStorage with JSON serialize/deserialize.
 * @param {string} key - localStorage key
 * @param {*} initialValue - default value if key is missing
 * @returns {[*, Function]} - [value, setValue]
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValueState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored != null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
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
 * Convenience hook for roster + periods + activePeriodId.
 */
export function useTipCalcStorage() {
  const [roster, setRoster] = useLocalStorage(STORAGE_KEYS.ROSTER, [])
  const [periods, setPeriods] = useLocalStorage(STORAGE_KEYS.PERIODS, [])
  const [activePeriodId, setActivePeriodId] = useLocalStorage(
    STORAGE_KEYS.ACTIVE_PERIOD_ID,
    null
  )

  return {
    roster,
    setRoster,
    periods,
    setPeriods,
    activePeriodId,
    setActivePeriodId,
  }
}
