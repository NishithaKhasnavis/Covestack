// src/lib/notes.ts
import { API_BASE } from "@/lib/api";

export type NotesDoc = {
  id: string;
  workspaceId: string;
  content: string;
  version: number;
  updatedAt: string;
  updatedById: string | null;
};

type SaveOk = { ok: true; etag: string; doc: NotesDoc };
type SaveConflict = {
  ok: false;
  type: "conflict";
  etag: string;
  server: NotesDoc;
  expected: number;
  currentVersion: number;
};
export type SaveNotesResult = SaveOk | SaveConflict;

export async function getNotes(workspaceId: string): Promise<{ etag: string; doc: NotesDoc }> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/notes`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return { etag: res.headers.get("etag") || "", doc: await res.json() as NotesDoc };
}

export async function saveNotes(workspaceId: string, content: string, etag: string): Promise<SaveNotesResult> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/notes`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", "If-Match": etag },
    body: JSON.stringify({ content }),
  });

  if (res.status === 200) {
    return { ok: true, etag: res.headers.get("etag") || "", doc: await res.json() as NotesDoc };
  }
  if (res.status === 409) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      type: "conflict",
      etag: res.headers.get("etag") || "",
      server: data.current,
      expected: data.expected,
      currentVersion: data.currentVersion,
    };
  }
  throw new Error(`${res.status} ${res.statusText}`);
}
