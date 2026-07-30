/**
 * Access control for documents (TRD §3, §5 FR-9/FR-12).
 *
 * This module is the single source of truth for "who can do what to a
 * document." Both API routes and (optionally) client-side UI gating
 * import from here, so there is exactly one place that defines the
 * rule — not a copy in the API and a slightly different copy in a
 * React component that could quietly drift out of sync.
 *
 * Permission model:
 *   - Owner: full access (view, edit, delete, share).
 *   - Shared user (in `sharedWith`): view-only. Cannot edit or delete.
 *   - Anyone else: no access at all.
 *
 * These functions take plain data (not a Mongoose document) so they're
 * cheap to unit test without touching a database — see
 * __tests__/access.test.ts.
 */

/** Minimal shape needed to make an access decision about a document. */
export interface AccessCheckable {
  ownerId: string;
  sharedWith: string[];
}

/**
 * Can `userId` view this document at all (as owner or as a shared
 * viewer)? Used to gate GET /api/documents/:id.
 */
export function canView(doc: AccessCheckable, userId: string): boolean {
  return doc.ownerId === userId || doc.sharedWith.includes(userId);
}

/**
 * Can `userId` edit (rename/update content) or delete this document?
 * Only the owner ever can — sharing is strictly read-only by design
 * (locked scope decision, see ARCHITECTURE.md).
 */
export function canEdit(doc: AccessCheckable, userId: string): boolean {
  return doc.ownerId === userId;
}

/**
 * Can `userId` share this document with someone else? Only the owner
 * can grant access — a shared (read-only) viewer cannot re-share.
 */
export function canShare(doc: AccessCheckable, userId: string): boolean {
  return doc.ownerId === userId;
}
