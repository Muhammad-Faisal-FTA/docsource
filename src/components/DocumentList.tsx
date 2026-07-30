"use client";

import { DocumentDTO, SeededUser } from "@/types";

interface DocumentListProps {
  documents: DocumentDTO[];
  currentUserId: string;
  selectedDocumentId: string | null;
  users: SeededUser[];
  onSelect: (id: string) => void;
}

/** Looks up a display name for a userId, falling back to the raw id if unknown. */
function userName(users: SeededUser[], userId: string): string {
  return users.find((u) => u.id === userId)?.name ?? userId;
}

/**
 * Renders the list of documents visible to the current user, with
 * owned and shared documents visually distinguished (FR-10) via
 * distinct badge colors and a "Shared by {owner}" label (FR-9).
 *
 * Deliberately a "dumb" presentational component: it receives fully
 * resolved data and a selection callback, and holds no fetching logic
 * itself — that lives in the page component so there's one place that
 * owns data-loading and re-fetching after mutations.
 */
export function DocumentList({
  documents,
  currentUserId,
  selectedDocumentId,
  users,
  onSelect,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-ink/50">
        No documents yet. Create one, or upload a .txt/.md file to get started.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {documents.map((doc) => {
        const isOwned = doc.ownerId === currentUserId;
        const isSelected = doc.id === selectedDocumentId;

        return (
          <li key={doc.id}>
            <button
              onClick={() => onSelect(doc.id)}
              className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                isSelected ? "bg-accent-soft" : "hover:bg-black/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">{doc.title}</span>
                {isOwned ? (
                  <span className="shrink-0 rounded-full bg-owned-soft px-2 py-0.5 text-[11px] font-semibold text-owned">
                    Owned
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-shared-soft px-2 py-0.5 text-[11px] font-semibold text-shared">
                    Shared
                  </span>
                )}
              </div>
              {!isOwned && (
                <p className="mt-0.5 text-xs text-ink/50">Shared by {userName(users, doc.ownerId)}</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
