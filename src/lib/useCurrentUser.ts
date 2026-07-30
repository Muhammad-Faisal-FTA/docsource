"use client";

import { useEffect, useState } from "react";
import { SEEDED_USERS } from "@/lib/users";

const STORAGE_KEY = "docedit:currentUserId";

/**
 * Manages which seeded user is "logged in" on this browser.
 *
 * Persisted to localStorage so the choice survives a refresh — the
 * task's persistence requirement (FR-11) reasonably extends to the
 * overall session experience, not just document content. This is a
 * UX default, not a security boundary: there is no real auth here
 * (see lib/users.ts), so localStorage is an appropriate (and honest)
 * place for it.
 *
 * Defaults to the first seeded user until the client has mounted and
 * localStorage has been read, avoiding a server/client render mismatch
 * (Next.js hydration warning) since localStorage doesn't exist during
 * server rendering.
 */
export function useCurrentUser() {
  const [currentUserId, setCurrentUserIdState] = useState<string>(SEEDED_USERS[0].id);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SEEDED_USERS.some((u) => u.id === stored)) {
      setCurrentUserIdState(stored);
    }
    setHydrated(true);
  }, []);

  function setCurrentUserId(userId: string) {
    setCurrentUserIdState(userId);
    window.localStorage.setItem(STORAGE_KEY, userId);
  }

  return { currentUserId, setCurrentUserId, hydrated };
}
