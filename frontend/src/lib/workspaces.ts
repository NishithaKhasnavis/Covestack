import { api } from "./api";

export type Workspace = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
};

export function listWorkspaces() {
  return api<Workspace[]>("/workspaces");
}

export function createWorkspace(input: { name: string; description?: string }) {
  return api<Workspace>("/workspaces", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getWorkspace(id: string) {
  return api<Workspace & { members: any[] }>(`/workspaces/${id}`);
}

export function renameWorkspace(id: string, name: string) {
  return api<Workspace>(`/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteWorkspace(id: string) {
  return api<{ ok: true }>(`/workspaces/${id}`, { method: "DELETE" });
}
