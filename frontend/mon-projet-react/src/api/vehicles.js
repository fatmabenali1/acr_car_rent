import { apiRequest } from './client';

export async function getVehicleGroups(lang = 'en') {
  return apiRequest('/vehicle-groups', { lang });
}

export async function getVehicles(params = {}, lang = 'en') {
  return apiRequest('/vehicles', { params, lang });
}

export async function getVehicleBySlug(slug, lang = 'en') {
  return apiRequest(`/vehicles/${slug}`, { lang });
}
