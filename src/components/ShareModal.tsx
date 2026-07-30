"use client";

import { useState } from "react";
import { DocumentDTO, SeededUser } from "@/types";

interface ShareModalProps {
  document: DocumentDTO;
  users: SeededUser[];
  currentUserId: string;
  onClose: () => void;
  onShared: () => void;
}

/**
 * Modal for sharing an owned document with another seeded user (FR-8).
 * Only rendered when the current user owns the open document — see
 * the "Share" button gating in page.tsx, which mirrors (but does not
 * replace) the server-side `canShare` check in the API route.
 */
export function ShareModal({ document, users, currentUserId, onClose, onShared }: ShareModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Can't share with yourself, and no point re-offering someone
  // who's already on the sharedWith list.
  const shareableUsers = users.filter(
    (u) => u.id !== currentUserId && !document.sharedWith.includes(u.id)
  );

  async function handleShare() {
    if (!selectedUserId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${document.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, shareWithUserId: selectedUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to share document.");
      }
      onShared();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share document.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-card bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-modal-title" className="text-base font-semibold text-ink">
          Share &ldquo;{document.title}&rdquo;
        </h2>
        <p className="mt-1 text-xs text-ink/50">
          The person you share with gets read-only access — they can view but not edit.
        </p>

        {shareableUsers.length === 0 ? (
          <p className="mt-4 text-sm text-ink/50">
            This document is already shared with everyone else.
          </p>
        ) : (
          <div className="mt-4">
            <label className="block text-xs font-medium text-ink/60" htmlFor="share-user-select">
              Share with
            </label>
            <select
              id="share-user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="" disabled>
                Choose a person…
              </option>
              {shareableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink/60 hover:bg-black/[0.04]"
          >
            Cancel
          </button>
          {shareableUsers.length > 0 && (
            <button
              onClick={handleShare}
              disabled={!selectedUserId || submitting}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Sharing…" : "Share"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
