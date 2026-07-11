'use client'

import { useState, useMemo } from 'react'
import { distributeTipsByHours } from '../utils/calculations'
import { formatDate } from '../lib/periodHelpers'
import { DEFAULT_TIPS } from '../lib/constants'
import { buildRosterMap } from '../lib/roster'
import { TipDistributionChart } from './TipDistributionChart'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Allow only digits and at most one decimal point; optional max decimal places */
function toNumericInput(value, maxDecimals = 2) {
  let s = value.replace(/[^\d.]/g, '')
  const parts = s.split('.')
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('')
  if (maxDecimals >= 0 && parts.length === 2) {
    s = parts[0] + '.' + parts[1].slice(0, maxDecimals)
  }
  return s
}

/** Hours: max 2 decimal places (hundredths). Preserves trailing decimal for "8." -> "8.25" */
function toHoursInput(value) {
  const s = toNumericInput(value, 2)
  if (s === '') return ''
  const parts = s.split('.')
  const intPart = (parts[0] || '').slice(0, 4)
  const decPart = parts[1] ? parts[1].slice(0, 2) : ''
  if (s.includes('.')) return `${intPart}.${decPart}`
  return intPart
}

/** USD currency: max 8 digits before decimal, exactly 2 decimal places (cents).
 *  Preserves trailing decimal so user can type "12." then "5" for "12.50" */
function toUsdInput(value) {
  const s = toNumericInput(value, 2)
  if (s === '') return ''
  const parts = s.split('.')
  const intPart = (parts[0] || '').slice(0, 8)
  const decPart = parts[1] ? parts[1].slice(0, 2) : ''
  if (s.includes('.')) return `${intPart}.${decPart}`
  return intPart
}

export function DayEntry({ day, roster, onUpdate }) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const tips = useMemo(
    () => day.tips ?? { ...DEFAULT_TIPS },
    [day.tips]
  )
  const hours = useMemo(() => day.hours ?? {}, [day.hours])

  const { shares, totalTips, totalHours, ratePerHour, reconciled } = useMemo(
    () => distributeTipsByHours(tips, hours),
    [tips, hours]
  )

  // roster carries every employee ever added (active + inactive); the
  // lookup map needs all of them so a former employee's name still
  // resolves, but the "add to this day" picker below only offers active ones.
  const rosterMap = useMemo(() => buildRosterMap(roster), [roster])

  const handleTipChange = (source, value) => {
    const allowed = toUsdInput(value)
    onUpdate({
      ...day,
      tips: { ...tips, [source]: allowed === '' ? 0 : allowed },
    })
  }

  const handleHoursChange = (employeeId, value) => {
    const allowed = toHoursInput(value)
    onUpdate({
      ...day,
      hours: { ...hours, [employeeId]: allowed === '' ? null : allowed },
    })
  }

  const addEmployee = () => {
    if (!selectedEmployeeId) return
    if (hours[selectedEmployeeId] !== undefined) return
    onUpdate({
      ...day,
      hours: { ...hours, [selectedEmployeeId]: null },
    })
    setSelectedEmployeeId('')
  }

  const removeEmployee = (employeeId) => {
    const next = { ...hours }
    delete next[employeeId]
    onUpdate({ ...day, hours: next })
  }

  const totalTipsDisplay =
    (parseFloat(tips.cash) || 0) +
    (parseFloat(tips.app) || 0) +
    (parseFloat(tips.creditCard) || 0)
  const employeesOnDay = Object.keys(hours)
  const workers = employeesOnDay.filter((id) => (parseFloat(hours[id]) || 0) > 0)
  const distributedTotal = Object.values(shares).reduce((a, b) => a + b, 0)
  const distributionMessage = reconciled
    ? `Distributed: $${distributedTotal.toFixed(2)} (matches total tips)`
    : `Distributed: $${distributedTotal.toFixed(2)} — differs from $${totalTips.toFixed(2)} total by ${
        distributedTotal > totalTips ? '+' : '-'
      }$${Math.abs(distributedTotal - totalTips).toFixed(2)} (rounding)`
  const availableToAdd = roster.filter((e) => e.active !== false && hours[e.id] === undefined)

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5">
        <h3 className="mb-4 text-base font-bold text-foreground">{formatDate(day.date)}</h3>

        <div className="mb-4 rounded-lg bg-muted/40 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`cash-${day.date}`}>Cash</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id={`cash-${day.date}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tips.cash === 0 || tips.cash === '0' ? '' : String(tips.cash)}
                  onChange={(e) => handleTipChange('cash', e.target.value)}
                  className="h-12 pl-7 font-mono text-base"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`app-${day.date}`}>App</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id={`app-${day.date}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tips.app === 0 || tips.app === '0' ? '' : String(tips.app)}
                  onChange={(e) => handleTipChange('app', e.target.value)}
                  className="h-12 pl-7 font-mono text-base"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`credit-${day.date}`}>Credit</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id={`credit-${day.date}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tips.creditCard === 0 || tips.creditCard === '0' ? '' : String(tips.creditCard)}
                  onChange={(e) => handleTipChange('creditCard', e.target.value)}
                  className="h-12 pl-7 font-mono text-base"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="font-mono text-2xl font-extrabold text-foreground">
              ${totalTipsDisplay.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mb-2">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Employees who worked
          </h4>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              aria-label="Select employee"
              className="h-11 flex-1 cursor-pointer rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary"
            >
              <option value="">Select employee…</option>
              {availableToAdd.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
            <Button type="button" onClick={addEmployee} disabled={!selectedEmployeeId}>
              Add
            </Button>
          </div>
          {roster.length === 0 && (
            <p className="mb-2 text-sm text-muted-foreground">Add employees to the roster first.</p>
          )}
          {employeesOnDay.length === 0 && roster.length > 0 && (
            <p className="mb-2 text-sm text-muted-foreground">Select an employee above and click Add.</p>
          )}
          <ul className="m-0 flex list-none flex-col p-0">
            {employeesOnDay.map((employeeId) => {
              const name = rosterMap[employeeId]?.name ?? 'Unknown'
              return (
                <li
                  key={employeeId}
                  className="flex flex-col gap-2 border-b border-border py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
                >
                  <span className="text-sm font-medium text-foreground sm:w-32 sm:flex-none">{name}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={
                        hours[employeeId] == null || hours[employeeId] === '' || hours[employeeId] === 0
                          ? ''
                          : String(hours[employeeId])
                      }
                      onChange={(e) => handleHoursChange(employeeId, e.target.value)}
                      placeholder="0.00"
                      aria-label={`Hours for ${name}`}
                      className="w-24 font-mono"
                    />
                    <span className="text-sm text-muted-foreground">hrs</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmployee(employeeId)}
                    aria-label={`Remove ${name}`}
                    className="text-brand-pink hover:bg-brand-pink/10 hover:text-brand-pink-dark sm:ml-auto"
                  >
                    Remove
                  </Button>
                </li>
              )
            })}
          </ul>
        </div>

        {totalHours === 0 && totalTipsDisplay > 0 && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400"
          >
            ${totalTipsDisplay.toFixed(2)} in tips is entered but no employee has hours yet
            for this day, so it won&apos;t be included in any totals. Add hours above to
            distribute it.
          </p>
        )}

        {totalHours > 0 && totalTipsDisplay > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-3 font-mono text-sm text-muted-foreground">
              ${totalTipsDisplay.toFixed(2)} ÷ {totalHours.toFixed(2)} hrs = $
              {ratePerHour.toFixed(2)}/hr
            </p>
            <TipDistributionChart
              shares={shares}
              rosterMap={rosterMap}
            />
            <div className="mt-3 max-w-full overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[320px] border-collapse text-sm">
                <thead>
                  <tr className="bg-brand-charcoal text-white">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                      Employee
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                      Hours
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((employeeId, i) => (
                    <tr key={employeeId} className={i % 2 === 1 ? 'bg-primary/5' : ''}>
                      <td className="border-b border-border px-3 py-2">
                        {rosterMap[employeeId]?.name ?? employeeId}
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        {parseFloat(hours[employeeId]) || hours[employeeId]}
                      </td>
                      <td className="border-b border-border px-3 py-2 font-mono font-medium">
                        ${(shares[employeeId] ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p
              role="status"
              className={cn(
                'mt-2 text-sm font-medium',
                reconciled ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {distributionMessage}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
