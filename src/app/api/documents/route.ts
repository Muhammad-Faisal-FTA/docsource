import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { DocumentModel } from "@/models/Document";
import { toDocumentDTO } from "@/lib/serialize";
import { isValidUserId } from "@/lib/users";

/**
 * GET /api/documents?userId=<id>
 *
 * Lists every document the given user can see: documents they own,
 * plus documents that have been shared with them (FR-1, FR-10).
 *
 * `userId` is a query param rather than an auth header/cookie because
 * there is no real session (see lib/users.ts) — the client tells the
 * server who's "logged in" on every request.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  // NFR-1: validate input before touching the database.
  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: "A valid userId query parameter is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    // One query covers both "owned" and "shared with me" — an $or
    // filter is simpler and cheaper here than two round-trips.
    const docs = await DocumentModel.find({
      $or: [{ ownerId: userId }, { sharedWith: userId }],
    }).sort({ updatedAt: -1 });

    return NextResponse.json(docs.map(toDocumentDTO));
  } catch (err) {
    // NFR-2: never let a raw stack trace leak to the client as a
    // blank/broken response — log server-side, return a clean message.
    console.error("GET /api/documents failed:", err);
    return NextResponse.json({ error: "Failed to load documents." }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Body: { userId: string, title?: string }
 *
 * Creates a new, blank document owned by `userId` (FR-1).
 */
export async function POST(request: NextRequest) {
  let body: { userId?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { userId, title } = body;

  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: "A valid userId is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const doc = await DocumentModel.create({
      title: title?.trim() || "Untitled document",
      content: "",
      ownerId: userId,
      sharedWith: [],
    });

    return NextResponse.json(toDocumentDTO(doc), { status: 201 });
  } catch (err) {
    console.error("POST /api/documents failed:", err);
    return NextResponse.json({ error: "Failed to create document." }, { status: 500 });
  }
}
