const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor({ code, message, details, status }) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN_ERROR';
    this.details = details || null;
    this.status = status || 500;
  }
}

function buildUrl(endpoint, params = {}) {
  const url = new URL(`${DEFAULT_BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.append(key, String(value));
  });

  return url.toString();
}

export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    params = {},
    lang = 'en',
    headers = {},
    signal,
    credentials = 'same-origin',
  } = options;

  const requestHeaders = {
    Accept: 'application/json',
    'Accept-Language': lang,
    ...headers,
  };

  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
  }

  const requestUrl = buildUrl(endpoint, { ...params, lang });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: requestHeaders,
      credentials,
      body: body instanceof FormData ? body : body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      signal: signal || controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
      const error = payload?.error || {};
      throw new ApiError({
        code: error.code || 'HTTP_ERROR',
        message: error.message || 'Request failed',
        details: error.details || payload,
        status: response.status,
      });
    }

    if (payload && typeof payload === 'object' && 'success' in payload && payload.success === false) {
      const error = payload.error || {};
      throw new ApiError({
        code: error.code || 'API_ERROR',
        message: error.message || 'Request failed',
        details: error.details || payload,
        status: 400,
      });
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      return {
        data: payload.data ?? null,
        meta: payload.meta ?? {},
      };
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw new ApiError({
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out. Please try again.',
        details: null,
        status: 408,
      });
    }

    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection and retry.',
      details: error instanceof Error ? error.message : error,
      status: 0,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getApiBaseUrl() {
  return DEFAULT_BASE_URL;
}
