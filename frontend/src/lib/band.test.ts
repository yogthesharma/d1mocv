import { describe, expect, it } from 'vitest'
import type { Slot } from '@/api/types'
import { buildDayChart } from './band'

const slot = (time: string, forecast: number | null, actual: number | null): Slot => ({
  start_time: `2026-01-15T${time}:00Z`,
  forecast_mw: forecast,
  actual_mw: actual,
  publish_time: null,
  horizon_hours: null,
  error_mw: null,
})

describe('buildDayChart', () => {
  it('builds forecast ± buffer and counts actuals inside it', () => {
    const chart = buildDayChart(
      [slot('00:00', 1000, 900), slot('00:30', 1000, 1600), slot('01:00', 1000, 1500)],
      500,
    )
    expect(chart.points[0].range).toEqual([500, 1500])
    expect(chart.compared).toBe(3)
    expect(chart.inside).toBe(2) // 1500 is exactly on the edge, so inside
  })

  it('leaves slots without a forecast out of the band and the count', () => {
    const chart = buildDayChart([slot('00:00', null, 900), slot('00:30', 1000, 950)], 100)
    expect(chart.points[0].range).toBeNull()
    expect(chart.compared).toBe(1)
    expect(chart.inside).toBe(1)
  })

  it('draws no band when no buffer is available', () => {
    const chart = buildDayChart([slot('00:00', 1000, 900)], null)
    expect(chart.points[0].range).toBeNull()
    expect(chart.inside).toBe(0)
    expect(chart.compared).toBe(1)
  })
})
