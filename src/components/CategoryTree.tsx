"use client";

import Link from "next/link";
import { useState } from "react";
import { colorHex } from "@/lib/colors";
import type { TreeNode } from "@/lib/categoryTree";

type Props = {
  roots: TreeNode[];
  current?: string;
  hrefs: Record<string, string>; // 分類 id → 保留其他篩選條件的網址
  openIds: string[]; // 預設展開（目前選取分類的上層路徑）
};

// 側欄分類樹：有子分類的可展開／收合，數字含子分類
export function CategoryTree({ roots, current, hrefs, openIds }: Props) {
  const [open, setOpen] = useState(() => new Set(openIds));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const render = (nodes: TreeNode[]) =>
    nodes.map((n) => {
      const hasKids = n.children.length > 0;
      const isOpen = open.has(n.id);
      return (
        <div key={n.id} className="tree-item">
          <div className={`tree-row ${current === n.id ? "on" : ""}`} style={{ paddingLeft: (n.depth - 1) * 14 }}>
            {hasKids ? (
              <button
                type="button"
                className="tree-twist"
                aria-label={isOpen ? "收合" : "展開"}
                aria-expanded={isOpen}
                onClick={() => toggle(n.id)}
              >
                {isOpen ? "▾" : "▸"}
              </button>
            ) : (
              <span className="tree-twist" />
            )}
            <Link href={hrefs[n.id]}>
              <span className="dot" style={{ "--c": colorHex(n.color) } as React.CSSProperties} />
              <span className="nm">{n.name}</span>
              <small>{n.total}</small>
            </Link>
          </div>
          {hasKids && isOpen && render(n.children)}
        </div>
      );
    });

  return <>{render(roots)}</>;
}
