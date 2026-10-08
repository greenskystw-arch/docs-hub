"use client";

// 轉出 PDF：用瀏覽器列印 →「另存為 PDF」；暫時把頁面標題換成文件標題，當作預設檔名
export function printAsPdf(title: string) {
  const prev = document.title;
  document.title = title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "document";
  const restore = () => {
    document.title = prev;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

export function PrintButton({ title, className = "btn plain small" }: { title: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => printAsPdf(title)} title="列印時選「另存為 PDF」">
      📄 PDF
    </button>
  );
}
