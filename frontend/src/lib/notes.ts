import { apiRaw } from "./api";

export type NotesDoc = {
  id: string;
  workspaceId: string;
  content: string;
  version: number;
  updatedAt: string;
  updatedById?: string | null;
};

export async function getNotes(workspaceId: string): Promise<{ etag: string; doc: NotesDoc }> {
  const res = await apiRaw(`/workspaces/${workspaceId}/notes`, { method: "GET" });
  const etag = res.headers.get("ETag") || "";
  const doc = (await res.json()) as NotesDoc;
  return { etag, doc };
}

export type SaveNotesOk = { ok: true; etag: string; doc: NotesDoc };
export type SaveNotesConflict = {
  ok: false;
  type: "conflict";
  etag: string;
  server: NotesDoc;
  expected: number;
  currentVersion: number;
};
export type SaveNotesResult = SaveNotesOk | SaveNotesConflict;

export async function saveNotes(
  workspaceId: string,
  content: string,
  etag: string
): Promise<SaveNotesResult> {
  const res = await apiRaw(`/workspaces/${workspaceId}/notes`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "If-Match": etag,
    },
    body: JSON.stringify({ content }),
  });

  if (res.status === 200) {
    const newEtag = res.headers.get("ETag") || "";
    const doc = (await res.json()) as NotesDoc;
    return { ok: true, etag: newEtag, doc };
  }

  if (res.status === 409) {
    const body = await res.json();
    // { message, expected, currentVersion, current }
    return {
      ok: false,
      type: "conflict",
      etag: res.headers.get("ETag") || "",
      server: body.current as NotesDoc,
      expected: body.expected,
      currentVersion: body.currentVersion,
    };
  }

  const text = await res.text().catch(() => "");
  throw new Error(`${res.status} ${res.statusText}: ${text || "saveNotes"}`);
}
