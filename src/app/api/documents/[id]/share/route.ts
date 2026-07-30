import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { DocumentModel } from "@/models/Document";
import { toDocumentDTO } from "@/lib/serialize";
import { canShare } from "@/lib/access";
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

/**
 * POST /api/documents/:id/share
 * Body: { userId: string, shareWithUserId: string }
 *
 * Grants read-only access to `shareWithUserId` (FR-8). Only the
 * document's owner can share (`canShare` — see lib/access.ts); a
 * shared viewer cannot re-share, since they have no edit/admin rights
 * over the document at all.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid document id." }, { status: 400 });
  }

  let body: { userId?: string; shareWithUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { userId, shareWithUserId } = body;

  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: "A valid userId is required." }, { status: 400 });
  }
  if (!isValidUserId(shareWithUserId)) {
    return NextResponse.json({ error: "A valid shareWithUserId is required." }, { status: 400 });
  }
  if (userId === shareWithUserId) {
    return NextResponse.json({ error: "You cannot share a document with yourself." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    if (!canShare(doc, userId)) {
      return NextResponse.json(
        { error: "Only the document owner can share this document." },
        { status: 403 }
      );
    }

    // Idempotent: sharing with someone already on the list is a no-op,
    // not an error — avoids duplicate ids and a confusing failure mode.
    if (!doc.sharedWith.includes(shareWithUserId as string)) {
      doc.sharedWith.push(shareWithUserId as string);
      await doc.save();
    }

    return NextResponse.json(toDocumentDTO(doc));
  } catch (err) {
    console.error(`POST /api/documents/${id}/share failed:`, err);
    return NextResponse.json({ error: "Failed to share document." }, { status: 500 });
  }
}
