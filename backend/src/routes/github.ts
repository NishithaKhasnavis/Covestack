// src/routes/github.ts
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

/* ---------------- Zod schemas ---------------- */

const zTokenBody = z.object({ token: z.string().min(10) });

const zOwnerRepo = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

const zPullBody = zOwnerRepo.extend({
  branch: z.string().min(1),
});

const zPushFile = z.object({
  path: z.string().min(1),         // e.g. "src/index.ts"
  content: z.string().default(""), // UTF-8 text
});

const PushBody = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
  files: z.array(zPushFile),
  delete: z.array(z.string()).optional().default([]),
  commitMessage: z.string().min(1).max(1000).optional().default("Sync from Cove"),
});

type AuthedReq = FastifyRequest & { user: { id: string } };

/* ---------------- helpers ---------------- */

type HeaderMap = Record<string, string>;
function ghHeaders(token: string): HeaderMap {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Covestack/1.0",
  };
}

async function getToken(app: FastifyInstance, userId: string): Promise<string> {
  const key = `gh:token:${userId}`;
  const token = await app.redis.get(key);
  if (!token) throw Object.assign(new Error("GitHub token not set"), { statusCode: 400 });
  return token;
}

// fetch JSON with good errors (and auto JSON Content-Type when body is present)
async function gh<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...ghHeaders(token),
    ...(init?.headers as Record<string, string> | undefined ?? {}),
  };
  if ((init as any)?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...(init ?? {}), headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`GitHub ${res.status} ${res.statusText}: ${text}`), { statusCode: res.status });
  }
  return (await res.json()) as T;
}

// safe path for GitHub content API (encode each segment, not the slashes)
const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

/* ---------------- route module ---------------- */

export default async function githubRoutes(app: FastifyInstance) {
  const base = "https://api.github.com";

  // Save / update GitHub token (per user)
  app.post("/integrations/github/token", { preHandler: app.authenticate }, async (req, reply) => {
    const { token } = zTokenBody.parse((req as any).body);
    const userId = (req as AuthedReq).user.id;
    await app.redis.set(`gh:token:${userId}`, token);
    return reply.send({ ok: true });
  });

  // Who am I?
  app.get("/github/me", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req as AuthedReq).user.id;
    const token = await getToken(app, userId);
    const me = await gh<{ login: string; name?: string; avatar_url?: string }>(`${base}/user`, token);
    return reply.send(me);
  });

  // List repos (first ~300 via simple pagination)
  app.get("/github/repos", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req as AuthedReq).user.id;
    const token = await getToken(app, userId);

    const perPage = 100;
    let page = 1;
    const all: any[] = [];
    while (page <= 3) {
      const items = await gh<any[]>(
        `${base}/user/repos?per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member&visibility=all`,
        token
      );
      all.push(...items);
      if (items.length < perPage) break;
      page++;
    }

    const mapped = all.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner: r.owner?.login,
      default_branch: r.default_branch,
      private: !!r.private,
    }));

    return reply.send(mapped);
  });

  // List branches for a repo
  app.get("/github/branches", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req as AuthedReq).user.id;
    const token = await getToken(app, userId);

    const { owner, repo } = zOwnerRepo.parse((req as any).query);

    const branches = await gh<Array<{ name: string; protected: boolean }>>(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`,
      token
    );

    return reply.send(branches.map((b) => ({ name: b.name, protected: !!b.protected })));
  });

  // Pull: read repo contents (text files) for a branch
  app.post("/github/pull", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req as AuthedReq).user.id;
    const token = await getToken(app, userId);
    const { owner, repo, branch } = zPullBody.parse((req as any).body);

    // Get branch ref -> commit -> tree
    const ref = await gh<{ object: { sha: string } }>(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
      token
    );
    const commitSha = ref.object.sha;

    const commit = await gh<{ tree: { sha: string } }>(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${commitSha}`,
      token
    );
    const tree = await gh<{ tree: Array<{ path: string; type: string }> }>(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${commit.tree.sha}?recursive=1`,
      token
    );

    // Fetch file contents (text only; skip big/binary-ish via extension)
    const results: Array<{ path: string; content: string }> = [];
    for (const entry of tree.tree) {
      if (entry.type !== "blob") continue;
      if (/\.(png|jpe?g|gif|svg|pdf|zip|gz|tar|woff2?|ttf|ico|mp4|mp3)$/i.test(entry.path)) continue;

      const file = await gh<{ content?: string; encoding?: string; type: string }>(
        `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(entry.path)}?ref=${encodeURIComponent(branch)}`,
        token
      );
      if (file.type !== "file" || !file.content) continue;

      const buf = Buffer.from(file.content, "base64");
      const text = buf.toString("utf8");
      results.push({ path: entry.path, content: text });

      if (results.length >= 500) break; // safety cap
    }

    return reply.send({ branch, files: results });
  });

  // Push: write files to a branch as a single commit
  app.post("/github/push", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req as AuthedReq).user.id;
    const token = await getToken(app, userId);
    const body = PushBody.parse((req as any).body);
    const { owner, repo, branch, files, delete: deletions, commitMessage } = body;

    // 1) current ref
    const ref = await gh<{ object: { sha: string } }>(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
      token
    );
    const parentCommitSha = ref.object.sha;

    // 2) parent commit -> base tree
    const parent = await gh<{ tree: { sha: string } }>(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${parentCommitSha}`,
      token
    );
    const baseTreeSha = parent.tree.sha;

    // 3) create blobs for provided files
    const blobShas: Array<{ path: string; sha: string }> = [];
    for (const f of files) {
      const blob = await gh<{ sha: string }>(
        `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
        token,
        { method: "POST", body: JSON.stringify({ content: f.content, encoding: "utf-8" }) }
      );
      blobShas.push({ path: f.path, sha: blob.sha });
    }

    // 4) create tree (updates + deletions)
    const treeItems =
      [
        ...blobShas.map((b) => ({ path: b.path, mode: "100644", type: "blob" as const, sha: b.sha })),
        ...deletions.map((p) => ({ path: p, mode: "100644", type: "blob" as const, sha: null as any })), // null sha => delete
      ];

    const tree = await gh<{ sha: string }>(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
      token,
      { method: "POST", body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }) }
    );

    // 5) create commit
    const commit = await gh<{ sha: string }>(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
      token,
      { method: "POST", body: JSON.stringify({ message: commitMessage, tree: tree.sha, parents: [parentCommitSha] }) }
    );

    // 6) update ref
    await gh(
      `${base}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branch)}`,
      token,
      { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: true }) }
    );

    // Match client expectation: { ok: true, commit }
    return reply.send({ ok: true, commit: commit.sha });
  });
}
