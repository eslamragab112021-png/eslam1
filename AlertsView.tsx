// ============================================================
// Alerts View
// ============================================================

import { useState } from "react";
import { Bell, CheckCheck, Filter, AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { alerts as initialAlerts } from "../data/mockData";
import type { Alert, Severity } from "../types";
import { cn } from "../utils/cn";

const severityConfig = {
  critical: { icon: AlertOctagon, color: "text-red-400", bg: "bg-red-950/40", border: "border-red-500/30", badge: "bg-red-500/20 text-red-400" },
  high: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-950/40", border: "border-orange-500/30", badge: "bg-orange-500/20 text-orange-400" },
  medium: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-400" },
  low: { icon: Info, color: "text-sky-400", bg: "bg-sky-950/40", border: "border-sky-500/30", badge: "bg-sky-500/20 text-sky-400" },
  info: { icon: Info, color: "text-slate-400", bg: "bg-slate-800/40", border: "border-slate-700", badge: "bg-slate-700 text-slate-400" },
};

export function AlertsView() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [filter, setFilter] = useState<"all" | Severity>("all");

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);
  const unacked = alerts.filter(a => !a.acknowledged).length;

  const acknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  };

  const acknowledgeAll = () => {
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: alerts.length, color: "text-white" },
          { label: "Critical", value: alerts.filter(a => a.severity === "critical").length, color: "text-red-400" },
          { label: "High", value: alerts.filter(a => a.severity === "high").length, color: "text-orange-400" },
          { label: "Medium", value: alerts.filter(a => a.severity === "medium").length, color: "text-amber-400" },
          { label: "Unacknowledged", value: unacked, color: "text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          {(["all", "critical", "high", "medium", "low"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition capitalize",
                filter === f
                  ? "bg-violet-600 text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        {unacked > 0 && (
          <button
            onClick={acknowledgeAll}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Acknowledge All
          </button>
        )}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Bell className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">No alerts found</p>
          </div>
        )}
        {filtered.map((alert) => {
          const cfg = severityConfig[alert.severity];
          const Icon = cfg.icon;
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 transition",
                cfg.bg, cfg.border,
                alert.acknowledged && "opacity-50"
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", cfg.badge)}>
                    {alert.severity}
                  </span>
                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">{alert.description}</p>
                <div className="mt-1.5 flex gap-3 text-[10px] text-slate-600">
                  <span>Service: <span className="text-slate-500">{alert.service}</span></span>
                  <span>{alert.timestamp}</span>
                </div>
              </div>
              {!alert.acknowledged ? (
                <button
                  onClick={() => acknowledge(alert.id)}
                  className="shrink-0 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                  Acknowledge
                </button>
              ) : (
                <span className="shrink-0 flex items-center gap-1 text-xs text-slate-600">
                  <CheckCheck className="h-3 w-3 text-emerald-700" />
                  ACK'd
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
