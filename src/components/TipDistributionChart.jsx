'use client'

import { useEffect, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getEmployeeDisplayName } from '@/lib/roster'

/**
 * Renders the bars themselves, starting at width 0 and growing to their
 * target % one frame after mount. Keyed by the parent on the set of active
 * employee IDs, so switching to a period with a different active roster
 * remounts this (instant reset, no shrink-then-regrow) and replays the
 * grow-in -- while a same-roster value change just transitions in place.
 */
function DistributionBars({ entries, maxVal, rosterMap }) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [grown, setGrown] = useState(prefersReducedMotion)

  useEffect(() => {
    if (prefersReducedMotion) return
    const frame = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(frame)
  }, [prefersReducedMotion])

  return entries.map(([employeeId, amount]) => {
    const name = getEmployeeDisplayName(rosterMap, employeeId)
    const pct = (amount / maxVal) * 100
    return (
      <div key={employeeId} className="flex items-center gap-3 text-sm">
        <span title={name} className="w-20 flex-none truncate font-medium text-foreground sm:w-28">
          {name}
        </span>
        <div className="h-5 min-w-0 flex-1 overflow-hidden rounded bg-muted">
          <div
            className="h-full min-w-1 rounded bg-gradient-to-r from-brand-pink to-brand-teal transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${grown ? pct : 0}%` }}
          />
        </div>
        <span className="w-16 flex-none text-right font-mono font-medium text-foreground sm:w-[70px]">
          ${amount.toFixed(2)}
        </span>
      </div>
    )
  })
}

/**
 * Horizontal bar chart for tip distribution - Claude artifact style
 */
export function TipDistributionChart({ shares, rosterMap }) {
  const entries = Object.entries(shares).filter(([, v]) => v > 0)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)
  const barSetKey = entries.map(([employeeId]) => employeeId).sort().join(',')

  return (
    <div className="mb-5 flex flex-col gap-2.5">
      <DistributionBars key={barSetKey} entries={entries} maxVal={maxVal} rosterMap={rosterMap} />
    </div>
  )
}
