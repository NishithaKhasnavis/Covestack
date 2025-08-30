// src/lib/auth.ts
import { api } from "./api";

export type User = { id: string; email: string; name?: string | null; passcode?: string };

const USER_KEY = "cove:user";

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}
export function setUser(u: User | null) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

export async function ensureSession(): Promise<User | null> {
  try {
    const me = await api<{ id: string; email: string; iat?: number; exp?: number }>("/me");
    const cached = getUser();
    const u: User = { id: me.id, email: me.email, name: cached?.name ?? null };
    setUser(u);
    return u;
  } catch {
    setUser(null);
    return null;
  }
}

export async function signIn(name: string, email: string, code: string) {
  const u = await api<User>("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ name, email, code }),
  });
  setUser({ id: u.id, email: u.email, name: u.name ?? name });
}

export async function signOut() {
  await api<{ ok: true }>("/auth/signout", { method: "POST" });
  setUser(null);
}

// legacy no-op (server validates the passcode)
export function updatePasscode(_newPasscode: string) {
  /* no-op */
}
