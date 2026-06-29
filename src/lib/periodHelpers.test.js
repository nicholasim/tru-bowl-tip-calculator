import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPayPeriod, defaultEndDate, periodLengthDays } from './periodHelpers'
import { MAX_PERIOD_DAYS } from './constants'

describe('createPayPeriod', () => {
  let originalTz

  beforeAll(() => {
    originalTz = process.env.TZ
    // Fixed UTC+9, no DST -- deterministically exercises the "east of UTC"
    // bug where parsing as local time then slicing toISOString() shifts
    // every date back a day, regardless of the machine actually running this.
    process.env.TZ = 'Asia/Tokyo'
  })

  afterAll(() => {
    process.env.TZ = originalTz
  })

  it('builds a normal 14-day period with no off-by-one', () => {
    const period = createPayPeriod('2025-01-30', '2025-02-12')
    expect(period.days).toHaveLength(14)
    expect(period.startDate).toBe('2025-01-30')
    expect(period.endDate).toBe('2025-02-12')
  })

  it('generates exact, consecutive dates across a month boundary', () => {
    const period = createPayPeriod('2025-01-30', '2025-02-02')
    expect(period.days.map((d) => d.date)).toEqual([
      '2025-01-30',
      '2025-01-31',
      '2025-02-01',
      '2025-02-02',
    ])
  })

  it('defaults to a 14-day period when no end date is given', () => {
    const period = createPayPeriod('2025-01-30')
    expect(period.days).toHaveLength(14)
    expect(period.endDate).toBe('2025-02-12')
  })

  it('accepts a range exactly at the cap', () => {
    const period = createPayPeriod('2025-01-01', '2025-01-31')
    expect(period.days).toHaveLength(MAX_PERIOD_DAYS)
  })

  it('rejects a range one day over the cap', () => {
    expect(() => createPayPeriod('2025-01-01', '2025-02-01')).toThrow()
  })

  it('rejects a far-future end date that would otherwise generate hundreds of rows', () => {
    expect(() => createPayPeriod('2025-01-01', '2026-01-01')).toThrow()
  })

  it('swaps an end date entered before the start date, and still enforces the cap', () => {
    const period = createPayPeriod('2025-01-14', '2025-01-01')
    expect(period.startDate).toBe('2025-01-01')
    expect(period.endDate).toBe('2025-01-14')
    expect(() => createPayPeriod('2025-02-01', '2025-01-01')).toThrow()
  })
})

describe('periodLengthDays', () => {
  it('counts inclusively regardless of which date is earlier', () => {
    expect(periodLengthDays('2025-01-01', '2025-01-14')).toBe(14)
    expect(periodLengthDays('2025-01-14', '2025-01-01')).toBe(14)
  })

  it('counts a single day as 1', () => {
    expect(periodLengthDays('2025-01-01', '2025-01-01')).toBe(1)
  })
})

describe('defaultEndDate', () => {
  it('is 13 days after the start date (14 days inclusive)', () => {
    expect(defaultEndDate('2025-01-30')).toBe('2025-02-12')
  })
})
