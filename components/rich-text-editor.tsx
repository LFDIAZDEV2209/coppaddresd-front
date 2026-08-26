"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TurndownService from "turndown";
import { marked } from "marked";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

function toHtml(markdown: string): string {
  return marked.parse(markdown || "") as string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const appliedRef = useRef<string | null>(null);
  const t = useT();

  const editor = useEditor({
    extensions: [StarterKit],
    content: toHtml(value),
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const markdown = turndown.turndown(editor.getHTML());
      appliedRef.current = markdown;
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = turndown.turndown(editor.getHTML());
    if (appliedRef.current !== value && current !== value) {
      editor.commands.setContent(toHtml(value), { emitUpdate: false });
      appliedRef.current = value;
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="min-h-80 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1">
        <ToolbarButton
          label={t("Encabezado 1")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("Encabezado 2")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("Encabezado 3")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label={t("Negrita")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("Cursiva")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label={t("Lista con viñetas")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("Lista numerada")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("Cita (bloque)")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label={t("Deshacer")} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label={t("Rehacer")} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className="rich-text-editor" />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary-soft text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
