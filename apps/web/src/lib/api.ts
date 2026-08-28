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

/**
 * Cicha odnowa sesji.
 *
 * Token dostepowy zyje 30 minut. Bez tego pracownica byla wyrzucana do
 * logowania w srodku dodawania produktu (uwaga klientki z 14.08.2026).
 * Przy 401 odnawiamy sesje refresh-tokenem i POWTARZAMY zadanie raz.
 * Rownolegle zadania czekaja na te sama odnowe (jedno `inFlight`), zeby nie
 * uniewaznic sobie nawzajem tokenow — backend rotuje refresh przy kazdym uzyciu.
 */
let odnawianie: Promise<boolean> | null = null;

async function odnowSesje(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;
  odnawianie ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      // Zwolnienie zamka dopiero po zapisaniu tokenow.
      setTimeout(() => (odnawianie = null), 0);
    }
  })();
  return odnawianie;
}

/** Sesja wygasla na dobre — czyscimy tokeny i wracamy do ekranu logowania. */
function wyloguj(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.dispatchEvent(new Event("sesja-wygasla"));
}

async function request<T>(path: string, init: RequestInit & { formData?: FormData } = {}): Promise<T> {
  const { formData, ...rest } = init;
  const wyslij = () =>
    fetch(BASE + path, {
      ...rest,
      headers: formData ? authHeaders() : { ...(rest.body ? { "Content-Type": "application/json" } : {}), ...authHeaders() },
      body: formData ?? rest.body,
    });

  let res = await wyslij();
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (await odnowSesje()) res = await wyslij();
    else wyloguj();
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  // 204 No Content (np. wylogowanie) nie ma ciala do sparsowania.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "POST", formData: form });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
}