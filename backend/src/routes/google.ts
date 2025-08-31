// backend/src/routes/google.ts
import fp from "fastify-plugin";
import fastifyOauth2 from "@fastify/oauth2";

export default fp(async function googleRoutes(app) {
  app.register(fastifyOauth2, {
    name: "googleOAuth2",
    scope: ["profile", "email"],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/auth/google/start",
    callbackUri: `${process.env.PUBLIC_API_BASE}/auth/google/callback`,
  } as any);

  app.get("/auth/google/callback", async (req, reply) => {
    const token = await (app as any).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);

    // Basic profile
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token.token.access_token}` },
    });
    const profile = (await res.json()) as any; // { email, name, picture, id, ... }

    // Upsert only fields that exist in your schema
    const user = await app.prisma.user.upsert({
      where: { email: profile.email },
      update: { name: profile.name ?? undefined },
      create: { email: profile.email, name: profile.name ?? null },
    });

    const jwt = await reply.jwtSign({ id: user.id, email: user.email });
    reply
      .setCookie("token", jwt, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 })
      .redirect(String(process.env.PUBLIC_WEB_BASE ?? "http://localhost:5173") + "/dashboard");
  });

  app.get("/auth/google/start", async (_req, reply) => {
    reply.redirect((app as any).googleOAuth2.generateAuthorizationUri());
  });
});
