import { supabase } from './supabaseClient'

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw != null ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Merge every guest dataset found in localStorage (one per name ever used on this browser). */
export function collectLocalGuestData() {
  const roster = []
  const rosterIds = new Set()
  const periods = []

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('tipcalc_roster_')) {
      const data = readJSON(key)
      if (Array.isArray(data)) {
        for (const employee of data) {
          if (employee?.id && !rosterIds.has(employee.id)) {
            rosterIds.add(employee.id)
            roster.push(employee)
          }
        }
      }
    } else if (key.startsWith('tipcalc_periods_')) {
      const data = readJSON(key)
      if (Array.isArray(data)) periods.push(...data)
    }
  }

  return { roster, periods }
}

export function clearLocalGuestData() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('tipcalc_')) localStorage.removeItem(key)
  }
}

/**
 * Copies every localStorage guest dataset on this browser into the new
 * Supabase account, then wipes localStorage. Called once right after signup.
 */
export async function migrateLocalDataToSupabase() {
  const { roster, periods } = collectLocalGuestData()

  if (roster.length === 0 && periods.length === 0) {
    clearLocalGuestData()
    return
  }

  if (roster.length) {
    const { error } = await supabase
      .from('employees')
      .insert(roster.map((e) => ({ id: e.id, name: e.name, active: e.active ?? true })))
    if (error) throw error
  }

  for (const period of periods) {
    const { error: periodError } = await supabase
      .from('pay_periods')
      .insert({ id: period.id, start_date: period.startDate, end_date: period.endDate })
    if (periodError) throw periodError

    const days = period.days ?? []

    const dayRows = days.map((d) => ({
      pay_period_id: period.id,
      entry_date: d.date,
      tips_cash: Number(d.tips?.cash) || 0,
      tips_app: Number(d.tips?.app) || 0,
      tips_credit: Number(d.tips?.creditCard) || 0,
    }))
    if (dayRows.length) {
      const { error: dayError } = await supabase.from('daily_entries').insert(dayRows)
      if (dayError) throw dayError
    }

    const hourRows = []
    for (const d of days) {
      for (const [employeeId, hours] of Object.entries(d.hours ?? {})) {
        hourRows.push({
          pay_period_id: period.id,
          entry_date: d.date,
          employee_id: employeeId,
          hours: hours == null || hours === '' ? null : Number(hours),
        })
      }
    }
    if (hourRows.length) {
      const { error: hourError } = await supabase.from('entry_hours').insert(hourRows)
      if (hourError) throw hourError
    }
  }

  clearLocalGuestData()
}
