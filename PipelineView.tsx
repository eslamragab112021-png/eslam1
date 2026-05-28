// ============================================================
// CI/CD Pipeline View
// ============================================================

import { CheckCircle2, XCircle, Clock, Loader2, Ban, Circle, GitCommit, GitBranch } from "lucide-react";
import { pipelineRuns } from "../data/mockData";
import type { PipelineRun, PipelineJob } from "../types";
import { cn } from "../utils/cn";

const statusConfig = {
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Passed" },
  running: { icon: Loader2, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", label: "Running" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Failed" },
  cancelled: { icon: Ban, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", label: "Cancelled" },
  pending: { icon: Circle, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", label: "Pending" },
  skipped: { icon: Ban, color: "text-slate-600", bg: "bg-slate-800", border: "border-slate-700", label: "Skipped" },
};

const envBadge = {
  production: "bg-red-500/10 text-red-400 border-red-500/20",
  staging: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  development: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

function JobBadge({ job }: { job: PipelineJob }) {
  const cfg = statusConfig[job.status];
  const Icon = cfg.icon;
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", cfg.bg, cfg.border)}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color, job.status === "running" && "animate-spin")} />
      <span className={cn("text-xs font-medium", cfg.color)}>{job.name}</span>
      {job.duration && (
        <span className="ml-auto text-xs text-slate-500">{job.duration}</span>
      )}
    </div>
  );
}

function PipelineCard({ run }: { run: PipelineRun }) {
  const cfg = statusConfig[run.status];
  const Icon = cfg.icon;

  return (
    <div className={cn(
      "rounded-2xl border bg-slate-900/60 p-5 transition hover:border-slate-700",
      run.status === "running" ? "border-violet-500/30" : "border-slate-800"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 rounded-lg p-2", cfg.bg)}>
            <Icon className={cn("h-4 w-4", cfg.color, run.status === "running" && "animate-spin")} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500">#{run.id}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", envBadge[run.environment])}>
                {run.environment}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.bg, cfg.border, cfg.color)}>
                {cfg.label}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-white">{run.commitMsg}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400">{run.startedAt}</p>
          {run.duration && (
            <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {run.duration}
            </p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          {run.branch}
        </span>
        <span className="flex items-center gap-1">
          <GitCommit className="h-3 w-3" />
          {run.commit}
        </span>
        <span className="flex items-center gap-1">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
            {run.avatar}
          </div>
          {run.author}
        </span>
      </div>

      {/* Jobs */}
      <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {run.jobs.map((job) => (
          <JobBadge key={job.name} job={job} />
        ))}
      </div>
    </div>
  );
}

export function PipelineView() {
  const successCount = pipelineRuns.filter(r => r.status === "success").length;
  const failCount = pipelineRuns.filter(r => r.status === "failed").length;
  const runningCount = pipelineRuns.filter(r => r.status === "running").length;
  const successRate = Math.round((successCount / pipelineRuns.length) * 100);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Runs", value: pipelineRuns.length, color: "text-white" },
          { label: "Success Rate", value: `${successRate}%`, color: "text-emerald-400" },
          { label: "Currently Running", value: runningCount, color: "text-violet-400" },
          { label: "Failed (24h)", value: failCount, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Workflow file info */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">GitHub Actions Workflows</h3>
            <p className="text-xs text-slate-500 mt-0.5">3 workflow files configured</p>
          </div>
          <div className="flex gap-2">
            {[
              { name: "ci-cd.yml", status: "active", color: "emerald" },
              { name: "pr-checks.yml", status: "active", color: "emerald" },
              { name: "dependency-update.yml", status: "scheduled", color: "sky" },
            ].map((w) => (
              <span
                key={w.name}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-mono font-medium",
                  w.color === "emerald" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-sky-500/20 bg-sky-500/10 text-sky-400"
                )}
              >
                {w.name}
              </span>
            ))}
          </div>
        </div>

        {/* Pipeline stages diagram */}
        <div className="mt-5 flex items-center gap-2">
          {[
            { step: "Push/PR", icon: "📤", color: "violet" },
            { step: "Lint + Types", icon: "🔍", color: "sky" },
            { step: "Security", icon: "🔒", color: "amber" },
            { step: "Build", icon: "🏗️", color: "sky" },
            { step: "Docker", icon: "🐳", color: "sky" },
            { step: "Deploy Staging", icon: "🧪", color: "amber" },
            { step: "Deploy Prod", icon: "🚀", color: "emerald" },
            { step: "Notify", icon: "📢", color: "slate" },
          ].map((s, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-3 py-2",
                s.color === "violet" ? "border-violet-500/30 bg-violet-500/10" :
                s.color === "sky" ? "border-sky-500/30 bg-sky-500/10" :
                s.color === "amber" ? "border-amber-500/30 bg-amber-500/10" :
                s.color === "emerald" ? "border-emerald-500/30 bg-emerald-500/10" :
                "border-slate-700 bg-slate-800"
              )}>
                <span className="text-base">{s.icon}</span>
                <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">{s.step}</span>
              </div>
              {i < arr.length - 1 && (
                <div className="h-px w-4 bg-slate-700" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline runs */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-400">Recent Runs</h3>
        <div className="space-y-3">
          {pipelineRuns.map((run) => (
            <PipelineCard key={run.id} run={run} />
          ))}
        </div>
      </div>
    </div>
  );
}
