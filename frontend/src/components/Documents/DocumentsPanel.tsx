"use client";

import { useEffect, useState } from "react";
import type { DocumentSummary, IngestionJob } from "@/lib/types";
import {
  deleteDocument,
  listDocuments,
  listIngestionJobs,
  renameDocument,
  retryIngestionJob
} from "@/lib/apiClient";
import { UploadDropzone } from "./UploadDropzone";

type Props = {
  highlightedDocumentIds?: string[];
  selectedDocumentIds?: string[];
  onSelectionChange?: (documentIds: string[]) => void;
};

export function DocumentsPanel({
  highlightedDocumentIds = [],
  selectedDocumentIds = [],
  onSelectionChange
}: Props) {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [savingDocId, setSavingDocId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await listDocuments();
      setDocs(result.items);
      const jobsResult = await listIngestionJobs();
      setJobs(jobsResult.items ?? []);
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
        <UploadDropzone onUploaded={() => void refresh()} />

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
          <div className="collection-box">
            <h3 className="collection-title">Ingestion jobs</h3>
            <p className="muted-text" style={{ marginTop: 4, marginBottom: 0 }}>
              Failed jobs can be retried if the file still exists in blob storage (including legacy jobs without a
              stored key).
            </p>
            <div className="doc-jobs-scroll">
              {jobs.map((job) => (
                <div key={job.id} className="doc-job-row">
                  <div className="doc-job-meta">
                    <strong style={{ color: "var(--text)" }}>{job.filename}</strong>
                    <div>
                      <span
                        className={`doc-job-status ${job.status === "failed" ? "is-failed" : job.status === "indexed" ? "is-ok" : ""}`}
                      >
                        {job.status}
                      </span>
                      <span className="muted-text" style={{ marginLeft: 8 }}>
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {job.errorMessage ? (
                      <div className="error-text" style={{ marginTop: 6 }}>
                        {job.errorMessage}
                      </div>
                    ) : null}
                  </div>
                  {job.status === "failed" ? (
                    <button
                      type="button"
                      className="dash-btn-sm"
                      disabled={retryingId === job.id}
                      onClick={async () => {
                        setRetryingId(job.id);
                        setError(null);
                        try {
                          await retryIngestionJob(job.id);
                          await refresh();
                        } catch (e: unknown) {
                          setError(e instanceof Error ? e.message : "Retry failed");
                        } finally {
                          setRetryingId(null);
                        }
                      }}
                    >
                      {retryingId === job.id ? "Retrying…" : "Retry"}
                    </button>
                  ) : null}
                </div>
              ))}
              {jobs.length === 0 && <p className="muted-text">No ingestion jobs yet.</p>}
            </div>
          </div>
          <div className="selection-toolbar">
            <button
              className="composer-send"
              type="button"
              disabled={docs.length === 0}
              onClick={() => onSelectionChange?.(docs.map((d) => d.id))}
            >
              Select all
            </button>
            <button className="composer-send" type="button" disabled={selectedDocumentIds.length === 0} onClick={() => onSelectionChange?.([])}>
              Clear selection
            </button>
          </div>
          {docs.length === 0 && !loading && (
            <p className="muted-text">No documents uploaded yet.</p>
          )}
          {docs.map((d) => {
            const highlighted = highlightedDocumentIds.includes(d.id);
            const selected = selectedDocumentIds.includes(d.id);
            return (
              <div
                key={d.id}
                className={`document-item ${highlighted ? "highlighted" : ""} ${selected ? "selected" : ""}`}
              >
                <div className="document-meta">
                  <label className="doc-select-label">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedDocumentIds, d.id]
                          : selectedDocumentIds.filter((id) => id !== d.id);
                        onSelectionChange?.(Array.from(new Set(next)));
                      }}
                    />
                    <span>Use in analysis</span>
                  </label>
                  <span className="document-name">{d.filename}</span>
                  <span className="document-subline">
                    {formatBytes(d.sizeBytes)} • {new Date(d.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="doc-actions">
                  <button
                    type="button"
                    className="dash-btn-sm"
                    disabled={savingDocId === d.id}
                    onClick={async () => {
                      const next = window.prompt("Rename document", d.filename)?.trim();
                      if (!next || next === d.filename) return;
                      setSavingDocId(d.id);
                      setError(null);
                      try {
                        await renameDocument(d.id, next);
                        await refresh();
                      } catch (e: unknown) {
                        setError(e instanceof Error ? e.message : "Rename failed");
                      } finally {
                        setSavingDocId(null);
                      }
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="dash-btn-sm"
                    disabled={savingDocId === d.id}
                    onClick={async () => {
                      if (!window.confirm(`Delete "${d.filename}"? This will remove chunks and index entries.`)) return;
                      setSavingDocId(d.id);
                      setError(null);
                      try {
                        await deleteDocument(d.id);
                        onSelectionChange?.(selectedDocumentIds.filter((id) => id !== d.id));
                        await refresh();
                      } catch (e: unknown) {
                        setError(e instanceof Error ? e.message : "Delete failed");
                      } finally {
                        setSavingDocId(null);
                      }
                    }}
                  >
                    Delete
                  </button>
                  <a href={d.blobUrl} target="_blank" rel="noreferrer" className="document-link">
                    Open
                  </a>
                </div>
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

