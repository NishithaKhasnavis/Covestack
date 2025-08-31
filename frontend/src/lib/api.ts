// Generic fetch helpers (JSON + cookie auth)

const viteBase =
  typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE;
const nextBase =
  typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_API_BASE;

export const API_BASE: string =
  (viteBase || nextBase || "http://localhost:3000") as string;

if (typeof window !== "undefined") {
  console.log("[API_BASE]", API_BASE);
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText} @ ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function apiRaw(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText} @ ${path}`);
  }
  return res;
}
