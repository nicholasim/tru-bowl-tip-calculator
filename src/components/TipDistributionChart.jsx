/**
 * Horizontal bar chart for tip distribution - Claude artifact style
 */
export function TipDistributionChart({ shares, rosterMap }) {
  const entries = Object.entries(shares).filter(([, v]) => v > 0)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)

  return (
    <div className="mb-5 flex flex-col gap-2.5">
      {entries.map(([employeeId, amount]) => {
        const name = rosterMap[employeeId]?.name ?? 'Former employee'
        const pct = (amount / maxVal) * 100
        return (
          <div key={employeeId} className="flex items-center gap-3 text-sm">
            <span className="w-20 flex-none truncate font-medium text-foreground sm:w-28">
              {name}
            </span>
            <div className="h-5 min-w-0 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full min-w-1 rounded bg-gradient-to-r from-brand-pink to-brand-teal transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 flex-none text-right font-mono font-medium text-foreground sm:w-[70px]">
              ${amount.toFixed(2)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
