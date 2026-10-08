"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { disableShare, enableShare } from "@/lib/actions";

// 轉發：產生公開唯讀連結，再用 LINE / Email / 系統分享 / 複製 送出
export function ShareMenu({ id, title, token: initialToken }: { id: string; title: string; token: string | null }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  // 點外面或按 Esc 關閉
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/s/${token}` : "";
  const text = `${title}\n${url}`;
  // 面板只在點擊後於瀏覽器端出現，可直接判斷（手機的系統分享選單）
  const canShare = open && typeof navigator.share === "function";

  return (
    <div className="share" ref={box}>
      <button type="button" className={`btn plain small ${token ? "shared" : ""}`} onClick={() => setOpen((v) => !v)}>
        ↗ 轉發{token ? " · 分享中" : ""}
      </button>
      {open && (
        <div className="share-pop card">
          {!token ? (
            <>
              <p className="note">
                文檔庫需要登入才能看。建立一個<b>公開唯讀連結</b>，拿到連結的人不用登入就能閱讀這份文件（不能編輯），隨時可以停止分享。
              </p>
              <button
                type="button"
                className="btn small"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await enableShare(id);
                    if (res.token) setToken(res.token);
                  })
                }
              >
                {pending ? "建立中…" : "建立分享連結"}
              </button>
            </>
          ) : (
            <>
              <div className="share-url">
                <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
                <button
                  type="button"
                  className="btn small"
                  onClick={async () => {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "已複製" : "複製"}
                </button>
              </div>
              <div className="share-btns">
                <a className="btn plain small" href={`https://line.me/R/share?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                  LINE
                </a>
                <a className="btn plain small" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`}>
                  Email
                </a>
                {canShare && (
                  <button type="button" className="btn plain small" onClick={() => navigator.share({ title, url }).catch(() => {})}>
                    更多…
                  </button>
                )}
                <a className="btn plain small" href={url} target="_blank" rel="noreferrer">
                  預覽
                </a>
              </div>
              <button
                type="button"
                className="btn danger small"
                disabled={pending}
                onClick={() => {
                  if (!confirm("停止分享後，已經傳出去的連結會失效。確定嗎？")) return;
                  startTransition(async () => {
                    await disableShare(id);
                    setToken(null);
                  });
                }}
              >
                停止分享
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
