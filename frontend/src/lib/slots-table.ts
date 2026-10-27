import type { DecisionResponse } from '@/api/types'

export type SlotRow = DecisionResponse['slots'][number]

export type PresenceFilter = 'all' | 'with' | 'out'

export type SlotColumnId =
  'start_time' | 'forecast_mw' | 'publish_time' | 'horizon_hours' | 'actual_mw' | 'error_mw'

export interface SlotSort {
  id: SlotColumnId
  desc: boolean
}

export const PRESENCE_OPTIONS: ReadonlyArray<{ value: PresenceFilter; label: string }> = [
  { value: 'all', label: 'All slots' },
  { value: 'with', label: 'With forecast' },
  { value: 'out', label: 'Left out' },
]

export const DEFAULT_SORT: SlotSort = { id: 'start_time', desc: false }

/** Case-insensitive substring match on the time and publish-time columns. */
export function slotMatchesQuery(slot: SlotRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  return (
    slot.start_time.toLowerCase().includes(q) ||
    (slot.publish_time !== null && slot.publish_time.toLowerCase().includes(q))
  )
}

export function slotMatchesPresence(slot: SlotRow, presence: PresenceFilter): boolean {
  if (presence === 'all') return true
  return presence === 'with' ? slot.forecast_mw !== null : slot.forecast_mw === null
}

export function filterSlots(slots: SlotRow[], query: string, presence: PresenceFilter): SlotRow[] {
  return slots.filter(
    (slot) => slotMatchesQuery(slot, query) && slotMatchesPresence(slot, presence),
  )
}

function sortValue(slot: SlotRow, id: SlotColumnId): number | string | null {
  switch (id) {
    case 'start_time':
      return slot.start_time
    case 'forecast_mw':
      return slot.forecast_mw
    case 'publish_time':
      return slot.publish_time
    case 'horizon_hours':
      return slot.horizon_hours
    case 'actual_mw':
      return slot.actual_mw
    case 'error_mw':
      return slot.error_mw
  }
}

/**
 * Sorted copy. Direction applies to real values; slots left out at this
 * cutoff (null values) stay at the end in both directions, with start time
 * as the tie-break.
 */
export function sortSlots(slots: SlotRow[], sort: SlotSort): SlotRow[] {
  const dir = sort.desc ? -1 : 1
  return [...slots].sort((a, b) => {
    const va = sortValue(a, sort.id)
    const vb = sortValue(b, sort.id)
    if (va === null || vb === null) {
      if (va === vb) return 0
      return va === null ? 1 : -1
    }
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? (va - vb) * dir
        : va < vb
          ? -dir
          : va > vb
            ? dir
            : 0
    if (cmp !== 0) return cmp
    if (a.start_time === b.start_time) return 0
    return a.start_time < b.start_time ? -1 : 1
  })
}
