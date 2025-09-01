// backend/src/routes/files.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireWorkspaceRole } from "../guards/workspace.js";
import { ensureBucket, signPost, signGetUrl, deleteObject } from "../lib/s3.js";
import { randomUUID } from "crypto";

const CreateFileDto = z.object({
  name: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export default async function filesRoutes(app: FastifyInstance) {
  const bucket = process.env.S3_BUCKET || "covestack";
  await ensureBucket(bucket);

  // 1) LIST files (viewer+)
  //    ⇢ matches frontend GET /workspaces/:workspaceId/files
  app.get(
    "/workspaces/:workspaceId/files",
    { preHandler: requireWorkspaceRole(Role.VIEWER) },
    async (req) => {
      const { workspaceId } = req.params as { workspaceId: string };
      return app.prisma.file.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          mime: true,
          size: true,
          createdAt: true,
          storageKey: true,
          createdBy: { select: { name: true, email: true } },
        },
      });
    }
  );

  // 2) REQUEST a presigned POST (editor+)
  //    ⇢ matches frontend POST /workspaces/:id/files
  app.post<{ Params: { id: string }; Body: z.infer<typeof CreateFileDto> }>(
    "/workspaces/:id/files",
    { preHandler: requireWorkspaceRole(Role.EDITOR) },
    async (req: FastifyRequest, reply: FastifyReply) => {
      await (req as any).jwtVerify();
      const { id: workspaceId } = req.params as { id: string };
      const body = CreateFileDto.parse((req as any).body ?? {});
      const user = (req as any).user as { id: string };

      const safeName = body.name.replace(/\s+/g, "_");
      const key = `${workspaceId}/${Date.now()}-${randomUUID()}-${safeName}`;

      const file = await app.prisma.file.create({
        data: {
          workspaceId,
          name: body.name,
          mime: body.mime,
          size: body.size,
          storageKey: key,
          createdById: user.id,
        },
      });

      const { url, fields } = await signPost(bucket, key, body.mime);
      reply.code(201);
      return { file, upload: { method: "POST", url, fields } };
    }
  );

  // 3) DOWNLOAD (redirect to signed URL) (viewer+)
  //    ⇢ matches frontend anchor <a href={`${API_BASE}/files/:id`}>
  app.get("/files/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const file = await app.prisma.file.findUnique({
      where: { id },
      select: { id: true, name: true, mime: true, size: true, storageKey: true, workspaceId: true },
    });
    if (!file) return reply.code(404).send({ message: "File not found" });

    try {
      await (req as any).jwtVerify();
    } catch {
      return reply.code(401).send({ message: "Invalid token" });
    }
    const user = (req as any).user as { id: string };

    // check membership
    const member = await app.prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId: file.workspaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member) return reply.code(403).send({ message: "Not a member of this workspace" });

    const downloadUrl = await signGetUrl(bucket, file.storageKey);
    return reply.redirect(downloadUrl); // <— redirect so browser downloads
  });

  // 4) DELETE (admin+)
  app.delete("/files/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const file = await app.prisma.file.findUnique({
      where: { id },
      select: { id: true, storageKey: true, workspaceId: true },
    });
    if (!file) return reply.code(404).send({ message: "File not found" });

    try {
      await (req as any).jwtVerify();
    } catch {
      return reply.code(401).send({ message: "Invalid token" });
    }
    const user = (req as any).user as { id: string };

    const member = await app.prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId: file.workspaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return reply.code(403).send({ message: "Insufficient role" });
    }

    await deleteObject(bucket, file.storageKey);
    await app.prisma.file.delete({ where: { id } });
    return { ok: true };
  });
}
