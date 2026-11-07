import { apiRequest } from './client';

export async function getPricingEstimate(payload, lang = 'en') {
  return apiRequest('/pricing/estimate', {
    method: 'POST',
    body: payload,
    lang,
  });
}
