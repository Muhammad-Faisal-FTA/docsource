"use client";

import { useRef, useState } from "react";

interface UploadButtonProps {
  currentUserId: string;
  onUploaded: () => void;
}

/**
 * Upload control for turning a .txt/.md file into a new document
 * (FR-6). The .txt/.md-only limit is stated directly in the UI
 * (FR-7) via both the visible helper text and the input's `accept`
 * attribute — the latter is a UX nicety (it filters the OS file
 * picker) and is NOT the actual enforcement, which happens
 * server-side in /api/upload since a client-side `accept` filter is
 * trivially bypassed.
 */
export function UploadButton({ currentUserId, onUploaded }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", currentUserId);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed.");
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      // Reset so selecting the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-md border border-dashed border-line px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload .txt or .md file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload a .txt or .md file as a new document"
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
