/* ============================================================
   六模块强调色（五色 + 个人中心白）单点配置
   全局底色统一现代简约浅色系，五色只作小面积强调
   ============================================================ */

export type AccentKey = "slate" | "meadow" | "breeze" | "terra" | "coral" | "iris";

export interface AccentClasses {
  softBg: string; // 淡底
  text: string; // 强调文字
  border: string; // 边框
  dot: string; // 小圆点
  iconWrap: string; // 图标容器
  gradient: string; // 小面积渐变
}

export const accents: Record<AccentKey, AccentClasses> = {
  slate: {
    softBg: "bg-frost-100",
    text: "text-ink-700",
    border: "border-frost-200",
    dot: "bg-ink-500",
    iconWrap: "bg-ink-500/10 text-ink-700",
    gradient: "from-frost-100 to-frost-200",
  },
  meadow: {
    softBg: "bg-meadow-50",
    text: "text-meadow-600",
    border: "border-meadow-100",
    dot: "bg-meadow-500",
    iconWrap: "bg-meadow-50 text-meadow-600",
    gradient: "from-meadow-50 to-meadow-100",
  },
  breeze: {
    softBg: "bg-breeze-50",
    text: "text-breeze-600",
    border: "border-breeze-100",
    dot: "bg-breeze-500",
    iconWrap: "bg-breeze-50 text-breeze-600",
    gradient: "from-breeze-50 to-breeze-100",
  },
  terra: {
    softBg: "bg-terra-50",
    text: "text-terra-600",
    border: "border-terra-100",
    dot: "bg-terra-500",
    iconWrap: "bg-terra-50 text-terra-600",
    gradient: "from-terra-50 to-terra-100",
  },
  coral: {
    softBg: "bg-coral-50",
    text: "text-coral-600",
    border: "border-coral-100",
    dot: "bg-coral-500",
    iconWrap: "bg-coral-50 text-coral-600",
    gradient: "from-coral-50 to-coral-100",
  },
  iris: {
    softBg: "bg-iris-50",
    text: "text-iris-600",
    border: "border-iris-100",
    dot: "bg-iris-500",
    iconWrap: "bg-iris-50 text-iris-600",
    gradient: "from-iris-50 to-iris-100",
  },
};
