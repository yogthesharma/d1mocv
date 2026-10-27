import type { AccuracyResponse, DecisionResponse, Meta } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  const url = `${BASE_URL}${path}${query.size ? `?${query}` : ''}`

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      message = body.error?.message ?? message
    } catch {
      // keep the generic message
    }
    throw new ApiError(response.status, message)
  }
  return (await response.json()) as T
}

export const api = {
  meta: () => get<Meta>('/api/meta'),
  decision: (decisionDate: string, cutoffHour: number) =>
    get<DecisionResponse>('/api/forecast-at-decision', {
      decision_date: decisionDate,
      cutoff_hour: cutoffHour,
    }),
  accuracy: (start: string, end: string, cutoffHour: number) =>
    get<AccuracyResponse>('/api/accuracy', { start, end, cutoff_hour: cutoffHour }),
}
