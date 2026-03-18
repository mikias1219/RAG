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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-100">Documents</span>
          <span className="text-xs text-slate-400">Uploaded sources used by RAG</span>
        </div>
        {loading && <span className="text-[11px] text-slate-400">Refreshing…</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 text-xs">
        <UploadDropzone onUploaded={refresh} />
        {error && <p className="text-[11px] text-red-300">{error}</p>}
        <div className="mt-2 space-y-1">
          {docs.length === 0 && !loading && (
            <p className="text-[11px] text-slate-500">No documents uploaded yet.</p>
          )}
          {docs.map((d) => {
            const highlighted = highlightedDocumentIds.includes(d.id);
            return (
              <div
                key={d.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  highlighted
                    ? "border-amber-400 bg-amber-500/10"
                    : "border-slate-800 bg-slate-950/40"
                }`}
              >
                <div className="flex flex-col">
                  <span className="max-w-[200px] truncate text-[11px] font-medium text-slate-100">
                    {d.filename}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatBytes(d.sizeBytes)} • {new Date(d.createdAt).toLocaleString()}
                  </span>
                </div>
                <a
                  href={d.blobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-medium text-indigo-300 hover:text-indigo-200"
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

