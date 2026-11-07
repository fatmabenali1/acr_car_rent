import { apiRequest } from './client';

export async function getPageBySlug(slug, lang = 'en') {
  return apiRequest(`/pages/${slug}`, { lang });
}
