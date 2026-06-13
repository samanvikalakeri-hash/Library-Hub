import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AuthRole = "librarian" | "student";

export interface AuthUser {
  id: string;
  role: AuthRole;
  name: string;
  studentRecordId: number | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export interface LoginPayload {
  role: "librarian" | "student";
  username?: string;
  password?: string;
  studentId?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setUser(data ?? null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (payload: LoginPayload) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Login failed");
    }
    const data = await res.json();
    setUser(data);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
