import { api } from "./api";

export type Task = {
  id: string;
  workspaceId: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  due: string | null;
  createdAt: string;
  createdById: string;
};

export function listTasks(workspaceId: string) {
  return api<Task[]>(`/workspaces/${workspaceId}/tasks`);
}

export function createTask(
  workspaceId: string,
  input: { title: string; status?: Task["status"]; due?: string }
) {
  return api<Task>(`/workspaces/${workspaceId}/tasks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTask(
  taskId: string,
  patch: Partial<Pick<Task, "title" | "status" | "due">>
) {
  return api<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteTask(taskId: string) {
  return api<{ ok: true }>(`/tasks/${taskId}`, { method: "DELETE" });
}
