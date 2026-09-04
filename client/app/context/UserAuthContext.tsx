"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender?: string | null;
  age?: number | null;
  bio?: string | null;
};

type UserAuthContextType = {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    gender?: string;
    age?: number;
    bio?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
};

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mounted = { current: true };
    const controller = new AbortController();

    async function loadSavedUser() {
      if (typeof window !== "undefined") {
        const savedToken = localStorage.getItem("user_token");
        if (savedToken) {
          if (mounted.current) setToken(savedToken);
          try {
            const res = await fetch(`${API_BASE}/api/user/me`, {
              headers: { Authorization: `Bearer ${savedToken}` },
              signal: controller.signal,
            });
            if (!mounted.current) return;
            if (res.ok) {
              const data = await res.json();
              if (mounted.current) setUser(data.user);
            } else {
              localStorage.removeItem("user_token");
              if (mounted.current) setToken(null);
            }
          } catch (err) {
            if ((err as any).name === "AbortError") return;
          }
        }
      }
      if (mounted.current) setLoading(false);
    }
    loadSavedUser();

    return () => {
      mounted.current = false;
      controller.abort();
    };
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await fetch(`${API_BASE}/api/user/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("user_token", data.token);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to connect to server" };
    }
  }

  async function register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    gender?: string;
    age?: number;
    bio?: string;
  }) {
    try {
      const res = await fetch(`${API_BASE}/api/user/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || "Registration failed" };
      }
      setToken(resData.token);
      setUser(resData.user);
      localStorage.setItem("user_token", resData.token);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to connect to server" };
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_token");
    }
  }

  async function updateProfile(data: Partial<UserProfile>) {
    if (!token) return { success: false, error: "Not logged in" };
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || "Update failed" };
      }
      setUser(resData.user);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Failed to connect to server" };
    }
  }

  return (
    <UserAuthContext.Provider
      value={{ user, token, loading, login, register, logout, updateProfile }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error("useUserAuth must be used within a UserAuthProvider");
  }
  return context;
}
