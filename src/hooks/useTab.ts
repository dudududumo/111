import { useState } from "react";

/* ============================================================
   useTab：tab 状态（可选 URL 同步）
   ============================================================ */

export function useTab<T extends string>(tabs: readonly T[], initial: T) {
  const valid = tabs.includes(initial) ? initial : tabs[0];
  const [active, setActive] = useState<T>(valid);

  const setTab = (key: T) => {
    if (tabs.includes(key)) setActive(key);
  };

  return { active, setTab };
}
