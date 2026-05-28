// ============================================================
// Stat Card — Metric display card
// ============================================================

import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
  status?: "healthy" | "warning" | "critical";
  className?: string;
}

export function StatCard({
  title, value, subtitle, icon, iconBg = "bg-violet-500/10",
  trend, status, className
}: StatCardProps) {
  const trendColor = trend
    ? trend.value > 0 ? "text-emerald-400" : trend.value < 0 ? "text-red-400" : "text-slate-400"
    : null;

  const TrendIcon = trend
    ? trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus
    : null;

  return (
    <div className={cn(
      "rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition hover:border-slate-700",
      status === "critical" && "border-red-500/30 bg-red-950/10",
      status === "warning" && "border-amber-500/30 bg-amber-950/10",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={cn("rounded-xl p-2.5", iconBg)}>
          {icon}
        </div>
      </div>
      {trend && TrendIcon && (
        <div className={cn("mt-3 flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{Math.abs(trend.value)}% {trend.label}</span>
        </div>
      )}
    </div>
  );
}
