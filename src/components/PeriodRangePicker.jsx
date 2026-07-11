'use client'

import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { addDays, formatPeriodRange, parseLocalDate, toIsoDateString } from '@/lib/periodHelpers'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Trigger button + popover calendar for picking a pay period's start/end.
 * Edits are local until Apply -- Cancel, Escape, or an outside click discard
 * them, since pendingRange is re-seeded from props every time the popover
 * opens rather than synced back into it as the user clicks.
 */
export function PeriodRangePicker({ id, startDate, endDate, maxDays, onApply }) {
  const [open, setOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState(undefined)
  const isDesktop = useMediaQuery('(min-width: 640px)')

  const handleOpenChange = (next) => {
    if (next) {
      setPendingRange({ from: parseLocalDate(startDate), to: parseLocalDate(endDate) })
    }
    setOpen(next)
  }

  const handleApply = () => {
    if (!pendingRange?.from) return
    const from = toIsoDateString(pendingRange.from)
    const to = pendingRange.to ? toIsoDateString(pendingRange.to) : from
    onApply(from, to)
    setOpen(false)
  }

  const maxSelectableDate = pendingRange?.from
    ? parseLocalDate(addDays(toIsoDateString(pendingRange.from), maxDays - 1))
    : undefined

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className="w-full gap-2 font-normal">
          <CalendarIcon className="size-4 text-muted-foreground" />
          {formatPeriodRange(startDate, endDate)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={isDesktop ? 2 : 1}
          defaultMonth={pendingRange?.from}
          selected={pendingRange}
          onSelect={setPendingRange}
          disabled={maxSelectableDate ? { after: maxSelectableDate } : undefined}
        />
        <div className="flex justify-end gap-2 border-t border-border px-3 pb-3 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleApply} disabled={!pendingRange?.from}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
