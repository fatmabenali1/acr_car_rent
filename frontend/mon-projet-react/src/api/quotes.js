import { apiRequest } from './client';

export async function createQuote(payload, lang = 'en') {
  return apiRequest('/quotes', {
    method: 'POST',
    body: payload,
    lang,
  });
}

export async function getQuoteByReference(reference, email, lang = 'en') {
  return apiRequest(`/quotes/${reference}`, {
    params: { email },
    lang,
  });
}
