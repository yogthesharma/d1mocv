import { describe, expect, it } from 'vitest'
import { buildTakeaway } from './takeaway'

const base = { days: 31, cutoffHour: 9, n: 1488, mae: 2000, p90: 4000, p95: 5000 }

describe('buildTakeaway', () => {
  it('states the average miss and the buffer from the P95', () => {
    const [first, second] = buildTakeaway({ ...base, bias: 1700 })
    expect(first).toContain('31 decision days')
    expect(first).toContain('09:00 UTC')
    expect(first).toContain('2,000 MW')
    expect(second).toContain('4,000 MW')
    expect(second).toContain('5,000 MW would have covered 95%')
  })

  it('says short when the forecast ran too high', () => {
    const text = buildTakeaway({ ...base, bias: 1700 }).join(' ')
    expect(text).toContain('1,700 MW too high')
    expect(text).toContain('short')
  })

  it('says overbought when the forecast ran too low', () => {
    const text = buildTakeaway({ ...base, bias: -1700 }).join(' ')
    expect(text).toContain('1,700 MW too low')
    expect(text).toContain('more than needed')
  })

  it('reports no lean when bias is small against the typical miss', () => {
    const text = buildTakeaway({ ...base, bias: 50 }).join(' ')
    expect(text).toContain('did not lean consistently')
  })

  it('uses the singular for one day', () => {
    expect(buildTakeaway({ ...base, days: 1, bias: 0 })[0]).toContain('1 decision day (')
  })
})
