import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useMeta } from '@/api/hooks'
import { ErrorAlert } from '@/components/shared/error-alert'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { ControlsProvider } from '@/state/controls'
import { AppSidebar } from './app-sidebar'
import { ThemeToggle } from './theme-toggle'

const TITLES: Record<string, string> = {
  '/decision': 'Decision view',
  '/accuracy': 'Forecast accuracy',
}

export function AppLayout() {
  const meta = useMeta()
  const { pathname } = useLocation()

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
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="flex-1 text-base font-semibold">
              {TITLES[pathname] ?? 'Wind forecast desk'}
            </h1>
            <ThemeToggle />
          </header>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" aria-busy="true" />}>
              <Outlet />
            </Suspense>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ControlsProvider>
  )
}
