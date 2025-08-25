import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireWorkspaceRole } from "../guards/workspace.js";

const StatusEnum = z.enum(["todo", "in_progress", "done"]);

const CreateTaskDto = z.object({
  title: z.string().min(1),
  status: StatusEnum.optional().default("todo"),
  due: z.string().datetime().optional(),
});
type CreateTaskDto = z.infer<typeof CreateTaskDto>;

const UpdateTaskDto = z.object({
  title: z.string().min(1).optional(),
  status: StatusEnum.optional(),
  due: z.string().datetime().nullable().optional(), // allow null to clear
});
type UpdateTaskDto = z.infer<typeof UpdateTaskDto>;

// helper: ensure caller is a member with required role for a given workspace
const rank: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

async function verifyRoleForWorkspace(
  req: FastifyRequest,
  reply: FastifyReply,
  workspaceId: string,
  required: Role
) {
  try {
    await req.jwtVerify();
  } catch {
    await reply.code(401).send({ message: "Invalid token" });
    return false;
  }
  const user = req.user as { id: string } | undefined;
  if (!user?.id) {
    await reply.code(401).send({ message: "Unauthenticated" });
    return false;
  }
  const member = await req.server.prisma.member.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    select: { role: true },
  });
  if (!member) {
    await reply.code(403).send({ message: "Not a member of this workspace" });
    return false;
  }
  if (rank[member.role] < rank[required]) {
    await reply.code(403).send({ message: "Insufficient role" });
    return false;
  }
  return true;
}

export default async function tasksRoutes(app: FastifyInstance) {
  // List tasks for a workspace (viewer+)
  app.get("/workspaces/:id/tasks", { preHandler: requireWorkspaceRole(Role.VIEWER) }, async (req) => {
    const { id: workspaceId } = req.params as { id: string };
    return app.prisma.task.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { createdBy: { select: { id: true, email: true } } },
    });
  });

  // Create task (editor+)
  app.post<{ Params: { id: string }; Body: CreateTaskDto }>(
    "/workspaces/:id/tasks",
    { preHandler: requireWorkspaceRole(Role.EDITOR) },
    async (req, reply) => {
      const { id: workspaceId } = req.params;
      const body = CreateTaskDto.parse(req.body);
      const user = req.user as { id: string };

      const task = await app.prisma.task.create({
        data: {
          workspaceId,
          title: body.title,
          status: body.status ?? "todo",
          due: body.due ? new Date(body.due) : null,
          createdById: user.id,
        },
      });
      reply.code(201);
      return task;
    }
  );

  // Update task (editor+)
  app.patch<{ Params: { id: string }; Body: UpdateTaskDto }>(
    "/tasks/:id",
    async (req, reply) => {
      const { id } = req.params;
      const body = UpdateTaskDto.parse(req.body);

      // find task to learn its workspace (and 404 if missing)
      const task = await app.prisma.task.findUnique({ where: { id }, select: { workspaceId: true } });
      if (!task) {
        reply.code(404);
        return { message: "Task not found" };
      }
      // verify role for that workspace
      const ok = await verifyRoleForWorkspace(req, reply, task.workspaceId, Role.EDITOR);
      if (!ok) return;

      const updated = await app.prisma.task.update({
        where: { id },
        data: {
          title: body.title ?? undefined,
          status: body.status ?? undefined,
          due: body.due === null ? null : body.due ? new Date(body.due) : undefined,
        },
      });
      return updated;
    }
  );

  // Delete task (admin+)
  app.delete("/tasks/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const task = await app.prisma.task.findUnique({ where: { id }, select: { workspaceId: true } });
    if (!task) {
      reply.code(404);
      return { message: "Task not found" };
    }
    const ok = await verifyRoleForWorkspace(req, reply, task.workspaceId, Role.ADMIN);
    if (!ok) return;

    await app.prisma.task.delete({ where: { id } });
    return { ok: true };
  });
}
