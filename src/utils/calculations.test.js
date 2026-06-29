import { describe, it, expect } from 'vitest'
import { distributeTipsByHours, computePeriodTotals } from './calculations'

describe('distributeTipsByHours', () => {
  it('distributes tips proportionally by hours', () => {
    const tips = { cash: 50, app: 50, creditCard: 0 }
    const hours = { a: 8, b: 4, c: 4 }
    const { shares, totalTips, totalHours, ratePerHour, reconciled } =
      distributeTipsByHours(tips, hours)

    expect(totalTips).toBe(100)
    expect(totalHours).toBe(16)
    expect(ratePerHour).toBe(6.25)
    expect(shares.a).toBe(50) // 8 * 6.25
    expect(shares.b).toBe(25)
    expect(shares.c).toBe(25)
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(100)
    expect(reconciled).toBe(true)
  })

  it('gives employees with equal hours an identical share, even when it does not divide evenly', () => {
    // 7 hrs each out of 21 total: exact share is 33.333...repeating dollars per
    // person. The old largest-remainder method floored each to $33.33, then handed
    // the one leftover penny to a single person (by remainder/index tiebreak),
    // producing $33.34/$33.33/$33.33 -- unequal pay for equal hours. Grouping by
    // hours and rounding once per group fixes that: all three get $33.33, and the
    // $0.01 that's left over is simply not distributed.
    const tips = { cash: 100, app: 0, creditCard: 0 }
    const hours = { a: 7, b: 7, c: 7 }
    const { shares, totalTips, reconciled } = distributeTipsByHours(tips, hours)

    expect(shares.a).toBe(33.33)
    expect(shares.b).toBe(33.33)
    expect(shares.c).toBe(33.33)
    expect(totalTips).toBe(100)
    expect(reconciled).toBe(false)
  })

  it('rounds an exact half-cent up (half-up), not down or to even', () => {
    // $39.53 split evenly two ways is exactly $19.765 each -- a tie that must
    // round up to $19.77 under half-up rounding (computed via exact integer
    // arithmetic so floating-point can't nudge the tie either way).
    const { shares: tieShares } = distributeTipsByHours(
      { cash: 39.53, app: 0, creditCard: 0 },
      { a: 1, b: 1 }
    )
    expect(tieShares.a).toBe(19.77)
    expect(tieShares.b).toBe(19.77)

    // $1.01 split evenly two ways is exactly $0.505 each. Half-up rounds this
    // up to $0.51; round-half-to-even would instead round down to $0.50.
    const { shares: centShares } = distributeTipsByHours(
      { cash: 1.01, app: 0, creditCard: 0 },
      { a: 1, b: 1 }
    )
    expect(centShares.a).toBe(0.51)
    expect(centShares.b).toBe(0.51)
  })

  it('reports a mismatch instead of forcing the distributed total to match exactly', () => {
    const tips = { cash: 10, app: 0, creditCard: 0 }
    const hours = { a: 1, b: 1, c: 1 }
    const { shares, totalTips, reconciled } = distributeTipsByHours(tips, hours)

    expect(shares.a).toBe(3.33)
    expect(shares.b).toBe(3.33)
    expect(shares.c).toBe(3.33)
    const distributedTotal = Object.values(shares).reduce((a, b) => a + b, 0)
    expect(distributedTotal).toBe(9.99)
    expect(totalTips).toBe(10)
    expect(reconciled).toBe(false)
  })

  it('excludes employees with 0 hours', () => {
    const tips = { cash: 100, app: 0, creditCard: 0 }
    const hours = { a: 8, b: 0, c: 4 }
    const { shares } = distributeTipsByHours(tips, hours)

    expect(shares.a).toBeDefined()
    expect(shares.c).toBeDefined()
    expect(shares.b).toBeUndefined()
    expect(shares.a + shares.c).toBe(100)
  })

  it('returns zeros when total tips is 0', () => {
    const tips = { cash: 0, app: 0, creditCard: 0 }
    const hours = { a: 8, b: 4 }
    const { shares, totalTips, reconciled } = distributeTipsByHours(tips, hours)

    expect(totalTips).toBe(0)
    expect(shares.a).toBe(0)
    expect(shares.b).toBe(0)
    expect(reconciled).toBe(true)
  })

  it('returns zeros when total hours is 0', () => {
    const tips = { cash: 100, app: 0, creditCard: 0 }
    const hours = { a: 0, b: 0 }
    const { shares, totalTips, totalHours, reconciled } =
      distributeTipsByHours(tips, hours)

    expect(totalTips).toBe(100)
    expect(totalHours).toBe(0)
    expect(shares.a).toBe(0)
    expect(shares.b).toBe(0)
    expect(reconciled).toBe(true)
  })

  it('handles decimal tips (cash + app + creditCard)', () => {
    const tips = { cash: 33.33, app: 33.33, creditCard: 33.34 }
    const hours = { a: 5, b: 5 }
    const { shares, reconciled } = distributeTipsByHours(tips, hours)

    const sum = Object.values(shares).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(100, 2)
    expect(reconciled).toBe(true)
  })
})

describe('computePeriodTotals', () => {
  it('sums daily shares into period totals', () => {
    const days = [
      {
        date: '2025-01-01',
        tips: { cash: 100, app: 0, creditCard: 0 },
        hours: { a: 8, b: 8 },
      },
      {
        date: '2025-01-02',
        tips: { cash: 80, app: 0, creditCard: 0 },
        hours: { a: 6, b: 2 },
      },
    ]
    const { byEmployee, byDay } = computePeriodTotals(days)

    expect(byEmployee.a).toBe(110) // 50 + 60
    expect(byEmployee.b).toBe(70) // 50 + 20
    expect(byDay['2025-01-01'].a).toBe(50)
    expect(byDay['2025-01-01'].b).toBe(50)
    expect(byDay['2025-01-02'].a).toBe(60)
    expect(byDay['2025-01-02'].b).toBe(20)
  })
})
