// Generic fetch helpers (JSON + cookie auth)

const viteBase =
  typeof import.meta !== "undefined" &&
  (import.meta as any)?.env?.VITE_API_BASE;

const nextBase =
  typeof process !== "undefined" &&
  (process as any)?.env?.NEXT_PUBLIC_API_BASE;

export const API_BASE: string =
  (viteBase || nextBase || "http://localhost:3000") as string;

// Optional debug
if (typeof window !== "undefined") {
  console.log("[API_BASE]", API_BASE);
}

function defaultHeaders(init?: HeadersInit, hasBody?: boolean): HeadersInit {
  const h = new Headers(init || {});
  // only set Content-Type if we are actually sending a body
  if (hasBody && !h.has("Content-Type")) h.set("Content-Type", "application/json");
  return h;
}

export async function api<T>(
  path: string,
  opts: RequestInit & { json?: any } = {}
): Promise<T> {
  const { json, ...rest } = opts;
  const hasBody = json !== undefined || rest.body !== undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: defaultHeaders(rest.headers, hasBody),
    ...(json !== undefined ? { body: JSON.stringify(json), method: rest.method ?? "POST" } : {}),
    ...rest,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  // Some endpoints (signout) send 204
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export async function apiRaw(
  path: string,
  opts: RequestInit & { json?: any } = {}
) {
  const { json, ...rest } = opts;
  const hasBody = json !== undefined || rest.body !== undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: defaultHeaders(rest.headers, hasBody),
    ...(json !== undefined ? { body: JSON.stringify(json), method: rest.method ?? "POST" } : {}),
    ...rest,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  return res;
}
