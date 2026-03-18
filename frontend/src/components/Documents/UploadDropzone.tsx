"use client";

import { useRef, useState } from "react";

type Props = {
  onUploaded?: () => void;
};

export function UploadDropzone({ onUploaded }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const file = files[0];
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${baseUrl}/documents/upload`, {
        method: "POST",
        body: form
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Upload failed with ${res.status}`);
      }
      if (onUploaded) onUploaded();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center text-xs ${
          dragOver ? "border-indigo-400 bg-slate-900/70" : "border-slate-700 bg-slate-950/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <p className="mb-1 font-medium text-slate-100">Upload document</p>
        <p className="mb-2 text-[11px] text-slate-400">
          Drag &amp; drop or click to select a text or JSON file.
        </p>
        <p className="text-[10px] text-slate-500">Max size is set by backend config.</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.json,text/plain,application/json"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {uploading && <p className="text-[11px] text-indigo-300">Uploading and indexing…</p>}
      {error && (
        <p className="text-[11px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

