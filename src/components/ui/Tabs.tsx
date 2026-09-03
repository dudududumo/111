import { accents, type AccentKey } from "./accents";

/* ============================================================
   Tabs：玻璃胶囊容器，激活项 = 白底 + 强调色文字
   ============================================================ */

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  accent?: AccentKey;
  className?: string;
}

export default function Tabs({ items, active, onChange, accent = "slate", className = "" }: TabsProps) {
  const a = accents[accent];
  return (
    <div className={`inline-flex flex-wrap gap-1 rounded-xl bg-frost-100 p-1 ${className}`}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
              isActive ? "bg-white shadow-card " + a.text : "text-ink-500 hover:text-ink-700"
            }`}
          >
            {item.label}
            {typeof item.count === "number" && item.count > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] font-semibold ${isActive ? a.softBg : "bg-frost-200 text-ink-500"}`}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
