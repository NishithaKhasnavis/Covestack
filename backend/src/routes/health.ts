import { FastifyInstance } from "fastify";

export default async function healthRoutes(app: FastifyInstance) {
  // keep a super-fast ping (no rate limit)
  app.get("/health", { config: { rateLimit: false } }, async () => ({ ok: true }));

  // deep check: DB + Redis
  app.get("/healthz", { config: { rateLimit: false } }, async (_req, reply) => {
    const result = { ok: true as const, db: "down", redis: "down" as "down" | "PONG" };

    // DB check
    try {
      const rows = await app.prisma.$queryRaw<{ x: number }[]>`SELECT 1 as x`;
      if (rows?.[0]?.x === 1) result.db = "up" as any;
    } catch {
      result.db = "down" as any;
    }

    // Redis check
    try {
      const pong = await app.redis.ping();
      result.redis = (pong as any) === "PONG" ? "PONG" : "down";
    } catch {
      result.redis = "down";
    }

    return reply.send(result);
  });
}
