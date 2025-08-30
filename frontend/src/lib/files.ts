// src/lib/files.ts
import { api } from "@/lib/api";

export type ServerFile = {
  id: string;
  workspaceId: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
  createdById: string;
};

type PresignedPost = {
  method: "POST";
  url: string;
  fields: Record<string, string>;
};

type PresignedPut = {
  method: "PUT";
  url: string;
};

export type InitUploadResponse = {
  file: ServerFile;
  upload: PresignedPost | PresignedPut;
};

export async function listFiles(workspaceId: string): Promise<ServerFile[]> {
  return api(`/workspaces/${workspaceId}/files`);
}

export async function initUpload(
  workspaceId: string,
  file: { name: string; mime: string; size: number }
): Promise<InitUploadResponse> {
  return api(`/workspaces/${workspaceId}/files`, {
    method: "POST",
    body: JSON.stringify(file),
  });
}

export async function deleteFile(fileId: string): Promise<void> {
  await api(`/files/${fileId}`, { method: "DELETE" });
}

/** Try a dedicated download endpoint first; fall back to file record fields */
export async function getDownloadUrl(fileId: string): Promise<string> {
  try {
    const r = await api<{ url: string }>(`/files/${fileId}/download`);
    return r.url;
  } catch {
    const r = await api<any>(`/files/${fileId}`);
    return r.url || r.downloadUrl || r.signedUrl || r.publicUrl || "";
  }
}
