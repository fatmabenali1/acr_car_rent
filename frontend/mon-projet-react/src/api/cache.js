const memoryCache = new Map();

export function getCacheKey(namespace, key, lang = 'en') {
  return `${namespace}:${lang}:${key}`;
}

export function readCache(namespace, key, lang = 'en', ttlMs = 5 * 60 * 1000) {
  const entryKey = getCacheKey(namespace, key, lang);
  const cached = memoryCache.get(entryKey);

  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(entryKey);
    return null;
  }

  return cached.value;
}

export function writeCache(namespace, key, value, lang = 'en', ttlMs = 5 * 60 * 1000) {
  const entryKey = getCacheKey(namespace, key, lang);
  memoryCache.set(entryKey, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCache(namespace, key, lang = 'en') {
  if (typeof key === 'undefined') {
    for (const cacheKey of [...memoryCache.keys()]) {
      if (cacheKey.startsWith(`${namespace}:`)) {
        memoryCache.delete(cacheKey);
      }
    }
    return;
  }

  memoryCache.delete(getCacheKey(namespace, key, lang));
}
