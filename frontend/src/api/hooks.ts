import { useQuery } from '@tanstack/react-query'
import { api } from './client'

// The data is a fixed historical snapshot, so cached answers never go stale.
const STATIC = { staleTime: Infinity, retry: 1 } as const

export const useMeta = () => useQuery({ queryKey: ['meta'], queryFn: api.meta, ...STATIC })

export const useDecision = (decisionDate: string, cutoffHour: number) =>
  useQuery({
    queryKey: ['decision', decisionDate, cutoffHour],
    queryFn: () => api.decision(decisionDate, cutoffHour),
    ...STATIC,
  })

export const useAccuracy = (start: string, end: string, cutoffHour: number) =>
  useQuery({
    queryKey: ['accuracy', start, end, cutoffHour],
    queryFn: () => api.accuracy(start, end, cutoffHour),
    ...STATIC,
  })
