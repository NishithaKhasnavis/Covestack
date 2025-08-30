// tiny client-side auth (localStorage-based; exchanged for a cookie on the server)
import { api, apiRaw } from "./api";

export type User = { id: string; name: string; email: string; passcode?: string };

const USER_KEY = "cove:user";

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}
export function setUser(u: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}
export function signOutLocal() {
  localStorage.removeItem(USER_KEY);
}

export function signIn(name: string, email: string, passcode: string) {
  // local profile stored on device (placeholder auth)
  const u: User = { id: crypto.randomUUID(), name, email, passcode };
  setUser(u);
  return u;
}

/**
 * Exchange local passcode for a server token cookie.
 * Server route expects { email, name?, code } and sets a cookie.
 */
export async function ensureSession() {
  const u = getUser();
  if (!u?.email || !u?.passcode) throw new Error("No local user / passcode");

  // This will set the cookie if not already set
  await api("/auth/passcode", {
    json: { email: u.email, name: u.name, code: u.passcode },
  });
}

/** Clear server cookie and local profile */
export async function signOutEverywhere() {
  try {
    await apiRaw("/auth/signout", { method: "POST" }); // no body, 204
  } catch {
    // ignore network errors on signout
  }
  signOutLocal();
}
