import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle>Employee Roster</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Employee name"
            aria-label="New employee name"
          />
          <Button type="submit">Add</Button>
        </form>

        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {roster.map((employee) => (
            <li
              key={employee.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent"
            >
              {editingId === employee.id ? (
                <form onSubmit={saveEdit} className="flex w-full items-center gap-2">
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                    autoFocus
                    aria-label="Edit employee name"
                    className="border-primary"
                  />
                  <Button type="submit" size="icon" variant="outline" aria-label="Save">
                    <Check className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={cancelEdit}
                    aria-label="Cancel edit"
                  >
                    <X className="size-4" />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="text-sm text-foreground">{employee.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(employee)}
                      aria-label={`Edit ${employee.name}`}
                      className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(employee.id)}
                      aria-label={`Remove ${employee.name}`}
                      className="text-brand-pink hover:bg-brand-pink/10 hover:text-brand-pink-dark"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {roster.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Add employees to get started.</p>
        )}
      </CardContent>
    </Card>
  )
}
