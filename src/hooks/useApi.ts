import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   useApi：通用请求 hook（加载态 + 竞态守卫 + refresh）
   ============================================================ */

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });
  const seq = useRef(0);

  const run = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (id === seq.current) setState({ data, loading: false, error: null });
    } catch (e: any) {
      if (id === seq.current) setState({ data: null, loading: false, error: e?.message || "请求失败" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      seq.current++;
    };
  }, [run]);

  return { ...state, refresh: run };
}
