import fp from "fastify-plugin";
import fastifyOauth2, { OAuth2Namespace } from "@fastify/oauth2";

declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
    githubOAuth2: OAuth2Namespace;
  }
}

export default fp(async (app) => {
  const APP_BASE_URL =
    process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

  // --- Google ---
  await app.register(fastifyOauth2, {
    name: "googleOAuth2",
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION,
    },
    scope: ["openid", "email", "profile"],
    startRedirectPath: "/auth/google/start",
    callbackUri: `${APP_BASE_URL}/auth/google/callback`,
  });

  // --- GitHub ---
  await app.register(fastifyOauth2, {
    name: "githubOAuth2",
    credentials: {
      client: {
        id: process.env.GITHUB_CLIENT_ID!,
        secret: process.env.GITHUB_CLIENT_SECRET!,
      },
      auth: fastifyOauth2.GITHUB_CONFIGURATION,
    },
    scope: ["read:user", "user:email"],
    startRedirectPath: "/auth/github/start",
    callbackUri: `${APP_BASE_URL}/auth/github/callback`,
  });
});
