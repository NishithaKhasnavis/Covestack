import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const SignInDto = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  code: z.string().min(1),
});

// Simple guard used in this file only (workspaces will verify inline)
async function authRequired(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();      // fastify-jwt reads the "token" cookie
    (req as any).user = req.user;
  } catch {
    return reply.code(401).send({ message: "Invalid token" });
  }
}

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/signin", async (req, reply) => {
    const body = SignInDto.parse(req.body);

    if (!process.env.ACCESS_CODE || body.code !== process.env.ACCESS_CODE) {
      return reply.code(401).send({ message: "Invalid access code" });
    }

    const user = await app.prisma.user.upsert({
      where: { email: body.email },
      update: { name: body.name ?? undefined },
      create: { email: body.email, name: body.name ?? body.email.split("@")[0] },
    });

    const token = await reply.jwtSign(
      { id: user.id, email: user.email },
      { expiresIn: "7d" }
    );

    reply.setCookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false, // true in prod over HTTPS
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.send({ id: user.id, email: user.email, name: user.name });
  });

  app.post("/auth/signout", async (_req, reply) => {
    reply.clearCookie("token", { path: "/" });
    return reply.send({ ok: true });
  });

  app.get("/me", { preHandler: authRequired }, async (req) => {
    return (req as any).user; // { id, email, iat, exp }
  });
}
