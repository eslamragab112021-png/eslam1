// ============================================================
// Overview Dashboard Tab
// ============================================================

import {
  Activity, Server, GitBranch, Shield, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Zap, Database
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { MiniChart, FullChart } from "../components/MiniChart";
import { services, alerts, pipelineRuns, cpuMetrics, memoryMetrics, requestMetrics } from "../data/mockData";
import { cn } from "../utils/cn";

const statusColor: Record<string, string> = {
  healthy: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-red-400",
  deploying: "text-violet-400",
};

const statusBg: Record<string, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  deploying: "bg-violet-500",
};

export function OverviewView() {
  const criticalCount = alerts.filter(a => a.severity === "critical" && !a.acknowledged).length;
  const healthyServices = services.filter(s => s.status === "healthy").length;
  const totalReqs = services.reduce((acc, s) => acc + s.requests, 0);
  const lastPipe = pipelineRuns[0];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Services Online"
          value={`${healthyServices}/${services.length}`}
          subtitle="2 need attention"
          icon={<Server className="h-5 w-5 text-violet-400" />}
          iconBg="bg-violet-500/10"
          trend={{ value: 0, label: "stable" }}
        />
        <StatCard
          title="Total Requests/hr"
          value={totalReqs.toLocaleString()}
          subtitle="across all services"
          icon={<Activity className="h-5 w-5 text-sky-400" />}
          iconBg="bg-sky-500/10"
          trend={{ value: 12, label: "vs last hour" }}
        />
        <StatCard
          title="Active Alerts"
          value={criticalCount}
          subtitle="critical unacknowledged"
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
          iconBg="bg-red-500/10"
          status={criticalCount > 0 ? "critical" : "healthy"}
        />
        <StatCard
          title="Last Deploy"
          value="2h ago"
          subtitle={lastPipe.branch + " → " + lastPipe.environment}
          icon={<GitBranch className="h-5 w-5 text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          trend={{ value: 0, label: "successful" }}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Request Volume (24h)</h3>
              <p className="text-xs text-slate-500">HTTP requests per hour across all services</p>
            </div>
            <span className="text-2xl font-bold text-white">
              {requestMetrics[requestMetrics.length - 1].value.toFixed(0)}
              <span className="ml-1 text-xs font-normal text-slate-400">req/s</span>
            </span>
          </div>
          <FullChart data={requestMetrics} color="#8b5cf6" height={100} />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">System Resources</h3>
          <div className="space-y-4">
            {[
              { label: "CPU Usage", data: cpuMetrics, color: "#22d3ee", current: cpuMetrics[cpuMetrics.length-1].value },
              { label: "Memory Usage", data: memoryMetrics, color: "#a78bfa", current: memoryMetrics[memoryMetrics.length-1].value },
            ].map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex justify-between">
                  <span className="text-xs text-slate-400">{m.label}</span>
                  <span className={cn("text-xs font-bold", m.current > 80 ? "text-red-400" : m.current > 60 ? "text-amber-400" : "text-emerald-400")}>
                    {m.current.toFixed(1)}%
                  </span>
                </div>
                <MiniChart data={m.data} color={m.color} height={36} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services + Recent Activity */}
      <div className="grid grid-cols-2 gap-4">
        {/* Service health */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Service Health</h3>
          <div className="space-y-2.5">
            {services.map((svc) => (
              <div key={svc.id} className="flex items-center gap-3 rounded-xl bg-slate-800/40 px-4 py-3">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", statusBg[svc.status] ?? "bg-slate-500")} />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">{svc.name}</p>
                  <p className="text-xs text-slate-500">v{svc.version} • {svc.lastDeploy}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-xs font-bold", statusColor[svc.status])}>{svc.uptime}</p>
                  <p className="text-xs text-slate-500">{svc.latency}ms</p>
                </div>
                <div className="w-16">
                  <MiniChart
                    data={Array.from({ length: 12 }, () => ({
                      time: "",
                      value: svc.cpu + (Math.random() - 0.5) * 20
                    }))}
                    color={svc.status === "healthy" ? "#22c55e" : svc.status === "warning" ? "#f59e0b" : "#ef4444"}
                    height={28}
                    showArea={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent events */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Recent Events</h3>
          <div className="space-y-2">
            {[
              { icon: "🚀", text: "Deployed v1.4.2 to production", time: "2h ago", type: "deploy" },
              { icon: "✅", text: "CI/CD pipeline #1247 passed (4m 32s)", time: "12m ago", type: "ci" },
              { icon: "🔒", text: "Security scan: 0 critical findings", time: "12m ago", type: "security" },
              { icon: "⚠️", text: "Redis memory usage reached 91%", time: "12m ago", type: "alert" },
              { icon: "🐳", text: "Docker image pushed to ghcr.io", time: "2h ago", type: "docker" },
              { icon: "📦", text: "Weekly dependency PR created", time: "6h ago", type: "deps" },
              { icon: "🔄", text: "SSL certificate auto-renewed", time: "1d ago", type: "ssl" },
              { icon: "📊", text: "Grafana alert: Worker replicas low", time: "4m ago", type: "monitoring" },
            ].map((event, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-slate-800/40 transition">
                <span className="mt-0.5 text-sm">{event.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs text-slate-300">{event.text}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{event.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Infrastructure overview */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <Zap className="h-5 w-5 text-amber-400" />, label: "Uptime SLA", value: "99.97%", sub: "last 30 days", bg: "bg-amber-500/10" },
          { icon: <TrendingUp className="h-5 w-5 text-sky-400" />, label: "Deployments", value: "247", sub: "this month", bg: "bg-sky-500/10" },
          { icon: <CheckCircle className="h-5 w-5 text-emerald-400" />, label: "Pipeline Success", value: "94.3%", sub: "last 100 runs", bg: "bg-emerald-500/10" },
          { icon: <Database className="h-5 w-5 text-violet-400" />, label: "Data Stored", value: "2.4 TB", sub: "across all volumes", bg: "bg-violet-500/10" },
          { icon: <Clock className="h-5 w-5 text-pink-400" />, label: "MTTR", value: "12 min", sub: "mean time to recover", bg: "bg-pink-500/10" },
          { icon: <Shield className="h-5 w-5 text-emerald-400" />, label: "Security Score", value: "A+", sub: "Mozilla Observatory", bg: "bg-emerald-500/10" },
          { icon: <GitBranch className="h-5 w-5 text-indigo-400" />, label: "Open PRs", value: "7", sub: "4 ready to merge", bg: "bg-indigo-500/10" },
          { icon: <Server className="h-5 w-5 text-slate-400" />, label: "Containers", value: "12", sub: "6 services running", bg: "bg-slate-500/10" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <div className={cn("rounded-lg p-2", item.bg)}>{item.icon}</div>
            <div>
              <p className="text-lg font-bold text-white">{item.value}</p>
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="text-[10px] text-slate-600">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
