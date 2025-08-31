import { api } from "./api";

export type Workspace = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;          // ISO
  deadline?: string | null;   // ISO or null
  ownerId: string;
};

export async function listWorkspaces(): Promise<Workspace[]> {
  return api<Workspace[]>("/workspaces");
}

export async function createWorkspace(p: { name: string; description?: string }): Promise<Workspace> {
  return api<Workspace>("/workspaces", {
    method: "POST",
    body: JSON.stringify(p),
  });
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  return api<Workspace>(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  await api(`/workspaces/${id}`, { method: "DELETE" });
}
