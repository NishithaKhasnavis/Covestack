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
import googleRoutes from "./routes/google.js";
import githubRoutes from "./routes/github.js";
import oauthPlugin from "./plugins/oauth.js";

const app = Fastify({ logger: true });

// CORS: allow credentials + all verbs we use
await app.register(cors, {
  origin: (origin, cb) => cb(null, true), // dev: allow all
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await app.register(cookie);
await app.register(jwt, {
  secret: process.env.JWT_SECRET || "changeme",
  cookie: { cookieName: "token", signed: false },
});

// decorate auth preHandler
app.decorate(
  "authenticate",
  async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ message: "Unauthorized" });
    }
  }
);

// plugins
await app.register(prismaPlugin);
await app.register(redisPlugin);
await app.register(oauthPlugin);


// rate limit
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  skipOnError: true,
});

await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(workspaceRoutes);
await app.register(tasksRoutes);
await app.register(notesRoutes);
await app.register(filesRoutes);
await app.register(googleRoutes);
await app.register(githubRoutes);

const port = Number(process.env.PORT || 3000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// Type augmentation so TS knows about app.authenticate
declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}
