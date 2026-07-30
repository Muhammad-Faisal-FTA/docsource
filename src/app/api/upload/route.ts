import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { DocumentModel } from "@/models/Document";
import { toDocumentDTO } from "@/lib/serialize";
import { isValidUserId } from "@/lib/users";

/** File types this endpoint accepts (FR-6, FR-7 — stated in UI + README too). */
const ALLOWED_EXTENSIONS = [".txt", ".md"];
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB — generous for plain text, cheap to enforce

/**
 * Very small, intentionally unambitious plain-text → HTML converter.
 *
 * Scope decision: we do NOT pull in a full Markdown parser here. The
 * brief leaves upload behavior open ("you may choose the exact
 * behavior"), and the locked-in product decision is: recognize `#`
 * / `##` style headings (common to both plain notes and Markdown
 * files) and treat every other non-blank line as a paragraph. This
 * covers the common case cheaply; anything more (lists, bold/italic
 * inside the uploaded file, tables) is an explicit non-goal for the
 * 4-hour timebox — the user can always add that formatting using the
 * Tiptap toolbar after the document is created.
 */
function convertPlainTextToHtml(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const htmlParts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length; // 1-3 (#, ##, ###)
      const text = escapeHtml(headingMatch[2]);
      htmlParts.push(`<h${level}>${text}</h${level}>`);
    } else {
      htmlParts.push(`<p>${escapeHtml(trimmed)}</p>`);
    }
  }

  return htmlParts.join("\n");
}

/** Prevents uploaded file content from being interpreted as HTML/script (basic XSS hygiene). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

/**
 * POST /api/upload
 * multipart/form-data: { file: File, userId: string }
 *
 * Accepts a .txt or .md file and creates a new document from its
 * content (FR-6). The uploading user becomes the owner, same as
 * creating a blank document — upload is just a different starting
 * point for document creation, not a separate concept.
 */
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  const userId = formData.get("userId");

  if (!isValidUserId(userId)) {
    return NextResponse.json({ error: "A valid userId is required." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  // FR-7: enforce and clearly explain the .txt/.md-only limit.
  const extension = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      { error: `Unsupported file type "${extension || "unknown"}". Only .txt and .md files are supported.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large. Maximum size is 1 MB." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  }

  try {
    const rawText = await file.text();
    const content = convertPlainTextToHtml(rawText);

    // Derive a starting title from the filename so the user isn't
    // dropped into an "Untitled document" after uploading something
    // that clearly already had a name.
    const titleFromFilename = file.name.replace(/\.(txt|md)$/i, "").trim();

    await connectToDatabase();
    const doc = await DocumentModel.create({
      title: titleFromFilename || "Untitled document",
      content,
      ownerId: userId,
      sharedWith: [],
    });

    return NextResponse.json(toDocumentDTO(doc), { status: 201 });
  } catch (err) {
    console.error("POST /api/upload failed:", err);
    return NextResponse.json({ error: "Failed to process uploaded file." }, { status: 500 });
  }
}
