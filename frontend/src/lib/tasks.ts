import { api } from "./api";

export type TaskStatus = "todo" | "in_progress" | "done";
export type Task = {
  id: string;
  workspaceId: string;
  title: string;
  status: TaskStatus;
  due?: string | null; // ISO date (YYYY-MM-DD) or null
  createdAt: string;
  updatedAt: string;
};

export async function listTasks(workspaceId: string): Promise<Task[]> {
  return api<Task[]>(`/workspaces/${workspaceId}/tasks`, { method: "GET" });
}

export async function createTask(
  workspaceId: string,
  p: { title: string; status?: TaskStatus; due?: string }
) {
  return api<Task>(`/workspaces/${workspaceId}/tasks`, { json: p });
}

export async function updateTask(id: string, patch: Partial<Task>) {
  return api<Task>(`/tasks/${id}`, { method: "PATCH", json: patch });
}

export async function deleteTask(id: string) {
  return api<void>(`/tasks/${id}`, { method: "DELETE" });
}
