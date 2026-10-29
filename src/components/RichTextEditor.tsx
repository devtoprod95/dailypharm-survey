import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading, Trash2, Undo2, Redo2,
} from "lucide-react";

/**
 * Tiptap(ProseMirror) 기반 서식 에디터 (React 19 호환)
 * - 굵게 / 기울임 / 밑줄 / 글머리표 / 번호 목록 / 소제목 / 되돌리기 / 다시실행 / 전체 지우기
 * - 이미지 삽입은 지원하지 않음 (텍스트 서식 전용)
 */

// ─── XSS 방지용 sanitize (허용 태그/속성만 남김) ──────────────
const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "P", "BR", "UL", "OL", "LI", "H3", "H4", "DIV", "SPAN",
]);

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          const parent = el.parentNode;
          while (el.firstChild) parent?.insertBefore(el.firstChild, el);
          parent?.removeChild(el);
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          el.removeAttribute(attr.name);
        }
        walk(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.parentNode?.removeChild(child);
      }
    }
  };

  walk(template.content);
  return template.innerHTML;
}

// 내용이 비어있는지 판정
export function isHtmlEmpty(html: string): boolean {
  if (!html) return true;
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
  return text.length === 0;
}

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // 선택 영역 유지
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 32, border: "none", borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        color: active ? "#27ae60" : "#595959",
        background: active ? "#eafaf0" : "transparent",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f0f0f0"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value = "", onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
      Placeholder.configure({
        placeholder: placeholder || "",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getText().trim() === "" ? "" : sanitizeHtml(editor.getHTML());
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        style: "min-height:160px; padding:12px 14px; outline:none; font-size:14px; line-height:1.7; color:#262626;",
      },
    },
  });

  // 외부에서 "리셋"(빈 값)으로 바뀐 경우에만 동기화한다.
  // 사용자가 편집 중일 때는 setContent를 호출하지 않아 서식(목록/소제목 등)이 되돌려지지 않음.
  useEffect(() => {
    if (!editor) return;
    if (isHtmlEmpty(value) && !editor.isEmpty) {
      editor.commands.clearContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
      {/* 툴바 */}
      <div
        style={{
          display: "flex", gap: 2, alignItems: "center", padding: "4px 6px",
          borderBottom: "1px solid #f0f0f0", background: "#fafafa", flexWrap: "wrap",
        }}
      >
        <ToolbarButton title="굵게" active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton title="기울임" active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton title="밑줄" active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={16} />
        </ToolbarButton>

        <span style={{ width: 1, height: 18, background: "#e0e0e0", margin: "0 4px" }} />

        <ToolbarButton title="글머리표 목록" active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton title="번호 목록" active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton title="소제목" active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading size={16} />
        </ToolbarButton>

        <span style={{ width: 1, height: 18, background: "#e0e0e0", margin: "0 4px" }} />

        <ToolbarButton title="되돌리기"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton title="다시 실행"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </ToolbarButton>

        <span style={{ width: 1, height: 18, background: "#e0e0e0", margin: "0 4px" }} />

        <ToolbarButton title="전체 내용 지우기"
          disabled={editor.isEmpty}
          onClick={() => editor.chain().focus().clearContent().run()}>
          <Trash2 size={16} />
        </ToolbarButton>
      </div>

      {/* 편집 영역 */}
      <div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
