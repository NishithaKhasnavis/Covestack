import { FastifyInstance } from "fastify";
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

  // Request a presigned POST (editor+)
  app.post<{ Params: { id: string }; Body: z.infer<typeof CreateFileDto> }>(
    "/workspaces/:id/files",
    { preHandler: requireWorkspaceRole(Role.EDITOR) },
    async (req, reply) => {
      await req.jwtVerify();
      const { id: workspaceId } = req.params;
      const body = CreateFileDto.parse(req.body);
      const user = req.user as { id: string };

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

  // Get a signed download URL (viewer+)
  app.get("/files/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const file = await app.prisma.file.findUnique({
      where: { id },
      select: { id: true, name: true, mime: true, size: true, storageKey: true, workspaceId: true },
    });
    if (!file) return reply.code(404).send({ message: "File not found" });

    try { await req.jwtVerify(); } catch { return reply.code(401).send({ message: "Invalid token" }); }
    const user = req.user as { id: string };

    const member = await app.prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId: file.workspaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member) return reply.code(403).send({ message: "Not a member of this workspace" });

    const downloadUrl = await signGetUrl(bucket, file.storageKey);
    return { file, downloadUrl };
  });

  // Delete a file (admin+)
  app.delete("/files/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const file = await app.prisma.file.findUnique({
      where: { id },
      select: { id: true, storageKey: true, workspaceId: true },
    });
    if (!file) return reply.code(404).send({ message: "File not found" });

    try { await req.jwtVerify(); } catch { return reply.code(401).send({ message: "Invalid token" }); }
    const user = req.user as { id: string };

    const member = await app.prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId: file.workspaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return reply.code(403).send({ message: "Insufficient role" });
    }

    const bucket = process.env.S3_BUCKET || "covestack";
    await deleteObject(bucket, file.storageKey);
    await app.prisma.file.delete({ where: { id } });
    return { ok: true };
  });
}
