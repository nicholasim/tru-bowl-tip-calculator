import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const HOURS_DEBOUNCE_MS = 600

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toHoursValue(hours) {
  return hours == null || hours === '' ? null : Number(hours)
}

async function fetchAll() {
  const [employeesRes, periodsRes, entriesRes, hoursRes] = await Promise.all([
    supabase.from('employees').select('id, name').order('created_at', { ascending: true }),
    supabase
      .from('pay_periods')
      .select('id, start_date, end_date')
      .order('created_at', { ascending: false }),
    supabase
      .from('daily_entries')
      .select('pay_period_id, entry_date, tips_cash, tips_app, tips_credit'),
    supabase.from('entry_hours').select('pay_period_id, entry_date, employee_id, hours'),
  ])

  const firstError =
    employeesRes.error || periodsRes.error || entriesRes.error || hoursRes.error
  if (firstError) throw firstError

  const daysByPeriod = new Map()
  for (const entry of entriesRes.data ?? []) {
    if (!daysByPeriod.has(entry.pay_period_id)) {
      daysByPeriod.set(entry.pay_period_id, new Map())
    }
    daysByPeriod.get(entry.pay_period_id).set(entry.entry_date, {
      date: entry.entry_date,
      tips: {
        cash: toNumber(entry.tips_cash),
        app: toNumber(entry.tips_app),
        creditCard: toNumber(entry.tips_credit),
      },
      hours: {},
    })
  }
  for (const row of hoursRes.data ?? []) {
    const day = daysByPeriod.get(row.pay_period_id)?.get(row.entry_date)
    if (day) day.hours[row.employee_id] = row.hours == null ? null : String(row.hours)
  }

  const periods = (periodsRes.data ?? []).map((p) => {
    const dayMap = daysByPeriod.get(p.id) ?? new Map()
    const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date))
    return { id: p.id, startDate: p.start_date, endDate: p.end_date, days }
  })

  const roster = (employeesRes.data ?? []).map((e) => ({ id: e.id, name: e.name }))

  return { roster, periods }
}

async function syncRosterDiff(prev, next) {
  const prevIds = new Set(prev.map((e) => e.id))
  const nextIds = new Set(next.map((e) => e.id))

  const added = next.filter((e) => !prevIds.has(e.id))
  const removed = prev.filter((e) => !nextIds.has(e.id))
  const changed = next.filter((e) => {
    const old = prev.find((p) => p.id === e.id)
    return old && old.name !== e.name
  })

  if (added.length) {
    await supabase.from('employees').insert(added.map((e) => ({ id: e.id, name: e.name })))
  }
  for (const e of changed) {
    await supabase.from('employees').update({ name: e.name }).eq('id', e.id)
  }
  if (removed.length) {
    await supabase
      .from('employees')
      .delete()
      .in('id', removed.map((e) => e.id))
  }
}

async function insertFullPeriod(period) {
  await supabase
    .from('pay_periods')
    .insert({ id: period.id, start_date: period.startDate, end_date: period.endDate })

  const dayRows = period.days.map((d) => ({
    pay_period_id: period.id,
    entry_date: d.date,
    tips_cash: toNumber(d.tips?.cash),
    tips_app: toNumber(d.tips?.app),
    tips_credit: toNumber(d.tips?.creditCard),
  }))
  if (dayRows.length) await supabase.from('daily_entries').insert(dayRows)

  const hourRows = []
  for (const d of period.days) {
    for (const [employeeId, hours] of Object.entries(d.hours ?? {})) {
      hourRows.push({
        pay_period_id: period.id,
        entry_date: d.date,
        employee_id: employeeId,
        hours: toHoursValue(hours),
      })
    }
  }
  if (hourRows.length) await supabase.from('entry_hours').insert(hourRows)
}

async function upsertDayTips(periodId, day) {
  await supabase.from('daily_entries').upsert(
    {
      pay_period_id: periodId,
      entry_date: day.date,
      tips_cash: toNumber(day.tips?.cash),
      tips_app: toNumber(day.tips?.app),
      tips_credit: toNumber(day.tips?.creditCard),
    },
    { onConflict: 'pay_period_id,entry_date' }
  )
}

async function upsertHours(periodId, date, employeeId, hours) {
  await supabase.from('entry_hours').upsert(
    {
      pay_period_id: periodId,
      entry_date: date,
      employee_id: employeeId,
      hours: toHoursValue(hours),
    },
    { onConflict: 'pay_period_id,entry_date,employee_id' }
  )
}

async function deleteHours(periodId, date, employeeId) {
  await supabase
    .from('entry_hours')
    .delete()
    .eq('pay_period_id', periodId)
    .eq('entry_date', date)
    .eq('employee_id', employeeId)
}

/**
 * Diffs prev vs next period arrays and pushes only what changed to Supabase.
 * Tip/hour edits (i.e. per-keystroke updates) are debounced; period
 * creation/removal and roster edits are discrete button actions and sync
 * immediately.
 */
function syncPeriodsDiff(prev, next, debouncedSync) {
  const prevById = new Map(prev.map((p) => [p.id, p]))
  const nextById = new Map(next.map((p) => [p.id, p]))

  const removedIds = [...prevById.keys()].filter((id) => !nextById.has(id))
  if (removedIds.length) {
    supabase.from('pay_periods').delete().in('id', removedIds)
  }

  for (const period of next) {
    const old = prevById.get(period.id)
    if (!old) {
      insertFullPeriod(period)
      continue
    }
    if (old === period) continue

    for (let i = 0; i < period.days.length; i++) {
      const day = period.days[i]
      const oldDay = old.days[i]
      if (day === oldDay) continue

      const tipsChanged =
        !oldDay || JSON.stringify(day.tips) !== JSON.stringify(oldDay.tips)
      if (tipsChanged) {
        debouncedSync(`tips:${period.id}:${day.date}`, () => upsertDayTips(period.id, day))
      }

      const oldHours = oldDay?.hours ?? {}
      const newHours = day.hours ?? {}
      for (const [employeeId, hours] of Object.entries(newHours)) {
        if (oldHours[employeeId] !== hours) {
          debouncedSync(`hours:${period.id}:${day.date}:${employeeId}`, () =>
            upsertHours(period.id, day.date, employeeId, hours)
          )
        }
      }
      for (const employeeId of Object.keys(oldHours)) {
        if (!(employeeId in newHours)) {
          deleteHours(period.id, day.date, employeeId)
        }
      }
    }
  }
}

/**
 * Supabase-backed equivalent of useTipCalcStorage. Same shape (roster,
 * setRoster, periods, setPeriods, activePeriodId, setActivePeriodId) so
 * components don't need to know whether they're talking to localStorage or
 * Supabase. activePeriodId is session-only UI state (not persisted) -- it
 * defaults to the most recently created period each time data loads.
 */
export function useSupabaseTipCalcStorage(userId) {
  const [roster, setRosterState] = useState([])
  const [periods, setPeriodsState] = useState([])
  const [activePeriodId, setActivePeriodId] = useState(null)
  const [loadedUserId, setLoadedUserId] = useState(null)
  const loading = userId !== loadedUserId

  const rosterRef = useRef([])
  const periodsRef = useRef([])
  const debounceTimers = useRef(new Map())

  const debouncedSync = useCallback((key, fn) => {
    const timers = debounceTimers.current
    clearTimeout(timers.get(key))
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key)
        fn()
      }, HOURS_DEBOUNCE_MS)
    )
  }, [])

  useEffect(() => {
    if (!userId) return

    let active = true
    fetchAll()
      .then(({ roster: fetchedRoster, periods: fetchedPeriods }) => {
        if (!active) return
        rosterRef.current = fetchedRoster
        periodsRef.current = fetchedPeriods
        setRosterState(fetchedRoster)
        setPeriodsState(fetchedPeriods)
        setActivePeriodId(fetchedPeriods[0]?.id ?? null)
      })
      .catch((e) => console.error('Failed to load Supabase data:', e))
      .finally(() => {
        if (active) setLoadedUserId(userId)
      })

    return () => {
      active = false
    }
  }, [userId])

  const setRoster = useCallback(
    (updater) => {
      const prev = rosterRef.current
      const next = typeof updater === 'function' ? updater(prev) : updater
      rosterRef.current = next
      setRosterState(next)
      syncRosterDiff(prev, next).catch((e) => console.error('Failed to sync roster:', e))
    },
    []
  )

  const setPeriods = useCallback(
    (updater) => {
      const prev = periodsRef.current
      const next = typeof updater === 'function' ? updater(prev) : updater
      periodsRef.current = next
      setPeriodsState(next)
      syncPeriodsDiff(prev, next, debouncedSync)
    },
    [debouncedSync]
  )

  if (!userId) {
    return {
      roster: [],
      setRoster: () => {},
      periods: [],
      setPeriods: () => {},
      activePeriodId: null,
      setActivePeriodId: () => {},
      loading: false,
    }
  }

  return {
    roster,
    setRoster,
    periods,
    setPeriods,
    activePeriodId,
    setActivePeriodId,
    loading,
  }
}
