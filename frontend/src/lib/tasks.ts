// src/lib/tasks.ts
import { api } from "./api";

export type Task = {
  id: string;
  workspaceId: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  due?: string | null;         // ISO 8601 or null
  createdAt?: string;
  updatedAt?: string;
};

type CreateTaskBody = {
  title: string;
  status?: Task["status"];
  due?: string | null;         // "YYYY-MM-DD" or ISO or null
};

type UpdateTaskBody = Partial<Pick<Task, "title" | "status" | "due">>;

/** Convert "YYYY-MM-DD" -> ISO (UTC midnight). If blank/undefined, returns undefined. */
const toIsoOrUndefined = (d?: string | null) => {
  if (!d) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) {
    const [, y, mo, day] = m;
    return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(day))).toISOString();
  }
  // already looks like an ISO datetime → pass through
  return d;
};

export async function listTasks(workspaceId: string): Promise<Task[]> {
  return api<Task[]>(`/workspaces/${workspaceId}/tasks`);
}

export async function createTask(
  workspaceId: string,
  body: CreateTaskBody
): Promise<Task> {
  const dueIso = toIsoOrUndefined(body.due ?? undefined);

  const payload = {
    title: body.title,
    status: body.status ?? "todo",
    ...(dueIso ? { due: dueIso } : {}), // omit if no date chosen
  };

  return api<Task>(`/workspaces/${workspaceId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(id: string, patch: UpdateTaskBody): Promise<Task> {
  const payload: any = { ...patch };

  if (Object.prototype.hasOwnProperty.call(patch, "due")) {
    // if the caller explicitly provided due:
    // - "" (clear) → null
    // - "YYYY-MM-DD" → ISO
    // - ISO → keep
    if (patch.due === "" || patch.due === null) {
      payload.due = null;
    } else {
      const iso = toIsoOrUndefined(patch.due ?? undefined);
      payload.due = iso ?? null;
    }
  }

  return api<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await api<void>(`/tasks/${id}`, { method: "DELETE" });
}
