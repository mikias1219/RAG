"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listAuditLogs, type AuditLogRow } from "@/lib/apiClient";
import { useSession } from "@/lib/context/SessionContext";

export default function AuditPage() {
  const router = useRouter();
  const { user } = useSession();
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!["admin", "superadmin"].includes(user.role)) {
      router.replace("/chat");
      return;
    }
    void listAuditLogs(200)
      .then((res) => setItems(res.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load audit log"));
  }, [user.role, router]);

  if (!["admin", "superadmin"].includes(user.role)) {
    return null;
  }

  return (
    <div className="dash-single">
      <div className="dash-hero">
        <h2 className="dash-hero-title">Audit log</h2>
        <p className="dash-hero-text">Immutable-style activity trail for your tenant (admin visibility).</p>
      </div>
      {error ? (
        <div className="dash-alert dash-alert-error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="dash-card">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Resource</th>
                <th>User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="muted-text">{new Date(row.createdAt).toLocaleString()}</td>
                  <td>
                    <code>{row.action}</code>
                  </td>
                  <td>
                    {row.resourceType}
                    {row.resourceId ? (
                      <div className="muted-text" style={{ fontSize: 11 }}>
                        {row.resourceId}
                      </div>
                    ) : null}
                  </td>
                  <td className="muted-text">{row.userId ?? "—"}</td>
                  <td>
                    <pre className="dash-json-inline">{JSON.stringify(row.metadata ?? {}, null, 0)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && !error ? <p className="muted-text">No audit entries yet.</p> : null}
      </div>
    </div>
  );
}
