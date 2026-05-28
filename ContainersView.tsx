// ============================================================
// Docker Containers View
// ============================================================

import { Container, Cpu, HardDrive, Activity } from "lucide-react";
import { containers } from "../data/mockData";
import type { DockerContainer } from "../types";
import { cn } from "../utils/cn";

const healthConfig = {
  healthy: { label: "healthy", color: "text-emerald-400", dot: "bg-emerald-500" },
  unhealthy: { label: "unhealthy", color: "text-red-400", dot: "bg-red-500" },
  starting: { label: "starting", color: "text-amber-400", dot: "bg-amber-500 animate-pulse" },
  none: { label: "no check", color: "text-slate-500", dot: "bg-slate-600" },
};

function ContainerRow({ c }: { c: DockerContainer }) {
  const hc = healthConfig[c.health];
  const memPct = Math.round((c.memory / c.memoryLimit) * 100);

  return (
    <div className="grid grid-cols-12 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3.5 transition hover:border-slate-700 hover:bg-slate-900/80">
      {/* Name & Image */}
      <div className="col-span-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", hc.dot)} />
          <p className="truncate text-sm font-medium text-white">{c.name}</p>
        </div>
        <p className="mt-0.5 truncate pl-4 text-xs text-slate-500">{c.image.split(":")[0].split("/").pop()}</p>
      </div>

      {/* Status */}
      <div className="col-span-1">
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
          {c.status}
        </span>
      </div>

      {/* Health */}
      <div className="col-span-1">
        <span className={cn("text-xs", hc.color)}>{hc.label}</span>
      </div>

      {/* CPU */}
      <div className="col-span-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold", c.cpu > 80 ? "text-red-400" : c.cpu > 60 ? "text-amber-400" : "text-slate-300")}>
            {c.cpu.toFixed(1)}%
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-slate-800">
            <div
              className={cn("h-full rounded-full", c.cpu > 80 ? "bg-red-500" : c.cpu > 60 ? "bg-amber-500" : "bg-violet-500")}
              style={{ width: `${Math.min(100, c.cpu)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Memory */}
      <div className="col-span-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold", memPct > 80 ? "text-red-400" : memPct > 60 ? "text-amber-400" : "text-slate-300")}>
            {c.memory}MB
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-slate-800">
            <div
              className={cn("h-full rounded-full", memPct > 80 ? "bg-red-500" : memPct > 60 ? "bg-amber-500" : "bg-sky-500")}
              style={{ width: `${memPct}%` }}
            />
          </div>
        </div>
        <p className="text-[10px] text-slate-600">{c.memory}/{c.memoryLimit}MB</p>
      </div>

      {/* Ports */}
      <div className="col-span-2">
        <div className="flex flex-wrap gap-1">
          {c.ports.length === 0 ? (
            <span className="text-xs text-slate-600">none</span>
          ) : c.ports.map((p) => (
            <span key={p} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Uptime & Restarts */}
      <div className="col-span-1 text-right">
        <p className="text-xs text-slate-400">{c.uptime}</p>
        {c.restarts > 0 && (
          <p className="text-[10px] text-amber-400">⚠️ {c.restarts} restart{c.restarts > 1 ? "s" : ""}</p>
        )}
      </div>
    </div>
  );
}

export function ContainersView() {
  const totalCpu = containers.reduce((a, c) => a + c.cpu, 0);
  const totalMem = containers.reduce((a, c) => a + c.memory, 0);
  const healthyCount = containers.filter(c => c.health === "healthy").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Running Containers", value: containers.length, icon: <Container className="h-4 w-4 text-violet-400" />, sub: "6 services" },
          { label: "Healthy", value: healthyCount, icon: <Activity className="h-4 w-4 text-emerald-400" />, sub: `${containers.length - healthyCount} no healthcheck` },
          { label: "Total CPU", value: `${totalCpu.toFixed(1)}%`, icon: <Cpu className="h-4 w-4 text-sky-400" />, sub: "across all containers" },
          { label: "Total Memory", value: `${totalMem}MB`, icon: <HardDrive className="h-4 w-4 text-amber-400" />, sub: "allocated" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <div className="rounded-lg bg-slate-800 p-2">{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-[10px] text-slate-600">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Docker Compose files info */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Docker Compose Files</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              file: "docker-compose.yml",
              desc: "Production stack: Nginx + Watchtower",
              services: ["frontend", "watchtower"],
              env: "production",
            },
            {
              file: "docker-compose.dev.yml",
              desc: "Development with Vite HMR",
              services: ["frontend-dev"],
              env: "development",
            },
            {
              file: "docker-compose.monitoring.yml",
              desc: "Prometheus + Grafana + Loki + Alertmanager",
              services: ["prometheus", "grafana", "loki", "promtail", "alertmanager", "nginx-exporter", "node-exporter"],
              env: "monitoring",
            },
          ].map((f) => (
            <div key={f.file} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="font-mono text-xs font-bold text-violet-400">{f.file}</p>
              <p className="mt-1 text-xs text-slate-400">{f.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {f.services.map((s) => (
                  <span key={s} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Container list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Running Containers</h3>
        </div>

        {/* Header */}
        <div className="grid grid-cols-12 gap-3 border-b border-slate-800 bg-slate-950/40 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          <div className="col-span-3">Container</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Health</div>
          <div className="col-span-2">CPU</div>
          <div className="col-span-2">Memory</div>
          <div className="col-span-2">Ports</div>
          <div className="col-span-1 text-right">Uptime</div>
        </div>

        <div className="divide-y divide-slate-800/50 p-3 space-y-1.5">
          {containers.map((c) => (
            <ContainerRow key={c.id} c={c} />
          ))}
        </div>
      </div>

      {/* Dockerfile info cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">🐳 Dockerfile (Production)</h3>
          <div className="space-y-2">
            {[
              { label: "Base Image", value: "node:20-alpine (Builder)" },
              { label: "Serve Image", value: "nginx:1.27-alpine" },
              { label: "Build Strategy", value: "Multi-stage (2 stages)" },
              { label: "Security", value: "Non-root nginx user" },
              { label: "Health Check", value: "wget /health every 30s" },
              { label: "Platforms", value: "linux/amd64, linux/arm64" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-xs">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-mono text-slate-300">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">🔧 Dockerfile.dev (Development)</h3>
          <div className="space-y-2">
            {[
              { label: "Base Image", value: "node:20-alpine" },
              { label: "Dev Server", value: "Vite (port 5173)" },
              { label: "Hot Reload", value: "Volume mounts + HMR" },
              { label: "Polling", value: "CHOKIDAR_USEPOLLING=true" },
              { label: "Health Check", value: "curl :5173 every 15s" },
              { label: "Node Modules", value: "Isolated in container" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-xs">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-mono text-slate-300">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
