import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './client'

afterEach(() => vi.unstubAllGlobals())

function stubFetch(response: Partial<Response> | Error) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response))),
  )
}

describe('api client', () => {
  it('sends decision parameters as a query string', async () => {
    stubFetch({ ok: true, json: () => Promise.resolve({ ok: 1 }) })
    await api.decision('2026-01-14', 9)
    expect(fetch).toHaveBeenCalledWith(
      '/api/forecast-at-decision?decision_date=2026-01-14&cutoff_hour=9',
    )
  })

  it('surfaces the server error message', async () => {
    stubFetch({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { code: 'not_found', message: 'Out of range' } }),
    })
    await expect(api.meta()).rejects.toMatchObject({ status: 404, message: 'Out of range' })
  })

  it('falls back to a generic message when the body is not JSON', async () => {
    stubFetch({ ok: false, status: 500, json: () => Promise.reject(new Error('bad')) })
    await expect(api.meta()).rejects.toThrow('Request failed (500)')
  })

  it('reports a network failure in plain words', async () => {
    stubFetch(new Error('offline'))
    const error = await api.meta().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toContain('Could not reach the server')
  })
})
