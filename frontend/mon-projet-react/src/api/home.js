import { apiRequest } from './client';

export async function getHome(lang = 'en') {
  return apiRequest('/home', { lang });
}

export async function getHomeArguments(lang = 'en') {
  const response = await getHome(lang);
  return response?.data ?? {};
}
