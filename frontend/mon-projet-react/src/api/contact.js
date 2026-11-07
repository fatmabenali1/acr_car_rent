import { apiRequest } from './client';

export async function getContactInfo(lang = 'en') {
  return apiRequest('/contact-info', { lang });
}

export async function createContactMessage(payload, lang = 'en') {
  return apiRequest('/contact', {
    method: 'POST',
    body: { ...payload, language: lang },
    lang,
  });
}
