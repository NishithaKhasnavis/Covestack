import fp from "fastify-plugin";
import Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (app) => {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    try {
      await redis.quit();
    } catch {
      /* ignore */
    }
  });
});
