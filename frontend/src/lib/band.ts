import type { Slot } from '@/api/types'
import { formatTime } from './format'

export interface ChartPoint {
  time: string
  forecast: number | null
  actual: number | null
  /** [lower, upper] around the forecast, or null when there is no forecast or no band. */
  range: [number, number] | null
}

export interface DayChart {
  points: ChartPoint[]
  /** Half-hours that have both a forecast and an actual. */
  compared: number
  /** Of those, how many had the actual inside forecast ± buffer. */
  inside: number
}

/** Chart rows for one day, with the planning range forecast ± buffer (MW) when a buffer is given. */
export function buildDayChart(slots: Slot[], buffer: number | null): DayChart {
  let compared = 0
  let inside = 0
  const points = slots.map((slot): ChartPoint => {
    const { forecast_mw: forecast, actual_mw: actual } = slot
    if (forecast !== null && actual !== null) {
      compared += 1
      if (buffer !== null && Math.abs(forecast - actual) <= buffer) inside += 1
    }
    return {
      time: formatTime(slot.start_time),
      forecast,
      actual,
      range: forecast !== null && buffer !== null ? [forecast - buffer, forecast + buffer] : null,
    }
  })
  return { points, compared, inside }
}
