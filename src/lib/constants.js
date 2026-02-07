/** Storage keys for localStorage */
export const STORAGE_KEYS = {
  CURRENT_USER: 'tipcalc_currentUser',
  ROSTER: 'tipcalc_roster',
  PERIODS: 'tipcalc_periods',
  ACTIVE_PERIOD_ID: 'tipcalc_activePeriodId',
}

/** Get user-scoped storage key */
export function userKey(baseKey, username) {
  if (!username || !username.trim()) return null
  const safe = username.trim().toLowerCase().replace(/\s+/g, '_')
  return `${baseKey}_${safe}`
}

/** Default empty structures */
export const DEFAULT_TIPS = { cash: 0, app: 0, creditCard: 0 }
export const BIWEEKLY_DAYS = 14
