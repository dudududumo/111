import React from "react";

/* 页面内容容器：大留白 + 淡入动画 */
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-up ${className}`}>
      {children}
    </div>
  );
}
