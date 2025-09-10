// src/lib/github.ts
// Small, self-contained client for your backend GitHub routes

import { API_BASE } from "@/lib/api";

export type GHRepo   = { id: number; name: string; full_name: string; private: boolean; default_branch: string };
export type GHBranch = { name: string; protected: boolean };
export type GitFile  = { path: string; content: string };
export type GHMe     = { login: string; name?: string; avatar_url?: string };

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => `${res.status} ${res.statusText}`);
    throw new Error(text);
  }
  return (await res.json()) as T;
}

export const ghMe = (): Promise<GHMe> =>
  fetch(`${API_BASE}/github/me`, { credentials: "include" }).then((r) => j<GHMe>(r));

export const ghRepos = (): Promise<GHRepo[]> =>
  fetch(`${API_BASE}/github/repos?per_page=100`, { credentials: "include" }).then((r) => j<GHRepo[]>(r));

export const ghBranches = (owner: string, repo: string): Promise<GHBranch[]> =>
  fetch(
    `${API_BASE}/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    { credentials: "include" }
  ).then((r) => j<GHBranch[]>(r));

export const saveGithubToken = (token: string): Promise<{ ok: true }> =>
  fetch(`${API_BASE}/integrations/github/token`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).then((r) => j<{ ok: true }>(r));

export const pullRepo = (
  owner: string,
  repo: string,
  branch: string
): Promise<{ branch: string; files: GitFile[] }> =>
  fetch(`${API_BASE}/github/pull`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, repo, branch }),
  }).then((r) => j<{ branch: string; files: GitFile[] }>(r));

export const pushRepo = (
  owner: string,
  repo: string,
  branch: string,
  files: GitFile[],
  deletions: string[] = [],
  commitMessage = "Sync from Cove"
): Promise<{ ok: true; commit: string }> =>
  fetch(`${API_BASE}/github/push`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, repo, branch, files, delete: deletions, commitMessage }),
  }).then((r) => j<{ ok: true; commit: string }>(r));
