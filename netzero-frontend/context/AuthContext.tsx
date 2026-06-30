"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

type LoginPayload =
  | string
  | {
      access?: string;
      token?: string;
      refresh?: string;
    };

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  // Accept either a raw token string or an auth response object.
  login: (token: LoginPayload) => void;
  logout: () => void;
  userEmail?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const userEmail = useMemo(() => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1])) as Record<string, string>;
      return payload.email || payload.username || null;
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (token) return;

    const timer = setTimeout(() => {
      const savedToken = localStorage.getItem("netzero_token");
      if (savedToken) {
        setToken(savedToken);
        return;
      }

      // If no access token but a refresh token exists, try to refresh on mount
      const savedRefresh = localStorage.getItem("netzero_refresh");
      if (!savedRefresh) return;

      const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const baseUrl = rawBase.replace(/\/+$|\/api$/i, "");
      fetch(`${baseUrl}/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: savedRefresh }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          const access = data?.access || data?.token || null;
          const refresh = data?.refresh || null;
          if (access) {
            localStorage.setItem("netzero_token", access);
            if (refresh) localStorage.setItem("netzero_refresh", refresh);
            setToken(access);
          }
        })
        .catch(() => {
          try { localStorage.removeItem("netzero_refresh"); } catch {}
        });
    }, 0);
    return () => clearTimeout(timer);
  }, [token]);

  const login = (newToken: LoginPayload) => {
    // Handle passed token shapes: string, { access, refresh }, or { token }
    const tokenToStore = typeof newToken === "string" ? newToken : newToken?.access || newToken?.token || null;
    const refreshToStore = typeof newToken === "object" ? newToken?.refresh || null : null;

    if (!tokenToStore) {
      console.error("No access token found in login payload.");
      return;
    }

    localStorage.setItem("netzero_token", tokenToStore);
    if (refreshToStore) localStorage.setItem("netzero_refresh", refreshToStore);
    setToken(tokenToStore);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("netzero_token");
    localStorage.removeItem("netzero_refresh");
    setToken(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, userEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be executed within an AuthProvider layout wrapper.");
  }
  return context;
}