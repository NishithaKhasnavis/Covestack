import { api } from "./api";

export type Workspace = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
};

export async function listWorkspaces(): Promise<Workspace[]> {
  return api<Workspace[]>("/workspaces", { method: "GET" });
}

export async function createWorkspace(p: { name: string; description?: string }) {
  return api<Workspace>("/workspaces", { json: p });
}

export async function renameWorkspace(id: string, name: string) {
  return api<Workspace>(`/workspaces/${id}`, {
    method: "PATCH",
    json: { name },
  });
}

export async function deleteWorkspace(id: string) {
  return api<void>(`/workspaces/${id}`, { method: "DELETE" });
}
