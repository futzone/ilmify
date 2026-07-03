"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pb/client";
import { getCurrentUser, type AuthUser } from "@/lib/pb/auth";

type AuthState = { user: AuthUser | null; isLoading: boolean };
const AuthContext = createContext<AuthState>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  // Tracks the previously authenticated user id so we can detect identity changes
  // (login, logout, or switching accounts) and avoid clearing the cache on
  // same-user token refreshes.
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initialUser = getCurrentUser();
    previousUserIdRef.current = initialUser?.id ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeding auth state from client-only PocketBase authStore; unavailable during SSR render
    setUser(initialUser);
    setIsLoading(false);
    const unsub = pb.authStore.onChange(() => {
      const nextUser = getCurrentUser();
      const nextUserId = nextUser?.id ?? null;
      if (nextUserId !== previousUserIdRef.current) {
        // The authenticated identity changed (login, logout, or account switch) —
        // clear all cached queries so the next user never sees stale data from
        // the previous session on a shared browser.
        queryClient.clear();
        previousUserIdRef.current = nextUserId;
      }
      setUser(nextUser);
    });
    return () => unsub();
  }, [queryClient]);

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
