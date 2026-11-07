import { apiRequest } from './client'

export function getCookieConsent() {
  return apiRequest('/cookie-consent', { credentials: 'include' })
}

export function saveCookieConsent(choice) {
  return apiRequest('/cookie-consent', {
    method: 'PUT',
    body: { choice },
    credentials: 'include',
  })
}
