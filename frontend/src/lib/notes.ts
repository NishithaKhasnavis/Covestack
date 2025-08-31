import { apiRaw } from "./api";

export type NotesDoc = {
  id: string;
  workspaceId: string;
  content: string;
  version: number;
  updatedById: string;
  updatedAt: string;
};

export async function getNotes(workspaceId: string) {
  const res = await apiRaw(`/workspaces/${workspaceId}/notes`);
  const etag = res.headers.get("ETag") || "";
  const doc = (await res.json()) as NotesDoc;
  return { etag, doc };
}

export type SaveNotesResult =
  | { ok: true; etag: string; doc: NotesDoc }
  | {
      ok: false;
      type: "conflict";
      currentVersion: number;
      expected: number;
      server: NotesDoc;
      etag: string;
    };

export async function saveNotes(workspaceId: string, content: string, etag: string): Promise<SaveNotesResult> {
  const res = await apiRaw(`/workspaces/${workspaceId}/notes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": etag },
    body: JSON.stringify({ content }),
  });

  if (res.status === 409) {
    const data = await res.json();
    return {
      ok: false,
      type: "conflict",
      currentVersion: data.currentVersion,
      expected: data.expected,
      server: data.current,
      etag: res.headers.get("ETag") || "",
    };
  }

  const out = (await res.json()) as NotesDoc;
  return { ok: true, etag: res.headers.get("ETag") || "", doc: out };
}
