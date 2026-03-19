"use client";

import { useState } from "react";
import { ChatShell } from "@/components/Chat/ChatShell";
import { DocumentsPanel } from "@/components/Documents/DocumentsPanel";

export default function HomePage() {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

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

