import React from "react";

/* 页面内容容器：大留白 + 淡入动画 */
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`min-h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-up ${className}`}>
      {children}

      {/* 页面最底部版权信息（不占固定底栏） */}
      <footer className="mt-10 pt-6 border-t border-frost-100 flex items-center justify-center gap-4 flex-wrap text-xs text-ink-400">
        <span className="font-medium text-ink-600">南部县第二小学</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink-700 transition-colors"
        >
          蜀ICP备2026018222号-1
        </a>
      </footer>
    </div>
  );
}
