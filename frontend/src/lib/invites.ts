// src/lib/invites.ts
import { API_BASE } from "@/lib/api";

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function sendInvite(workspaceId: string, email: string, name = ""): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/invites/send`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, email, name }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status} ${res.statusText}`));
  return res.json();
}
