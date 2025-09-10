// src/routes/invites.ts
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import nodemailer from "nodemailer";

type AuthedReq = FastifyRequest & { user: { id: string } };

const zInvite = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional().default(""),
});

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  // Dev fallback: prints to console instead of sending
  return nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true,
  });
}

export default async function inviteRoutes(app: FastifyInstance) {
  const frontend = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  const fromEmail = process.env.FROM_EMAIL ?? "Cove <no-reply@example.com>";

  let transport: ReturnType<typeof buildTransport> | null = null;
  const tx = () => (transport ??= buildTransport());

  app.post("/invites/send", { preHandler: app.authenticate }, async (req, reply) => {
    const { workspaceId, email, name } = zInvite.parse((req as any).body);

    // Ensure workspace exists
    try {
      await app.prisma.workspace.findFirstOrThrow({ where: { id: workspaceId } });
    } catch {
      return reply.code(404).send({ message: "Workspace not found" });
    }

    // Short-lived token so the accept page can verify
    const token = (app.jwt as any).sign({ workspaceId, email }, { expiresIn: "7d" });

    const link =
      `${frontend}/invite?` +
      `workspace=${encodeURIComponent(workspaceId)}&` +
      `email=${encodeURIComponent(email)}&` +
      `token=${encodeURIComponent(token)}`;

    try {
      await tx().verify(); // throws if bad SMTP creds
      const info = await tx().sendMail({
        from: fromEmail,
        to: name ? `${name} <${email}>` : email,
        subject: "You're invited to a Cove",
        text:
          `You've been invited to a Cove.\n\n` +
          `Open: ${link}\n\n` +
          `If you didn't expect this, you can ignore the message.`,
        html:
          `<p>You've been invited to a Cove.</p>` +
          `<p><a href="${link}">Open invite</a></p>` +
          `<p>If you didn't expect this, you can ignore the message.</p>`,
      });

      // In dev stream transport, expose the output for debugging
      if ((info as any).message) app.log.info({ invitePreview: (info as any).message.toString() });
      return reply.send({ ok: true });
    } catch (e: any) {
      app.log.error(e);
      return reply.code(500).send({ message: e?.message || "Failed to send invite" });
    }
  });
}
