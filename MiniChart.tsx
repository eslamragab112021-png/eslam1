// ============================================================
// Mini Sparkline Chart — SVG-based, zero dependencies
// ============================================================

import type { MetricPoint } from "../types";

interface MiniChartProps {
  data: MetricPoint[];
  color?: string;
  height?: number;
  showArea?: boolean;
  label?: string;
}

export function MiniChart({
  data, color = "#8b5cf6", height = 48, showArea = true, label
}: MiniChartProps) {
  if (!data.length) return null;

  const width = 200;
  const padding = 2;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: padding + (i / (values.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = [
    `M ${points[0].x} ${height}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${height}`,
    "Z",
  ].join(" ");

  const gradientId = `grad-${color.replace("#", "").slice(0, 6)}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <div className="relative">
      {label && (
        <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      )}
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {showArea && (
          <path d={areaPath} fill={`url(#${gradientId})`} />
        )}
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Latest value dot */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={color}
        />
      </svg>
    </div>
  );
}

// Larger full chart
interface ChartProps {
  data: MetricPoint[];
  color?: string;
  height?: number;
  showLabels?: boolean;
  unit?: string;
  title?: string;
}

export function FullChart({ data, color = "#8b5cf6", height = 120, showLabels = true, title }: Omit<ChartProps, 'unit'> & { unit?: string }) {
  if (!data.length) return null;

  const width = 600;
  const paddingX = 8;
  const paddingY = 8;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: paddingX + (i / (values.length - 1)) * (width - paddingX * 2),
    y: paddingY + (1 - (v - min) / range) * (height - paddingY * 2),
    value: v,
    label: data[i].time,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = [
    `M ${points[0].x} ${height}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${height}`,
    "Z",
  ].join(" ");

  const gradId = `full-grad-${Math.random().toString(36).slice(2, 8)}`;

  // Show every 4th label
  const visibleLabels = points.filter((_, i) => i % 4 === 0 || i === points.length - 1);

  return (
    <div>
      {title && <p className="mb-2 text-xs font-medium text-slate-400">{title}</p>}
      <svg width="100%" viewBox={`0 0 ${width} ${height + (showLabels ? 20 : 0)}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={paddingX}
            y1={paddingY + frac * (height - paddingY * 2)}
            x2={width - paddingX}
            y2={paddingY + frac * (height - paddingY * 2)}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="4"
          fill={color}
          stroke="#0f172a"
          strokeWidth="2"
        />

        {/* Time labels */}
        {showLabels && visibleLabels.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height + 14}
            textAnchor="middle"
            fill="#475569"
            fontSize="9"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
