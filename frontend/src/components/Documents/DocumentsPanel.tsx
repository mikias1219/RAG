import { useEffect, useState } from "react";
import type { DocumentSummary } from "@/lib/types";
import { listDocuments } from "@/lib/apiClient";
import { UploadDropzone } from "./UploadDropzone";

type Props = {
  highlightedDocumentIds?: string[];
};

export function DocumentsPanel({ highlightedDocumentIds = [] }: Props) {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await listDocuments();
      setDocs(result.items);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="docs-shell">
      <div className="docs-header">
        <div>
          <h2 className="panel-title">Documents</h2>
          <p className="panel-subtitle">Storage, collections, and indexed knowledge sources</p>
        </div>
        {loading && <span className="pending-badge">Refreshing...</span>}
      </div>

      <div className="docs-content">
        <UploadDropzone onUploaded={refresh} />

        {error && <p className="error-text">{error}</p>}

        <div className="metric-grid">
          <div className="metric-card">
            <p className="metric-label">Total Documents</p>
            <p className="metric-value">{docs.length}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Stored Size</p>
            <p className="metric-value">
              {formatBytes(docs.reduce((total, item) => total + item.sizeBytes, 0))}
            </p>
          </div>
        </div>

        <div className="collection-box">
          <h3 className="collection-title">Collections</h3>
          <div className="collection-list">
            {groupByType(docs).map((group) => (
              <div key={group.label} className="collection-item">
                <span>{group.label}</span>
                <strong>{group.count}</strong>
              </div>
            ))}
            {docs.length === 0 && <p className="muted-text">Collections appear after uploads.</p>}
          </div>
        </div>

        <div className="documents-list">
          {docs.length === 0 && !loading && (
            <p className="muted-text">No documents uploaded yet.</p>
          )}
          {docs.map((d) => {
            const highlighted = highlightedDocumentIds.includes(d.id);
            return (
              <div
                key={d.id}
                className={`document-item ${highlighted ? "highlighted" : ""}`}
              >
                <div className="document-meta">
                  <span className="document-name">{d.filename}</span>
                  <span className="document-subline">
                    {formatBytes(d.sizeBytes)} • {new Date(d.createdAt).toLocaleString()}
                  </span>
                </div>
                <a
                  href={d.blobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="document-link"
                >
                  Open
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

function groupByType(docs: DocumentSummary[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const doc of docs) {
    const key = doc.contentType || "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

