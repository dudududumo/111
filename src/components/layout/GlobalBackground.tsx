/* 全局柔和光晕背景（雾蓝，克制不抢眼） */
export default function GlobalBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      <div className="absolute -top-40 -right-24 w-[34rem] h-[34rem] bg-mist-200/35 rounded-full halo"></div>
      <div className="absolute -bottom-48 -left-32 w-[36rem] h-[36rem] bg-mist-200/25 rounded-full halo"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] bg-mist-100/30 rounded-full halo"></div>
    </div>
  );
}
