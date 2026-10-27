import { describe, expect, it } from 'vitest'
import { formatDateTime, formatDay, formatMw, formatSignedMw, formatTime } from './format'

describe('format', () => {
  it('formats MW with thousands separators and a dash for missing values', () => {
    expect(formatMw(12345.6)).toBe('12,346')
    expect(formatMw(null)).toBe('-')
  })

  it('always signs errors so direction is obvious', () => {
    expect(formatSignedMw(1747.9)).toBe('+1,748')
    expect(formatSignedMw(-30)).toBe('−30')
    expect(formatSignedMw(0.2)).toBe('0')
    expect(formatSignedMw(null)).toBe('-')
  })

  it('shows UTC times exactly as the API sends them', () => {
    expect(formatTime('2026-01-14T07:30:00Z')).toBe('07:30')
    expect(formatDay('2026-01-14')).toBe('14 Jan 2026')
    expect(formatDateTime('2026-01-14T07:30:00Z')).toBe('14 Jan 2026, 07:30')
  })
})
