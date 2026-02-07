import { useState } from 'react'
import { nanoid } from 'nanoid'

export function RosterManager({ roster, setRoster }) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setRoster((prev) => [...prev, { id: nanoid(), name: trimmed }])
    setNewName('')
  }

  const handleRemove = (id) => {
    setRoster((prev) => prev.filter((e) => e.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setEditName('')
    }
  }

  const startEdit = (employee) => {
    setEditingId(employee.id)
    setEditName(employee.name)
  }

  const saveEdit = (e) => {
    e?.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed || !editingId) return
    setRoster((prev) =>
      prev.map((e) => (e.id === editingId ? { ...e, name: trimmed } : e))
    )
    setEditingId(null)
    setEditName('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  return (
    <section className="roster-manager">
      <h2>Employee Roster</h2>
      <form onSubmit={handleAdd} className="roster-add">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Employee name"
          aria-label="New employee name"
        />
        <button type="submit">Add</button>
      </form>
      <ul className="roster-list">
        {roster.map((employee) => (
          <li key={employee.id} className="roster-item">
            {editingId === employee.id ? (
              <form onSubmit={saveEdit} className="roster-edit-form">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                  autoFocus
                  aria-label="Edit employee name"
                />
                <button type="submit">Save</button>
                <button type="button" onClick={cancelEdit}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span className="roster-name">{employee.name}</span>
                <div className="roster-actions">
                  <button
                    type="button"
                    onClick={() => startEdit(employee)}
                    aria-label={`Edit ${employee.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(employee.id)}
                    aria-label={`Remove ${employee.name}`}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {roster.length === 0 && (
        <p className="roster-empty">Add employees to get started.</p>
      )}
    </section>
  )
}
