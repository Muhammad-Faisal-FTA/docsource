import mongoose, { Schema, model, models } from "mongoose";

/**
 * Document model (TRD §7.2).
 *
 * `content` stores Tiptap's HTML output directly. We chose HTML over
 * Tiptap's JSON representation because it's simpler to render read-only
 * views from (dangerouslySetInnerHTML on the client, or server-rendered
 * previews) without re-hydrating a full editor instance — a reasonable
 * trade-off for a project this size. JSON would be preferable if we
 * needed structural queries against content, which is out of scope here.
 *
 * `sharedWith` is a flat array of seeded user ids rather than a
 * separate join collection (see TRD §7.2 design decision) — at this
 * scale (a handful of users, a handful of docs) a join table buys
 * nothing and costs an extra query on every read.
 */
export interface DocumentAttrs {
  title: string;
  content: string;
  ownerId: string;
  sharedWith: string[];
}

export interface DocumentDocument extends mongoose.Document, DocumentAttrs {
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<DocumentDocument>(
  {
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
      maxlength: [200, "Title must be 200 characters or fewer"],
      default: "Untitled document",
    },
    content: {
      type: String,
      default: "",
    },
    ownerId: {
      type: String,
      required: [true, "ownerId is required"],
      index: true, // documents are frequently queried by owner
    },
    sharedWith: {
      type: [String],
      default: [],
    },
  },
  {
    // Adds createdAt/updatedAt automatically, satisfying FR-11
    // (persistence survives refresh, including edit history ordering).
    timestamps: true,
  }
);

// Reuse the compiled model across hot-reloads in dev / warm serverless
// invocations, rather than redefining it on every import (which
// Mongoose throws on: "Cannot overwrite model once compiled").
export const DocumentModel =
  (models.Document as mongoose.Model<DocumentDocument>) ||
  model<DocumentDocument>("Document", documentSchema);
