// 側欄寬度（可拖曳調整，存在 cookie）
export const SIDE_COOKIE = "side_w";
export const SIDE_DEFAULT = 240;
export const SIDE_MIN = 180;
export const SIDE_MAX = 560;

export function clampSide(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(SIDE_MAX, Math.max(SIDE_MIN, n))) : SIDE_DEFAULT;
}
