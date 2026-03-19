"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatShell } from "@/components/Chat/ChatShell";
import { DocumentsPanel } from "@/components/Documents/DocumentsPanel";
import { clearAuthToken, getAuthToken } from "@/lib/auth";
import { getMe } from "@/lib/apiClient";

export default function HomePage() {
  const router = useRouter();
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    void getMe()
      .then((res) => {
        setUserEmail(res.user?.email ?? "");
        setReady(true);
      })
      .catch(() => {
        clearAuthToken();
        router.replace("/login");
      });
  }, [router]);

  if (!ready) {
    return <div className="panel panel-compact">Checking session...</div>;
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="panel panel-compact">
          <h2 className="panel-title">Navigation</h2>
          <ul className="nav-list">
            <li className="nav-item active">Chat Workspace</li>
            <li className="nav-item">Documents</li>
            <li className="nav-item">Collections</li>
            <li className="nav-item">Settings</li>
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

      <section className="panel chat-panel">
        <ChatShell onSourcesChange={(ids) => setSelectedSourceIds(ids)} />
      </section>

      <section className="panel docs-panel">
        <DocumentsPanel highlightedDocumentIds={selectedSourceIds} />
      </section>
    </div>
  );
}

