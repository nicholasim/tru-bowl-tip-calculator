import { nanoid } from 'nanoid'
import { DEFAULT_TIPS, BIWEEKLY_DAYS } from './constants'

/**
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} [endDate] - Optional end date (YYYY-MM-DD). If omitted, 14 days from start.
 * @returns {Object} New pay period with days from start through end (inclusive)
 */
export function createPayPeriod(startDate, endDate) {
  let start = new Date(startDate + 'T00:00:00')
  let end = endDate ? new Date(endDate + 'T00:00:00') : new Date(start)
  if (!endDate) end.setDate(end.getDate() + BIWEEKLY_DAYS - 1)
  if (end < start) [start, end] = [end, start]

  const id = nanoid()
  const days = []
  let current = new Date(start.getTime())

  while (current <= end) {
    days.push({
      date: current.toISOString().slice(0, 10),
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
