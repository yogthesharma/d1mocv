import { describe, expect, it } from 'vitest'
import { addDays, clampDay, fromIsoDay, isIsoDay, toIsoDay } from './dates'

describe('dates', () => {
  it('round-trips a day without time zone drift', () => {
    expect(toIsoDay(fromIsoDay('2026-01-01'))).toBe('2026-01-01')
    expect(toIsoDay(fromIsoDay('2026-01-31'))).toBe('2026-01-31')
  })

  it('adds days across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-01-15', -14)).toBe('2026-01-01')
  })

  it('clamps to the allowed range', () => {
    expect(clampDay('2025-12-01', '2026-01-01', '2026-01-31')).toBe('2026-01-01')
    expect(clampDay('2026-03-01', '2026-01-01', '2026-01-31')).toBe('2026-01-31')
    expect(clampDay('2026-01-10', '2026-01-01', '2026-01-31')).toBe('2026-01-10')
  })

  it('recognises only well-formed day strings', () => {
    expect(isIsoDay('2026-01-10')).toBe(true)
    expect(isIsoDay('10/01/2026')).toBe(false)
    expect(isIsoDay(null)).toBe(false)
  })
})
