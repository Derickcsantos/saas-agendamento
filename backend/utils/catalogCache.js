const DAY_MS = 24 * 60 * 60 * 1000;
const cacheStore = new Map();

function getKey(scope, orgId, suffix = "default") {
  return `${scope}:${orgId}:${suffix}`;
}

export function getCatalogCache(scope, orgId, suffix = "default") {
  const cached = cacheStore.get(getKey(scope, orgId, suffix));
  if (!cached) return null;

  if (Date.now() - cached.timestamp > DAY_MS) {
    cacheStore.delete(getKey(scope, orgId, suffix));
    return null;
  }

  return cached.data;
}

export function setCatalogCache(scope, orgId, data, suffix = "default") {
  cacheStore.set(getKey(scope, orgId, suffix), {
    data,
    timestamp: Date.now(),
  });
}

export function invalidateCatalogCache(orgId) {
  const needle = `:${orgId}:`;
  for (const key of cacheStore.keys()) {
    if (key.includes(needle)) {
      cacheStore.delete(key);
    }
  }
}
