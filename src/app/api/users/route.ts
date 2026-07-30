import { NextResponse } from "next/server";
import { SEEDED_USERS } from "@/lib/users";

/**
 * GET /api/users
 *
 * Returns the fixed list of seeded users, used to populate the
 * "current user" switcher and the share-recipient picker (TRD §3, §8).
 * No database round-trip needed — this list is static by design.
 */
export async function GET() {
  return NextResponse.json(SEEDED_USERS);
}
