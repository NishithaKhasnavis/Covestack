// backend/src/server.ts
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

/**
 * CORS: allow Vite dev (5173), credentials (cookies),
 * and headers/methods needed for ETag-based notes (If-Match, ETag, PUT).
 *
 * You can override origins via CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
 */
const ORIGINS =
  (process.env.CORS_ORIGINS ??
    "http://localhost:5173,http://127.0.0.1:5173").split(",")
    .map((s) => s.trim())
    .filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    // allow same-origin / curl (no Origin header)
    if (!origin) return cb(null, true);
    if (ORIGINS.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
  // Needed for our API usage
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "If-Match", "If-None-Match", "Authorization"],
  // So the browser can read ETag from responses
  exposedHeaders: ["ETag"],
  preflightContinue: false,
});

await app.register(cookie);
await app.register(jwt, {
  secret: process.env.JWT_SECRET || "changeme",
  cookie: { cookieName: "token", signed: false },
});

// plugins
await app.register(prismaPlugin);
await app.register(redisPlugin);

// global light rate limit (per IP)
await app.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: "1 minute",
  skipOnError: true,
  // If you want to back this with Redis instead of memory:
  // redis: app.redis
});

// routes
await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(workspaceRoutes);
await app.register(tasksRoutes);
await app.register(notesRoutes);
await app.register(filesRoutes);

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

app.log.info({ ORIGINS }, "CORS allowed origins");
app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
