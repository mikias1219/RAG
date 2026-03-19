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
      const file = normalizeUploadFile(files[0]);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/backend-api/documents/upload`, {
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
    <div className="upload-wrap">
      <div
        className={`dropzone ${dragOver ? "drag-over" : ""}`}
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
        <p className="dropzone-title">Upload document</p>
        <p className="dropzone-subtitle">Drag and drop or click to select a text or JSON file.</p>
        <p className="dropzone-note">Max size is controlled by backend configuration.</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".txt,.json,text/plain,application/json"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {uploading && <p className="info-text">Uploading and indexing...</p>}
      {error && (
        <p className="error-text">{error}</p>
      )}
    </div>
  );
}

function normalizeUploadFile(file: File): File {
  const name = file.name.toLowerCase();
  // Some browsers/devices provide empty or generic MIME for plain text files.
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return new File([file], file.name, { type: "text/plain" });
  }
  if (name.endsWith(".json")) {
    return new File([file], file.name, { type: "application/json" });
  }
  return file;
}

