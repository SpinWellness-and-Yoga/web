interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const local = cache.get<T>(key);
  if (local) return local;

  const { redisEnabled, redisGet } = await import('./redis');
  if (!redisEnabled()) return null;

  const raw = await redisGet(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as T;
    // default local ttl; redis is authoritative
    cache.set(key, parsed, 60);
    return parsed;
  } catch {
    return null;
  }
}

export async function cacheSetJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  cache.set(key, value, ttlSeconds);

  const { redisEnabled, redisSet } = await import('./redis');
  if (!redisEnabled()) return;

  try {
    await redisSet(key, JSON.stringify(value), ttlSeconds);
  } catch {
    // ignore
  }
}

export async function cacheDel(keys: string[]): Promise<void> {
  for (const key of keys) {
    cache.delete(key);
  }

  const { redisEnabled, redisDel } = await import('./redis');
  if (!redisEnabled()) return;
  await redisDel(keys);
}

// cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of (cache as any).cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}, 300000);

