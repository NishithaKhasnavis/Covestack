// src/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import "dotenv/config";

import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import oauthPlugin from "./plugins/oauth.js";

import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import tasksRoutes from "./routes/tasks.js";
import notesRoutes from "./routes/notes.js";
import filesRoutes from "./routes/files.js";
import githubRoutes from "./routes/github.js";
import codeRoutes from "./routes/code.js";
import inviteRoutes from "./routes/invites.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: (origin, cb) => cb(null, true),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "If-Match"],
  exposedHeaders: ["ETag"],
});

await app.register(cookie);
await app.register(jwt, {
  secret: process.env.JWT_SECRET || "changeme",
  cookie: { cookieName: "token", signed: false },
});

import type { FastifyRequest, FastifyReply } from "fastify";
app.decorate("authenticate", async function (req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ message: "Unauthorized" });
  }
});

await app.register(prismaPlugin);
await app.register(redisPlugin);
await app.register(oauthPlugin);

await app.register(rateLimit, { max: 100, timeWindow: "1 minute", skipOnError: true });

// Routes
await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(workspaceRoutes);
await app.register(tasksRoutes);
await app.register(notesRoutes);
await app.register(filesRoutes);
await app.register(githubRoutes);
await app.register(codeRoutes);
await app.register(inviteRoutes);

const port = Number(process.env.PORT || 3000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<any>;
  }
}
