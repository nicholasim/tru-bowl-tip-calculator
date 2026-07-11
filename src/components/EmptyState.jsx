import { cn } from '@/lib/utils'

/**
 * Centered icon + title + optional description + optional children (e.g. a
 * button), for the "nothing here yet" spots in the app. Layout only -- no
 * outer border/box, so callers keep control of whether it sits in a dashed
 * placeholder, plain card content, etc.
 */
export function EmptyState({ icon: Icon, title, description, children, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 py-6 text-center animate-in fade-in duration-300 motion-reduce:animate-none',
        className
      )}
    >
      {Icon && (
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="size-6 text-primary" aria-hidden="true" />
        </div>
      )}
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
