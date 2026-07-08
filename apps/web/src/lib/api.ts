import { useEffect, useState } from "react";

// W produkcji front i backend sa na osobnych domenach. VITE_API_URL moze byc
// pelnym URL-em albo sama nazwa hosta (Render podaje host) - normalizujemy.
// W dev (brak zmiennej) uzywamy proxy Vite: /api -> localhost:3000.
const raw = import.meta.env.VITE_API_URL;
const origin = raw ? (raw.startsWith("http") ? raw : `https://${raw}`) : "";
const BASE = origin ? `${origin.replace(/\/$/, "")}/api` : "/api";

export function getToken(): string | null {
  return localStorage.getItem("accessToken");
}

/** Pobiera dane z API, a gdy backend niedostepny - zwraca fallback (fixture). */
export function useApiData<T>(path: string, fallback: T): [T, (v: T) => void] {
  const [data, setData] = useState<T>(fallback);
  useEffect(() => {
    let alive = true;
    apiGet<T>(path)
      .then((d) => alive && setData(d))
      .catch(() => void 0);
    return () => {
      alive = false;
    };
  }, [path]);
  return [data, setData];
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: authHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(BASE + path, { method: "POST", headers: authHeaders(), body: form });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}