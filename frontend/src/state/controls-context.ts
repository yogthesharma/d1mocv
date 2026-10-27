import { createContext, useContext } from 'react'
import type { Meta } from '@/api/types'

export interface Controls {
  meta: Meta
  decisionDate: string
  cutoffHour: number
  /** First and last decision dates covered by the Accuracy view. */
  rangeStart: string
  rangeEnd: string
  setDecisionDate: (day: string) => void
  setCutoffHour: (hour: number) => void
  setRange: (start: string, end: string) => void
}

export const ControlsContext = createContext<Controls | null>(null)

export function useControls(): Controls {
  const value = useContext(ControlsContext)
  if (!value) throw new Error('useControls must be used inside ControlsProvider')
  return value
}
