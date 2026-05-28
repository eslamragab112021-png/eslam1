// ============================================================
// Security View
// ============================================================

import { ShieldCheck, ShieldAlert, CheckCircle, AlertTriangle, Loader2, Lock, Key, Eye } from "lucide-react";
import { securityScans } from "../data/mockData";
import type { SecurityScan } from "../types";
import { cn } from "../utils/cn";

const scanTypeIcon: Record<string, string> = {
  sast: "🔬", dast: "🌐", dependency: "📦", container: "🐳", secrets: "🔑",
};

const statusConfig = {
  passed: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Passed" },
  failed: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Failed" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Warning" },
  running: { icon: Loader2, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", label: "Running" },
};

function ScanCard({ scan }: { scan: SecurityScan }) {
  const cfg = statusConfig[scan.status];
  const Icon = cfg.icon;
  const totalFindings = Object.values(scan.findings).reduce((a, b) => a + b, 0);

  return (
    <div className={cn("rounded-2xl border p-5", cfg.bg, cfg.border)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{scanTypeIcon[scan.type]}</span>
          <div>
            <p className="font-semibold text-white">{scan.name}</p>
            <p className="text-xs text-slate-500 capitalize">{scan.type} scan</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", cfg.color)} />
          <span className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</span>
        </div>
      </div>

      {/* Findings */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Critical", count: scan.findings.critical, color: "text-red-400", bg: "bg-red-950/40" },
          { label: "High", count: scan.findings.high, color: "text-orange-400", bg: "bg-orange-950/40" },
          { label: "Medium", count: scan.findings.medium, color: "text-amber-400", bg: "bg-amber-950/40" },
          { label: "Low", count: scan.findings.low, color: "text-slate-400", bg: "bg-slate-800/60" },
        ].map((f) => (
          <div key={f.label} className={cn("rounded-lg p-2 text-center", f.bg)}>
            <p className={cn("text-lg font-bold", f.color)}>{f.count}</p>
            <p className="text-[10px] text-slate-500">{f.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{totalFindings} total findings</span>
        <span>{scan.lastRun}</span>
      </div>
    </div>
  );
}

export function SecurityView() {
  const criticalFindings = securityScans.reduce((a, s) => a + s.findings.critical, 0);
  const highFindings = securityScans.reduce((a, s) => a + s.findings.high, 0);

  return (
    <div className="space-y-6">
      {/* Security score */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-500/30 bg-emerald-500/10">
            <span className="text-3xl font-black text-emerald-400">A+</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-white">Security Score</p>
          <p className="text-xs text-slate-400">Mozilla Observatory</p>
        </div>

        {[
          { label: "Critical Findings", value: criticalFindings, icon: <ShieldAlert className="h-5 w-5 text-red-400" />, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          { label: "High Findings", value: highFindings, icon: <AlertTriangle className="h-5 w-5 text-orange-400" />, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
          { label: "Scans Passing", value: `${securityScans.filter(s => s.status === "passed").length}/${securityScans.length}`, icon: <CheckCircle className="h-5 w-5 text-emerald-400" />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border p-5", s.bg, s.border)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className={cn("mt-2 text-3xl font-bold", s.color)}>{s.value}</p>
              </div>
              <div className="rounded-xl bg-slate-900/50 p-2">{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Scan results */}
      <div className="grid grid-cols-2 gap-4">
        {securityScans.map((scan) => (
          <ScanCard key={scan.id} scan={scan} />
        ))}
      </div>

      {/* Security headers */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">🛡️ Security Headers (Nginx)</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { header: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload", status: "✅" },
            { header: "X-Frame-Options", value: "SAMEORIGIN", status: "✅" },
            { header: "X-Content-Type-Options", value: "nosniff", status: "✅" },
            { header: "X-XSS-Protection", value: "1; mode=block", status: "✅" },
            { header: "Referrer-Policy", value: "strict-origin-when-cross-origin", status: "✅" },
            { header: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()", status: "✅" },
            { header: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'...", status: "✅" },
            { header: "OCSP Stapling", value: "Enabled", status: "✅" },
            { header: "TLS Protocol", value: "TLSv1.2, TLSv1.3 only", status: "✅" },
            { header: "SSL Session Cache", value: "shared:SSL:10m", status: "✅" },
          ].map((h) => (
            <div key={h.header} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
              <span>{h.status}</span>
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-slate-300">{h.header}</p>
                <p className="truncate font-mono text-[10px] text-slate-600">{h.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secret management */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: <Key className="h-5 w-5 text-amber-400" />,
            title: "Secret Management",
            items: [
              "Secrets via GitHub Actions Secrets",
              ".env never committed to git",
              ".env.example with placeholders",
              "Docker secrets for sensitive vars",
              "Environment-specific configs",
            ],
          },
          {
            icon: <Lock className="h-5 w-5 text-violet-400" />,
            title: "Network Security",
            items: [
              "Rate limiting: 30 req/s (API)",
              "Connection limits: 20/IP",
              "Internal-only /nginx_status",
              "Docker network isolation",
              "Non-root container user",
            ],
          },
          {
            icon: <Eye className="h-5 w-5 text-sky-400" />,
            title: "Monitoring",
            items: [
              "Trivy container scan on CI",
              "npm audit on every PR",
              "CodeQL static analysis",
              "Secret detection in commits",
              "Weekly dependency updates",
            ],
          },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              {card.icon}
              <h4 className="text-sm font-semibold text-white">{card.title}</h4>
            </div>
            <ul className="space-y-1.5">
              {card.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
