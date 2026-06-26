import { useMemo } from 'react'
import { computePeriodTotals } from '../utils/calculations'
import { formatDate } from '../lib/periodHelpers'
import { TipDistributionChart } from './TipDistributionChart'

export function PeriodSummary({ period, roster }) {
  const { byEmployee, byDay } = useMemo(
    () => computePeriodTotals(period.days),
    [period.days]
  )

  const rosterMap = Object.fromEntries(roster.map((e) => [e.id, e]))
  const getDisplayName = (id) => rosterMap[id]?.name ?? 'Former employee'
  const employeeIds = [...new Set([...Object.keys(byEmployee), ...roster.map((e) => e.id)])]
  const sortedIds = employeeIds.sort((a, b) =>
    getDisplayName(a).localeCompare(getDisplayName(b))
  )

  // Shared per-employee data for both the desktop table and the mobile
  // cards, so the "does this employee have any data" filtering only
  // happens once.
  const rows = sortedIds
    .map((employeeId) => {
      const name = getDisplayName(employeeId)
      const total = byEmployee[employeeId] ?? 0
      const days = period.days.map((d) => ({
        date: d.date,
        share: byDay[d.date]?.[employeeId] ?? 0,
      }))
      const hasData = total > 0 || days.some((d) => d.share > 0)
      return hasData ? { employeeId, name, total, days } : null
    })
    .filter(Boolean)

  const hasAnyData = rows.length > 0

  return (
    <section className="period-summary">
      <h2>Pay Period Summary</h2>
      <p className="period-range">
        {formatDate(period.startDate)} – {formatDate(period.endDate)}
      </p>
      {!hasAnyData ? (
        <p className="summary-empty">Enter tips and hours below to see totals.</p>
      ) : (
      <>
      <TipDistributionChart
        shares={byEmployee}
        rosterMap={rosterMap}
      />
      <div className="summary-table-wrap">
        <table className="summary-table">
          <thead>
            <tr>
              <th>Employee</th>
              {period.days.map((d) => (
                <th key={d.date}>{formatDate(d.date)}</th>
              ))}
              <th className="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ employeeId, name, total, days }) => (
              <tr key={employeeId}>
                <td>{name}</td>
                {days.map(({ date, share }) => (
                  <td key={date}>{share > 0 ? `$${share.toFixed(2)}` : '–'}</td>
                ))}
                <td className="col-total">
                  <strong>${total.toFixed(2)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="summary-cards">
        {rows.map(({ employeeId, name, total, days }) => {
          const activeDays = days.filter((d) => d.share > 0)
          return (
            <li key={employeeId} className="summary-card">
              <div className="summary-card-header">
                <span className="summary-card-name">{name}</span>
                <span className="summary-card-total">${total.toFixed(2)}</span>
              </div>
              {activeDays.length > 0 && (
                <details className="summary-card-details">
                  <summary>
                    Daily breakdown ({activeDays.length} {activeDays.length === 1 ? 'day' : 'days'})
                  </summary>
                  <ul className="summary-card-days">
                    {activeDays.map(({ date, share }) => (
                      <li key={date}>
                        <span>{formatDate(date)}</span>
                        <span>${share.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          )
        })}
      </ul>
      </>
      )}
    </section>
  )
}
