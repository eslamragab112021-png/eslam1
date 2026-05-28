import { useState } from 'react';
import {
  Building2, Search, Filter, CheckCircle2,
  XCircle, Eye, Edit, Plus, Download,
  Globe, TrendingUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { db } from '../../data/mockDatabase';
import { PLANS } from '../../data/plans';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../utils/cn';
import type { Company } from '../../types';

export function CompaniesManagement() {
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const companies = db.getCompanies();
  const subscriptions = db.getSubscriptions();

  const filtered = companies.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.domain.toLowerCase().includes(search.toLowerCase());
    const sub = subscriptions.find(s => s.companyId === c.id);
    const matchPlan = filterPlan === 'all' || sub?.planId === filterPlan;
    return matchSearch && matchPlan;
  });

  const getCompanySub = (companyId: string) => subscriptions.find(s => s.companyId === companyId);
  const getCompanyPlan = (companyId: string) => {
    const sub = getCompanySub(companyId);
    return sub ? PLANS.find(p => p.id === sub.planId) : null;
  };

  const totalMRR = subscriptions.reduce((acc, sub) => {
    const plan = PLANS.find(p => p.id === sub.planId);
    return acc + (sub.billingCycle === 'annual' ? (plan?.price.annual || 0) : (plan?.price.monthly || 0));
  }, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Company Management</h2>
          <p className="text-slate-500 text-sm mt-0.5">{companies.length} companies · ${totalMRR.toLocaleString()} total MRR</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={<Download className="h-4 w-4" />}>Export CSV</Button>
          <Button icon={<Plus className="h-4 w-4" />}>Add Company</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Companies', value: companies.length, icon: <Building2 className="h-5 w-5 text-indigo-600" />, bg: 'bg-indigo-100' },
          { label: 'Enterprise', value: subscriptions.filter(s => s.planId === 'enterprise').length, icon: <TrendingUp className="h-5 w-5 text-amber-600" />, bg: 'bg-amber-100' },
          { label: 'Professional', value: subscriptions.filter(s => s.planId === 'pro').length, icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, bg: 'bg-emerald-100' },
          { label: 'Free Tier', value: subscriptions.filter(s => s.planId === 'free').length, icon: <Globe className="h-5 w-5 text-slate-500" />, bg: 'bg-slate-100' },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-xl', item.bg)}>{item.icon}</div>
              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-xl font-bold text-slate-900">{item.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="bg-transparent text-sm text-slate-700 outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 outline-none"
          >
            <option value="all">All Plans</option>
            <option value="free">Starter (Free)</option>
            <option value="pro">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">MRR</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Industry</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(company => {
                const sub = getCompanySub(company.id);
                const plan = getCompanyPlan(company.id);
                const mrr = sub ? (sub.billingCycle === 'annual' ? (plan?.price.annual || 0) : (plan?.price.monthly || 0)) : 0;
                return (
                  <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">
                          {company.logo}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                          <p className="text-xs text-slate-400">{company.domain}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={plan?.id === 'enterprise' ? 'purple' : plan?.id === 'pro' ? 'info' : 'default'}
                      >
                        {plan?.name || 'Free'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full', company.isActive ? 'bg-emerald-400' : 'bg-red-400')} />
                        <span className="text-sm text-slate-600">{company.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-slate-900">${mrr}</span>
                      <span className="text-xs text-slate-400">/{sub?.billingCycle === 'annual' ? 'mo (ann)' : 'mo'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-600">{company.industry}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-500">{format(parseISO(company.createdAt), 'MMM d, yyyy')}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedCompany(company); setShowDetails(true); }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No companies found</p>
          </div>
        )}
      </Card>

      {/* Company Detail Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={selectedCompany?.name || ''}
        subtitle={selectedCompany?.domain}
        size="lg"
      >
        {selectedCompany && (() => {
          const sub = getCompanySub(selectedCompany.id);
          const plan = getCompanyPlan(selectedCompany.id);
          const users = db.getUsers(selectedCompany.id);
          const invoices = db.getInvoices(selectedCompany.id);
          return (
            <div className="space-y-5">
              {/* Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Company</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedCompany.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Industry</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedCompany.industry}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Country</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedCompany.country}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Stripe Customer ID</p>
                    <p className="text-xs font-mono text-slate-500">{selectedCompany.stripeCustomerId}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Current Plan</p>
                    <Badge variant={plan?.id === 'enterprise' ? 'purple' : plan?.id === 'pro' ? 'info' : 'default'}>
                      {plan?.name || 'Free'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Billing</p>
                    <p className="text-sm font-semibold text-slate-900">{sub?.billingCycle || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Users</p>
                    <p className="text-sm font-semibold text-slate-900">{users.length} users</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Invoices</p>
                    <p className="text-sm font-semibold text-slate-900">{invoices.length} invoices</p>
                  </div>
                </div>
              </div>

              {/* Tenant Settings */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Tenant Configuration</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Working Hours:</span>
                    <span className="font-medium">{selectedCompany.settings.workingHoursStart} - {selectedCompany.settings.workingHoursEnd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Late Threshold:</span>
                    <span className="font-medium">{selectedCompany.settings.lateThresholdMinutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remote Work:</span>
                    <span className="font-medium">{selectedCompany.settings.allowRemoteWork ? '✅ Yes' : '❌ No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">2FA Required:</span>
                    <span className="font-medium">{selectedCompany.settings.twoFactorRequired ? '✅ Yes' : '❌ No'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" icon={<Edit className="h-4 w-4" />}>Edit Company</Button>
                <Button variant="danger" icon={<XCircle className="h-4 w-4" />}>Suspend Account</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
