import { buildStorage, canStale } from 'axios-cache-interceptor';
import type { StorageValue } from 'axios-cache-interceptor';

const KEY_PREFIX = 'axios-cache-';

const MIN_TTL = 60000;

export default function createRedisStorage(redisEndpoint: string) {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const redis = require('redis');

  const client = redis.createClient({ url: redisEndpoint });

  // source https://axios-cache-interceptor.js.org/guide/storages#node-redis-storage
  return buildStorage({
    async find(key) {
      if (!client.isReady) {
        await client.connect();
      }
      const result = await client.get(`${KEY_PREFIX}${key}`);
      return result ? (JSON.parse(result) as StorageValue) : undefined;
    },

    // eslint-disable-next-line complexity
    async set(key, value, req) {
      if (!client.isReady) {
        await client.connect();
      }

      await client.set(`${KEY_PREFIX}${key}`, JSON.stringify(value), {
        PXAT:
          // We don't want to keep indefinitely values in the storage if
          // their request don't finish somehow. Either set its value as
          // the TTL or 1 minute (MIN_TTL).
          value.state === 'loading'
            ? Date.now() +
              (req?.cache && typeof req.cache.ttl === 'number' ? req.cache.ttl : MIN_TTL)
            : (value.state === 'stale' && value.ttl) ||
              (value.state === 'cached' && !canStale(value))
            ? value.createdAt + value.ttl!
            : // otherwise, we can't determine when it should expire, so we keep
              //   it indefinitely.
              undefined,
      });
    },

    async remove(key) {
      if (!client.isReady) {
        await client.connect();
      }
      await client.del(`${KEY_PREFIX}${key}`);
    },
  });
}
