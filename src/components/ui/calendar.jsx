'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex w-full flex-col gap-3',
        nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-8 w-8 select-none p-0 disabled:pointer-events-none disabled:opacity-40'
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-8 w-8 select-none p-0 disabled:pointer-events-none disabled:opacity-40'
        ),
        month_caption: 'flex h-8 items-center justify-center text-sm font-medium text-foreground',
        table: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 flex-1 select-none text-[0.8rem] font-normal text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: 'relative h-9 w-9 select-none p-0 text-center',
        range_start: 'rounded-l-md bg-primary/15',
        range_end: 'rounded-r-md bg-primary/15',
        range_middle: 'bg-primary/15',
        today: 'font-semibold text-primary',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) =>
          orientation === 'right' ? (
            <ChevronRight className={cn('size-4', chevronClassName)} {...chevronProps} />
          ) : (
            <ChevronLeft className={cn('size-4', chevronClassName)} {...chevronProps} />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

function CalendarDayButton({ className, day, modifiers, ...props }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isAnchor =
    modifiers.range_start ||
    modifiers.range_end ||
    (modifiers.selected && !modifiers.range_middle)

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'h-9 w-9 rounded-md p-0 font-normal',
        isAnchor &&
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        modifiers.range_middle && 'rounded-none bg-transparent hover:bg-primary/25',
        className
      )}
      {...props}
    />
  )
}
CalendarDayButton.displayName = 'CalendarDayButton'

export { Calendar, CalendarDayButton }
