import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireWorkspaceRole } from "../guards/workspace.js";

const CreateWorkspaceDto = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  deadline: z.string().datetime().optional(),
});
type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceDto>;

const UpdateWorkspaceDto = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  deadline: z.string().datetime().nullable().optional(), // allow null to clear
});

const AddMemberDto = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).default(Role.EDITOR),
});

export default async function workspaceRoutes(app: FastifyInstance) {
  // List only workspaces the user belongs to
  app.get(
    "/workspaces",
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        return reply.code(401).send({ message: "Invalid token" });
      }
      const user = req.user as { id: string };
      return app.prisma.workspace.findMany({
        where: { members: { some: { userId: user.id } } },
        orderBy: { createdAt: "desc" },
      });
    }
  );

  // Create workspace (requires auth)
  app.post<{ Body: CreateWorkspaceDto }>(
    "/workspaces",
    async (req, reply) => {
      try {
        await req.jwtVerify();
      } catch {
        return reply.code(401).send({ message: "Invalid token" });
      }
      const body = CreateWorkspaceDto.parse(req.body);
      const user = req.user as { id: string; email: string };

      const ws = await app.prisma.workspace.create({
        data: {
          name: body.name,
          description: body.description ?? null,
          deadline: body.deadline ? new Date(body.deadline) : null,
          ownerId: user.id,
          members: { create: [{ userId: user.id, role: "OWNER" }] },
          channels: { create: [{ name: "general" }] },
        },
      });

      reply.code(201);
      return ws;
    }
  );

  // Get workspace (viewer+)
  app.get(
    "/workspaces/:id",
    { preHandler: requireWorkspaceRole(Role.VIEWER) },
    async (req) => {
      const { id } = req.params as { id: string };
      return app.prisma.workspace.findUnique({
        where: { id },
        include: {
          members: { select: { userId: true, role: true, user: { select: { email: true, name: true } } } },
        },
      });
    }
  );

  // Update workspace (admin+)
  app.patch<{ Body: z.infer<typeof UpdateWorkspaceDto>; Params: { id: string } }>(
    "/workspaces/:id",
    { preHandler: requireWorkspaceRole(Role.ADMIN) },
    async (req) => {
      const { id } = req.params;
      const body = UpdateWorkspaceDto.parse(req.body);
      return app.prisma.workspace.update({
        where: { id },
        data: {
          name: body.name ?? undefined,
          description: body.description ?? undefined,
          deadline:
            body.deadline === null
              ? null
              : body.deadline
              ? new Date(body.deadline)
              : undefined,
        },
      });
    }
  );

  // Delete workspace (owner only)
  app.delete(
    "/workspaces/:id",
    { preHandler: requireWorkspaceRole(Role.OWNER) },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      await app.prisma.workspace.delete({ where: { id } });
      return reply.send({ ok: true });
    }
  );

  // Add member (admin+)
  app.post<{ Params: { id: string }; Body: z.infer<typeof AddMemberDto> }>(
    "/workspaces/:id/members",
    { preHandler: requireWorkspaceRole(Role.ADMIN) },
    async (req, reply) => {
      const { id: workspaceId } = req.params;
      const body = AddMemberDto.parse(req.body);

      // ensure user exists
      const user = await app.prisma.user.upsert({
        where: { email: body.email },
        update: {},
        create: { email: body.email, name: body.email.split("@")[0] },
      });

      // create membership
      try {
        const member = await app.prisma.member.create({
          data: { workspaceId, userId: user.id, role: body.role },
        });
        reply.code(201);
        return member;
      } catch (e: any) {
        // unique violation => already a member
        if (e?.code === "P2002") {
          reply.code(409);
          return { message: "User is already a member" };
        }
        throw e;
      }
    }
  );

  // Remove member (admin+, but only owners can remove another OWNER)
  app.delete<{ Params: { id: string; userId: string } }>(
    "/workspaces/:id/members/:userId",
    { preHandler: requireWorkspaceRole(Role.ADMIN) },
    async (req, reply) => {
      const { id: workspaceId, userId } = req.params;

      const target = await app.prisma.member.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        select: { role: true },
      });
      if (!target) {
        reply.code(404);
        return { message: "Member not found" };
      }

      // only owners can remove an OWNER
      if (target.role === "OWNER") {
        // check caller role
        try { await req.jwtVerify(); } catch { return reply.code(401).send({ message: "Invalid token" }); }
        const caller = req.user as { id: string };
        const callerMem = await app.prisma.member.findUnique({
          where: { workspaceId_userId: { workspaceId, userId: caller.id } },
          select: { role: true },
        });
        if (callerMem?.role !== "OWNER") {
          reply.code(403);
          return { message: "Only owner can remove another owner" };
        }
      }

      await app.prisma.member.delete({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      return { ok: true };
    }
  );
}
