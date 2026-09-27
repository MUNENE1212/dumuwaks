/**
 * Redis Configuration
 *
 * Redis is used for:
 * - Session storage
 * - Rate limiting
 * - Replay attack protection (M-Pesa callbacks)
 * - Caching
 *
 * Redis is OPTIONAL in development. If unavailable, a no-op fallback is used.
 */

/**
 * No-op fallback that mimics the Redis client API.
 * Used when Redis is not available (e.g., local development without Redis).
 */
const fallback = {
  isOpen: false,
  _isFallback: true,
  get: async () => null,
  set: async () => 'OK',
  del: async () => 0,
  exists: async () => 0,
  expire: async () => false,
  incr: async () => 1,
  decr: async () => 0,
  hGet: async () => null,
  hSet: async () => 0,
  hGetAll: async () => ({}),
  publish: async () => 0,
  subscribe: async () => {},
  unsubscribe: async () => {},
  quit: async () => {},
  disconnect: async () => {},
  on: () => {},
  connect: async () => {},
};

// Only attempt Redis if explicitly configured via REDIS_URL or REDIS_HOST env var
const hasRedisConfig = !!(process.env.REDIS_URL || process.env.REDIS_HOST);

function createClient() {
  const redis = require('redis');

  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = process.env.REDIS_PORT || 6379;
  const redisPassword = process.env.REDIS_PASSWORD;

  let redisUrl;
  if (process.env.REDIS_URL) {
    redisUrl = process.env.REDIS_URL;
  } else if (redisPassword) {
    redisUrl = `redis://:${redisPassword}@${redisHost}:${redisPort}`;
  } else {
    redisUrl = `redis://${redisHost}:${redisPort}`;
  }

  let client;

  try {
    client = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.warn('⚠️  Redis reconnection failed after 5 attempts');
            return new Error('Redis max retries reached');
          }
          return Math.min(retries * 200, 3000);
        },
        connectTimeout: 5000,
      }
    });

    client.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    client.on('error', (err) => {
      console.error('Redis error:', err.message);
    });

    client.on('end', () => {
      console.log('Redis connection ended');
    });

    // Non-blocking connect
    client.connect().catch((err) => {
      console.warn(`⚠️  Redis not available: ${err.message}`);
      console.warn('   Caching and replay protection disabled');
    });
  } catch (err) {
    console.warn(`⚠️  Redis init failed: ${err.message}`);
    client = fallback;
  }

  // Graceful shutdown
  const shutdown = async () => {
    try {
      if (client && client.isOpen) {
        await client.quit();
      }
    } catch (_) {
      // ignore
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return client;
}

if (!hasRedisConfig && process.env.NODE_ENV !== 'production') {
  console.log('ℹ️  Redis not configured — running with in-memory fallback');
  module.exports = fallback;
} else {
  module.exports = createClient();
}
