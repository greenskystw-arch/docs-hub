"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Markdown } from "@/components/Markdown";
import { saveDocument } from "@/lib/actions";
import { splitTitle } from "@/lib/text";

type Option = { id: string; name: string };
type Initial = { id?: string; title: string; content: string; categoryId: string; tags: string; pinned: boolean };
type Mode = "edit" | "split" | "preview";

// 工具列：包住選取文字，或在行首加前綴
type Tool =
  | { label: string; title: string; wrap: [string, string]; placeholder: string }
  | { label: string; title: string; prefix: string }
  | { label: string; title: string; block: string };

const TOOLS: (Tool | "sep")[] = [
  { label: "H1", title: "大標題", prefix: "# " },
  { label: "H2", title: "標題", prefix: "## " },
  { label: "H3", title: "小標題", prefix: "### " },
  "sep",
  { label: "B", title: "粗體 (Ctrl+B)", wrap: ["**", "**"], placeholder: "粗體" },
  { label: "I", title: "斜體 (Ctrl+I)", wrap: ["*", "*"], placeholder: "斜體" },
  { label: "S", title: "刪除線", wrap: ["~~", "~~"], placeholder: "刪除" },
  { label: "</>", title: "行內程式碼", wrap: ["`", "`"], placeholder: "code" },
  { label: "🔗", title: "連結 (Ctrl+K)", wrap: ["[", "](https://)"], placeholder: "連結文字" },
  "sep",
  { label: "•", title: "項目清單", prefix: "- " },
  { label: "1.", title: "編號清單", prefix: "1. " },
  { label: "☑", title: "待辦清單", prefix: "- [ ] " },
  { label: "❝", title: "引用", prefix: "> " },
  "sep",
  { label: "{ }", title: "程式碼區塊", block: "```\n\n```" },
  { label: "▦", title: "表格", block: "| 欄位 | 欄位 |\n| --- | --- |\n| 內容 | 內容 |" },
  { label: "—", title: "分隔線", block: "---" },
];

export function DocEditor({
  initial,
  categories,
  tagNames,
}: {
  initial: Initial;
  categories: Option[];
  tagNames: string[];
}) {
  const router = useRouter();
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [tags, setTags] = useState(initial.tags);
  const [pinned, setPinned] = useState(initial.pinned);
  const [mode, setMode] = useState<Mode>("split");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(initial);

  const dirty =
    title !== saved.title ||
    content !== saved.content ||
    categoryId !== saved.categoryId ||
    tags !== saved.tags ||
    pinned !== saved.pinned;

  // 未儲存就離開頁面時提醒
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function save(thenView: boolean) {
    setError("");
    startTransition(async () => {
      const current = { id: initial.id, title, content, categoryId, tags, pinned };
      const res = await saveDocument(current);
      if (res.error || !res.id) {
        setError(res.error ?? "儲存失敗");
        return;
      }
      setSaved({ ...current, id: res.id });
      if (thenView) router.push(`/docs/${res.id}`);
      else if (!initial.id) router.replace(`/docs/${res.id}/edit`);
    });
  }

  // Ctrl+S 儲存（留在編輯頁）
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function replaceRange(start: number, end: number, text: string, selStart: number, selEnd: number) {
    const el = ta.current;
    if (!el) return;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  function apply(tool: Tool) {
    const el = ta.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = content.slice(s, e);
    if ("wrap" in tool) {
      const inner = sel || tool.placeholder;
      const [a, b] = tool.wrap;
      replaceRange(s, e, a + inner + b, s + a.length, s + a.length + inner.length);
    } else if ("prefix" in tool) {
      // 套用到選取範圍內的每一行
      const lineStart = content.lastIndexOf("\n", s - 1) + 1;
      const block = content.slice(lineStart, e);
      const lines = block.split("\n");
      const allHave = lines.every((l) => l.startsWith(tool.prefix));
      const out = lines
        .map((l, i) => {
          if (allHave) return l.slice(tool.prefix.length);
          const p = tool.prefix === "1. " ? `${i + 1}. ` : tool.prefix;
          return p + l.replace(/^(#{1,6} |- \[ \] |- |\d+\. |> )/, "");
        })
        .join("\n");
      replaceRange(lineStart, e, out, lineStart + out.length, lineStart + out.length);
    } else {
      const before = s > 0 && content[s - 1] !== "\n" ? "\n\n" : "";
      const text = before + tool.block + "\n";
      const caret = tool.block.startsWith("```") ? s + before.length + 4 : s + text.length;
      replaceRange(s, e, text, caret, caret);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.ctrlKey || e.metaKey;
    const find = (title: string) => TOOLS.find((t) => t !== "sep" && t.title.startsWith(title)) as Tool;
    if (mod && e.key.toLowerCase() === "b") {
      e.preventDefault();
      apply(find("粗體"));
    } else if (mod && e.key.toLowerCase() === "i") {
      e.preventDefault();
      apply(find("斜體"));
    } else if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      apply(find("連結"));
    } else if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart;
      replaceRange(s, el.selectionEnd, "  ", s + 2, s + 2);
    } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      // 清單自動延續；空項目按 Enter 結束清單
      const el = e.currentTarget;
      const s = el.selectionStart;
      if (s !== el.selectionEnd) return;
      const lineStart = content.lastIndexOf("\n", s - 1) + 1;
      const line = content.slice(lineStart, s);
      const m = line.match(/^(\s*)(- \[[ xX]\] |[-*+] |(\d+)\. |> )(.*)$/);
      if (!m) return;
      e.preventDefault();
      if (!m[4].trim()) {
        replaceRange(lineStart, s, "", lineStart, lineStart);
        return;
      }
      const marker = m[3] ? `${Number(m[3]) + 1}. ` : m[2].startsWith("- [") ? "- [ ] " : m[2];
      const ins = "\n" + m[1] + marker;
      replaceRange(s, s, ins, s + ins.length, s + ins.length);
    }
  }

  async function importFile(file: File) {
    const text = (await file.text()).replace(/\r\n/g, "\n");
    const name = file.name.replace(/\.(md|markdown|txt)$/i, "");
    const parsed = splitTitle(text, name);
    if (content.trim() && !confirm("要用匯入的檔案取代目前內容嗎？")) return;
    if (!title.trim()) setTitle(parsed.title);
    setContent(title.trim() ? text : parsed.content);
  }

  return (
    <div className="editor">
      <div className="ed-head">
        <input
          className="ed-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文件標題"
          maxLength={200}
          autoFocus={!initial.id}
        />
      </div>

      <div className="ed-meta">
        <label>
          分類
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">未分類</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>
          標籤
          <input
            type="text"
            className="tags-input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="用逗號分隔，例：筆記, 工作"
            list="tag-suggest"
          />
          <datalist id="tag-suggest">
            {tagNames.map((t) => (
              <option key={t} value={tags.replace(/[^,，、]*$/, (cur) => (cur.trim() ? "" : cur)) + t} />
            ))}
          </datalist>
        </label>
        <label>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          置頂
        </label>
        <button type="button" className="btn plain small" onClick={() => fileInput.current?.click()}>
          匯入 .md 檔
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="card ed-box">
        <div className="ed-toolbar">
          {TOOLS.map((t, i) =>
            t === "sep" ? (
              <span key={i} className="sep" />
            ) : (
              <button key={i} type="button" title={t.title} onClick={() => apply(t)} disabled={mode === "preview"}>
                {t.label}
              </button>
            ),
          )}
          <div className="modes">
            <button type="button" className={mode === "edit" ? "on" : undefined} onClick={() => setMode("edit")}>編輯</button>
            <button type="button" className={`split-btn ${mode === "split" ? "on" : ""}`} onClick={() => setMode("split")}>並排</button>
            <button type="button" className={mode === "preview" ? "on" : undefined} onClick={() => setMode("preview")}>預覽</button>
          </div>
        </div>
        <div className={`ed-panes ${mode}`}>
          {mode !== "preview" && (
            <textarea
              ref={ta}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={"用 Markdown 撰寫…\n\n# 標題\n- 清單\n- [ ] 待辦\n**粗體**、`程式碼`"}
              spellCheck={false}
            />
          )}
          {mode !== "edit" && (content.trim() ? <Markdown>{content}</Markdown> : <div className="md note">（預覽）</div>)}
        </div>
      </div>

      <div className="ed-foot">
        <span className="note">
          {error ? <span className="error">{error}</span> : dirty ? "● 尚未儲存（Ctrl+S 儲存）" : initial.id || saved.id ? "✓ 已儲存" : ""}
          {" · "}
          {content.length.toLocaleString()} 字元
        </span>
        <div className="doc-actions">
          <Link href={saved.id ? `/docs/${saved.id}` : "/"} className="btn plain">
            {saved.id ? "返回檢視" : "取消"}
          </Link>
          <button type="button" className="btn ghost" disabled={pending} onClick={() => save(false)}>
            儲存
          </button>
          <button type="button" className="btn" disabled={pending} onClick={() => save(true)}>
            {pending ? "儲存中…" : "儲存並檢視"}
          </button>
        </div>
      </div>
    </div>
  );
}
