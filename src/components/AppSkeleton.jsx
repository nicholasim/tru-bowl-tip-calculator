import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Placeholder shaped like the real roster + pay period + summary layout, so
 * the page previews its structure instead of flashing blank while auth or
 * the initial data fetch is in flight. Purely decorative -- aria-hidden,
 * since the loading announcement itself lives in the sr-only text the
 * caller renders alongside this.
 */
export function AppSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex max-w-[1320px] flex-col gap-4 p-4 sm:flex-row sm:gap-6 sm:p-8"
    >
      <aside className="flex flex-col gap-4 sm:w-[300px] sm:flex-none">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 w-16" />
            </div>
            <div className="flex flex-col gap-2 py-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
      </aside>

      <main className="min-w-0 flex-1">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-32 w-full" />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
