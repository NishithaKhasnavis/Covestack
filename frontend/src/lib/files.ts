import { api } from "./api";

export type FileItem = {
  id: string;
  name: string;
  mime: string | null;
  size: number;
  createdAt: string;
  createdBy?: { name?: string | null; email: string };
};

type PresignedPost = {
  method: "POST";
  url: string;
  fields: Record<string, string>;
};

export async function listFiles(workspaceId: string) {
  return api<FileItem[]>(`/workspaces/${workspaceId}/files`);
}

export async function requestUpload(workspaceId: string, file: File) {
  return api<{ file: FileItem; upload: PresignedPost }>(`/workspaces/${workspaceId}/files`, {
    method: "POST",
    body: JSON.stringify({ name: file.name, mime: file.type, size: file.size }),
  });
}

export async function uploadToS3(p: PresignedPost, file: File) {
  const fd = new FormData();
  Object.entries(p.fields).forEach(([k, v]) => fd.append(k, v));
  fd.append("Content-Type", file.type || "application/octet-stream");
  fd.append("file", file);
  const res = await fetch(p.url, { method: "POST", body: fd });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`S3 upload failed: ${t || res.statusText}`);
  }
}
