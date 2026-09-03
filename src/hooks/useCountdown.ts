import { useEffect, useState } from "react";

/* ============================================================
   useCountdown：验证码倒计时
   ============================================================ */

export function useCountdown(initial = 60) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const start = (n: number = initial) => setSeconds(n);
  const reset = () => setSeconds(0);

  return { seconds, active: seconds > 0, start, reset };
}
