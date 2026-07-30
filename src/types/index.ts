/**
 * Shared domain types.
 *
 * Kept in one place so the client (React components), the API routes,
 * and the Mongoose model all agree on the same shape (TRD §7).
 */

/** A seeded, mocked user (TRD §3 — no real authentication). */
export interface SeededUser {
  id: string;
  name: string;
}

/**
 * A document as returned by the API to the client.
 *
 * Note: `_id`/dates from Mongoose are serialized to plain strings once
 * they cross the API boundary — see `lib/serialize.ts`.
 */
export interface DocumentDTO {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

/** Standard shape for API error responses (NFR-1, NFR-2). */
export interface ApiErrorResponse {
  error: string;
}
