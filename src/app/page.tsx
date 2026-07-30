"use client";

import { useEffect, useState, useCallback } from "react";
import { DocumentDTO, SeededUser } from "@/types";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { UserSwitcher } from "@/components/UserSwitcher";
import { DocumentList } from "@/components/DocumentList";
import { DocumentEditor } from "@/components/DocumentEditor";
import { UploadButton } from "@/components/UploadButton";
import { ShareModal } from "@/components/ShareModal";

/**
 * Main application page.
 *
 * This is intentionally a single client component orchestrating all
 * state (documents, selection, modal visibility) rather than split
 * across nested server/client boundaries. Given the project's scope —
 * one page, a handful of components, no server-rendered data that
 * needs to be there before first paint — that split would add
 * indirection without a real benefit. If this app grew (more pages,
 * SEO-sensitive views), server components would earn their keep.
 */
export default function HomePage() {
  const { currentUserId, setCurrentUserId, hydrated } = useCurrentUser();

  const [users, setUsers] = useState<SeededUser[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId) ?? null;
  const isOwner = selectedDocument?.ownerId === currentUserId;

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!currentUserId) return;
    setLoadError(null);
    try {
      const res = await fetch(`/api/documents?userId=${encodeURIComponent(currentUserId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents.");
      setDocuments(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Load the fixed user list once; not dependent on currentUserId.
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reload the document list whenever the current (mocked) user
  // changes, and on first mount once localStorage has been read
  // (`hydrated`) so we don't fetch for the wrong user momentarily.
  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    loadDocuments();
  }, [hydrated, loadDocuments]);

  // If the currently selected document is no longer in the list for
  // this user (e.g. switched to a user with no access to it), clear
  // the selection rather than showing stale content.
  useEffect(() => {
    if (selectedDocumentId && !documents.some((d) => d.id === selectedDocumentId)) {
      setSelectedDocumentId(null);
    }
  }, [documents, selectedDocumentId]);

  async function handleCreate() {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, title: "Untitled document" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error || "Failed to create document.");
      return;
    }
    await loadDocuments();
    setSelectedDocumentId(data.id);
  }

  async function handleSave(updates: { title: string; content: string }) {
    if (!selectedDocument) return;
    const res = await fetch(`/api/documents/${selectedDocument.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save document.");
    }
    // Update in place rather than a full reload, so the list re-sorts
    // and the title updates without an extra round-trip.
    setDocuments((prev) => prev.map((d) => (d.id === data.id ? data : d)));
  }

  async function handleDelete() {
    if (!selectedDocument) return;
    if (!window.confirm(`Delete "${selectedDocument.title}"? This can't be undone.`)) return;

    const res = await fetch(`/api/documents/${selectedDocument.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setLoadError(data.error || "Failed to delete document.");
      return;
    }
    setSelectedDocumentId(null);
    await loadDocuments();
  }

  if (!hydrated) {
    // Avoids a flash of the wrong "current user" before localStorage
    // has been read on the client.
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line bg-white px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight text-ink">DocEdit</h1>
        <UserSwitcher currentUserId={currentUserId} onChange={setCurrentUserId} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-white p-4">
          <button
            onClick={handleCreate}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + New document
          </button>

          <UploadButton currentUserId={currentUserId} onUploaded={loadDocuments} />

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-sm text-ink/40">Loading documents…</p>
            ) : loadError ? (
              <p role="alert" className="px-3 py-4 text-sm text-danger">
                {loadError}
              </p>
            ) : (
              <DocumentList
                documents={documents}
                currentUserId={currentUserId}
                selectedDocumentId={selectedDocumentId}
                users={users}
                onSelect={setSelectedDocumentId}
              />
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-hidden bg-paper">
          {selectedDocument ? (
            <div className="flex h-full flex-col">
              <div className="flex justify-end gap-2 border-b border-line bg-white px-6 py-2">
                {isOwner && (
                  <>
                    <button
                      onClick={() => setShareModalOpen(true)}
                      className="rounded-md px-3 py-1 text-xs font-medium text-ink/60 hover:bg-black/[0.04]"
                    >
                      Share
                    </button>
                    <button
                      onClick={handleDelete}
                      className="rounded-md px-3 py-1 text-xs font-medium text-danger hover:bg-danger/5"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
              <div className="flex-1 overflow-hidden bg-white">
                <DocumentEditor
                  key={selectedDocument.id}
                  documentId={selectedDocument.id}
                  initialTitle={selectedDocument.title}
                  initialContent={selectedDocument.content}
                  editable={isOwner}
                  onSave={handleSave}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink/40">
              Select a document, or create a new one to get started.
            </div>
          )}
        </main>
      </div>

      {shareModalOpen && selectedDocument && (
        <ShareModal
          document={selectedDocument}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setShareModalOpen(false)}
          onShared={loadDocuments}
        />
      )}
    </div>
  );
}
