// 分類可選顏色（亮/暗主題都清楚）
export const CATEGORY_COLORS = [
  { id: "green", name: "綠", hex: "#2f9e77" },
  { id: "blue", name: "藍", hex: "#3b82f6" },
  { id: "purple", name: "紫", hex: "#8b5cf6" },
  { id: "pink", name: "粉", hex: "#e0568a" },
  { id: "orange", name: "橘", hex: "#f08c2e" },
  { id: "red", name: "紅", hex: "#e5484d" },
  { id: "teal", name: "青", hex: "#0ea5a4" },
  { id: "gray", name: "灰", hex: "#8a94a3" },
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number]["id"];

export function colorHex(id: string) {
  return CATEGORY_COLORS.find((c) => c.id === id)?.hex ?? CATEGORY_COLORS[0].hex;
}

export function isCategoryColor(v: unknown): v is CategoryColor {
  return CATEGORY_COLORS.some((c) => c.id === v);
}
