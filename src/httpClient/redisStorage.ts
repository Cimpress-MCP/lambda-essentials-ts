import { buildStorage, canStale } from 'axios-cache-interceptor';
import type { StorageValue } from 'axios-cache-interceptor';
// eslint-disable-next-line import/no-extraneous-dependencies
import { createClient } from 'redis';

const keyPrefix = 'axios-cache-';

export default function createRedisStorage(client: ReturnType<typeof createClient>) {
  // source https://axios-cache-interceptor.js.org/guide/storages#node-redis-storage
  return buildStorage({
    async find(key) {
      const result = await client.get(`${keyPrefix}${key}`);
      return result ? (JSON.parse(result) as StorageValue) : undefined;
    },

    // eslint-disable-next-line complexity
    async set(key, value, req) {
      await client.set(`${keyPrefix}${key}`, JSON.stringify(value), {
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
      await client.del(`${keyPrefix}${key}`);
    },
  });
}
