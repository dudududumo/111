/* recharts 统一主题：去硬网格、柔和渐变填充、圆角柱 */
export const chartTheme = {
  grid: {
    stroke: "#eef0f3",
    strokeDasharray: "3 6",
    vertical: false,
  },
  axis: {
    tick: { fill: "#9ca3af", fontSize: 11 },
    axisLine: { stroke: "#e6e9ec" },
    tickLine: false,
  },
  tooltip: {
    contentStyle: {
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(12px)",
      borderRadius: 12,
      border: "1px solid #e6e9ec",
      boxShadow: "0 8px 30px -8px rgba(17,24,39,0.12)",
      fontSize: 12,
    },
  },
  legend: {
    iconType: "circle" as const,
    iconSize: 8,
    wrapperStyle: { fontSize: 12, color: "#6b7280" },
  },
};

export const chartGradients = (id: string, from: string, to: string) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={from} stopOpacity={0.9} />
      <stop offset="100%" stopColor={to} stopOpacity={0.15} />
    </linearGradient>
  </defs>
);

export const barRadius = [8, 8, 0, 0] as [number, number, number, number];
