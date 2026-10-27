import { useCallback, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Meta } from '@/api/types'
import { addDays, clampDay, isIsoDay } from '@/lib/dates'
import { ControlsContext, type Controls } from './controls-context'

/** Date and cutoff live in the URL, so any view can be shared or reloaded as it is. */
export function ControlsProvider({ meta, children }: { meta: Meta; children: ReactNode }) {
  const [params, setParams] = useSearchParams()

  const rawDate = params.get('date')
  const decisionDate = isIsoDay(rawDate)
    ? clampDay(rawDate, meta.first_decision_date, meta.last_decision_date)
    : clampDay(
        addDays(meta.first_decision_date, 14),
        meta.first_decision_date,
        meta.last_decision_date,
      )

  const rawCutoff = Number(params.get('cutoff'))
  const cutoffHour =
    params.get('cutoff') !== null &&
    Number.isInteger(rawCutoff) &&
    rawCutoff >= 0 &&
    rawCutoff <= 23
      ? rawCutoff
      : meta.default_cutoff_hour

  const first = meta.first_decision_date
  const last = meta.last_decision_date
  const rawStart = params.get('from')
  const rawEnd = params.get('to')
  const start = isIsoDay(rawStart) ? clampDay(rawStart, first, last) : first
  const end = isIsoDay(rawEnd) ? clampDay(rawEnd, first, last) : last
  const [rangeStart, rangeEnd] = start <= end ? [start, end] : [end, start]

  const update = useCallback(
    (key: string, value: string) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.set(key, value)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const value = useMemo<Controls>(
    () => ({
      meta,
      decisionDate,
      cutoffHour,
      setDecisionDate: (day) => update('date', day),
      setCutoffHour: (hour) => update('cutoff', String(hour)),
      rangeStart,
      rangeEnd,
      setRange: (from, to) =>
        setParams(
          (previous) => {
            const next = new URLSearchParams(previous)
            next.set('from', from)
            next.set('to', to)
            return next
          },
          { replace: true },
        ),
    }),
    [meta, decisionDate, cutoffHour, update, rangeStart, rangeEnd, setParams],
  )

  return <ControlsContext.Provider value={value}>{children}</ControlsContext.Provider>
}
