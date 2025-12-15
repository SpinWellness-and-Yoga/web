import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType> | null = null;

function isEnabled(): boolean {
  return process.env.REDIS_ENABLED === 'true' && !!process.env.REDIS_URL;
}

export function redisEnabled(): boolean {
  return isEnabled();
}

export async function getRedis(): Promise<RedisClientType | null> {
  if (!isEnabled()) return null;
  if (client) return client;
  if (connecting) return connecting;

  const url = process.env.REDIS_URL!;

  connecting = (async () => {
    const c = createClient({
      url,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => Math.min(250 * retries, 2000),
        keepAlive: 1,
      },
    });

    c.on('error', (err) => {
      logger.error('redis client error', err);
    });

    await c.connect();
    client = c;
    connecting = null;
    logger.info('redis connected');
    return c;
  })();

  return connecting;
}

export async function redisGet(key: string): Promise<string | null> {
  const c = await getRedis();
  if (!c) return null;
  try {
    return await c.get(key);
  } catch (err) {
    logger.warn('redis get failed', { key });
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const c = await getRedis();
  if (!c) return;
  try {
    await c.set(key, value, { EX: ttlSeconds });
  } catch {
    logger.warn('redis set failed', { key });
  }
}

export async function redisDel(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const c = await getRedis();
  if (!c) return;
  try {
    await c.del(keys);
  } catch {
    logger.warn('redis del failed', { keysCount: keys.length });
  }
}


