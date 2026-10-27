import { lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { TooltipProvider } from '@/components/ui/tooltip'

// Each view pulls in the charts, so load them on demand and keep the app shell small.
const DecisionView = lazy(() =>
  import('@/views/decision-view').then((m) => ({ default: m.DecisionView })),
)
const AccuracyView = lazy(() =>
  import('@/views/accuracy-view').then((m) => ({ default: m.AccuracyView })),
)

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/decision" element={<DecisionView />} />
              <Route path="/accuracy" element={<AccuracyView />} />
              <Route path="*" element={<Navigate to="/decision" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
