import { apiRequest } from './client';

export async function getExtras(lang = 'en') {
  return apiRequest('/extras', { lang });
}
