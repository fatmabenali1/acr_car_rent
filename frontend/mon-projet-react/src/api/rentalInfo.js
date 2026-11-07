import { apiRequest } from './client';

export async function getRentalInfo(lang = 'en') {
  return apiRequest('/rental-info', { lang });
}
