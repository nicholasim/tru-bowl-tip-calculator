/**
 * Tip distribution calculations.
 * Employees are grouped by hours worked; everyone in a group receives the
 * exact same rounded share. Each group's share is computed independently, so
 * the distributed total can land a cent or two off total tips -- equal pay
 * for equal hours takes priority over the distributed total matching exactly.
 *
 * All money is rounded through the helpers below so cents are derived the
 * same way everywhere: a tiny epsilon guards against cases where chained
 * floating-point arithmetic lands just under/over an exact cent boundary
 * (e.g. 1000 represented as 999.9999999999999).
 */

const FP_EPSILON = 1e-9

/** Dollars -> dollars, rounded to the nearest cent. */
function roundToCents(amount) {
  return Math.round((amount + FP_EPSILON) * 100) / 100
}

/** Dollars -> integer cents, rounded to the nearest cent. */
function toCentsInt(amount) {
  return Math.round((amount + FP_EPSILON) * 100)
}

/**
 * Round the fraction numerator/denominator to the nearest integer, half-up
 * (ties round away from zero). Both inputs must be non-negative integers
 * within the safe integer range, so the remainder check is exact -- no
 * floating-point division is used to make the rounding decision.
 */
function divideHalfUp(numerator, denominator) {
  const remainder = numerator % denominator
  const quotient = (numerator - remainder) / denominator
  return remainder * 2 >= denominator ? quotient + 1 : quotient
}

/**
 * Distribute tips by hours. Only includes employees with hours > 0.
 * Employees with identical hours are grouped and always receive an identical
 * share, rounded half-up to the nearest cent.
 *
 * @param {Object} tips - { cash, app, creditCard } in dollars
 * @param {Object} hours - { employeeId: number } hours worked per employee
 * @returns {{ shares: Object, totalTips: number, totalHours: number, ratePerHour: number, reconciled: boolean }}
 */
export function distributeTipsByHours(tips, hours) {
  const cash = parseFloat(tips.cash) || 0
  const app = parseFloat(tips.app) || 0
  const creditCard = parseFloat(tips.creditCard) || 0
  const totalTips = roundToCents(cash + app + creditCard)
  const entries = Object.entries(hours).filter(([, h]) => (parseFloat(h) || 0) > 0)
  const totalHours = entries.reduce((sum, [, h]) => sum + (parseFloat(h) || 0), 0)

  if (totalHours === 0 || totalTips === 0) {
    const shares = {}
    Object.entries(hours).forEach(([id]) => { shares[id] = 0 })
    return {
      shares,
      totalTips,
      totalHours: 0,
      ratePerHour: 0,
      reconciled: true,
    }
  }

  const ratePerHour = totalTips / totalHours
  const totalTipsCents = toCentsInt(totalTips)

  // Group by hours (hundredths of an hour -- inputs are capped at 2 decimal
  // places) so equal hours always land in the same group and get one shared
  // rounding decision instead of being rounded independently per person.
  const groups = new Map()
  let totalHoursHundredths = 0
  for (const [employeeId, h] of entries) {
    const hrs = parseFloat(h) || 0
    const hrsHundredths = Math.round(hrs * 100)
    totalHoursHundredths += hrsHundredths
    if (!groups.has(hrsHundredths)) groups.set(hrsHundredths, [])
    groups.get(hrsHundredths).push(employeeId)
  }

  const shares = {}
  let distributedTotalCents = 0
  for (const [hrsHundredths, employeeIds] of groups) {
    const shareCents = divideHalfUp(totalTipsCents * hrsHundredths, totalHoursHundredths)
    distributedTotalCents += shareCents * employeeIds.length
    for (const employeeId of employeeIds) {
      shares[employeeId] = shareCents / 100
    }
  }

  const reconciled = distributedTotalCents === totalTipsCents

  return {
    shares,
    totalTips,
    totalHours,
    ratePerHour,
    reconciled,
  }
}

/**
 * Compute pay period totals from days.
 * Sums in integer cents to avoid floating-point drift (e.g. 3–4 cents off over many days).
 *
 * @param {Array} days - Each { date, tips, hours }
 * @returns {Object} { byEmployee: { employeeId: total }, byDay: { date: { employeeId: share } } }
 */
export function computePeriodTotals(days) {
  const byEmployeeCents = {}
  const byDay = {}

  for (const day of days) {
    const { shares } = distributeTipsByHours(day.tips, day.hours)
    // Round each day's share to cents so table cells are exact
    const dayShares = {}
    for (const [employeeId, amount] of Object.entries(shares)) {
      const cents = toCentsInt(amount)
      dayShares[employeeId] = cents / 100
      if (cents > 0) {
        byEmployeeCents[employeeId] = (byEmployeeCents[employeeId] ?? 0) + cents
      }
    }
    byDay[day.date] = dayShares
  }

  const byEmployee = {}
  for (const [employeeId, cents] of Object.entries(byEmployeeCents)) {
    byEmployee[employeeId] = cents / 100
  }

  return { byEmployee, byDay }
}
