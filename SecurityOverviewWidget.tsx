// Security widget component - exported for reuse
import { ShieldCheck } from 'lucide-react';

export function SecurityStatusBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      <ShieldCheck size={11} />
      Secured
    </div>
  );
}
