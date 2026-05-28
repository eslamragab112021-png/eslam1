import {
  Building2, DollarSign, TrendingUp, AlertTriangle,
  ArrowUpRight, Package, Activity, Globe, Zap, CheckCircle2,
  Star
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { db } from '../../data/mockDatabase';
import { PLANS } from '../../data/plans';
import { StatCard, Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../utils/cn';

export function SuperAdminDashboard() {
  const { setActiveView } = useAppStore();
  const analytics = db.getRevenueAnalytics();
  const companies = db.getCompanies();
  const subscriptions = db.getSubscriptions();
  const allInvoices = db.getAllInvoices();

  const activeCompanies = companies.filter(c => c.isActive).length;

  const monthlyRecurring = analytics.mrr;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Platform Overview</h2>
          <p className="text-slate-500 text-sm mt-0.5">Real-time SaaS metrics — {format(new Date(), 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-emerald-700">All Systems Operational</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`$${monthlyRecurring.toLocaleString()}`}
          change={`+${analytics.mrrGrowth}% vs last month`}
          changeType="positive"
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-100"
          subtitle={`ARR: $${analytics.arr.toLocaleString()}`}
        />
        <StatCard
          title="Active Companies"
          value={activeCompanies}
          change="+3 new this month"
          changeType="positive"
          icon={<Building2 className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-100"
          subtitle={`${analytics.trialingSubscriptions} trialing`}
        />
        <StatCard
          title="Active Subscriptions"
          value={analytics.activeSubscriptions}
          change={`${analytics.churnRate}% churn rate`}
          changeType={analytics.churnRate < 3 ? 'positive' : 'negative'}
          icon={<Package className="h-5 w-5 text-violet-600" />}
          iconBg="bg-violet-100"
          subtitle={`${analytics.cancelledThisMonth} cancelled this month`}
        />
        <StatCard
          title="Average Revenue Per User"
          value={`$${analytics.arpu}`}
          change={`LTV: $${analytics.ltv.toLocaleString()}`}
          changeType="positive"
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-100"
          subtitle="Per active subscription"
        />
      </div>

      {/* MRR Breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'New MRR', value: analytics.newMrr, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: '📈' },
          { label: 'Expansion MRR', value: analytics.expansionMrr, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: '⬆️' },
          { label: 'Contraction MRR', value: analytics.contractionMrr, color: 'text-amber-600 bg-amber-50 border-amber-200', icon: '⬇️' },
          { label: 'Churned MRR', value: analytics.churnedMrr, color: 'text-red-600 bg-red-50 border-red-200', icon: '📉' },
        ].map((item) => (
          <div key={item.label} className={cn('rounded-xl p-4 border', item.color)}>
            <span className="text-lg">{item.icon}</span>
            <p className="text-xs font-medium mt-1 opacity-70">{item.label}</p>
            <p className="text-xl font-bold mt-0.5">${item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">Revenue Growth</h3>
              <p className="text-xs text-slate-500 mt-0.5">MRR and subscription count over time</p>
            </div>
            <Badge variant="success">+{analytics.mrrGrowth}% MoM</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={analytics.monthlyRevenue}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGrad)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue by Plan */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-1">Revenue by Plan</h3>
          <p className="text-xs text-slate-500 mb-5">Current month distribution</p>
          <div className="space-y-4">
            {analytics.revenueByPlan.map((planData) => {
              const plan = PLANS.find(p => p.id === planData.planId);
              const total = analytics.revenueByPlan.reduce((acc, p) => acc + p.revenue, 1);
              const pct = Math.round((planData.revenue / total) * 100);
              return (
                <div key={planData.planId}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: plan?.color }} />
                      <span className="font-medium text-slate-700">{plan?.name}</span>
                      <span className="text-xs text-slate-400">({planData.count})</span>
                    </div>
                    <span className="font-bold text-slate-900">${planData.revenue.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: plan?.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total MRR</span>
              <span className="font-bold text-slate-900">${analytics.mrr.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Companies & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Companies */}
        <Card>
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Top Companies</h3>
            <button onClick={() => setActiveView('superadmin-companies')} className="text-xs text-indigo-600 font-medium flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {companies.map(company => {
              const sub = subscriptions.find(s => s.companyId === company.id);
              const plan = PLANS.find(p => p.id === sub?.planId);
              return (
                <div key={company.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                    {company.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{company.name}</p>
                    <p className="text-xs text-slate-500">{company.domain} · {company.country}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge
                      variant={plan?.id === 'enterprise' ? 'purple' : plan?.id === 'pro' ? 'info' : 'default'}
                    >
                      {plan?.name || 'Free'}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">
                      ${sub ? (sub.billingCycle === 'annual' ? sub.unitAmount : sub.unitAmount) : 0}/
                      {sub?.billingCycle === 'annual' ? 'yr' : 'mo'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Payments */}
        <Card>
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Payments</h3>
            <button onClick={() => setActiveView('superadmin-revenue')} className="text-xs text-indigo-600 font-medium flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {allInvoices.map(invoice => {
              const company = companies.find(c => c.id === invoice.companyId);
              return (
                <div key={invoice.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                  <div className={cn(
                    'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0',
                    invoice.status === 'paid' ? 'bg-emerald-100' : 'bg-red-100'
                  )}>
                    {invoice.status === 'paid'
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      : <AlertTriangle className="h-4 w-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{company?.name}</p>
                    <p className="text-xs text-slate-500">{invoice.number} · {format(parseISO(invoice.createdAt), 'MMM d')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">${invoice.amount.toLocaleString()}</p>
                    <Badge variant={invoice.status === 'paid' ? 'success' : 'danger'} className="mt-1">{invoice.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Globe className="h-4 w-4" />, label: 'Countries', value: '12', color: 'text-indigo-600 bg-indigo-50' },
          { icon: <Activity className="h-4 w-4" />, label: 'Uptime', value: '99.97%', color: 'text-emerald-600 bg-emerald-50' },
          { icon: <Zap className="h-4 w-4" />, label: 'API Calls Today', value: '48.2K', color: 'text-amber-600 bg-amber-50' },
          { icon: <Star className="h-4 w-4" />, label: 'Avg NPS Score', value: '72', color: 'text-violet-600 bg-violet-50' },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', item.color)}>{item.icon}</div>
              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="font-bold text-slate-900">{item.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
