import { SeededUser } from "@/types";

/**
 * Seeded users standing in for real authentication.
 *
 * Scope decision (see AI_WORKFLOW.md / ARCHITECTURE.md): this project
 * intentionally does not implement real auth (signup/login/sessions).
 * Instead, the UI lets the user pick who they're "logged in as" from
 * this fixed list. Every API request carries the selected user's id
 * as a plain field — there is no session token, because there is no
 * real session to protect. This is a deliberate scope cut driven by
 * the 4-hour timebox, not an oversight.
 *
 * Kept as a static, in-memory list (not a DB collection) because the
 * set of users is fixed for the life of the demo and never changes at
 * runtime — a collection would add a moving part with no product value.
 */
export const SEEDED_USERS: SeededUser[] = [
  { id: "user-alice", name: "Alice" },
  { id: "user-bob", name: "Bob" },
  { id: "user-carol", name: "Carol" },
];

/** Look up a seeded user by id, or `undefined` if the id is unknown. */
export function findSeededUser(userId: string): SeededUser | undefined {
  return SEEDED_USERS.find((u) => u.id === userId);
}

/** Type guard used by API routes to validate an incoming userId (NFR-1). */
export function isValidUserId(userId: unknown): userId is string {
  return typeof userId === "string" && SEEDED_USERS.some((u) => u.id === userId);
}
