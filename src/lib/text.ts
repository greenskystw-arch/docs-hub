// 標籤：以逗號（全形/半形）、頓號或換行分隔，去掉開頭的 #
export function parseTags(raw: string) {
  const out: string[] = [];
  for (const part of raw.split(/[,，、\n]+/)) {
    const t = part.trim().replace(/^#+/, "").trim().slice(0, 30);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// 列表摘要：拿掉 Markdown 符號
export function excerpt(md: string, len = 120) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, len);
}

// 下載檔名：移除 Windows 不允許的字元
export function safeFileName(title: string) {
  return (title.replace(/[\\/:*?"<>|\r\n]+/g, " ").trim() || "untitled").slice(0, 80);
}

// 匯入 .md：第一個 # 標題當文件標題，其餘當內容
export function splitTitle(md: string, fallback: string) {
  const m = md.match(/^\s*#\s+(.+)\n?/);
  if (m) return { title: m[1].trim(), content: md.slice(m[0].length).replace(/^\n+/, "") };
  return { title: fallback, content: md };
}

export function formatDay(d: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDate(d: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
