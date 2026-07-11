'use client'

import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { computePeriodTotals } from '../utils/calculations'
import { formatDate } from '../lib/periodHelpers'
import { buildRosterMap, getEmployeeDisplayName } from '../lib/roster'
import { TipDistributionChart } from './TipDistributionChart'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function PeriodSummary({ period, roster }) {
  const { byEmployee, byDay } = useMemo(
    () => computePeriodTotals(period.days),
    [period.days]
  )

  // roster carries every employee ever added (active + inactive), so a
  // former employee's name still resolves for their historical entries.
  const rosterMap = buildRosterMap(roster)
  const getDisplayName = (id) => getEmployeeDisplayName(rosterMap, id)
  // Sort by the bare name, not the "(former employee)"-suffixed display
  // string, so alphabetical order matches the person's name either way.
  const getSortName = (id) => rosterMap[id]?.name ?? 'Former employee'
  const employeeIds = [...new Set([...Object.keys(byEmployee), ...roster.map((e) => e.id)])]
  const sortedIds = employeeIds.sort((a, b) => getSortName(a).localeCompare(getSortName(b)))

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
    <Card className="mb-6 rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle>Pay Period Summary</CardTitle>
        <CardDescription>
          {formatDate(period.startDate)} – {formatDate(period.endDate)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAnyData ? (
          <p className="text-sm text-muted-foreground">Enter tips and hours below to see totals.</p>
        ) : (
          <>
            <TipDistributionChart
              shares={byEmployee}
              rosterMap={rosterMap}
            />

            {/* Tablet/desktop: full table, always horizontally scrollable so
                long pay periods (many day columns) never get cut off. */}
            <div className="hidden md:block">
              <div className="max-w-full overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-brand-charcoal text-white">
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                        Employee
                      </th>
                      {period.days.map((d) => (
                        <th
                          key={d.date}
                          className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                        >
                          {formatDate(d.date)}
                        </th>
                      ))}
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ employeeId, name, total, days }, i) => (
                      <tr key={employeeId} className={i % 2 === 1 ? 'bg-primary/5' : ''}>
                        <td className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">
                          {name}
                        </td>
                        {days.map(({ date, share }) => (
                          <td key={date} className="whitespace-nowrap border-b border-border px-3 py-2">
                            {share > 0 ? `$${share.toFixed(2)}` : '–'}
                          </td>
                        ))}
                        <td className="whitespace-nowrap border-b border-border bg-accent/50 px-3 py-2 font-mono font-bold text-foreground">
                          ${total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Phone: per-employee cards with a collapsible daily breakdown,
                since one column per day doesn't fit a phone width. */}
            <ul className="m-0 flex list-none flex-col gap-2 p-0 md:hidden">
              {rows.map(({ employeeId, name, total, days }) => {
                const activeDays = days.filter((d) => d.share > 0)
                return (
                  <li key={employeeId} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">{name}</span>
                      <span className="font-mono text-base font-bold text-foreground">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                    {activeDays.length > 0 && (
                      <details className="group mt-2">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
                          <span>
                            Daily breakdown ({activeDays.length} {activeDays.length === 1 ? 'day' : 'days'})
                          </span>
                          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <ul className="m-0 mt-1 list-none border-t border-border p-0">
                          {activeDays.map(({ date, share }) => (
                            <li
                              key={date}
                              className="flex items-center justify-between border-b border-border py-2 text-sm text-muted-foreground last:border-b-0"
                            >
                              <span>{formatDate(date)}</span>
                              <span className="font-mono">${share.toFixed(2)}</span>
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
      </CardContent>
    </Card>
  )
}
