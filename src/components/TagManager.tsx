"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteTag, renameTag } from "@/lib/actions";

type TagItem = { id: string; name: string; count: number };

function Chip({ tag }: { tag: TagItem }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (name.trim() === tag.name) return setEditing(false);
    startTransition(async () => {
      const res = await renameTag(tag.id, name);
      if (res.error) alert(res.error);
      else setEditing(false);
    });
  }

  return (
    <span className="chip">
      {editing ? (
        <input
          value={name}
          autoFocus
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setName(tag.name); setEditing(false); }
          }}
          onBlur={submit}
        />
      ) : (
        <Link href={`/?tag=${encodeURIComponent(tag.name)}`}>#{tag.name}</Link>
      )}
      <small>{tag.count}</small>
      {!editing && (
        <button type="button" className="icon-btn" title="重新命名（改成既有名稱會合併）" onClick={() => setEditing(true)}>✏️</button>
      )}
      <button
        type="button"
        className="icon-btn del"
        title="刪除標籤"
        disabled={pending}
        onClick={() => {
          if (confirm(`刪除標籤 #${tag.name}？文件本身不會被刪除。`)) startTransition(() => deleteTag(tag.id));
        }}
      >
        ✕
      </button>
    </span>
  );
}

export function TagManager({ tags }: { tags: TagItem[] }) {
  if (tags.length === 0) return <p className="empty">還沒有標籤，在編輯文件時輸入即可建立</p>;
  return (
    <div className="tag-mgr">
      {tags.map((t) => (
        <Chip key={t.id} tag={t} />
      ))}
    </div>
  );
}
