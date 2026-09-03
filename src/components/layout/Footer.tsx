/* 页脚：透明无底 */
export default function Footer() {
  return (
    <footer className="py-4 px-6 text-center text-xs text-ink-400 flex-shrink-0">
      <div className="flex items-center justify-center gap-4">
        <span className="font-medium text-ink-600">南部县第二小学</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink-700 transition-colors"
        >
          蜀ICP备2026018222号-1
        </a>
      </div>
    </footer>
  );
}
