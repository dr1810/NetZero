"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  // Accept either a raw token string or an auth response object.
  login: (token: any) => void;
  logout: () => void;
  userEmail?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Mount-time verification of local storage for persistence
    const savedToken = localStorage.getItem("netzero_token");
    if (savedToken) {
      setToken(savedToken);
      try {
        const payload = JSON.parse(atob(savedToken.split(".")[1]));
        setUserEmail(payload.email || payload.username || null);
      } catch (e) {}
      return;
    }

    // If no access token but a refresh token exists, try to refresh on mount
    const savedRefresh = localStorage.getItem("netzero_refresh");
    if (savedRefresh) {
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
            try {
              const payload = JSON.parse(atob(access.split(".")[1]));
              setUserEmail(payload.email || payload.username || null);
            } catch (e) {}
          }
        })
        .catch(() => {
          try { localStorage.removeItem("netzero_refresh"); } catch (e) {}
        });
    }
  }, []);

  const login = (newToken: any) => {
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
    try {
      const payload = JSON.parse(atob(tokenToStore.split(".")[1]));
      setUserEmail(payload.email || payload.username || null);
    } catch (e) {
      setUserEmail(null);
    }
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("netzero_token");
    localStorage.removeItem("netzero_refresh");
    setToken(null);
    setUserEmail(null);
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