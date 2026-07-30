"use client";

import { useEditor, EditorContent, Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useState } from "react";

interface DocumentEditorProps {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  /** False for shared (read-only) documents (FR-9) — enforced again server-side (FR-12). */
  editable: boolean;
  onSave: (updates: { title: string; content: string }) => Promise<void>;
}

/**
 * Rich-text editor built on Tiptap (locked stack decision — TRD §6:
 * "do not build formatting logic from scratch"). Supports exactly the
 * formatting the brief asks for: bold, italic, underline, headings,
 * and ordered/unordered lists (FR-3). StarterKit brings most of this;
 * Underline is added separately since it's not in StarterKit by default.
 *
 * Save is explicit (a Save button), not autosave-on-every-keystroke.
 * That's a deliberate choice for this scope: autosave needs debouncing,
 * conflict handling, and a "saving..." state machine that's more
 * complexity than a 4-hour, single-editor-at-a-time project needs.
 * An explicit save also makes the required "save/reopen" behavior
 * (FR-4/FR-5) trivially easy to verify by hand.
 */
export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  editable,
  onSave,
}: DocumentEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editor: TiptapEditor | null = useEditor({
    extensions: [StarterKit, Underline],
    content: initialContent,
    editable,
    immediatelyRender: false, // avoids SSR hydration mismatch warnings in Next.js App Router
  });

  // Re-sync editor content/title and editable state whenever the
  // selected document changes (switching documents reuses this same
  // mounted component rather than remounting it).
  useEffect(() => {
    setTitle(initialTitle);
    setLastSavedAt(null);
    setError(null);
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(initialContent);
      editor.setEditable(editable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim() || "Untitled document", content: editor.getHTML() });
      setLastSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save document.");
    } finally {
      setSaving(false);
    }
  }

  if (!editor) {
    return <div className="p-6 text-sm text-ink/40">Loading editor…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!editable}
          placeholder="Untitled document"
          aria-label="Document title"
          className="w-full bg-transparent text-xl font-semibold text-ink outline-none disabled:text-ink/60"
        />
        {editable && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="border-b border-danger/20 bg-danger/5 px-6 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {editable && <Toolbar editor={editor} />}

      {!editable && (
        <p className="border-b border-line bg-shared-soft px-6 py-2 text-xs font-medium text-shared">
          This document is shared with you as read-only. Only the owner can make changes.
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <EditorContent editor={editor} className="tiptap-content" />
      </div>

      {lastSavedAt && (
        <p className="px-6 pb-3 text-xs text-ink/40">Saved at {lastSavedAt.toLocaleTimeString()}</p>
      )}
    </div>
  );
}

/** Formatting toolbar: bold, italic, underline, headings, lists (FR-3). */
function Toolbar({ editor }: { editor: TiptapEditor }) {
  const buttons = [
    { label: "B", title: "Bold", isActive: () => editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "I", title: "Italic", isActive: () => editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "U", title: "Underline", isActive: () => editor.isActive("underline"), run: () => editor.chain().focus().toggleUnderline().run() },
    { label: "H1", title: "Heading 1", isActive: () => editor.isActive("heading", { level: 1 }), run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "H2", title: "Heading 2", isActive: () => editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "•", title: "Bullet list", isActive: () => editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "1.", title: "Numbered list", isActive: () => editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-line px-6 py-2">
      {buttons.map((btn) => (
        <button
          key={btn.title}
          type="button"
          title={btn.title}
          onClick={btn.run}
          className={`min-w-[32px] rounded-md px-2 py-1 text-sm font-semibold transition-colors ${
            btn.isActive() ? "bg-accent-soft text-accent" : "text-ink/70 hover:bg-black/[0.04]"
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
