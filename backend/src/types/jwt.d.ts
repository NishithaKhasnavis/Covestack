// backend/src/types/jwt.d.ts
import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    // what you sign/verify
    payload: { sub: string; id: string; email: string; name?: string };
    // what shows up on req.user after jwtVerify()
    user: { sub: string; id: string; email: string; name?: string };
  }
}
