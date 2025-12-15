import { createClient } from 'redis';
import { logger } from './logger';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connecting: Promise<RedisClient> | null = null;
let disabledUntil = 0;
let lastErrorLogAt = 0;
const DISABLE_MS = 30_000;
const LOG_THROTTLE_MS = 30_000;

function isEnabled(): boolean {
  return process.env.REDIS_ENABLED === 'true' && !!process.env.REDIS_URL;
}

function prefixKey(key: string): string {
  const prefix = (process.env.REDIS_PREFIX || '').trim();
  if (!prefix) return key;
  return `${prefix}:${key}`;
}

export function redisEnabled(): boolean {
  return isEnabled();
}

export async function getRedis(): Promise<RedisClient | null> {
  if (!isEnabled()) return null;
  if (Date.now() < disabledUntil) return null;
  if (client) return client;
  if (connecting) return connecting;

  const url = process.env.REDIS_URL!;

  connecting = (async () => {
    const c = createClient({
      url,
      socket: {
        connectTimeout: 2500,
        keepAlive: 1,
        reconnectStrategy: (retries) => {
          if (retries >= 3) return new Error('redis reconnect attempts exceeded');
          return Math.min(250 * (2 ** retries), 2000);
        },
      },
    });

    c.on('error', (err) => {
      // reduce noise: log at most once per throttle window
      const now = Date.now();
      if (now - lastErrorLogAt >= LOG_THROTTLE_MS) {
        lastErrorLogAt = now;
        logger.error('redis client error', err);
      }
      // if we are seeing connection errors, back off to avoid repeated dials
      if (disabledUntil === 0 || now >= disabledUntil) {
        disabledUntil = now + DISABLE_MS;
      }
    });

    try {
      await c.connect();
      client = c;
      logger.info('redis connected');
      return c;
    } catch (err) {
      disabledUntil = Date.now() + DISABLE_MS;
      try {
        // disconnect is best-effort; client may be closed or never connected
        if (c && typeof c.disconnect === 'function') {
          try {
            await c.disconnect();
          } catch (disconnectErr: any) {
            // ignore "client is closed" and other disconnect errors
            if (disconnectErr?.message?.includes('closed')) {
              // expected when connect failed before session established
            }
          }
        }
      } catch {
        // ignore any cleanup errors
      }
      logger.warn('redis connect failed, disabling temporarily', { disabledForMs: DISABLE_MS });
      throw err;
    } finally {
      connecting = null;
    }
  })();

  try {
    return await connecting;
  } catch {
    return null;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const c = await getRedis();
  if (!c) return null;
  try {
    return await c.get(prefixKey(key));
  } catch {
    logger.warn('redis get failed');
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const c = await getRedis();
  if (!c) return;
  try {
    await c.set(prefixKey(key), value, { EX: ttlSeconds });
  } catch {
    logger.warn('redis set failed');
  }
}

export async function redisDel(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const c = await getRedis();
  if (!c) return;
  try {
    await c.del(keys.map(prefixKey));
  } catch {
    logger.warn('redis del failed', { keysCount: keys.length });
  }
}

export async function redisPing(): Promise<{ ok: boolean; latencyMs?: number }> {
  const c = await getRedis();
  if (!c) return { ok: false };
  const start = Date.now();
  try {
    const res = await c.ping();
    if (res !== 'PONG') return { ok: false };
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false };
  }
}


