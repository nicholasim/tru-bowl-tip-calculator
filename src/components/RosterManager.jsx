'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Check, Pencil, Trash2, Users, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/EmptyState'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const MotionLi = motion.li

export function RosterManager({ roster, setRoster }) {
  // MotionConfig's reducedMotion="user" only suppresses *positional*
  // (x/y/layout) animation -- opacity still fades at full duration -- so
  // the row transition is gated on this too, to make add/remove fully
  // instant (not just non-jumpy) for reduced-motion users.
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  // roster carries every employee ever added (active + inactive), so their
  // names survive removal for historical entries -- this component only
  // ever shows/edits the active ones.
  const activeRoster = roster.filter((e) => e.active !== false)

  const handleAdd = (e) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setRoster((prev) => [...prev, { id: nanoid(), name: trimmed, active: true }])
    setNewName('')
  }

  // Soft delete: keep the row (with active: false) instead of filtering it
  // out, so PeriodSummary/TipDistributionChart can still resolve their name.
  const handleRemove = (id) => {
    setRoster((prev) => prev.map((e) => (e.id === id ? { ...e, active: false } : e)))
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
          <MotionConfig reducedMotion="user">
          <AnimatePresence initial={false}>
            {activeRoster.map((employee) => (
            <MotionLi
              key={employee.id}
              layout={!prefersReducedMotion}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
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
            </MotionLi>
            ))}
          </AnimatePresence>
          </MotionConfig>
        </ul>

        {activeRoster.length === 0 && (
          <EmptyState
            icon={Users}
            title="No employees yet"
            description="Add your first employee above to get started."
          />
        )}
      </CardContent>
    </Card>
  )
}
