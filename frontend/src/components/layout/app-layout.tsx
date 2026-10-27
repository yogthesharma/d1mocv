import { Suspense, useMemo } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BarChart3Icon, ChevronsUpDownIcon, ClockIcon, WindIcon } from 'lucide-react'
import { useMeta } from '@/api/hooks'
import { ErrorAlert } from '@/components/shared/error-alert'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatDay, formatHour } from '@/lib/format'
import { ControlsProvider } from '@/state/controls'
import { useControls } from '@/state/controls-context'
import { DatePicker } from './date-picker'
import { ThemeToggle } from './theme-toggle'

const VIEWS = [
  { to: '/decision', label: 'Decision view', icon: ClockIcon },
  { to: '/accuracy', label: 'Accuracy', icon: BarChart3Icon },
]

const TITLES: Record<string, string> = {
  '/decision': 'Decision view',
  '/accuracy': 'Forecast accuracy',
}

function HeaderControls({ view }: { view: string }) {
  const {
    meta,
    decisionDate,
    cutoffHour,
    setDecisionDate,
    setCutoffHour,
    rangeStart,
    rangeEnd,
    setRange,
  } = useControls()
  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        value: String(hour),
        label: `${formatHour(hour)} UTC`,
      })),
    [],
  )
  const isAccuracy = view === '/accuracy'
  const isWholeMonth =
    rangeStart === meta.first_decision_date && rangeEnd === meta.last_decision_date

  return (
    <>
      <span aria-hidden className="text-sm text-muted-foreground">
        in
      </span>
      {isAccuracy ? (
        <>
          <DatePicker
            id="range-start"
            value={rangeStart}
            min={meta.first_decision_date}
            max={meta.last_decision_date}
            onChange={(day) => setRange(day, day > rangeEnd ? day : rangeEnd)}
            ariaLabel={`From decision date: ${formatDay(rangeStart)}`}
          />
          <span aria-hidden className="text-sm text-muted-foreground">
            to
          </span>
          <DatePicker
            id="range-end"
            value={rangeEnd}
            min={meta.first_decision_date}
            max={meta.last_decision_date}
            onChange={(day) => setRange(day < rangeStart ? day : rangeStart, day)}
            ariaLabel={`To decision date: ${formatDay(rangeEnd)}`}
          />
          {isWholeMonth ? null : (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => setRange(meta.first_decision_date, meta.last_decision_date)}
            >
              Whole month
            </Button>
          )}
        </>
      ) : (
        <DatePicker
          id="decision-date"
          value={decisionDate}
          min={meta.first_decision_date}
          max={meta.last_decision_date}
          onChange={setDecisionDate}
        />
      )}
      <span aria-hidden className="text-sm text-muted-foreground">
        at
      </span>
      <Select
        items={hours}
        value={String(cutoffHour)}
        onValueChange={(value) => value !== null && setCutoffHour(Number(value))}
      >
        <SelectTrigger aria-label="Cutoff time" className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((hour) => (
            <SelectItem key={hour.value} value={hour.value}>
              {hour.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}

export function AppLayout() {
  const meta = useMeta()
  const { pathname, search } = useLocation()
  const current = VIEWS.find((view) => view.to === pathname) ?? VIEWS[0]

  if (meta.isPending) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-6" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (meta.isError) {
    return (
      <div className="p-6">
        <ErrorAlert error={meta.error} onRetry={() => void meta.refetch()} />
      </div>
    )
  }

  return (
    <ControlsProvider meta={meta.data}>
      <TooltipProvider>
        <div className="flex min-h-svh flex-col">
          <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 py-2">
              <Link
                to={{ pathname: '/decision', search }}
                aria-label="Wind forecast desk, go to Decision view"
                className="rounded-sm p-1 outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <WindIcon className="size-5" aria-hidden />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-current="page"
                      aria-label={`${current.label}, switch view`}
                      className="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-sm font-medium outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <current.icon className="size-4" aria-hidden />
                      {current.label}
                      <ChevronsUpDownIcon className="size-3.5 opacity-50" aria-hidden />
                    </button>
                  }
                />
                <DropdownMenuContent align="start">
                  {VIEWS.map((view) => (
                    <DropdownMenuItem
                      key={view.to}
                      render={<Link to={{ pathname: view.to, search }} />}
                    >
                      <view.icon className="size-4" aria-hidden />
                      {view.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <HeaderControls view={pathname} />
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              <h1 className="sr-only">{TITLES[pathname] ?? 'Wind forecast desk'}</h1>
              <ErrorBoundary>
                <Suspense fallback={<Skeleton className="h-96 w-full" aria-busy="true" />}>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </ControlsProvider>
  )
}
