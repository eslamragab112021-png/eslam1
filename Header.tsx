// ============================================================
// Header — Top navigation bar
// ============================================================

import { Bell, RefreshCw, Search } from "lucide-react";

interface HeaderProps {
  alertCount: number;
  lastRefresh: string;
  onRefresh: () => void;
  onAlertsClick: () => void;
}

export function Header({ alertCount, lastRefresh, onRefresh, onAlertsClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur-xl">
      {/* Left: search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search services, pipelines..."
            className="h-9 w-72 rounded-lg border border-slate-700 bg-slate-800/50 pl-9 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition"
          />
        </div>
      </div>

      {/* Right: status + actions */}
      <div className="flex items-center gap-3">
        {/* Last refresh */}
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-white"
        >
          <RefreshCw className="h-3 w-3" />
          {lastRefresh}
        </button>

        {/* Environment badge */}
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          Production
        </span>

        {/* Alerts */}
        <button
          onClick={onAlertsClick}
          className="relative rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-400 transition hover:border-slate-600 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>

        {/* User */}
        <button className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            A
          </div>
          <span className="text-xs">Admin</span>
        </button>
      </div>
    </header>
  );
}
