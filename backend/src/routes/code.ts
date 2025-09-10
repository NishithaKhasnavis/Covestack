// src/routes/code.ts
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

type AuthedReq = FastifyRequest & { user: { id: string } };

const zGitFile = z.object({
  path: z.string().min(1),
  content: z.string().default(""),
});
const zSaveBody = z.object({
  files: z.array(zGitFile),
});

export default async function codeRoutes(app: FastifyInstance) {
  const keyFor = (wsId: string) => `code:ws:${wsId}`;

  // GET /code/:workspaceId  -> { files: GitFile[], updatedAt: string }
  app.get("/code/:workspaceId", { preHandler: app.authenticate }, async (req, reply) => {
    const wsId = (req.params as any).workspaceId as string;
    if (!wsId) return reply.code(400).send({ message: "workspaceId required" });

    const raw = await app.redis.get(keyFor(wsId));
    if (!raw) return reply.send({ files: [], updatedAt: null });

    try {
      const parsed = JSON.parse(raw);
      return reply.send(parsed);
    } catch {
      return reply.send({ files: [], updatedAt: null });
    }
  });

  // PUT /code/:workspaceId  -> save files
  app.put("/code/:workspaceId", { preHandler: app.authenticate }, async (req, reply) => {
    const wsId = (req.params as any).workspaceId as string;
    if (!wsId) return reply.code(400).send({ message: "workspaceId required" });

    const { files } = zSaveBody.parse((req as any).body);
    const payload = JSON.stringify({ files, updatedAt: new Date().toISOString() });

    await app.redis.set(keyFor(wsId), payload);
    return reply.send({ ok: true });
  });
}
