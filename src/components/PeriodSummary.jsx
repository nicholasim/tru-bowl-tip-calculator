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

  const hasAnyData = sortedIds.some(
    (id) =>
      (byEmployee[id] ?? 0) > 0 ||
      period.days.some((d) => (byDay[d.date]?.[id] ?? 0) > 0)
  )

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
            {sortedIds.map((employeeId) => {
              const name = getDisplayName(employeeId)
              const total = byEmployee[employeeId] ?? 0
              const hasData = total > 0 || period.days.some((d) => (byDay[d.date]?.[employeeId] ?? 0) > 0)
              if (!hasData) return null
              return (
                <tr key={employeeId}>
                  <td>{name}</td>
                  {period.days.map((d) => {
                    const share = byDay[d.date]?.[employeeId] ?? 0
                    return (
                      <td key={d.date}>
                        {share > 0 ? `$${share.toFixed(2)}` : '–'}
                      </td>
                    )
                  })}
                  <td className="col-total">
                    <strong>${total.toFixed(2)}</strong>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </section>
  )
}
