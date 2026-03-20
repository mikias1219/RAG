"use client";

import { useState } from "react";
import { ChatShell } from "@/components/Chat/ChatShell";
import { DocumentsPanel } from "@/components/Documents/DocumentsPanel";

export default function ChatPage() {
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  return (
    <div className="dash-page-grid">
      <section className="panel chat-panel dash-panel-tall">
        <ChatShell
          onSourcesChange={(ids) => setSelectedSourceIds(ids)}
          selectedDocumentIds={selectedDocumentIds}
          onSelectionChange={setSelectedDocumentIds}
        />
      </section>
      <section className="panel docs-panel dash-panel-tall">
        <DocumentsPanel
          highlightedDocumentIds={selectedSourceIds}
          selectedDocumentIds={selectedDocumentIds}
          onSelectionChange={setSelectedDocumentIds}
        />
      </section>
    </div>
  );
}
