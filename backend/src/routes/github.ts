// backend/src/routes/github.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Octokit } from "octokit";

// where we stash user tokens in Redis
const tokenKey = (userId: string) => `github:token:${userId}`;

async function getUserToken(app: FastifyInstance, userId: string): Promise<string | null> {
  try {
    const v = await app.redis.get(tokenKey(userId));
    return v ?? null;
  } catch {
    return null;
  }
}

export default async function githubRoutes(app: FastifyInstance) {
  // --- store/update token for current user ---
  app.post("/integrations/github/token", { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req as any).body as { token?: string };
    const token = (body?.token || "").trim();
    if (!token) return reply.code(400).send({ message: "token is required" });

    const user = (req as any).user as { id: string };
    await app.redis.set(tokenKey(user.id), token);
    return { ok: true };
  });

  // --- delete token ---
  app.delete("/integrations/github/token", { preHandler: app.authenticate }, async (req: FastifyRequest) => {
    const user = (req as any).user as { id: string };
    await app.redis.del(tokenKey(user.id));
    return { ok: true };
  });

  // --- check connection & get the GitHub user ---
  app.get("/github/me", { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user as { id: string };
    const token = await getUserToken(app, user.id);
    if (!token) return reply.code(400).send({ message: "No GitHub token set" });

    const gh = new Octokit({ auth: token });
    const me = await gh.rest.users.getAuthenticated();
    return {
      login: me.data.login,
      id: me.data.id,
      name: me.data.name,
      avatar_url: me.data.avatar_url,
    };
  });

  // --- list repos for the authed user (owner+collaborator, private+public) ---
  app.get("/github/repos", { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user as { id: string };
    const token = await getUserToken(app, user.id);
    if (!token) return reply.code(400).send({ message: "No GitHub token set" });

    const gh = new Octokit({ auth: token });
    const per_page = Number((req.query as any).per_page ?? 100);
    const page = Number((req.query as any).page ?? 1);

    const res = await gh.rest.repos.listForAuthenticatedUser({
      per_page,
      page,
      visibility: "all",
      affiliation: "owner,collaborator,organization_member",
      sort: "updated",
      direction: "desc",
    });

    return res.data.map(r => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      default_branch: r.default_branch,
      owner: r.owner?.login,
    }));
  });

  // --- list branches of a repo ---
  app.get("/github/branches", { preHandler: app.authenticate }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { owner, repo } = (req.query as any) as { owner?: string; repo?: string };
    if (!owner || !repo) return reply.code(400).send({ message: "owner and repo are required" });

    const user = (req as any).user as { id: string };
    const token = await getUserToken(app, user.id);
    if (!token) return reply.code(400).send({ message: "No GitHub token set" });

    const gh = new Octokit({ auth: token });
    const res = await gh.rest.repos.listBranches({ owner, repo, per_page: 100 });
    return res.data.map(b => ({ name: b.name, protected: !!b.protected }));
  });

  
}
