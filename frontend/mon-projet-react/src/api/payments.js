import { apiRequest } from './client';

export async function initPayment(payload, lang = 'en') {
  return apiRequest('/payments/init', {
    method: 'POST',
    body: payload,
    lang,
  });
}

export async function getPaymentStatus(id, lang = 'en') {
  return apiRequest(`/payments/${id}/status`, { lang });
}
