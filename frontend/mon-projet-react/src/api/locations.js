import { apiRequest } from './client';

export async function getLocations(lang = 'en') {
  return apiRequest('/locations', { lang });
}

export async function getLocationBySlug(slug, lang = 'en') {
  return apiRequest(`/locations/${slug}`, { lang });
}
