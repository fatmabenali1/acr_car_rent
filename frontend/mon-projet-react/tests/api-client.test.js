import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from '../src/api/client'
import { createCheckout } from '../src/api/checkout'

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends language and JSON data and unwraps the API response', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({
      success: true,
      data: { reservationNumber: '0203AC' },
      meta: { lang: 'el' },
    }))
    vi.stubGlobal('fetch', fetch)

    const result = await apiRequest('/reservations', {
      method: 'POST',
      lang: 'el',
      body: { privacyAccepted: true },
    })

    expect(result.data).toEqual({ reservationNumber: '0203AC' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('lang=el'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ privacyAccepted: true }),
      }),
    )
  })

  it('sends one checkout request with the client idempotency key', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({
      success: true,
      data: { url: 'https://checkout.stripe.test/session' },
    }))
    vi.stubGlobal('fetch', fetch)

    const result = await createCheckout('0203AC', 'customer@example.com', 'client-key')

    expect(result.url).toBe('https://checkout.stripe.test/session')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('client-key')
  })
})