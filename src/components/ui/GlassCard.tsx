import React from "react";

/* ============================================================
   玻璃卡：毛玻璃 + 悬浮浮影 + 按下微沉
   ============================================================ */

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: React.ElementType;
  [key: string]: any;
}

export default function GlassCard({ children, className = "", hover = true, as, ...rest }: GlassCardProps) {
  const Tag = (as || "div") as React.ElementType;
  return (
    <Tag
      className={`glass rounded-2xl ${hover ? "glass-hover" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
