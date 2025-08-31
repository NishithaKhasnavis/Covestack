// src/lib/auth.ts
import { API_BASE } from "./api";

export type User = { id: string; email: string; name?: string; avatarUrl?: string };
const LS_USER = "covestack:user";

export function getUser(): User | null {
  const raw = localStorage.getItem(LS_USER);
  return raw ? (JSON.parse(raw) as User) : null;
}
function setUser(u: User | null) {
  if (!u) localStorage.removeItem(LS_USER);
  else localStorage.setItem(LS_USER, JSON.stringify(u));
}

export async function ensureSession(): Promise<User | null> {
  const res = await fetch(`${API_BASE}/me`, { credentials: "include" });
  if (!res.ok) { setUser(null); return null; }
  const u = (await res.json()) as User;
  setUser(u);
  return u;
}

export async function signInPasscode(name: string, email: string, passcode: string) {
  const res = await fetch(`${API_BASE}/auth/passcode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, email, passcode }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  await ensureSession();
}

export async function signOut() {
  await fetch(`${API_BASE}/auth/signout`, { method: "POST", credentials: "include" });
  setUser(null);
}
