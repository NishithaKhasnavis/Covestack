// backend/src/routes/github.ts
import fp from "fastify-plugin";
import { Octokit } from "octokit";

export default fp(async (app) => {
  app.post("/github/push", { preHandler: app.authenticate }, async (req: any, reply) => {
    const { owner, repo, branch = "main", path, content, message } = req.body || {};
    if (!owner || !repo || !path || !content) {
      return reply.code(400).send({ message: "owner, repo, path, content are required" });
    }

    const token = process.env.GITHUB_TOKEN; // TEMP: single token for dev
    if (!token) return reply.code(400).send({ message: "GITHUB_TOKEN not configured" });

    const octo = new Octokit({ auth: token });

    // If the file exists, we need its SHA
    let sha: string | undefined;
    try {
      const { data } = await octo.rest.repos.getContent({ owner, repo, path, ref: branch });
      if (!Array.isArray(data)) sha = (data as any).sha;
    } catch {
      // 404 is fine -> creating new file
    }

    const res = await octo.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      branch,
      message: message || `Update ${path} from CoveStack`,
      content: Buffer.from(content, "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
    });

    return { ok: true, commitSha: res.data.commit.sha };
  });
});
