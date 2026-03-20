"use client";

import { useState } from "react";
import { DocumentsPanel } from "@/components/Documents/DocumentsPanel";
import { AZURE_RESOURCE_USAGE } from "@/lib/platformInfo";

export default function DocumentsPage() {
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  return (
    <div className="dash-page-grid">
      <section className="panel chat-panel dash-panel-tall">
        <DocumentsPanel
          highlightedDocumentIds={[]}
          selectedDocumentIds={selectedDocumentIds}
          onSelectionChange={setSelectedDocumentIds}
        />
      </section>
      <aside className="panel panel-compact dash-side-card">
        <h2 className="panel-title">Ingestion &amp; search</h2>
        <p className="panel-subtitle">Uploads queue for chunking, embedding, and Azure AI Search indexing.</p>
        <p className="muted-text" style={{ marginTop: 12 }}>
          Use the jobs list in the panel to track status. Failed jobs can be retried when storage is still
          available.
        </p>
        <h3 className="dash-section-title">Azure services</h3>
        <div className="resource-list">
          {AZURE_RESOURCE_USAGE.slice(0, 4).map((item) => (
            <div key={item.service} className="resource-item">
              <p className="resource-service">{item.service}</p>
              <p className="resource-usage">{item.usage}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
