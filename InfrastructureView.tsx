// ============================================================
// Infrastructure View — Files, configs, architecture
// ============================================================

import { FileCode2, CheckCircle } from "lucide-react";
import { cn } from "../utils/cn";

const infraFiles = [
  {
    category: "🐳 Docker",
    color: "sky",
    files: [
      { name: "Dockerfile", desc: "Multi-stage production build (Node 20 → Nginx Alpine)" },
      { name: "Dockerfile.dev", desc: "Development container with Vite HMR" },
      { name: "docker-compose.yml", desc: "Production stack: frontend + Watchtower" },
      { name: "docker-compose.dev.yml", desc: "Development stack with volume mounts" },
      { name: "docker-compose.monitoring.yml", desc: "Prometheus + Grafana + Loki + Alertmanager" },
    ],
  },
  {
    category: "🌐 Nginx",
    color: "emerald",
    files: [
      { name: "nginx/nginx.conf", desc: "Main config: gzip, rate limiting, logging, buffers" },
      { name: "nginx/conf.d/app.conf", desc: "HTTPS vhost: SSL, security headers, SPA routing" },
      { name: "nginx/conf.d/app-http-only.conf.template", desc: "HTTP-only template (no SSL)" },
    ],
  },
  {
    category: "⚙️ CI/CD",
    color: "violet",
    files: [
      { name: ".github/workflows/ci-cd.yml", desc: "Full pipeline: lint → build → docker → deploy" },
      { name: ".github/workflows/pr-checks.yml", desc: "Fast PR feedback + bundle size check" },
      { name: ".github/workflows/dependency-update.yml", desc: "Weekly automated dependency PRs" },
    ],
  },
  {
    category: "📊 Monitoring",
    color: "amber",
    files: [
      { name: "monitoring/prometheus/prometheus.yml", desc: "Prometheus scrape config & targets" },
      { name: "monitoring/prometheus/alerts.yml", desc: "Alert rules: availability, performance, resources" },
      { name: "monitoring/loki/loki.yml", desc: "Loki log aggregation config" },
      { name: "monitoring/promtail/promtail.yml", desc: "Log shipping from Docker containers" },
      { name: "monitoring/alertmanager/alertmanager.yml", desc: "Alert routing: Slack, email, PagerDuty" },
    ],
  },
  {
    category: "🚀 Scripts",
    color: "pink",
    files: [
      { name: "scripts/deploy.sh", desc: "Production deployment with health check + rollback" },
      { name: "scripts/setup-ssl.sh", desc: "Let's Encrypt or self-signed SSL setup" },
      { name: "scripts/health-check.sh", desc: "Comprehensive health check reporter" },
    ],
  },
  {
    category: "🔧 Config",
    color: "slate",
    files: [
      { name: ".env.example", desc: "Environment variable template (never commit .env)" },
      { name: ".env.production", desc: "Production non-secret defaults" },
      { name: ".gitignore", desc: "Comprehensive ignore: certs, .env, dist, logs" },
    ],
  },
];

const colorMap: Record<string, string> = {
  sky: "border-sky-500/20 bg-sky-500/5 text-sky-400",
  emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  violet: "border-violet-500/20 bg-violet-500/5 text-violet-400",
  amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
  pink: "border-pink-500/20 bg-pink-500/5 text-pink-400",
  slate: "border-slate-700 bg-slate-800/30 text-slate-400",
};

const deployTargets = [
  { platform: "DigitalOcean VPS", icon: "🖥️", cmd: "docker-compose up -d", note: "Full control, best for enterprise" },
  { platform: "Vercel", icon: "▲", cmd: "vercel --prod", note: "Zero config, edge network, free tier" },
  { platform: "Railway", icon: "🚂", cmd: "railway up", note: "Simple deploys, managed containers" },
  { platform: "Render", icon: "⚡", cmd: "git push (auto-deploy)", note: "Free SSL, auto-scaling" },
  { platform: "Docker Hub/GHCR", icon: "🐳", cmd: "docker pull yourimage", note: "Container registry for all platforms" },
  { platform: "Any VPS (SSH)", icon: "🔑", cmd: "./scripts/deploy.sh", note: "Works on any Linux server with Docker" },
];

export function InfrastructureView() {
  const totalFiles = infraFiles.reduce((a, c) => a + c.files.length, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Config Files Created", value: totalFiles, icon: "📄" },
          { label: "Docker Images", value: 2, icon: "🐳" },
          { label: "CI/CD Workflows", value: 3, icon: "⚙️" },
          { label: "Deploy Targets", value: 6, icon: "🚀" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* File tree */}
      <div className="grid grid-cols-2 gap-4">
        {infraFiles.map((category) => (
          <div key={category.category} className={cn("rounded-2xl border p-4", colorMap[category.color])}>
            <h3 className="mb-3 text-sm font-bold">{category.category}</h3>
            <div className="space-y-2">
              {category.files.map((file) => (
                <div key={file.name} className="flex items-start gap-2.5">
                  <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                  <div>
                    <p className="font-mono text-xs font-semibold text-white">{file.name}</p>
                    <p className="text-[10px] opacity-70">{file.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Architecture diagram (text) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">🏗️ Production Architecture</h3>
        <div className="rounded-xl bg-slate-950 p-5 font-mono text-xs text-slate-400">
          <pre className="leading-relaxed overflow-x-auto">{`
  Internet
     │
     ▼
  ┌─────────────────────────────────────────────────────┐
  │  Nginx (Port 80/443)                                │
  │  ┌─ HTTPS redirect        ┌─ Security Headers       │
  │  ├─ SSL/TLS (TLSv1.3)    ├─ Gzip compression       │
  │  ├─ Rate limiting         ├─ Static asset caching   │
  │  └─ SPA fallback routing  └─ /health endpoint       │
  └─────────────────────────────────────────────────────┘
     │
     ▼
  ┌─────────────────────────────────────────────────────┐
  │  React SPA (Vite Build, served as static files)     │
  │  ┌─ Code splitting        ┌─ Error boundaries        │
  │  ├─ Lazy loading          ├─ React Suspense          │
  │  └─ TypeScript strict     └─ Optimized bundle        │
  └─────────────────────────────────────────────────────┘

  Monitoring Stack (separate compose profile):
  ┌────────────┐  ┌─────────┐  ┌──────┐  ┌──────────────┐
  │ Prometheus │  │ Grafana │  │ Loki │  │ Alertmanager │
  │ :9090      │→ │ :3000   │  │:3100 │  │ :9093        │
  └────────────┘  └─────────┘  └──────┘  └──────────────┘
       ↑               ↑            ↑
  ┌─────────────────────────────────────────────────────┐
  │  Exporters: nginx-exporter | node-exporter          │
  │  Shippers:  promtail (Docker logs → Loki)           │
  └─────────────────────────────────────────────────────┘

  CI/CD (GitHub Actions):
  Push → Lint → Type Check → Security Scan → Build →
  Docker Build/Push → Deploy Staging → Deploy Production →
  Health Check → Notify (Slack/Email)
          `}</pre>
        </div>
      </div>

      {/* Quick deploy commands */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">⚡ Quick Deploy Commands</h3>
        <div className="grid grid-cols-3 gap-3">
          {deployTargets.map((t) => (
            <div key={t.platform} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center gap-2">
                <span>{t.icon}</span>
                <p className="text-xs font-bold text-white">{t.platform}</p>
              </div>
              <code className="mt-2 block rounded bg-slate-800 px-2 py-1 font-mono text-[11px] text-emerald-400">
                {t.cmd}
              </code>
              <p className="mt-1.5 text-[10px] text-slate-500">{t.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">✅ Production Readiness Checklist</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            "Multi-stage Docker build", "Non-root container user", "HTTPS with TLS 1.3",
            "Security headers (A+)", "Rate limiting", "Gzip compression",
            "Static asset caching", "SPA routing", "Health check endpoints",
            "Prometheus metrics", "Grafana dashboards", "Loki log aggregation",
            "Alertmanager routing", "GitHub Actions CI/CD", "Automated security scans",
            "Trivy container scan", "npm audit checks", "Secret management",
            "Environment configs", ".env.example template", "SSL automation script",
            "Deployment script", "Rollback on failure", "Multi-platform images",
            "Watchtower auto-update", "Docker networks", "Resource limits",
            "Error boundaries", "TypeScript strict", "Bundle optimization",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
