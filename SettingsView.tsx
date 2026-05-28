// ============================================================
// Settings View
// ============================================================

import { Bell, Shield, Globe, Terminal, RefreshCw } from "lucide-react";
import { cn } from "../utils/cn";

export function SettingsView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Notification settings */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Slack Alerts", desc: "Critical and high severity alerts", enabled: true },
              { label: "Email Digests", desc: "Daily summary of deployments", enabled: true },
              { label: "PagerDuty", desc: "On-call escalation for critical", enabled: false },
              { label: "Webhook", desc: "Custom webhook on deploy events", enabled: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <div className={cn(
                  "relative h-5 w-9 rounded-full transition",
                  item.enabled ? "bg-violet-600" : "bg-slate-700"
                )}>
                  <div className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                    item.enabled ? "left-[18px]" : "left-0.5"
                  )} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Environment config */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Environment</h3>
          </div>
          <div className="space-y-2">
            {[
              { key: "NODE_ENV", value: "production", secret: false },
              { key: "DOMAIN", value: "yourdomain.com", secret: false },
              { key: "PORT", value: "443", secret: false },
              { key: "TZ", value: "UTC", secret: false },
              { key: "SECRET_KEY", value: "••••••••••••••••", secret: true },
              { key: "JWT_SECRET", value: "••••••••••••••••", secret: true },
              { key: "SMTP_PASSWORD", value: "••••••••••••••••", secret: true },
              { key: "GRAFANA_PASSWORD", value: "••••••••••••••••", secret: true },
            ].map((env) => (
              <div key={env.key} className="flex items-center gap-2 rounded-lg bg-slate-950/60 px-3 py-2">
                <code className="flex-1 font-mono text-xs text-sky-400">{env.key}</code>
                <span className="text-slate-600">=</span>
                <code className={cn("font-mono text-xs", env.secret ? "text-slate-600" : "text-slate-300")}>
                  {env.value}
                </code>
                {env.secret && <Shield className="h-3 w-3 text-slate-600" />}
              </div>
            ))}
          </div>
        </div>

        {/* Performance settings */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Performance & Caching</h3>
          </div>
          <div className="space-y-2">
            {[
              { setting: "Gzip Compression", value: "Level 6", status: "on" },
              { setting: "Static Asset Cache", value: "1 year (immutable)", status: "on" },
              { setting: "HTML Cache", value: "no-cache", status: "on" },
              { setting: "Keep-Alive", value: "65s / 1000 req", status: "on" },
              { setting: "Worker Processes", value: "auto (CPU count)", status: "on" },
              { setting: "Worker Connections", value: "4096", status: "on" },
              { setting: "Rate Limit (API)", value: "30 req/s burst 50", status: "on" },
              { setting: "Connection Limit", value: "20/IP", status: "on" },
            ].map((s) => (
              <div key={s.setting} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2">
                <span className="text-xs text-slate-400">{s.setting}</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-slate-300">{s.value}</code>
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GitHub Actions secrets */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">GitHub Actions Secrets Required</h3>
          </div>
          <div className="space-y-1.5">
            {[
              { secret: "PROD_HOST", desc: "Production server IP/hostname" },
              { secret: "PROD_USER", desc: "SSH username" },
              { secret: "PROD_SSH_KEY", desc: "Private SSH key for prod" },
              { secret: "STAGING_HOST", desc: "Staging server hostname" },
              { secret: "STAGING_USER", desc: "SSH username for staging" },
              { secret: "STAGING_SSH_KEY", desc: "Private SSH key for staging" },
              { secret: "SLACK_WEBHOOK_URL", desc: "Slack webhook for notifications" },
              { secret: "GRAFANA_PASSWORD", desc: "Grafana admin password" },
            ].map((s) => (
              <div key={s.secret} className="flex items-start gap-2 rounded-lg bg-slate-950/60 px-3 py-2">
                <Shield className="mt-0.5 h-3 w-3 shrink-0 text-amber-500/60" />
                <div>
                  <code className="text-xs font-bold font-mono text-amber-400">{s.secret}</code>
                  <p className="text-[10px] text-slate-600">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
