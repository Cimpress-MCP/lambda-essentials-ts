import { buildStorage, canStale } from 'axios-cache-interceptor';
import type { StorageValue } from 'axios-cache-interceptor';
import { createClient } from 'redis';

export default function createRedisStorage(client: ReturnType<typeof createClient>) {
  // source https://axios-cache-interceptor.js.org/guide/storages#node-redis-storage
  return buildStorage({
    async find(key) {
      const result = await client.get(`axios-cache-${key}`);
      return result ? (JSON.parse(result) as StorageValue) : undefined;
    },

    // eslint-disable-next-line complexity
    async set(key, value, req) {
      await client.set(`axios-cache-${key}`, JSON.stringify(value), {
        PXAT:
          value.state === 'loading'
            ? Date.now() + (req?.cache && typeof req.cache.ttl === 'number' ? req.cache.ttl : 60000)
            : (value.state === 'stale' && value.ttl) ||
              (value.state === 'cached' && !canStale(value))
            ? value.createdAt + value.ttl!
            : undefined,
      });
    },

    async remove(key) {
      await client.del(`axios-cache-${key}`);
    },
  });
}
