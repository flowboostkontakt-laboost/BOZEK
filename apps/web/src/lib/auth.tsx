import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiGet, apiPost } from "./api";

export interface AuthUser {
  id: string;
  login: string;
  role: "ADMIN" | "WORKER";
  employee?: { id: string; name: string } | null;
  name: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

interface MeResponse {
  id: string;
  login: string;
  role: "ADMIN" | "WORKER";
  employee?: { id: string; name: string } | null;
}

function shape(u: MeResponse): AuthUser {
  return { ...u, name: u.employee?.name ?? u.login };
}

/**
 * Profil trzymany lokalnie, zeby otwarcie apki nie zalezalo od pierwszego
 * strzalu do API. Darmowy Render budzi sie ~1 min po bezczynnosci i przez
 * ten czas /auth/me potrafi zwrocic 5xx — wczesniej apka kasowala wtedy
 * tokeny i wyrzucala pracownice do logowania (uwaga klientki: „bardzo
 * szybko wylogowuje"). Definitywne wygasniecie sesji (401 + odrzucona
 * odnowa) obsluguje warstwa API zdarzeniem `sesja-wygasla`.
 */
function cachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("cachedUser");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function zapamietaj(u: AuthUser): void {
  localStorage.setItem("cachedUser", JSON.stringify(u));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const maToken = !!localStorage.getItem("accessToken");
  const [user, setUser] = useState<AuthUser | null>(() => (maToken ? cachedUser() : null));
  const [loading, setLoading] = useState(maToken && !user);

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) return;
    // Odswiezenie profilu w tle; blad sieci nie zmienia stanu zalogowania.
    apiGet<MeResponse>("/auth/me")
      .then((u) => {
        const su = shape(u);
        zapamietaj(su);
        setUser(su);
      })
      .catch(() => void 0)
      .finally(() => setLoading(false));
  }, []);

  // Gdy odnowa sesji ostatecznie sie nie powiedzie, warstwa API czysci tokeny
  // i wysyla to zdarzenie — wtedy wracamy do ekranu logowania.
  useEffect(() => {
    const onWygasla = () => setUser(null);
    window.addEventListener("sesja-wygasla", onWygasla);
    return () => window.removeEventListener("sesja-wygasla", onWygasla);
  }, []);

  const login = async (login: string, password: string) => {
    const res = await apiPost<{ accessToken: string; refreshToken: string; user: MeResponse }>(
      "/auth/login",
      { login, password },
    );
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    const su = shape(res.user);
    zapamietaj(su);
    setUser(su);
  };

  const logout = () => {
    apiPost("/auth/logout").catch(() => void 0);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("cachedUser");
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
