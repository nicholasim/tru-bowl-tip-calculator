/**
 * Tip distribution calculations.
 * Uses largest-remainder method so sum of distributed amounts equals total tips.
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

/** Dollars -> integer cents, rounded down (used for largest-remainder base shares). */
function floorToCentsInt(amount) {
  return Math.floor(amount * 100 + FP_EPSILON)
}

/**
 * Distribute tips by hours using largest-remainder method.
 * Only includes employees with hours > 0.
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
  const exactAmounts = []
  let index = 0
  for (const [employeeId, h] of entries) {
    const hrs = parseFloat(h) || 0
    const exact = (hrs / totalHours) * totalTips
    const flooredCents = floorToCentsInt(exact)
    exactAmounts.push({
      employeeId,
      hours: hrs,
      flooredCents,
      remainder: exact - flooredCents / 100,
      index: index++,
    })
  }

  // Sort by remainder descending; use index as tiebreaker so extra pennies aren't always given to the same person
  const sortedByRemainder = [...exactAmounts].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index
  )
  const totalCents = toCentsInt(totalTips)
  const flooredCentsList = exactAmounts.map((a) => a.flooredCents)
  const assignedCents = flooredCentsList.reduce((s, c) => s + c, 0)
  const toAssign = Math.max(0, totalCents - assignedCents)

  for (let i = 0; i < toAssign; i++) {
    flooredCentsList[sortedByRemainder[i].index] += 1
  }

  // Round to exact cents so displayed amounts and daily totals don't drift from floating point
  const shares = {}
  exactAmounts.forEach(({ employeeId }, i) => {
    shares[employeeId] = flooredCentsList[i] / 100
  })

  const distributedTotal = Object.values(shares).reduce((a, b) => a + b, 0)
  const reconciled = Math.abs(distributedTotal - totalTips) < 0.001

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
