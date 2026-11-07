import { apiRequest } from './client';

export async function checkAvailability(payload, lang = 'en') {
  return apiRequest('/availability/check', {
    method: 'POST',
    body: payload,
    lang,
  });
}
