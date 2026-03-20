"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listUsers, updateUserRole, updateUserStatus } from "@/lib/apiClient";
import { useSession } from "@/lib/context/SessionContext";

type UserRow = {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { user } = useSession();
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function refreshUsers() {
    setLoading(true);
    try {
      const res = await listUsers();
      setAdminUsers(res.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user.role !== "superadmin") {
      router.replace("/chat");
      return;
    }
    void refreshUsers();
  }, [user.role, router]);

  if (user.role !== "superadmin") {
    return null;
  }

  return (
    <div className="dash-single">
      <div className="dash-hero">
        <h2 className="dash-hero-title">Administration</h2>
        <p className="dash-hero-text">Approve users and assign admin roles for your tenant.</p>
      </div>
      <div className="dash-card">
        <div className="dash-card-head">
          <h3 className="dash-card-title">Users</h3>
          <button type="button" className="dash-btn-ghost" onClick={() => void refreshUsers()}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>
        <div className="dash-user-admin-list">
          {adminUsers.map((u) => (
            <div key={u.id} className="dash-user-row">
              <div>
                <div className="dash-user-row-email">{u.email}</div>
                <div className="muted-text">
                  {(u.displayName || "No name") + " · " + u.role + " · " + u.status}
                </div>
              </div>
              {u.role !== "superadmin" ? (
                <div className="dash-user-actions">
                  <button
                    type="button"
                    className="dash-btn-sm"
                    onClick={async () => {
                      await updateUserStatus(u.id, "approved");
                      await refreshUsers();
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="dash-btn-sm"
                    onClick={async () => {
                      await updateUserStatus(u.id, "rejected");
                      await refreshUsers();
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="dash-btn-sm"
                    onClick={async () => {
                      await updateUserRole(u.id, u.role === "admin" ? "user" : "admin");
                      await refreshUsers();
                    }}
                  >
                    {u.role === "admin" ? "Make user" : "Make admin"}
                  </button>
                </div>
              ) : (
                <span className="dash-badge">Superadmin</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
