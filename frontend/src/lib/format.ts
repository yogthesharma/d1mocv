const mwFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatMw(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : mwFormat.format(value)
}

/** Like formatMw but always shows the sign, so over- and under-forecasts are obvious. */
export function formatSignedMw(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const rounded = Math.round(value)
  if (rounded === 0) return '0'
  return `${rounded > 0 ? '+' : '−'}${mwFormat.format(Math.abs(rounded))}`
}

export function formatHours(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : value.toFixed(1)
}

/** "2026-01-14T07:30:00Z" -> "07:30" */
export function formatTime(iso: string): string {
  return iso.slice(11, 16)
}

/** "2026-01-14" -> "14 Jan 2026" */
export function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`))
}

/** "2026-01-14T07:30:00Z" -> "14 Jan 2026, 07:30" */
export function formatDateTime(iso: string): string {
  return `${formatDay(iso.slice(0, 10))}, ${formatTime(iso)}`
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
