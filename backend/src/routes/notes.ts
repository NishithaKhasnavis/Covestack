// backend/src/routes/notes.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireWorkspaceRole } from "../guards/workspace.js";

const SaveNotesDto = z.object({
  content: z.string(),
  // optional optimistic lock version from client
  version: z.number().int().nonnegative().optional(),
});

function etagFor(version: number) {
  return `W/"v${version}"`;
}

// Parse If-Match header safely (accepts W/"v123", "v123", or "123")
function getIfMatchVersion(req: FastifyRequest): number | undefined {
  const raw = (req.headers["if-match"] ??
    (req.headers as any)["If-Match"]) as string | string[] | undefined;

  const pick = (v: string) => {
    const m = v.match(/v?(\d+)/i);
    return m ? Number(m[1]) : undefined;
  };

  if (typeof raw === "string") return pick(raw);
  if (Array.isArray(raw) && typeof raw[0] === "string") return pick(raw[0]);
  return undefined;
}

export default async function notesRoutes(app: FastifyInstance) {
  // GET notes for a workspace (viewer+)
  app.get(
    "/workspaces/:id/notes",
    { preHandler: requireWorkspaceRole(Role.VIEWER) },
    async (req, reply) => {
      const { id: workspaceId } = req.params as { id: string };

      // use findFirst (no need for workspaceId to be @unique)
      let note = await app.prisma.note.findFirst({ where: { workspaceId } });
      if (!note) {
        note = await app.prisma.note.create({
          data: { workspaceId, content: "", version: 1 },
        });
      }

      reply.header("ETag", etagFor(note.version));
      return note;
    }
  );

  // PUT notes (editor+) with optimistic locking via If-Match or body.version
  app.put<{ Params: { id: string }; Body: z.infer<typeof SaveNotesDto> }>(
    "/workspaces/:id/notes",
    { preHandler: requireWorkspaceRole(Role.EDITOR) },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id: workspaceId } = req.params as { id: string };
      const body = SaveNotesDto.parse((req as any).body ?? {});

      // who is updating (populates req.user)
      await (req as any).jwtVerify();
      const user = (req as any).user as { id: string };

      // read current by workspace
      const current = await app.prisma.note.findFirst({ where: { workspaceId } });
      if (!current) {
        const created = await app.prisma.note.create({
          data: {
            workspaceId,
            content: body.content,
            version: 1,
            // if your schema has updatedById, keep this; otherwise remove the next line
            updatedById: user.id,
          } as any,
        });
        reply.header("ETag", etagFor(created.version));
        return created;
      }

      // Prefer header; fall back to body.version
      const headerVersion = getIfMatchVersion(req);
      const expectedVersion =
        headerVersion !== undefined ? headerVersion : body.version;

      if (
        expectedVersion !== undefined &&
        expectedVersion !== current.version
      ) {
        reply.code(409);
        reply.header("ETag", etagFor(current.version));
        return {
          message: "Version conflict",
          expected: expectedVersion,
          currentVersion: current.version,
          current,
        };
      }

      // update by primary key to avoid requiring a unique(workspaceId)
      const updated = await app.prisma.note.update({
        where: { id: current.id },
        data: {
          content: body.content,
          version: current.version + 1,
          // if your schema has updatedById, keep this; otherwise remove the next line
          updatedById: user.id,
        } as any,
      });

      reply.header("ETag", etagFor(updated.version));
      return updated;
    }
  );
}
