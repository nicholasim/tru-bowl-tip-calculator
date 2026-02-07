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

  it('uses largest-remainder when distribution does not divide evenly', () => {
    const tips = { cash: 10, app: 0, creditCard: 0 }
    const hours = { a: 1, b: 1, c: 1 }
    const { shares, reconciled } = distributeTipsByHours(tips, hours)

    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(10)
    expect(reconciled).toBe(true)
    expect(shares.a + shares.b + shares.c).toBe(10)
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
