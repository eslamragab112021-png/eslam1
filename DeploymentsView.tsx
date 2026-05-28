// ============================================================
// Deployments View — Multi-target deployment status
// ============================================================

import { Globe, CheckCircle, AlertTriangle, Loader2, XCircle, ExternalLink } from "lucide-react";
import { deploymentTargets } from "../data/mockData";
import type { DeploymentTarget } from "../types";
import { cn } from "../utils/cn";

const statusConfig = {
  healthy: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Online" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Warning" },
  critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Down" },
  deploying: { icon: Loader2, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", label: "Deploying" },
  unknown: { icon: Globe, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-700", label: "Unknown" },
  building: { icon: Loader2, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", label: "Building" },
};

function TargetCard({ target }: { target: DeploymentTarget }) {
  const cfg = statusConfig[target.status];
  const Icon = cfg.icon;

  return (
    <div className={cn(
      "rounded-2xl border p-5 transition hover:scale-[1.01]",
      cfg.bg, cfg.border
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{target.icon}</span>
          <div>
            <p className="font-semibold text-white">{target.name}</p>
            <p className="text-xs text-slate-400">{target.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", cfg.color, target.status === "deploying" && "animate-spin")} />
          <span className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Region</span>
          <span className="text-slate-300">{target.region}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Last Deploy</span>
          <span className="text-slate-300">{target.lastDeploy}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">URL</span>
          <a
            href={target.url.startsWith("http") ? target.url : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono text-violet-400 hover:text-violet-300 transition"
          >
            {target.url.replace("https://", "").slice(0, 28)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function DeploymentsView() {
  const onlineCount = deploymentTargets.filter(t => t.status === "healthy").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Targets", value: deploymentTargets.length, color: "text-white" },
          { label: "Online", value: onlineCount, color: "text-emerald-400" },
          { label: "Deploying", value: deploymentTargets.filter(t => t.status === "deploying").length, color: "text-violet-400" },
          { label: "Issues", value: deploymentTargets.filter(t => t.status === "warning" || t.status === "critical").length, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Targets grid */}
      <div className="grid grid-cols-3 gap-4">
        {deploymentTargets.map((t) => (
          <TargetCard key={t.name} target={t} />
        ))}
      </div>

      {/* Deployment guide */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Deployment Guides</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              title: "🖥️ VPS / DigitalOcean",
              steps: [
                "git clone your repo",
                "cp .env.example .env && nano .env",
                "./scripts/setup-ssl.sh --domain yourdomain.com",
                "docker-compose up -d",
                "./scripts/health-check.sh",
              ],
            },
            {
              title: "▲ Vercel",
              steps: [
                "vercel login",
                "vercel --prod",
                "Set env vars in Vercel dashboard",
                "Configure custom domain",
                "Enable Vercel Analytics",
              ],
            },
            {
              title: "🚂 Railway",
              steps: [
                "railway login",
                "railway init",
                "railway up",
                "railway domain",
                "railway vars set KEY=VALUE",
              ],
            },
          ].map((guide) => (
            <div key={guide.title} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="mb-3 text-xs font-bold text-white">{guide.title}</p>
              <ol className="space-y-1.5">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-400">
                    <span className="shrink-0 font-bold text-slate-600">{i + 1}.</span>
                    <code className="font-mono">{step}</code>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
