import { apiRequest } from './client';

export async function getReviews({ source, limit } = {}, lang = 'en') {
  return apiRequest('/reviews', {
    params: { source, limit },
    lang,
  });
}
