// ============================================================
// Monitoring View — Metrics, Logs, Alerts
// ============================================================

import { Bell, CheckCircle2, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { alerts, cpuMetrics, memoryMetrics, requestMetrics, errorMetrics } from "../data/mockData";
import type { Alert } from "../types";
import { FullChart } from "../components/MiniChart";
import { cn } from "../utils/cn";

const severityConfig = {
  critical: { icon: AlertOctagon, color: "text-red-400", bg: "bg-red-950/30", border: "border-red-500/20", dot: "bg-red-500", label: "Critical" },
  high: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-950/30", border: "border-orange-500/20", dot: "bg-orange-500", label: "High" },
  medium: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-500/20", dot: "bg-amber-400", label: "Medium" },
  low: { icon: Info, color: "text-sky-400", bg: "bg-sky-950/30", border: "border-sky-500/20", dot: "bg-sky-500", label: "Low" },
  info: { icon: Info, color: "text-slate-400", bg: "bg-slate-800/30", border: "border-slate-700", dot: "bg-slate-500", label: "Info" },
};

function AlertRow({ alert }: { alert: Alert }) {
  const cfg = severityConfig[alert.severity];
  const Icon = cfg.icon;

  return (
    <div className={cn(
      "flex items-start gap-4 rounded-xl border p-4 transition",
      alert.acknowledged ? "opacity-60" : "",
      cfg.bg, cfg.border
    )}>
      <div className="mt-0.5">
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", cfg.bg, cfg.color)}>
            {cfg.label}
          </span>
          <p className="text-sm font-medium text-white">{alert.title}</p>
          {alert.acknowledged && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Acknowledged
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">{alert.description}</p>
        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-600">
          <span>Service: <span className="text-slate-500">{alert.service}</span></span>
          <span>{alert.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

export function MonitoringView() {
  const unacked = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Alert summary */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Active Alerts", value: unacked, color: "text-red-400" },
          { label: "Critical", value: alerts.filter(a => a.severity === "critical").length, color: "text-red-400" },
          { label: "High", value: alerts.filter(a => a.severity === "high").length, color: "text-orange-400" },
          { label: "Medium", value: alerts.filter(a => a.severity === "medium").length, color: "text-amber-400" },
          { label: "Acknowledged", value: alerts.filter(a => a.acknowledged).length, color: "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Metrics charts */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: "CPU Usage (%)", data: cpuMetrics, color: "#22d3ee" },
          { title: "Memory Usage (%)", data: memoryMetrics, color: "#a78bfa" },
          { title: "Request Rate (req/s)", data: requestMetrics, color: "#34d399" },
          { title: "Error Rate (%)", data: errorMetrics, color: "#f87171" },
        ].map((chart) => (
          <div key={chart.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">{chart.title}</h4>
              <span className="text-sm font-bold" style={{ color: chart.color }}>
                {chart.data[chart.data.length - 1].value.toFixed(1)}
              </span>
            </div>
            <FullChart data={chart.data} color={chart.color} height={80} />
          </div>
        ))}
      </div>

      {/* Monitoring stack */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">📊 Monitoring Stack</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              name: "Prometheus",
              icon: "🔥",
              status: "running",
              port: "9090",
              desc: "Metrics scraping & storage (30d retention)",
              color: "amber",
            },
            {
              name: "Grafana",
              icon: "📊",
              status: "running",
              port: "3000",
              desc: "Visualization dashboards & alerting UI",
              color: "orange",
            },
            {
              name: "Loki",
              icon: "📋",
              status: "running",
              port: "3100",
              desc: "Log aggregation (31d retention)",
              color: "violet",
            },
            {
              name: "Alertmanager",
              icon: "🔔",
              status: "running",
              port: "9093",
              desc: "Alert routing → Slack / email / PagerDuty",
              color: "red",
            },
          ].map((tool) => (
            <div key={tool.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{tool.icon}</span>
                <p className="font-semibold text-white">{tool.name}</p>
              </div>
              <p className="mt-2 text-xs text-slate-400">{tool.desc}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-xs text-slate-600">:{tool.port}</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  running
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts list */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-white">All Alerts</h3>
          {unacked > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {unacked} unacknowledged
            </span>
          )}
        </div>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </div>
  );
}
