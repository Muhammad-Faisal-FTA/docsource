"use client";

import { SEEDED_USERS } from "@/lib/users";

interface UserSwitcherProps {
  currentUserId: string;
  onChange: (userId: string) => void;
}

/**
 * Dropdown for switching the mocked "current user" (TRD §3).
 *
 * This stands in for a real login screen. It's placed prominently in
 * the header, not tucked away, specifically so it's obvious to anyone
 * reviewing the project that auth is intentionally mocked rather than
 * silently missing.
 */
export function UserSwitcher({ currentUserId, onChange }: UserSwitcherProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-ink/60">Viewing as</span>
      <select
        value={currentUserId}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-white px-2 py-1 font-medium text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label="Switch current user (mocked authentication)"
      >
        {SEEDED_USERS.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </label>
  );
}
