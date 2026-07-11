import { nanoid } from 'nanoid'
import { DEFAULT_TIPS, BIWEEKLY_DAYS, MAX_PERIOD_DAYS } from './constants'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Build a YYYY-MM-DD string from a Date's *local* parts. Deliberately not
 * `date.toISOString().slice(0, 10)` -- that converts to UTC first, which
 * shifts the date back a day for anyone east of UTC once local midnight has
 * already crossed into the next UTC day.
 */
export function toIsoDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a 'YYYY-MM-DD' string into a Date at *local* midnight -- the inverse
 * of toIsoDateString. Deliberately not `new Date(isoDate)`, which parses as
 * UTC midnight and reintroduces the same off-by-one-day bug toIsoDateString
 * avoids.
 */
export function parseLocalDate(isoDate) {
  return new Date(isoDate + 'T00:00:00')
}

/**
 * @param {string} isoDate - ISO date string (YYYY-MM-DD)
 * @param {number} days - Number of days to add (may be negative)
 * @returns {string} ISO date string
 */
export function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toIsoDateString(d)
}

/**
 * Inclusive day count between two ISO date strings, regardless of which one
 * is earlier.
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} endDate - ISO date string (YYYY-MM-DD)
 * @returns {number}
 */
export function periodLengthDays(startDate, endDate) {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  return Math.round(Math.abs(end - start) / MS_PER_DAY) + 1
}

/**
 * Default end date for a new pay period: BIWEEKLY_DAYS after startDate (inclusive).
 * Single source of truth so the "new period" form can re-derive this whenever
 * the start date changes, instead of leaving a stale end date in place.
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @returns {string} ISO date string
 */
export function defaultEndDate(startDate) {
  return addDays(startDate, BIWEEKLY_DAYS - 1)
}

/**
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} [endDate] - Optional end date (YYYY-MM-DD). If omitted, 14 days from start.
 * @returns {Object} New pay period with days from start through end (inclusive)
 * @throws {Error} If the requested range exceeds MAX_PERIOD_DAYS
 */
export function createPayPeriod(startDate, endDate) {
  let start = new Date(startDate + 'T00:00:00')
  let end = endDate ? new Date(endDate + 'T00:00:00') : new Date(start)
  if (!endDate) end.setDate(end.getDate() + BIWEEKLY_DAYS - 1)
  if (end < start) [start, end] = [end, start]

  const spanDays = Math.round((end - start) / MS_PER_DAY) + 1
  if (spanDays > MAX_PERIOD_DAYS) {
    throw new Error(`Pay period can't exceed ${MAX_PERIOD_DAYS} days (requested ${spanDays}).`)
  }

  const id = nanoid()
  const days = []
  let current = new Date(start.getTime())

  while (current <= end) {
    days.push({
      date: toIsoDateString(current),
      tips: { ...DEFAULT_TIPS },
      hours: {},
    })
    current.setDate(current.getDate() + 1)
  }

  const actualStart = days.length ? days[0].date : startDate
  const actualEnd = days.length ? days[days.length - 1].date : (endDate || startDate)

  return {
    id,
    startDate: actualStart,
    endDate: actualEnd,
    days,
  }
}

/**
 * Format date for display (e.g., "Jan 15, 2025")
 */
export function formatDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date range for period selector (e.g., "Jan 1 – 15, 2025")
 */
export function formatPeriodRange(startDate, endDate) {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = start.getMonth() === end.getMonth()

  if (sameMonth && sameYear) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
  }
  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}
