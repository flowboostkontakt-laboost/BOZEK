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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      setLoading(false);
      return;
    }
    apiGet<MeResponse>("/auth/me")
      .then((u) => setUser(shape(u)))
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (login: string, password: string) => {
    const res = await apiPost<{ accessToken: string; refreshToken: string; user: MeResponse }>(
      "/auth/login",
      { login, password },
    );
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    setUser(shape(res.user));
  };

  const logout = () => {
    apiPost("/auth/logout").catch(() => void 0);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
