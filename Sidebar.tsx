// ============================================================
// Sidebar Navigation
// ============================================================

import {
  LayoutDashboard, Activity, GitBranch, Container,
  Shield, BarChart3, Settings, ChevronRight,
  Zap, Bell, Globe
} from "lucide-react";
import { cn } from "../utils/cn";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  alertCount: number;
}

const navItems = [
  { id: "overview",     label: "Overview",      icon: LayoutDashboard },
  { id: "services",     label: "Services",       icon: Activity },
  { id: "pipeline",     label: "CI/CD Pipeline", icon: GitBranch },
  { id: "containers",   label: "Containers",     icon: Container },
  { id: "deployments",  label: "Deployments",    icon: Globe },
  { id: "security",     label: "Security",       icon: Shield },
  { id: "monitoring",   label: "Monitoring",     icon: BarChart3 },
  { id: "infrastructure", label: "Infrastructure", icon: Zap },
];

export function Sidebar({ activeTab, onTabChange, alertCount }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
          <span className="text-base">⚙️</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white">DevOps Hub</p>
          <p className="text-xs text-slate-400">Production Control</p>
        </div>
      </div>

      {/* Live indicator */}
      <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-medium text-emerald-400">Live Monitoring</span>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const showBadge = item.id === "monitoring" && alertCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              )}
              {isActive && <ChevronRight className="h-3 w-3" />}
            </button>
          );
        })}
      </nav>

      {/* Alerts & Settings footer */}
      <div className="space-y-0.5 border-t border-slate-800 px-3 py-3">
        <button
          onClick={() => onTabChange("alerts")}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            activeTab === "alerts"
              ? "bg-violet-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          <Bell className="h-4 w-4" />
          <span className="flex-1 text-left">Alerts</span>
          {alertCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            activeTab === "settings"
              ? "bg-violet-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* System info */}
      <div className="border-t border-slate-800 px-4 py-4">
        <div className="rounded-lg bg-slate-800/50 p-3">
          <p className="text-xs font-medium text-slate-300">System</p>
          <div className="mt-2 space-y-1.5">
            {[
              { label: "CPU", value: 47 },
              { label: "Memory", value: 68 },
              { label: "Disk", value: 34 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{m.label}</span>
                  <span>{m.value}%</span>
                </div>
                <div className="mt-0.5 h-1 rounded-full bg-slate-700">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      m.value > 85 ? "bg-red-500" : m.value > 70 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
