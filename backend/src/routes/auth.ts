import type { FastifyInstance } from "fastify";

export default async function authRoutes(app: FastifyInstance) {
  // ... your existing passcode /me /signout etc.

  // GOOGLE callback
  app.get("/auth/google/callback", async (req, reply) => {
    const token = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    const access = token.token.access_token as string;

    // get profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access}` },
    });
    const profile = await profileRes.json();

    const email = profile.email as string;
    const name = (profile.name || profile.given_name || email) as string;

    const user = await app.prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });

    const jwt = await reply.jwtSign({ sub: user.id, email: user.email, name: user.name });
    reply.setCookie("token", jwt, { path: "/", httpOnly: true, sameSite: "lax" });

    const FRONTEND = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    return reply.redirect(`${FRONTEND}/dashboard`);
  });

  // GITHUB callback
  app.get("/auth/github/callback", async (req, reply) => {
    const token = await app.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    const access = token.token.access_token as string;

    const uRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access}`, "User-Agent": "covestack" },
    });
    const u = await uRes.json();

    // email might be null on /user, fetch list as fallback
    let email: string | null = u.email || null;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${access}`, "User-Agent": "covestack" },
      });
      const emails = await emailsRes.json();
      const primary = emails.find((e: any) => e.primary && e.verified) || emails[0];
      email = primary?.email || null;
    }
    if (!email) {
      return reply.status(400).send({ error: "No email returned from GitHub" });
    }

    const name: string = u.name || u.login || email;

    const user = await app.prisma.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });

    const jwt = await reply.jwtSign({ sub: user.id, email: user.email, name: user.name });
    reply.setCookie("token", jwt, { path: "/", httpOnly: true, sameSite: "lax" });

    const FRONTEND = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    return reply.redirect(`${FRONTEND}/dashboard`);
  });
}
