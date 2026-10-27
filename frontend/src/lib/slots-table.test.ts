import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SORT,
  filterSlots,
  slotMatchesPresence,
  slotMatchesQuery,
  sortSlots,
  type SlotRow,
} from './slots-table'

const base: SlotRow = {
  start_time: '2026-01-15T09:30:00Z',
  forecast_mw: 5000,
  publish_time: '2026-01-14T07:30:00Z',
  horizon_hours: 26,
  actual_mw: 4100,
  error_mw: 900,
}

function slot(overrides: Partial<SlotRow>): SlotRow {
  return { ...base, ...overrides }
}

const leftOut = slot({
  start_time: '2026-01-15T10:00:00Z',
  forecast_mw: null,
  publish_time: null,
  horizon_hours: null,
  actual_mw: 3900,
  error_mw: null,
})

describe('slotMatchesQuery', () => {
  it('matches on the start time', () => {
    expect(slotMatchesQuery(base, '09:30')).toBe(true)
    expect(slotMatchesQuery(base, '10:00')).toBe(false)
  })

  it('matches on the publish time and ignores case', () => {
    expect(slotMatchesQuery(base, '2026-01-14T07')).toBe(true)
    expect(slotMatchesQuery(base, 'JUNK')).toBe(false)
  })

  it('treats empty and whitespace-only queries as match-all', () => {
    expect(slotMatchesQuery(base, '')).toBe(true)
    expect(slotMatchesQuery(base, '   ')).toBe(true)
  })

  it('finds left-out slots by their start time even without a publish time', () => {
    expect(slotMatchesQuery(leftOut, '10:00')).toBe(true)
    expect(slotMatchesQuery(leftOut, '07:30')).toBe(false)
  })
})

describe('slotMatchesPresence', () => {
  it('keeps everything for the all filter', () => {
    expect(slotMatchesPresence(base, 'all')).toBe(true)
    expect(slotMatchesPresence(leftOut, 'all')).toBe(true)
  })

  it('splits by forecast presence', () => {
    expect(slotMatchesPresence(base, 'with')).toBe(true)
    expect(slotMatchesPresence(leftOut, 'with')).toBe(false)
    expect(slotMatchesPresence(leftOut, 'out')).toBe(true)
    expect(slotMatchesPresence(base, 'out')).toBe(false)
  })
})

describe('filterSlots', () => {
  const slots = [base, leftOut]

  it('combines the text and presence filters', () => {
    expect(filterSlots(slots, '10:00', 'out')).toEqual([leftOut])
    expect(filterSlots(slots, '09:30', 'out')).toEqual([])
    expect(filterSlots(slots, '', 'all')).toEqual(slots)
  })
})

describe('sortSlots', () => {
  const slots = [
    slot({ start_time: '2026-01-15T09:30:00Z', error_mw: 900 }),
    slot({ start_time: '2026-01-15T10:00:00Z', error_mw: null }),
    slot({ start_time: '2026-01-15T08:00:00Z', error_mw: 2500 }),
    slot({ start_time: '2026-01-15T07:30:00Z', error_mw: -300 }),
  ]

  it('does not mutate the input', () => {
    const copy = [...slots]
    sortSlots(slots, { id: 'error_mw', desc: true })
    expect(slots).toEqual(copy)
  })

  it('sorts numbers descending with the biggest miss first', () => {
    const times = sortSlots(slots, { id: 'error_mw', desc: true }).map((s) => s.start_time)
    expect(times).toEqual([
      '2026-01-15T08:00:00Z',
      '2026-01-15T09:30:00Z',
      '2026-01-15T07:30:00Z',
      '2026-01-15T10:00:00Z',
    ])
  })

  it('sorts numbers ascending and still keeps left-out slots last', () => {
    const times = sortSlots(slots, { id: 'error_mw', desc: false }).map((s) => s.start_time)
    expect(times).toEqual([
      '2026-01-15T07:30:00Z',
      '2026-01-15T09:30:00Z',
      '2026-01-15T08:00:00Z',
      '2026-01-15T10:00:00Z',
    ])
  })

  it('sorts ISO times ascending by default', () => {
    const times = sortSlots(slots, DEFAULT_SORT).map((s) => s.start_time)
    expect(times[0]).toBe('2026-01-15T07:30:00Z')
    expect(times[3]).toBe('2026-01-15T10:00:00Z')
  })

  it('tie-breaks on start time', () => {
    const tied = [
      slot({ start_time: '2026-01-15T10:00:00Z', error_mw: 100 }),
      slot({ start_time: '2026-01-15T08:00:00Z', error_mw: 100 }),
    ]
    expect(sortSlots(tied, { id: 'error_mw', desc: false }).map((s) => s.start_time)).toEqual([
      '2026-01-15T08:00:00Z',
      '2026-01-15T10:00:00Z',
    ])
  })
})
