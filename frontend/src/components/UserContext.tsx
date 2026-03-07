"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type SystemRole = "admin" | "manager" | "member";

export interface AppUser {
  id: string;
  name: string;
  role: string;
  system_role: SystemRole;
  department: string;
  email: string;
  avatar_color: string;
}

interface UserContextValue {
  currentUser: AppUser | null;
  login: (userId: string, pin: string) => Promise<{ error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  login: async () => ({}),
  logout: () => {},
  isAdmin: false,
  isManager: false,
});

const STORAGE_KEY = "pikaui_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}
  }, []);

  const login = async (userId: string, pin: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pin }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      setCurrentUser(data.user);
      return {};
    } catch {
      return { error: "Network error" };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
  };

  const isAdmin   = currentUser?.system_role === "admin";
  const isManager = currentUser?.system_role === "admin" || currentUser?.system_role === "manager";

  return (
    <UserContext.Provider value={{ currentUser, login, logout, isAdmin, isManager }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
