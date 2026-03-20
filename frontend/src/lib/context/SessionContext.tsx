"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/auth";
import { getMe, getWorkspaceProfile, switchWorkspace } from "@/lib/apiClient";
import type { WorkspaceSummary } from "@/lib/types";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  workspaceId: string | null;
};

type SessionContextValue = {
  ready: boolean;
  user: SessionUser | null;
  workspaces: WorkspaceSummary[];
  refresh: () => Promise<void>;
  switchWs: (workspaceId: string) => Promise<void>;
  logout: () => void;
};

/** Returned under SessionProvider after the loading gate — `user` is always set */
export type AuthenticatedSession = Omit<SessionContextValue, "user"> & { user: SessionUser };

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);

  const refresh = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setWorkspaces([]);
      setReady(true);
      return;
    }
    const res = await getMe();
    setUser({
      id: res.user?.id ?? "",
      email: res.user?.email ?? "",
      displayName: res.user?.displayName ?? null,
      role: res.user?.role ?? "user",
      workspaceId: res.user?.workspaceId ?? null
    });
    setWorkspaces(res.workspaces ?? []);
    setReady(true);
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    void refresh().catch(() => {
      clearAuthToken();
      router.replace("/login");
    });
  }, [refresh, router]);

  const switchWs = useCallback(
    async (workspaceId: string) => {
      const switched = await switchWorkspace(workspaceId);
      if (switched?.token) setAuthToken(switched.token);
      await refresh();
      void getWorkspaceProfile().catch(() => null);
    },
    [refresh]
  );

  const logout = useCallback(() => {
    clearAuthToken();
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ ready, user, workspaces, refresh, switchWs, logout }),
    [ready, user, workspaces, refresh, switchWs, logout]
  );

  if (!ready || !user) {
    return (
      <div className="dash-loading">
        <div className="dash-loading-inner">
          <span className="dash-spinner" />
          <p>Loading workspace…</p>
        </div>
      </div>
    );
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): AuthenticatedSession {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  if (!ctx.user) throw new Error("Session not loaded");
  return { ...ctx, user: ctx.user };
}
