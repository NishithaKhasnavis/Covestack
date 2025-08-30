// src/lib/api.ts
// Generic fetch helpers (JSON + cookie auth)

// Safe detection for both Vite and Next without touching undefined globals
const viteBase =
  typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE;
const nextBase =
  typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_API_BASE;

export const API_BASE: string = (viteBase || nextBase || "http://localhost:3000") as string;

// (optional) one-time log
if (typeof window !== "undefined") {
  console.log("[API_BASE]", API_BASE);
}

function buildHeaders(opts: RequestInit) {
  // Use the browser Headers object to avoid TS issues with HeadersInit
  const headers = new Headers(opts.headers ?? {});
  const hasBody = opts.body !== undefined && opts.body !== null;

  // Don’t set JSON content-type if:
  //  - there is no body
  //  - or the body is FormData (browser sets the boundary)
  const isForm =
    typeof FormData !== "undefined" && hasBody && opts.body instanceof FormData;

  if (hasBody && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...opts,
    headers: buildHeaders(opts),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  return res.json() as Promise<T>;
}

// When you need headers (e.g., ETag) or non-JSON
export async function apiRaw(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...opts,
    headers: buildHeaders(opts),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  return res;
}
