jest.mock(
  'redis',
  () => ({
    createClient: jest.fn(),
  }),
  { virtual: true },
);

import createRedisStorage from '../../src/httpClient/redisStorage';

const mClient = {
  connect: jest.fn().mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    mClient.isReady = true;
  }),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  isReady: false,
  on: jest.fn(),
};

describe('redisStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mClient.isReady = false;
  });

  it('should connect when not ready', async () => {
    const storage = createRedisStorage(mClient as any);
    mClient.isReady = false;

    await storage.get('key');

    expect(mClient.connect).toHaveBeenCalledTimes(1);
    expect(mClient.isReady).toBe(true);
  });

  it('should connect only once when multiple requests are made', async () => {
    mClient.isReady = false;
    const storage = createRedisStorage(mClient as any);

    await Promise.all([storage.get('key1'), storage.get('key2')]);

    expect(mClient.connect).toHaveBeenCalledTimes(1);
  });
});
