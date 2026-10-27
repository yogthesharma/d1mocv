/** Colour for a signed error: amber when the forecast was too high (short), sky when too low. */
export function errorTone(value: number | null | undefined): string {
  if (value === null || value === undefined || Math.round(value) === 0) return ''
  return value > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-sky-700 dark:text-sky-400'
}
