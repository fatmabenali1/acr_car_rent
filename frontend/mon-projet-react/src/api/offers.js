import { apiRequest } from './client';

export async function getOffers(lang = 'en') {
  return apiRequest('/offers', { lang });
}
