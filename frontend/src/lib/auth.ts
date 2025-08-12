// tiny client-side auth (localStorage-based, placeholder only)
export type User = { id: string; name: string; email: string; passcode?: string };
export type Workspace = { id: string; name: string; createdAt: string };

const USER_KEY = "cove:user";
const WS_KEY = "cove:workspaces";

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function setUser(u: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

export function signIn(name: string, email: string, passcode: string) {
  const existing = getUser();
  if (existing && existing.passcode) {
    // placeholder check: compare raw passcode (NOT secure)
    if (passcode !== existing.passcode) {
      throw new Error("Incorrect passcode.");
    }
    // update basic profile fields if you changed them
    setUser({ ...existing, name, email });
    return;
  }
  // first-time setup (stores passcode on device)
  const u: User = { id: crypto.randomUUID(), name, email, passcode };
  setUser(u);

  // seed demo workspaces if none exist
  if (!localStorage.getItem(WS_KEY)) {
    const seed: Workspace[] = [
      { id: Math.random().toString(36).slice(2, 8), name: "Design Sprint", createdAt: new Date().toISOString() },
      { id: Math.random().toString(36).slice(2, 8), name: "Hackathon Team", createdAt: new Date().toISOString() },
    ];
    localStorage.setItem(WS_KEY, JSON.stringify(seed));
  }
}

export function updatePasscode(newPasscode: string) {
  const u = getUser();
  if (!u) return;
  setUser({ ...u, passcode: newPasscode });
}

export function signOut() {
  localStorage.removeItem(USER_KEY);
}

export function listWorkspaces(): Workspace[] {
  const raw = localStorage.getItem(WS_KEY);
  return raw ? (JSON.parse(raw) as Workspace[]) : [];
}

export function createWorkspace(name: string): Workspace {
  const ws: Workspace = { id: Math.random().toString(36).slice(2, 8), name, createdAt: new Date().toISOString() };
  const all = [ws, ...listWorkspaces()];
  localStorage.setItem(WS_KEY, JSON.stringify(all));
  return ws;
}

export function renameWorkspace(id: string, name: string) {
  const all = listWorkspaces().map((w) => (w.id === id ? { ...w, name } : w));
  localStorage.setItem(WS_KEY, JSON.stringify(all));
}

export function deleteWorkspace(id: string) {
  const all = listWorkspaces().filter((w) => w.id !== id);
  localStorage.setItem(WS_KEY, JSON.stringify(all));
}
