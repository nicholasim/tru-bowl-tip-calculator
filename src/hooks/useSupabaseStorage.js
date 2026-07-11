import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const HOURS_DEBOUNCE_MS = 600
const SAVED_DISPLAY_MS = 2000

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toHoursValue(hours) {
  return hours == null || hours === '' ? null : Number(hours)
}

// Supabase calls resolve with an { error } field instead of throwing, so every
// write has to be checked explicitly or failures pass by silently.
async function exec(promise) {
  const { error } = await promise
  if (error) throw error
}

async function fetchAll() {
  const [employeesRes, periodsRes, entriesRes, hoursRes] = await Promise.all([
    supabase.from('employees').select('id, name, active').order('created_at', { ascending: true }),
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

  const roster = (employeesRes.data ?? []).map((e) => ({ id: e.id, name: e.name, active: e.active }))

  return { roster, periods }
}

async function syncRosterDiff(prev, next) {
  const prevIds = new Set(prev.map((e) => e.id))
  const nextIds = new Set(next.map((e) => e.id))

  const added = next.filter((e) => !prevIds.has(e.id))
  const removed = prev.filter((e) => !nextIds.has(e.id))
  // "Removed" via the UI now means active flipped false, not a missing id --
  // the id-missing branch below stays reachable only through a full roster
  // wipe (handleResetUser's setRoster([])), which really does want a delete.
  const changed = next.filter((e) => {
    const old = prev.find((p) => p.id === e.id)
    return old && (old.name !== e.name || old.active !== e.active)
  })

  if (added.length) {
    await exec(supabase.from('employees').insert(added.map((e) => ({ id: e.id, name: e.name }))))
  }
  for (const e of changed) {
    await exec(
      supabase.from('employees').update({ name: e.name, active: e.active }).eq('id', e.id)
    )
  }
  if (removed.length) {
    await exec(
      supabase
        .from('employees')
        .delete()
        .in('id', removed.map((e) => e.id))
    )
  }
}

// Deleting pay_periods cascades to daily_entries and then entry_hours at the
// DB level (see supabase/schema.sql), so one delete is enough -- but the
// caller needs that cascade to have actually completed (not just been fired)
// before it can safely sign out or report success, hence the recount below.
async function verifyPeriodsDeleted(ids) {
  const [periodsRes, entriesRes, hoursRes] = await Promise.all([
    supabase.from('pay_periods').select('id', { count: 'exact', head: true }).in('id', ids),
    supabase
      .from('daily_entries')
      .select('pay_period_id', { count: 'exact', head: true })
      .in('pay_period_id', ids),
    supabase
      .from('entry_hours')
      .select('pay_period_id', { count: 'exact', head: true })
      .in('pay_period_id', ids),
  ])

  const firstError = periodsRes.error || entriesRes.error || hoursRes.error
  if (firstError) throw firstError

  const leftover = (periodsRes.count ?? 0) + (entriesRes.count ?? 0) + (hoursRes.count ?? 0)
  if (leftover > 0) {
    throw new Error('Pay period delete did not fully remove cascaded rows.')
  }
}

async function deletePayPeriods(ids) {
  await exec(supabase.from('pay_periods').delete().in('id', ids))
  await verifyPeriodsDeleted(ids)
}

async function insertFullPeriod(period) {
  await exec(
    supabase
      .from('pay_periods')
      .insert({ id: period.id, start_date: period.startDate, end_date: period.endDate })
  )

  const dayRows = period.days.map((d) => ({
    pay_period_id: period.id,
    entry_date: d.date,
    tips_cash: toNumber(d.tips?.cash),
    tips_app: toNumber(d.tips?.app),
    tips_credit: toNumber(d.tips?.creditCard),
  }))
  if (dayRows.length) await exec(supabase.from('daily_entries').insert(dayRows))

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
  if (hourRows.length) await exec(supabase.from('entry_hours').insert(hourRows))
}

async function upsertDayTips(periodId, day) {
  await exec(
    supabase.from('daily_entries').upsert(
      {
        pay_period_id: periodId,
        entry_date: day.date,
        tips_cash: toNumber(day.tips?.cash),
        tips_app: toNumber(day.tips?.app),
        tips_credit: toNumber(day.tips?.creditCard),
      },
      { onConflict: 'pay_period_id,entry_date' }
    )
  )
}

async function upsertHours(periodId, date, employeeId, hours) {
  await exec(
    supabase.from('entry_hours').upsert(
      {
        pay_period_id: periodId,
        entry_date: date,
        employee_id: employeeId,
        hours: toHoursValue(hours),
      },
      { onConflict: 'pay_period_id,entry_date,employee_id' }
    )
  )
}

async function deleteHours(periodId, date, employeeId) {
  await exec(
    supabase
      .from('entry_hours')
      .delete()
      .eq('pay_period_id', periodId)
      .eq('entry_date', date)
      .eq('employee_id', employeeId)
  )
}

/**
 * Diffs prev vs next period arrays and pushes only what changed to Supabase.
 * Tip/hour edits (i.e. per-keystroke updates) are debounced; period
 * creation/removal and roster edits are discrete button actions and sync
 * immediately. Every write is handed to runTracked so failures update
 * saveStatus instead of disappearing, and so flush() can wait for them.
 */
function syncPeriodsDiff(prev, next, debouncedSync, runTracked) {
  const prevById = new Map(prev.map((p) => [p.id, p]))
  const nextById = new Map(next.map((p) => [p.id, p]))

  const removedIds = [...prevById.keys()].filter((id) => !nextById.has(id))
  if (removedIds.length) {
    runTracked(() => deletePayPeriods(removedIds))
  }

  for (const period of next) {
    const old = prevById.get(period.id)
    if (!old) {
      runTracked(() => insertFullPeriod(period))
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
          runTracked(() => deleteHours(period.id, day.date, employeeId))
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
 *
 * saveStatus reflects the in-flight/last-resolved state of background writes:
 * 'idle' | 'saving' | 'saved' | 'error'. A failure surfaces as 'error' even if
 * other concurrent writes succeed, since a partial save is still a save the
 * user needs to know about. 'saved' auto-reverts to 'idle' after a couple of
 * seconds; 'error' persists until the next save attempt resolves cleanly.
 *
 * flush() and cancelPendingSyncs() let callers (e.g. reset / sign-out / period
 * delete) force a clean, fully-awaited stopping point: cancel debounced
 * writes that haven't fired yet, then wait for whatever's already in flight.
 *
 * loadError is set when the initial (or retried) load fails, and roster/
 * periods are deliberately left untouched when that happens -- otherwise an
 * outage would look identical to the user's data having been deleted.
 * retryLoad() re-runs the load without a full page reload.
 */
export function useSupabaseTipCalcStorage(userId) {
  const [roster, setRosterState] = useState([])
  const [periods, setPeriodsState] = useState([])
  const [activePeriodId, setActivePeriodId] = useState(null)
  const [loadedUserId, setLoadedUserId] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const loading = userId !== loadedUserId

  const rosterRef = useRef([])
  const periodsRef = useRef([])
  const debounceTimers = useRef(new Map())
  const pendingSaves = useRef(0)
  const batchHadError = useRef(false)
  const pendingWrites = useRef(new Set())
  const savedRevertTimer = useRef(null)
  const loadActiveRef = useRef(false)

  // Reset stale save status when switching users, rather than in an effect,
  // so a previous session's status can't briefly show during the render that
  // kicks off the new load. Pending timers are cancelled separately, in the
  // data-loading effect's cleanup below, since refs can't be touched here
  // during render.
  const [prevUserId, setPrevUserId] = useState(userId)
  if (userId !== prevUserId) {
    setPrevUserId(userId)
    setSaveStatus('idle')
  }

  // periodId omitted cancels every pending debounced write; passed, it scopes
  // cancellation to just that period so unrelated periods' pending edits
  // survive a single-period delete.
  const cancelPendingSyncs = useCallback((periodId) => {
    const timers = debounceTimers.current
    for (const key of [...timers.keys()]) {
      if (
        periodId == null ||
        key.startsWith(`tips:${periodId}:`) ||
        key.startsWith(`hours:${periodId}:`)
      ) {
        clearTimeout(timers.get(key))
        timers.delete(key)
      }
    }
  }, [])

  const runTracked = useCallback((fn) => {
    pendingSaves.current += 1
    clearTimeout(savedRevertTimer.current)
    setSaveStatus('saving')

    const promise = fn()
      .then(() => ({ ok: true }))
      .catch((e) => {
        console.error('Failed to save:', e)
        return { ok: false, error: e }
      })
      .then((result) => {
        pendingSaves.current -= 1
        if (!result.ok) batchHadError.current = true
        if (pendingSaves.current === 0) {
          if (batchHadError.current) {
            setSaveStatus('error')
          } else {
            setSaveStatus('saved')
            savedRevertTimer.current = setTimeout(() => setSaveStatus('idle'), SAVED_DISPLAY_MS)
          }
          batchHadError.current = false
        }
        return result
      })

    pendingWrites.current.add(promise)
    promise.finally(() => pendingWrites.current.delete(promise))
    return promise
  }, [])

  // Resolves once every write that was in flight at call time has settled;
  // resolves to false if any of them failed, so callers can decide whether
  // to proceed (e.g. sign out anyway) or warn the user.
  const flush = useCallback(async () => {
    const results = await Promise.all(pendingWrites.current)
    return results.every((r) => r.ok)
  }, [])

  const debouncedSync = useCallback(
    (key, fn) => {
      const timers = debounceTimers.current
      clearTimeout(timers.get(key))
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key)
          runTracked(fn)
        }, HOURS_DEBOUNCE_MS)
      )
    },
    [runTracked]
  )

  // Shared by the load effect and retryLoad below, so a manual retry can
  // reuse the exact same success/failure handling as the initial load.
  // loadActiveRef (rather than an effect-local variable) tracks whether this
  // in-flight load is still relevant, since retryLoad fires outside the
  // effect's own closure.
  const runLoad = useCallback((uid) => {
    loadActiveRef.current = true
    return fetchAll()
      .then(({ roster: fetchedRoster, periods: fetchedPeriods }) => {
        if (!loadActiveRef.current) return
        rosterRef.current = fetchedRoster
        periodsRef.current = fetchedPeriods
        setRosterState(fetchedRoster)
        setPeriodsState(fetchedPeriods)
        setActivePeriodId(fetchedPeriods[0]?.id ?? null)
        setLoadError(null)
      })
      .catch((e) => {
        console.error('Failed to load Supabase data:', e)
        // Deliberately leave roster/periods untouched -- a failed load must
        // never look like an empty (i.e. deleted) account.
        if (loadActiveRef.current) setLoadError(e)
      })
      .finally(() => {
        if (loadActiveRef.current) setLoadedUserId(uid)
      })
  }, [])

  useEffect(() => {
    if (!userId) return

    const timers = debounceTimers.current
    runLoad(userId)

    return () => {
      loadActiveRef.current = false
      // Cancel this user's pending debounced writes before the next user's
      // data loads in, so a stale write can't fire under a different session.
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
      clearTimeout(savedRevertTimer.current)
    }
  }, [userId, runLoad])

  const retryLoad = useCallback(() => {
    if (!userId) return
    return runLoad(userId)
  }, [userId, runLoad])

  const setRoster = useCallback(
    (updater) => {
      const prev = rosterRef.current
      const next = typeof updater === 'function' ? updater(prev) : updater
      rosterRef.current = next
      setRosterState(next)
      runTracked(() => syncRosterDiff(prev, next))
    },
    [runTracked]
  )

  const setPeriods = useCallback(
    (updater) => {
      const prev = periodsRef.current
      const next = typeof updater === 'function' ? updater(prev) : updater
      periodsRef.current = next
      setPeriodsState(next)
      syncPeriodsDiff(prev, next, debouncedSync, runTracked)
    },
    [debouncedSync, runTracked]
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
      loadError: null,
      retryLoad: () => {},
      saveStatus: 'idle',
      flush: () => Promise.resolve(true),
      cancelPendingSyncs: () => {},
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
    loadError,
    retryLoad,
    saveStatus,
    flush,
    cancelPendingSyncs,
  }
}
