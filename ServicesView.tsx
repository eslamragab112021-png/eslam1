// ============================================================
// Services View — All microservices status
// ============================================================

import { services } from "../data/mockData";
import type { Service } from "../types";
import { MiniChart } from "../components/MiniChart";
import { cn } from "../utils/cn";
import { Activity, Server, Cpu, HardDrive, GitBranch, AlertTriangle } from "lucide-react";

const statusDot: Record<string, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500 animate-pulse",
  critical: "bg-red-500 animate-pulse",
  unknown: "bg-slate-500",
};

const statusText: Record<string, string> = {
  healthy: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  unknown: "text-slate-400",
};

function ServiceCard({ svc }: { svc: Service }) {
  const sparkData = Array.from({ length: 20 }, () => ({
    time: "",
    value: svc.cpu + (Math.random() - 0.5) * 30,
  }));

  const errColor = svc.errorRate === 0 ? "text-emerald-400" : svc.errorRate > 0.5 ? "text-red-400" : "text-amber-400";

  return (
    <div className={cn(
      "rounded-2xl border bg-slate-900/60 p-5 transition hover:border-slate-600",
      svc.status === "critical" ? "border-red-500/30" :
      svc.status === "warning" ? "border-amber-500/30" :
      "border-slate-800"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", statusDot[svc.status])} />
          <div>
            <p className="font-semibold text-white">{svc.name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <GitBranch className="h-3 w-3" />
              <span>v{svc.version}</span>
              <span>•</span>
              <span>{svc.environment}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className={cn("text-sm font-bold", statusText[svc.status])}>
            {svc.uptime}
          </span>
          <p className="text-xs text-slate-500">uptime</p>
        </div>
      </div>

      {/* Spark chart */}
      <div className="my-3">
        <MiniChart
          data={sparkData}
          color={svc.status === "healthy" ? "#22c55e" : svc.status === "warning" ? "#f59e0b" : "#ef4444"}
          height={40}
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Latency", value: `${svc.latency}ms`, icon: <Activity className="h-3 w-3" /> },
          { label: "Requests/hr", value: svc.requests.toLocaleString(), icon: <Server className="h-3 w-3" /> },
          { label: "Error Rate", value: `${svc.errorRate}%`, icon: <AlertTriangle className="h-3 w-3" />, valueClass: errColor },
          { label: "Last Deploy", value: svc.lastDeploy, icon: <GitBranch className="h-3 w-3" /> },
        ].map((m) => (
          <div key={m.label} className="rounded-lg bg-slate-800/50 px-2.5 py-2">
            <div className="flex items-center gap-1 text-slate-500">{m.icon}<span className="text-[10px]">{m.label}</span></div>
            <p className={cn("mt-0.5 text-sm font-bold text-white", m.valueClass)}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Resource bars */}
      <div className="mt-3 space-y-1.5">
        {[
          { label: "CPU", value: svc.cpu, icon: <Cpu className="h-3 w-3" /> },
          { label: "Memory", value: svc.memory, icon: <HardDrive className="h-3 w-3" /> },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="text-slate-500">{r.icon}</span>
            <span className="w-12 text-[10px] text-slate-500">{r.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800">
              <div
                className={cn("h-full rounded-full", r.value > 85 ? "bg-red-500" : r.value > 70 ? "bg-amber-500" : "bg-violet-500")}
                style={{ width: `${r.value}%` }}
              />
            </div>
            <span className={cn("w-8 text-right text-[10px] font-bold", r.value > 85 ? "text-red-400" : r.value > 70 ? "text-amber-400" : "text-slate-400")}>
              {r.value}%
            </span>
          </div>
        ))}
      </div>

      {/* Replicas */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2">
        <span className="text-xs text-slate-500">Replicas</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: svc.replicas.desired }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full",
                i < svc.replicas.running ? "bg-emerald-500" : "bg-red-500"
              )}
            />
          ))}
          <span className="ml-1 text-xs font-bold text-white">
            {svc.replicas.running}/{svc.replicas.desired}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ServicesView() {
  const healthyCount = services.filter(s => s.status === "healthy").length;
  const avgLatency = Math.round(services.reduce((a, s) => a + s.latency, 0) / services.length);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Services", value: services.length, color: "text-white" },
          { label: "Healthy", value: healthyCount, color: "text-emerald-400" },
          { label: "Needs Attention", value: services.length - healthyCount, color: "text-amber-400" },
          { label: "Avg Latency", value: `${avgLatency}ms`, color: "text-sky-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {services.map((svc) => (
          <ServiceCard key={svc.id} svc={svc} />
        ))}
      </div>
    </div>
  );
}
