import { useCallback, useState } from "react";

/* ============================================================
   useModal：弹窗开关
   ============================================================ */

export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return { open, openModal, closeModal, toggle };
}
