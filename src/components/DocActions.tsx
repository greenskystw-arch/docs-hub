"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PrintButton } from "@/components/PrintButton";
import { ShareMenu } from "@/components/ShareMenu";
import { deleteDocument, togglePin } from "@/lib/actions";

type Props = { id: string; title: string; pinned: boolean; markdown: string; shareToken: string | null };

export function DocActions({ id, title, pinned, markdown, shareToken }: Props) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1600);
  }

  return (
    <div className="doc-actions">
      <Link href={`/docs/${id}/edit`} className="btn small">✏️ 編輯</Link>
      <button
        type="button"
        className="btn plain small"
        disabled={pending}
        onClick={() => startTransition(() => togglePin(id, !pinned))}
      >
        {pinned ? "取消置頂" : "📌 置頂"}
      </button>
      <button
        type="button"
        className="btn plain small"
        onClick={async () => {
          await navigator.clipboard.writeText(markdown);
          flash("已複製 Markdown");
        }}
      >
        複製
      </button>
      <a href={`/docs/${id}/download`} className="btn plain small">⬇ .md</a>
      <PrintButton title={title} />
      <ShareMenu id={id} title={title} token={shareToken} />
      <button
        type="button"
        className="btn danger small"
        disabled={pending}
        onClick={() => {
          if (confirm("確定刪除這份文件？刪除後無法復原。")) startTransition(() => deleteDocument(id));
        }}
      >
        刪除
      </button>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
