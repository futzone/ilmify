"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { pb } from "@/lib/pb/client";
import { getCurrentUser, type AuthUser } from "@/lib/pb/auth";

type AuthState = { user: AuthUser | null; isLoading: boolean };
const AuthContext = createContext<AuthState>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setIsLoading(false);
    const unsub = pb.authStore.onChange(() => setUser(getCurrentUser()));
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
