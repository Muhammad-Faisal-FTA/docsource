import { DocumentDocument } from "@/models/Document";
import { DocumentDTO } from "@/types";

/**
 * Converts a Mongoose Document instance into the plain DTO shape the
 * client expects (TRD §7 / types/index.ts).
 *
 * Why this exists: Mongoose documents carry an `_id` (ObjectId, not a
 * string) plus internal fields/methods that shouldn't leak to the
 * client. Centralizing the conversion in one place avoids every API
 * route hand-rolling its own (and potentially inconsistent) mapping.
 */
export function toDocumentDTO(doc: DocumentDocument): DocumentDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    content: doc.content,
    ownerId: doc.ownerId,
    sharedWith: doc.sharedWith,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
