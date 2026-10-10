"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createCategory, deleteCategory, moveCategory, updateCategory } from "@/lib/actions";
import { CATEGORY_COLORS, colorHex } from "@/lib/colors";
import {
  buildTree,
  depthOf,
  flatten,
  heightOf,
  MAX_DEPTH,
  pathOf,
  PATH_SEP,
  subtreeIds,
  type FlatCat,
  type TreeNode,
} from "@/lib/categoryTree";

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

// 新增分類（第一層或某個分類底下）
function AddForm({
  parent,
  defaultColor,
  onDone,
}: {
  parent: TreeNode | null;
  defaultColor: string;
  onDone?: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="add-row"
      style={parent ? { paddingLeft: parent.depth * 22 } : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await createCategory(name, color, parent?.id ?? null);
          if (res.error) setError(res.error);
          else {
            setError("");
            setName("");
            onDone?.();
          }
        });
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={parent ? `「${parent.name}」的子分類名稱` : "新分類名稱，例：工作、學習、食譜"}
        maxLength={30}
        autoFocus={!!parent}
      />
      <Swatches value={color} onChange={setColor} />
      <button className="btn small" type="submit" disabled={pending || !name.trim()}>新增</button>
      {onDone && <button type="button" className="btn plain small" onClick={onDone}>取消</button>}
      {error && <span className="error">{error}</span>}
    </form>
  );
}

function Row({ node, list, siblings }: { node: TreeNode; list: FlatCat[]; siblings: TreeNode[] }) {
  const [mode, setMode] = useState<"view" | "edit" | "add">("view");
  const [name, setName] = useState(node.name);
  const [color, setColor] = useState(node.color);
  const [parentId, setParentId] = useState(node.parentId ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const idx = siblings.findIndex((s) => s.id === node.id);
  const indent = { paddingLeft: (node.depth - 1) * 22 };

  // 可以移過去的上層：不能是自己或子孫，且移過去後不超過層數上限
  const parentOptions = useMemo(() => {
    const own = subtreeIds(list, node.id);
    const h = heightOf(list, node.id);
    return flatten(buildTree(list))
      .filter((c) => !own.includes(c.id) && depthOf(list, c.id) + h <= MAX_DEPTH)
      .map((c) => ({ id: c.id, label: pathOf(list, c.id).map((p) => p.name).join(PATH_SEP) }));
  }, [list, node.id]);

  if (mode === "edit") {
    return (
      <div className="mgr-row mgr-edit" style={indent}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoFocus />
        <Swatches value={color} onChange={setColor} />
        <label className="note">
          上層
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">（第一層）</option>
            {parentOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn small"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateCategory(node.id, name, color, parentId || null);
              if (res.error) setError(res.error);
              else {
                setError("");
                setMode("view");
              }
            })
          }
        >
          儲存
        </button>
        <button
          type="button"
          className="btn plain small"
          onClick={() => {
            setMode("view");
            setName(node.name);
            setColor(node.color);
            setParentId(node.parentId ?? "");
            setError("");
          }}
        >
          取消
        </button>
        {error && <span className="error">{error}</span>}
      </div>
    );
  }

  return (
    <>
      <div className="mgr-row" style={indent}>
        <div className="name">
          {node.depth > 1 && <span className="branch">└</span>}
          <span className="dot" style={{ "--c": colorHex(node.color) } as React.CSSProperties} />
          <Link href={`/?cat=${node.id}`}>{node.name}</Link>
          <small>
            {node.total} 份{node.children.length > 0 && ` · ${node.children.length} 個子分類`}
          </small>
        </div>
        {node.depth < MAX_DEPTH && (
          <button type="button" className="icon-btn" title="新增子分類" onClick={() => setMode("add")}>＋ 子分類</button>
        )}
        <button type="button" className="icon-btn" title="上移" disabled={idx === 0 || pending} onClick={() => startTransition(() => moveCategory(node.id, -1))}>↑</button>
        <button type="button" className="icon-btn" title="下移" disabled={idx === siblings.length - 1 || pending} onClick={() => startTransition(() => moveCategory(node.id, 1))}>↓</button>
        <button type="button" className="icon-btn" title="編輯（名稱、顏色、上層）" onClick={() => setMode("edit")}>✏️</button>
        <button
          type="button"
          className="icon-btn del"
          title="刪除"
          disabled={pending}
          onClick={() => {
            const where = node.parentId ? `上一層「${list.find((c) => c.id === node.parentId)?.name}」` : "「未分類」";
            const parts = [
              node.count ? `${node.count} 份文件會移到${where}` : "",
              node.children.length ? `${node.children.length} 個子分類會往上移一層` : "",
            ].filter(Boolean);
            const msg = `刪除「${node.name}」？${parts.length ? `\n${parts.join("，")}。` : ""}\n（不會刪除任何文件）`;
            if (!confirm(msg)) return;
            startTransition(async () => {
              const res = await deleteCategory(node.id);
              if (res.error) alert(res.error);
            });
          }}
        >
          🗑
        </button>
        {error && <span className="error">{error}</span>}
      </div>
      {mode === "add" && <AddForm parent={node} defaultColor={node.color} onDone={() => setMode("view")} />}
      {node.children.map((ch) => (
        <Row key={ch.id} node={ch} list={list} siblings={node.children} />
      ))}
    </>
  );
}

export function CategoryManager({ categories }: { categories: FlatCat[] }) {
  const roots = useMemo(() => buildTree(categories), [categories]);
  const nextColor = CATEGORY_COLORS[roots.length % CATEGORY_COLORS.length].id;

  return (
    <>
      <AddForm key={nextColor} parent={null} defaultColor={nextColor} />
      {roots.length === 0 ? (
        <p className="empty">還沒有分類，在上面新增一個吧</p>
      ) : (
        roots.map((n) => <Row key={n.id} node={n} list={categories} siblings={roots} />)
      )}
    </>
  );
}
