import { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "@prisma/client";

const rank: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

function getWsId(params: any): string | undefined {
  return params?.id ?? params?.workspaceId;
}

export function requireWorkspaceRole(required: Role) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    // verify JWT (reads cookie)
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ message: "Invalid token" });
    }

    const wsId = getWsId(req.params as any);
    const user = req.user as { id: string; email: string } | undefined;
    if (!wsId || !user?.id) {
      return reply.code(400).send({ message: "Missing workspace id or user" });
    }

    const member = await req.server.prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId: wsId, userId: user.id } },
      select: { role: true },
    });

    if (!member) {
      return reply.code(403).send({ message: "Not a member of this workspace" });
    }
    if (rank[member.role] < rank[required]) {
      return reply.code(403).send({ message: "Insufficient role" });
    }
  };
}
