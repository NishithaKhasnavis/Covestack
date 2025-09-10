import { API_BASE } from "@/lib/api";

async function j<T>(res: Response) {
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status} ${res.statusText}`));
  return (await res.json()) as T;
}

export const sendInvite = (workspaceId: string, email: string, name?: string) =>
  fetch(`${API_BASE}/invites`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, email, name }),
  }).then(j<{ ok: true; id: string }>);
