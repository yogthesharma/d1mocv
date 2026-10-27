import { formatMw } from './format'

export interface TakeawayInput {
  days: number
  cutoffHour: number
  n: number
  mae: number
  bias: number
  p90: number
  p95: number
}

/** Plain-English reading of the accuracy numbers. Every figure comes from the API response. */
export function buildTakeaway(input: TakeawayInput): string[] {
  const { days, cutoffHour, n, mae, bias, p90, p95 } = input
  const cutoff = `${String(cutoffHour).padStart(2, '0')}:00 UTC`
  const lines = [
    `Across ${days} decision day${days === 1 ? '' : 's'} (${formatMw(n)} half-hours), the forecast available at ${cutoff} was off by ${formatMw(mae)} MW on average.`,
    `In 9 of 10 half-hours the miss was ${formatMw(p90)} MW or less, and in 19 of 20 it was ${formatMw(p95)} MW or less. A buffer of about ${formatMw(p95)} MW would have covered 95% of half-hours.`,
  ]

  if (Math.abs(bias) < 0.1 * mae) {
    lines.push(
      'The forecast did not lean consistently in either direction, so the buffer can be symmetric.',
    )
  } else if (bias > 0) {
    lines.push(
      `The forecast was ${formatMw(bias)} MW too high on average, so relying on it alone would have left you about ${formatMw(bias)} MW short on average. Consider buying that much extra as part of the buffer.`,
    )
  } else {
    lines.push(
      `The forecast was ${formatMw(-bias)} MW too low on average, so relying on it alone would have meant buying about ${formatMw(-bias)} MW more than needed.`,
    )
  }
  return lines
}
