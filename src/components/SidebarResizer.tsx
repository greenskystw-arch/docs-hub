"use client";

import { useRef } from "react";
import { clampSide, SIDE_COOKIE, SIDE_DEFAULT } from "@/lib/sidebar";

// 拖曳側欄右緣調整寬度；寬度存在 cookie，伺服器端直接套用，重新整理不會跳動。雙擊恢復預設。
export function SidebarResizer() {
  const dragging = useRef(false);

  function apply(w: number, save: boolean) {
    const lib = document.querySelector<HTMLElement>(".lib");
    if (!lib) return;
    const clamped = clampSide(w);
    lib.style.setProperty("--side-w", `${clamped}px`);
    if (save) document.cookie = `${SIDE_COOKIE}=${clamped}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div
      className="side-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="拖曳調整側欄寬度"
      title="拖曳調整寬度，雙擊恢復預設"
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.classList.add("resizing");
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const lib = document.querySelector<HTMLElement>(".lib");
        if (lib) apply(e.clientX - lib.getBoundingClientRect().left, false);
      }}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        document.body.classList.remove("resizing");
        const lib = document.querySelector<HTMLElement>(".lib");
        if (lib) apply(e.clientX - lib.getBoundingClientRect().left, true);
      }}
      onDoubleClick={() => apply(SIDE_DEFAULT, true)}
      onKeyDown={(e) => {
        // 鍵盤也能調整
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const aside = document.querySelector<HTMLElement>(".lib > .side");
        if (aside) apply(aside.offsetWidth + (e.key === "ArrowRight" ? 20 : -20), true);
      }}
      tabIndex={0}
    />
  );
}
