// src/lib/code.ts
import { API_BASE } from "@/lib/api";

export type GitFile = { path: string; content: string };

export async function loadCode(workspaceId: string): Promise<{ files: GitFile[]; updatedAt: string | null }> {
  const res = await fetch(`${API_BASE}/code/${encodeURIComponent(workspaceId)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status} ${res.statusText}`));
  return res.json();
}

export async function saveCode(workspaceId: string, files: GitFile[]): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/code/${encodeURIComponent(workspaceId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status} ${res.statusText}`));
  return res.json();
}
