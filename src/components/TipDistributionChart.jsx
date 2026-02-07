/**
 * Horizontal bar chart for tip distribution - Claude artifact style
 */
const CHART_COLORS = ['#0a0a0a', '#404040', '#525252', '#737373', '#a3a3a3', '#737373']

export function TipDistributionChart({ shares, rosterMap }) {
  const entries = Object.entries(shares).filter(([, v]) => v > 0)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)

  return (
    <div className="tip-chart">
      {entries.map(([employeeId, amount], i) => {
        const name = rosterMap[employeeId]?.name ?? 'Former employee'
        const pct = (amount / maxVal) * 100
        return (
          <div key={employeeId} className="tip-chart-row">
            <span className="tip-chart-name">{name}</span>
            <div className="tip-chart-bar-wrap">
              <div
                className="tip-chart-bar"
                style={{
                  width: `${pct}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
            <span className="tip-chart-value">${amount.toFixed(2)}</span>
          </div>
        )
      })}
    </div>
  )
}
