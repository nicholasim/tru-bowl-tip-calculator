import { useState, useMemo } from 'react'
import { distributeTipsByHours } from '../utils/calculations'
import { formatDate } from '../lib/periodHelpers'
import { DEFAULT_TIPS } from '../lib/constants'
import { TipDistributionChart } from './TipDistributionChart'

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

  const { shares, totalHours, ratePerHour, reconciled } = useMemo(
    () => distributeTipsByHours(tips, hours),
    [tips, hours]
  )

  const rosterMap = useMemo(
    () => Object.fromEntries(roster.map((e) => [e.id, e])),
    [roster]
  )

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
  const availableToAdd = roster.filter((e) => hours[e.id] === undefined)

  return (
    <article className="day-entry">
      <h3 className="day-date">{formatDate(day.date)}</h3>

      <div className="day-tips">
        <label>
          Cash $
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={tips.cash === 0 || tips.cash === '0' ? '' : String(tips.cash)}
            onChange={(e) => handleTipChange('cash', e.target.value)}
          />
        </label>
        <label>
          App $
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={tips.app === 0 || tips.app === '0' ? '' : String(tips.app)}
            onChange={(e) => handleTipChange('app', e.target.value)}
          />
        </label>
        <label>
          Credit $
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={tips.creditCard === 0 || tips.creditCard === '0' ? '' : String(tips.creditCard)}
            onChange={(e) => handleTipChange('creditCard', e.target.value)}
          />
        </label>
        <span className="day-tips-total">
          Total: ${totalTipsDisplay.toFixed(2)}
        </span>
      </div>

      <div className="day-hours">
        <h4>Employees who worked</h4>
        <div className="day-hours-add">
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            aria-label="Select employee"
            className="day-hours-select"
          >
            <option value="">Select employee…</option>
            {availableToAdd.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addEmployee}
            disabled={!selectedEmployeeId}
            className="btn-add-employee"
          >
            Add
          </button>
        </div>
        {roster.length === 0 && (
          <p className="day-hours-hint">Add employees to the roster first.</p>
        )}
        {employeesOnDay.length === 0 && roster.length > 0 && (
          <p className="day-hours-hint">Select an employee above and click Add.</p>
        )}
        <ul className="day-hours-list">
          {employeesOnDay.map((employeeId) => {
            const name = rosterMap[employeeId]?.name ?? 'Unknown'
            return (
              <li key={employeeId} className="day-hours-row">
                <span className="day-hours-name">{name}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={hours[employeeId] == null || hours[employeeId] === '' || hours[employeeId] === 0 ? '' : String(hours[employeeId])}
                  onChange={(e) => handleHoursChange(employeeId, e.target.value)}
                  placeholder="0.00"
                  className="day-hours-input"
                  aria-label={`Hours for ${name}`}
                />
                <span className="day-hours-unit">hrs</span>
                <button
                  type="button"
                  onClick={() => removeEmployee(employeeId)}
                  className="btn-remove-inline"
                  aria-label={`Remove ${name}`}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {totalHours > 0 && totalTipsDisplay > 0 && (
        <div className="day-results">
          <p className="day-calc-summary">
            ${totalTipsDisplay.toFixed(2)} ÷ {totalHours} hrs = $
            {ratePerHour.toFixed(2)}/hr
          </p>
          <TipDistributionChart
            shares={shares}
            rosterMap={rosterMap}
          />
          <table className="day-shares-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Hours</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((employeeId) => (
                <tr key={employeeId}>
                  <td>{rosterMap[employeeId]?.name ?? employeeId}</td>
                  <td>{parseFloat(hours[employeeId]) || hours[employeeId]}</td>
                  <td>${(shares[employeeId] ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p
            className={`day-reconciled ${reconciled ? 'ok' : 'warning'}`}
            role="status"
          >
            {reconciled
              ? `Distributed: $${Object.values(shares).reduce((a, b) => a + b, 0).toFixed(2)} (matches total tips)`
              : 'Rounding adjustment needed'}
          </p>
        </div>
      )}
    </article>
  )
}
