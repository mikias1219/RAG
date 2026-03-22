"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { SessionProvider, useSession } from "@/lib/context/SessionContext";
import {
  IconAdmin,
  IconAgents,
  IconAudit,
  IconChat,
  IconCloud,
  IconDocs,
  IconSettings,
  IconWorkflow
} from "@/components/layout/NavIcons";

const nav: Array<{
  href: string;
  label: string;
  Icon: ComponentType;
  roles?: string[];
}> = [
  { href: "/chat", label: "AI Chat", Icon: IconChat },
  { href: "/documents", label: "Documents", Icon: IconDocs },
  { href: "/workflows", label: "Workflows", Icon: IconWorkflow },
  { href: "/agents", label: "AI Agents", Icon: IconAgents },
  { href: "/platform", label: "Platform", Icon: IconCloud },
  { href: "/settings", label: "Settings", Icon: IconSettings },
  { href: "/audit", label: "Audit log", Icon: IconAudit, roles: ["admin", "superadmin"] },
  { href: "/admin", label: "Admin", Icon: IconAdmin, roles: ["superadmin"] }
];

function DashboardChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, workspaces, switchWs, logout } = useSession();

  const visibleNav = nav.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });

  return (
    <div className="dash-root">
      <aside className="dash-sidebar">
        <div className="dash-sidebar-brand">
          <div className="dash-logo" aria-hidden />
          <div>
            <div className="dash-product">OKDE</div>
            <div className="dash-tagline">Knowledge &amp; decisions</div>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Main">
          {visibleNav.map((item) => {
            const active =
              pathname === item.href || (item.href.length > 1 && pathname.startsWith(`${item.href}/`));
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dash-nav-link ${active ? "is-active" : ""}`}
              >
                <span className="dash-nav-icon" aria-hidden>
                  <Icon />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dash-sidebar-footer">
          <label className="dash-label" htmlFor="ws-select">
            Workspace
          </label>
          <select
            id="ws-select"
            className="dash-select"
            value={user.workspaceId ?? ""}
            disabled={workspaces.length === 0}
            onChange={(e) => void switchWs(e.target.value)}
          >
            {workspaces.length === 0 ? (
              <option value="">No workspace</option>
            ) : (
              workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.displayName}
                </option>
              ))
            )}
          </select>
          <div className="dash-user">
            <span className="dash-user-email">{user.email}</span>
            <span className="dash-user-role">{user.role}</span>
          </div>
          <button type="button" className="dash-btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="dash-main">
        <header className="dash-topbar">
          <h1 className="dash-page-title">
            {visibleNav.find((n) => pathname === n.href || (n.href.length > 1 && pathname.startsWith(`${n.href}/`)))
              ?.label ?? "Dashboard"}
          </h1>
          <div className="dash-topbar-meta">
            <span className="dash-pill">Multi-tenant</span>
            <span className="dash-pill dash-pill-accent">Azure-ready</span>
          </div>
        </header>
        <div className="dash-scroll">{children}</div>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </SessionProvider>
  );
}
