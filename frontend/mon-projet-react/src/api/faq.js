import { apiRequest } from './client';

export async function getFaq(lang = 'en') {
  return apiRequest('/faq', { lang });
}
