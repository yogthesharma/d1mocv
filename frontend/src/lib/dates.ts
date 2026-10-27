// Decision and delivery dates travel as plain "YYYY-MM-DD" strings (UTC calendar days).
// The calendar widget works with local Dates, so these helpers convert without time zone drift.

const pad = (value: number) => String(value).padStart(2, '0')

export function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromIsoDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

export function addDays(day: string, amount: number): string {
  const date = fromIsoDay(day)
  date.setDate(date.getDate() + amount)
  return toIsoDay(date)
}

export function isIsoDay(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function clampDay(day: string, first: string, last: string): string {
  if (day < first) return first
  if (day > last) return last
  return day
}
