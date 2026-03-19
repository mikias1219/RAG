"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatShell } from "@/components/Chat/ChatShell";
import { DocumentsPanel } from "@/components/Documents/DocumentsPanel";
import { clearAuthToken, getAuthToken } from "@/lib/auth";
import { getMe, listUsers, updateMe, updateUserRole, updateUserStatus } from "@/lib/apiClient";

type AppSection = "chat" | "documents" | "collections" | "profile" | "admin";

type UserRow = {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
  status: string;
  createdAt: string;
};

export default function HomePage() {
  const router = useRouter();
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("user");
  const [section, setSection] = useState<AppSection>("chat");
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    void getMe()
      .then((res) => {
        setUserEmail(res.user?.email ?? "");
        setUserName(res.user?.displayName ?? "");
        setProfileNameDraft(res.user?.displayName ?? "");
        setUserRole(res.user?.role ?? "user");
        setReady(true);
      })
      .catch(() => {
        clearAuthToken();
        router.replace("/login");
      });
  }, [router]);

  async function refreshUsers() {
    if (userRole !== "admin") return;
    setAdminLoading(true);
    try {
      const res = await listUsers();
      setAdminUsers(res.items ?? []);
    } finally {
      setAdminLoading(false);
    }
  }

  useEffect(() => {
    if (section === "admin") void refreshUsers();
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return <div className="panel panel-compact">Checking session...</div>;
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="panel panel-compact">
          <h2 className="panel-title">Navigation</h2>
          <ul className="nav-list">
            <li className={`nav-item ${section === "chat" ? "active" : ""}`} onClick={() => setSection("chat")}>
              Chat Workspace
            </li>
            <li
              className={`nav-item ${section === "documents" ? "active" : ""}`}
              onClick={() => setSection("documents")}
            >
              Documents
            </li>
            <li
              className={`nav-item ${section === "collections" ? "active" : ""}`}
              onClick={() => setSection("collections")}
            >
              Collections
            </li>
            <li
              className={`nav-item ${section === "profile" ? "active" : ""}`}
              onClick={() => setSection("profile")}
            >
              Profile
            </li>
            {userRole === "superadmin" && (
              <li className={`nav-item ${section === "admin" ? "active" : ""}`} onClick={() => setSection("admin")}>
                Admin
              </li>
            )}
          </ul>
        </div>
        <div className="panel panel-compact">
          <h2 className="panel-title">Platform</h2>
          <p className="muted-text" style={{ marginTop: 8 }}>{userEmail}</p>
          <div className="metric-grid">
            <div className="metric-card">
              <p className="metric-label">Mode</p>
              <p className="metric-value">Production</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Backend</p>
              <p className="metric-value">Live</p>
            </div>
          </div>
          <button
            className="composer-send"
            style={{ marginTop: 12, width: "100%" }}
            onClick={() => {
              clearAuthToken();
              router.replace("/login");
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {section === "chat" && (
        <>
          <section className="panel chat-panel">
            <ChatShell
              onSourcesChange={(ids) => setSelectedSourceIds(ids)}
              selectedDocumentIds={selectedDocumentIds}
            />
          </section>
          <section className="panel docs-panel">
            <DocumentsPanel
              highlightedDocumentIds={selectedSourceIds}
              selectedDocumentIds={selectedDocumentIds}
              onSelectionChange={setSelectedDocumentIds}
            />
          </section>
        </>
      )}

      {section === "documents" && (
        <>
          <section className="panel chat-panel">
            <DocumentsPanel
              highlightedDocumentIds={selectedSourceIds}
              selectedDocumentIds={selectedDocumentIds}
              onSelectionChange={setSelectedDocumentIds}
            />
          </section>
          <section className="panel docs-panel">
            <div className="panel panel-compact" style={{ minHeight: "100%" }}>
              <h2 className="panel-title">Document storage</h2>
              <p className="panel-subtitle">All uploaded files are stored in Azure Blob Storage (standard tier).</p>
            </div>
          </section>
        </>
      )}

      {section === "collections" && (
        <>
          <section className="panel chat-panel">
            <div className="panel panel-compact" style={{ minHeight: "100%" }}>
              <h2 className="panel-title">Collections</h2>
              <p className="panel-subtitle">
                Collections are organized by document type and available through the Documents panel.
              </p>
              <p className="muted-text" style={{ marginTop: 10 }}>
                Next step: custom folders, labels, and team-level sharing policies.
              </p>
            </div>
          </section>
          <section className="panel docs-panel">
            <DocumentsPanel
              highlightedDocumentIds={selectedSourceIds}
              selectedDocumentIds={selectedDocumentIds}
              onSelectionChange={setSelectedDocumentIds}
            />
          </section>
        </>
      )}

      {section === "profile" && (
        <>
          <section className="panel chat-panel">
            <div className="panel panel-compact" style={{ minHeight: "100%" }}>
              <h2 className="panel-title">Profile</h2>
              <p className="panel-subtitle">Manage your account details and access level.</p>
              <div className="metric-grid" style={{ marginTop: 16 }}>
                <div className="metric-card">
                  <p className="metric-label">Display Name</p>
                  <p className="metric-value">{userName || "-"}</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Email</p>
                  <p className="metric-value">{userEmail}</p>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Role</p>
                  <p className="metric-value">{userRole}</p>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <p className="metric-label">Edit display name</p>
                <input
                  className="composer-input"
                  value={profileNameDraft}
                  onChange={(e) => setProfileNameDraft(e.target.value)}
                  placeholder="Your display name"
                  style={{ marginTop: 8 }}
                />
                <button
                  className="composer-send"
                  style={{ marginTop: 10 }}
                  disabled={profileSaving || profileNameDraft.trim().length === 0}
                  onClick={async () => {
                    setProfileSaving(true);
                    setProfileError(null);
                    setProfileSuccess(null);
                    try {
                      const res = await updateMe({ displayName: profileNameDraft.trim() });
                      const updatedName = res.user?.displayName ?? "";
                      setUserName(updatedName);
                      setProfileNameDraft(updatedName);
                      setProfileSuccess("Profile updated");
                    } catch (e: any) {
                      setProfileError(e?.message ?? "Failed to update profile");
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                >
                  {profileSaving ? "Saving..." : "Save profile"}
                </button>
                {profileError && <p className="error-text" style={{ marginTop: 8 }}>{profileError}</p>}
                {profileSuccess && <p className="info-text" style={{ marginTop: 8 }}>{profileSuccess}</p>}
              </div>
            </div>
          </section>
          <section className="panel docs-panel">
            <div className="panel panel-compact" style={{ minHeight: "100%" }}>
              <h2 className="panel-title">Security</h2>
              <p className="panel-subtitle">Session token auth with optional Google sign-in.</p>
            </div>
          </section>
        </>
      )}

      {section === "admin" && (
        <>
          <section className="panel chat-panel">
            <div className="panel panel-compact" style={{ minHeight: "100%" }}>
              <h2 className="panel-title">User approvals</h2>
              <p className="panel-subtitle">Superadmin controls account approval and admin roles.</p>
              <button className="composer-send" style={{ marginTop: 12 }} onClick={() => void refreshUsers()}>
                {adminLoading ? "Refreshing..." : "Refresh"}
              </button>
              <div className="documents-list" style={{ marginTop: 14 }}>
                {adminUsers.map((u) => (
                  <div key={u.id} className="document-item">
                    <div className="document-meta">
                      <span className="document-name">{u.email}</span>
                      <span className="document-subline">
                        {(u.displayName || "No name")} • {u.role} • {u.status}
                      </span>
                    </div>
                    {u.role !== "superadmin" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="composer-send"
                          onClick={async () => {
                            await updateUserStatus(u.id, "approved");
                            await refreshUsers();
                          }}
                        >
                          Approve
                        </button>
                        <button
                          className="composer-send"
                          onClick={async () => {
                            await updateUserStatus(u.id, "rejected");
                            await refreshUsers();
                          }}
                        >
                          Reject
                        </button>
                        <button
                          className="composer-send"
                          onClick={async () => {
                            await updateUserRole(u.id, u.role === "admin" ? "user" : "admin");
                            await refreshUsers();
                          }}
                        >
                          {u.role === "admin" ? "Make user" : "Make admin"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="panel docs-panel">
            <div className="panel panel-compact" style={{ minHeight: "100%" }}>
              <h2 className="panel-title">Admin tools</h2>
              <p className="panel-subtitle">Account governance and access workflow.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

