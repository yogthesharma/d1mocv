import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AccuracyView } from '@/views/accuracy-view'
import { DecisionView } from '@/views/decision-view'

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
