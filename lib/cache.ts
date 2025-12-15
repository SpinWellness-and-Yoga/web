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
  return cache.get<T>(key);
}

export async function cacheSetJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  cache.set(key, value, ttlSeconds);
}

export async function cacheDel(keys: string[]): Promise<void> {
  for (const key of keys) {
    cache.delete(key);
  }
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

