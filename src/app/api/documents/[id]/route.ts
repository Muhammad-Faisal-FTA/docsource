import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { DocumentModel } from "@/models/Document";
import { toDocumentDTO } from "@/lib/serialize";
import { canView, canEdit } from "@/lib/access";
import { isValidUserId } from "@/lib/users";

import dns from "node:dns";

// 1. Force Node.js to use Google and Cloudflare resolvers immediately during engine boot
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (error) {
  console.warn("⚠️ Custom DNS configuration skipped:", error);
}

interface RouteParams {
  params: { id: string };
}

/** Shared validation: is this a syntactically valid Mongo ObjectId? (NFR-1) */
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/documents/:id?userId=<id>
 *
 * Fetches a single document. Access is enforced with `canView` (FR-9):
 * the requester must be the owner or in `sharedWith`, otherwise this
 * returns 403 rather than leaking document existence/content.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  const userId = request.nextUrl.searchParams.get("userId");

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }
  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: "A valid userId query parameter is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    if (!canView(doc, userId)) {
      return NextResponse.json({ error: "You do not have access to this document." }, { status: 403 });
    }

    return NextResponse.json(toDocumentDTO(doc));
  } catch (err) {
    console.error(`GET /api/documents/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to load document." }, { status: 500 });
  }
}

/**
 * PATCH /api/documents/:id
 * Body: { userId: string, title?: string, content?: string }
 *
 * Updates title and/or content. This is the route FR-12 is really
 * about: edit access is enforced server-side via `canEdit`, so a
 * shared (read-only) user cannot write even if they bypass the client
 * UI (e.g. by calling the API directly). The UI hiding the editor
 * toolbar is a courtesy, not the actual security boundary.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }

  let body: { userId?: string; title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { userId, title, content } = body;

  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: "A valid userId is required." }, { status: 400 });
  }
  if (title === undefined && content === undefined) {
    return NextResponse.json({ error: "Nothing to update: provide title and/or content." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // Server-side enforcement of read-only sharing (FR-9, FR-12).
    if (!canEdit(doc, userId)) {
      return NextResponse.json(
        { error: "Only the document owner can edit this document." },
        { status: 403 }
      );
    }

    if (title !== undefined) doc.title = title.trim() || "Untitled document";
    if (content !== undefined) doc.content = content;
    await doc.save();

    return NextResponse.json(toDocumentDTO(doc));
  } catch (err) {
    console.error(`PATCH /api/documents/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update document." }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/:id
 * Body: { userId: string }
 *
 * Deletes a document. Owner-only, same enforcement pattern as PATCH.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = params;

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isValidUserId(body.userId)) {
    return NextResponse.json({ error: "A valid userId is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    if (!canEdit(doc, body.userId as string)) {
      return NextResponse.json(
        { error: "Only the document owner can delete this document." },
        { status: 403 }
      );
    }

    await doc.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/documents/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete document." }, { status: 500 });
  }
}
