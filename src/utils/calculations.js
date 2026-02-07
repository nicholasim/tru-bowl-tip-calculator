/**
 * Tip distribution calculations.
 * Uses largest-remainder method so sum of distributed amounts equals total tips.
 */

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
  const totalTips = Math.round((cash + app + creditCard) * 100) / 100
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
    exactAmounts.push({
      employeeId,
      hours: hrs,
      exact,
      remainder: exact - Math.floor(exact * 100) / 100,
      index: index++,
    })
  }

  // Sort by remainder descending to assign extra pennies
  const sortedByRemainder = [...exactAmounts].sort((a, b) => b.remainder - a.remainder)
  const totalCents = Math.round(totalTips * 100)
  const flooredCents = exactAmounts.map((a) => Math.floor(a.exact * 100))
  let assignedCents = flooredCents.reduce((s, c) => s + c, 0)
  const toAssign = totalCents - assignedCents

  for (let i = 0; i < toAssign; i++) {
    flooredCents[sortedByRemainder[i].index] += 1
  }

  const shares = {}
  exactAmounts.forEach(({ employeeId }, i) => {
    shares[employeeId] = flooredCents[i] / 100
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
 *
 * @param {Array} days - Each { date, tips, hours }
 * @returns {Object} { byEmployee: { employeeId: total }, byDay: { date: { employeeId: share } } }
 */
export function computePeriodTotals(days) {
  const byEmployee = {}
  const byDay = {}

  for (const day of days) {
    const { shares } = distributeTipsByHours(day.tips, day.hours)
    byDay[day.date] = shares

  for (const [employeeId, amount] of Object.entries(shares)) {
    if (amount > 0) {
      byEmployee[employeeId] = (byEmployee[employeeId] ?? 0) + amount
    }
  }
  }

  return { byEmployee, byDay }
}
