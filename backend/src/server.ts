import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import "dotenv/config";

import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import tasksRoutes from "./routes/tasks.js";
import notesRoutes from "./routes/notes.js";
import filesRoutes from "./routes/files.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(cookie);
await app.register(jwt, {
  secret: process.env.JWT_SECRET || "changeme",
  cookie: { cookieName: "token", signed: false },
});

// plugins
await app.register(prismaPlugin);
await app.register(redisPlugin);

// global light rate limit (per IP)
// disable on /health and /healthz via route config above
await app.register(rateLimit, {
  max: 100,                // 100 requests
  timeWindow: "1 minute",  // per minute
  skipOnError: true,       // don’t block requests if the limiter errors
  // If you want to back this with Redis instead of memory:
  // redis: app.redis
});

await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(workspaceRoutes);
await app.register(tasksRoutes);
await app.register(notesRoutes);
await app.register(filesRoutes);

const port = Number(process.env.PORT || 3000);
app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
