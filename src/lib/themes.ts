export const THEMES = [
  { id: "auto", name: "跟隨系統", swatch: "linear-gradient(90deg,#fff 50%,#11161d 50%)" },
  { id: "mint", name: "清新綠", swatch: "#2f7d6d" },
  { id: "latte", name: "奶茶暖色", swatch: "#b5704a" },
  { id: "ocean", name: "海洋藍", swatch: "#2563a8" },
  { id: "sakura", name: "櫻花粉", swatch: "#c4577d" },
  { id: "night", name: "夜間深色", swatch: "#1a212b" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function isThemeId(v: unknown): v is ThemeId {
  return THEMES.some((t) => t.id === v);
}
