// backend/src/routes/auth.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
// If TS complains about `fetch`, either add "DOM" to tsconfig libs
// or install undici and uncomment the next line:
// import { fetch } from "undici";

export default async function authRoutes(app: FastifyInstance) {
  // -----------------------------
  // Dev passcode sign-in (POST /auth/passcode)
  // -----------------------------
  app.post("/auth/passcode", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = ((req as any).body ?? {}) as Partial<{
      name: string;
      email: string;
      passcode: string;
    }>;

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const passcode = String(body.passcode ?? "");

    if (!name || !email || !passcode) {
      return reply.code(400).send({ message: "name, email, passcode are required" });
    }

    const expected = process.env.DEV_PASSCODE || "letmein-123";
    if (passcode !== expected) {
      return reply.code(401).send({ message: "Invalid passcode" });
    }

    const user = await app.prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });

    // Sign BOTH sub and id so req.user.id works across the app
    const session = await reply.jwtSign({
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
    });

    reply.setCookie("token", session, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
  });

  // -----------------------------
  // Who am I? (GET /auth/me)
  // -----------------------------
  app.get("/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await (req as any).jwtVerify(); // populates req.user as typed in jwt.d.ts
      const user = await app.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return reply.code(401).send({ message: "Unauthorized" });
      return { id: user.id, email: user.email, name: user.name };
    } catch {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });

  // -----------------------------
  // Sign out (POST /auth/signout)
  // -----------------------------
  app.post("/auth/signout", async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie("token", { path: "/" });
    return { ok: true };
  });

  // -----------------------------
  // Google OAuth callback (GET /auth/google/callback)
  // Flow is started by /auth/google/start from plugins/oauth.ts
  // -----------------------------
  app.get("/auth/google/callback", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const oauth = (app as any).googleOAuth2;
      if (!oauth) {
        return reply.code(500).send({ message: "Google OAuth plugin not registered" });
      }

      const tokenRes: any = await oauth.getAccessTokenFromAuthorizationCodeFlow(req as any);
      const access = tokenRes?.token?.access_token as string | undefined;
      if (!access) return reply.code(400).send({ message: "Google access token missing" });

      // Fetch minimal profile
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return reply.code(400).send({ message: "Failed to fetch Google profile", detail: text });
      }
      const profile: any = await res.json();

      const email = String(profile?.email || "");
      const name = String(profile?.name || profile?.given_name || email || "User");
      if (!email) return reply.code(400).send({ message: "Google profile missing email" });

      const user = await app.prisma.user.upsert({
        where: { email },
        update: { name },
        create: { email, name },
      });

      const session = await reply.jwtSign({
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
      });

      reply.setCookie("token", session, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });

      const FRONTEND =
        process.env.FRONTEND_ORIGIN ||
        process.env.PUBLIC_WEB_BASE ||
        "http://localhost:5173";

      return reply.redirect(`${FRONTEND}/dashboard`);
    } catch (err: any) {
      app.log.error({ err }, "google oauth callback failed");
      return reply.code(400).send({ message: "OAuth error", detail: String(err?.message || err) });
    }
  });
}
