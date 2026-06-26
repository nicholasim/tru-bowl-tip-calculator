/**
 * Horizontal bar chart for tip distribution - Claude artifact style
 */
export function TipDistributionChart({ shares, rosterMap }) {
  const entries = Object.entries(shares).filter(([, v]) => v > 0)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)

  return (
    <div className="tip-chart">
      {entries.map(([employeeId, amount]) => {
        const name = rosterMap[employeeId]?.name ?? 'Former employee'
        const pct = (amount / maxVal) * 100
        return (
          <div key={employeeId} className="tip-chart-row">
            <span className="tip-chart-name">{name}</span>
            <div className="tip-chart-bar-wrap">
              <div className="tip-chart-bar" style={{ width: `${pct}%` }} />
            </div>
            <span className="tip-chart-value">${amount.toFixed(2)}</span>
          </div>
        )
      })}
    </div>
  )
}
