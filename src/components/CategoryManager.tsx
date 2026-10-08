"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createCategory, deleteCategory, moveCategory, updateCategory } from "@/lib/actions";
import { CATEGORY_COLORS, colorHex } from "@/lib/colors";

type Cat = { id: string; name: string; color: string; count: number };

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="swatches">
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          title={c.name}
          aria-label={c.name}
          className={value === c.id ? "on" : undefined}
          style={{ "--c": c.hex } as React.CSSProperties}
          onClick={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}

function Row({ cat, first, last }: { cat: Cat; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [color, setColor] = useState(cat.color);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="mgr-row">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoFocus />
        <Swatches value={color} onChange={setColor} />
        <button
          type="button"
          className="btn small"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateCategory(cat.id, name, color);
              if (res.error) setError(res.error);
              else {
                setError("");
                setEditing(false);
              }
            })
          }
        >
          儲存
        </button>
        <button type="button" className="btn plain small" onClick={() => { setEditing(false); setName(cat.name); setColor(cat.color); setError(""); }}>
          取消
        </button>
        {error && <span className="error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="mgr-row">
      <div className="name">
        <span className="dot" style={{ "--c": colorHex(cat.color) } as React.CSSProperties} />
        <Link href={`/?cat=${cat.id}`}>{cat.name}</Link>
        <small>{cat.count} 份</small>
      </div>
      <button type="button" className="icon-btn" title="上移" disabled={first || pending} onClick={() => startTransition(() => moveCategory(cat.id, -1))}>↑</button>
      <button type="button" className="icon-btn" title="下移" disabled={last || pending} onClick={() => startTransition(() => moveCategory(cat.id, 1))}>↓</button>
      <button type="button" className="icon-btn" title="編輯" onClick={() => setEditing(true)}>✏️</button>
      <button
        type="button"
        className="icon-btn del"
        title="刪除"
        disabled={pending}
        onClick={() => {
          const msg = cat.count
            ? `刪除「${cat.name}」？其中 ${cat.count} 份文件會變成「未分類」（文件不會被刪除）。`
            : `刪除「${cat.name}」？`;
          if (confirm(msg)) startTransition(() => deleteCategory(cat.id));
        }}
      >
        🗑
      </button>
    </div>
  );
}

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length].id);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createCategory(name, color);
      if (res.error) setError(res.error);
      else {
        setError("");
        setName("");
        setColor(CATEGORY_COLORS[(categories.length + 1) % CATEGORY_COLORS.length].id);
      }
    });
  }

  return (
    <>
      <form className="add-row" onSubmit={add}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="新分類名稱，例：工作、學習、食譜" maxLength={30} />
        <Swatches value={color} onChange={setColor} />
        <button className="btn" type="submit" disabled={pending || !name.trim()}>新增</button>
      </form>
      {error && <p className="error">{error}</p>}
      {categories.length === 0 ? (
        <p className="empty">還沒有分類，在上面新增一個吧</p>
      ) : (
        categories.map((c, i) => <Row key={c.id} cat={c} first={i === 0} last={i === categories.length - 1} />)
      )}
    </>
  );
}
