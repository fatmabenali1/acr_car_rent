import { getLocations } from './locations'

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const API_ORIGIN = new URL(configuredApiUrl, window.location.origin).origin
const CHECKOUT_LOCATION_SLUGS = new Set([
  'athens-international-airport',
  'koropi-metro-station',
  'piraeus-port',
])

function normalizeLocation(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase()
}

export async function checkoutRequest(path, { method = 'GET', body, params = {}, headers = {} } = {}) {
  const url = new URL(`/api${path.startsWith('/') ? path : `/${path}`}`, API_ORIGIN)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || result?.success === false) {
    const error = new Error(result?.error?.message || 'The request could not be completed. Please try again.')
    error.status = response.status
    error.fields = result?.error?.fields || {}
    throw error
  }
  return result?.data ?? result
}

export async function getCheckoutLocations(query = '') {
  try {
    return await checkoutRequest('/locations', { params: { q: query } })
  } catch (error) {
    if (error.status !== 404) throw error

    const { data = [] } = await getLocations()
    const normalizedQuery = normalizeLocation(query.trim())
    return data
      .filter((location) => CHECKOUT_LOCATION_SLUGS.has(location.slug))
      .map((location) => ({
        ...location,
        locationType: location.isAirport ? 'airport' : location.slug === 'piraeus-port' ? 'port' : 'station',
      }))
      .filter((location) => !normalizedQuery || normalizeLocation(location.name).includes(normalizedQuery))
  }
}

export function getBooking(reference, email) {
  return checkoutRequest(`/bookings/${encodeURIComponent(reference)}`, { params: { email } })
}

export function getReservationPaymentInfo(reference) {
  return checkoutRequest(`/reservations/${encodeURIComponent(reference)}/payment-info`)
}

export function createCheckout(reference, email, idempotencyKey) {
  return checkoutRequest('/payments/checkout', {
    method: 'POST',
    body: { reference, email },
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function getCheckoutStatus(reference) {
  return checkoutRequest(`/payments/status/${encodeURIComponent(reference)}`)
}

export function createBooking(payload) {
  return checkoutRequest('/reservations', { method: 'POST', body: payload })
}

export function submitInquiry(payload) {
  return checkoutRequest('/inquiries', { method: 'POST', body: payload })
}
