import { useState } from 'react';
import {
  CreditCard, Check, Zap, Star, Building2, AlertTriangle,
  Download, RefreshCw, Calendar,
  Shield, XCircle, CheckCircle2, Loader2,
  Receipt, Clock, ArrowUpRight, Info
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { useAppStore } from '../store/appStore';
import { db } from '../data/mockDatabase';
import { PLANS, formatPrice } from '../data/plans';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
import type { PlanId } from '../types';

type BillingCycle = 'monthly' | 'annual';

function PlanCard({
  plan, currentPlanId, billingCycle, onSelect, isProcessing
}: {
  plan: typeof PLANS[0];
  currentPlanId: PlanId;
  billingCycle: BillingCycle;
  onSelect: (planId: PlanId) => void;
  isProcessing: boolean;
}) {
  const isCurrent = plan.id === currentPlanId;
  const isDowngrade = (
    (currentPlanId === 'enterprise' && (plan.id === 'pro' || plan.id === 'free')) ||
    (currentPlanId === 'pro' && plan.id === 'free')
  );
  const price = plan.price[billingCycle];
  const annualSavings = billingCycle === 'annual' && plan.price.monthly > 0
    ? Math.round((1 - plan.price.annual / plan.price.monthly) * 100)
    : 0;

  return (
    <div className={cn(
      'relative rounded-2xl border-2 p-6 transition-all duration-200',
      isCurrent
        ? 'border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-100'
        : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md',
      plan.popular && !isCurrent && 'border-indigo-300'
    )}>
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={cn(
            'px-3 py-1 text-xs font-bold rounded-full text-white',
            plan.id === 'pro' ? 'bg-indigo-600' : 'bg-amber-500'
          )}>
            {plan.badge}
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500 text-white">Current Plan</span>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${plan.color}20` }}>
            {plan.id === 'free' && <Zap className="h-4 w-4" style={{ color: plan.color }} />}
            {plan.id === 'pro' && <Star className="h-4 w-4" style={{ color: plan.color }} />}
            {plan.id === 'enterprise' && <Building2 className="h-4 w-4" style={{ color: plan.color }} />}
          </div>
          <h3 className="font-bold text-slate-900">{plan.name}</h3>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{plan.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-slate-900">{price === 0 ? 'Free' : `$${price}`}</span>
          {price > 0 && <span className="text-slate-500 text-sm mb-1">/mo</span>}
        </div>
        {billingCycle === 'annual' && price > 0 && (
          <p className="text-xs text-emerald-600 font-medium mt-1">
            💰 Save {annualSavings}% vs monthly · ${plan.price.monthly * 12}/yr → ${plan.price.annual * 12}/yr
          </p>
        )}
        {billingCycle === 'monthly' && price > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            Switch to annual & save ${(plan.price.monthly - plan.price.annual) * 12}/year
          </p>
        )}
      </div>

      <div className="space-y-2 mb-6">
        {plan.features.slice(0, 8).map((feature, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
            <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
        {plan.features.length > 8 && (
          <p className="text-xs text-indigo-600 font-medium pl-6">+{plan.features.length - 8} more features</p>
        )}
      </div>

      <Button
        variant={isCurrent ? 'outline' : 'primary'}
        className="w-full"
        disabled={isCurrent || isProcessing}
        loading={isProcessing}
        onClick={() => !isCurrent && onSelect(plan.id)}
      >
        {isCurrent ? 'Current Plan' : isDowngrade ? 'Downgrade' : plan.id === 'free' ? 'Downgrade to Free' : 'Upgrade Now'}
      </Button>
    </div>
  );
}

function PaymentModal({
  isOpen, onClose, selectedPlan, billingCycle, onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: typeof PLANS[0] | null;
  billingCycle: BillingCycle;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'card' | 'processing' | 'success' | 'failed'>('card');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/27');
  const [cvc, setCvc] = useState('424');
  const [name, setName] = useState('Sarah Johnson');
  const [failTest, setFailTest] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    await new Promise(r => setTimeout(r, 2000));

    const shouldFail = failTest || cardNumber.startsWith('4000 0000 0000 9995');
    if (shouldFail) {
      setStep('failed');
    } else {
      setStep('success');
      setTimeout(() => { onSuccess(); onClose(); setStep('card'); }, 2000);
    }
  };

  if (!selectedPlan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (step !== 'processing') { onClose(); setStep('card'); } }}
      title={step === 'card' ? 'Complete Your Upgrade' : undefined}
      subtitle={step === 'card' ? `Upgrading to ${selectedPlan.name} — ${billingCycle}` : undefined}
      size="md"
    >
      {step === 'card' && (
        <div className="space-y-5">
          {/* Plan Summary */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">{selectedPlan.name} Plan</span>
              <span className="font-bold text-slate-900">
                ${billingCycle === 'annual' ? selectedPlan.price.annual * 12 : selectedPlan.price.monthly}
                <span className="text-xs text-slate-500 font-normal">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <Check className="h-3 w-3" />
              {billingCycle === 'annual' ? `Billed annually — save ${Math.round((1 - selectedPlan.price.annual / selectedPlan.price.monthly) * 100)}%` : 'Billed monthly, cancel anytime'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Next renewal: {format(addDays(new Date(), billingCycle === 'annual' ? 365 : 30), 'MMM d, yyyy')}</p>
          </div>

          {/* Stripe-style Card Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Card Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="1234 5678 9012 3456"
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="MM/YY"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">CVC</label>
                <input
                  type="text"
                  value={cvc}
                  onChange={e => setCvc(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="123"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Name on Card</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Full name"
              />
            </div>

            {/* Test failure toggle */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">Test: Simulate payment failure</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFailTest(v => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 rounded-full transition-colors',
                    failTest ? 'bg-red-500' : 'bg-slate-200'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    failTest && 'translate-x-4'
                  )} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Secured by Stripe — PCI DSS compliant
            </div>

            <Button type="submit" className="w-full" size="lg">
              Pay {billingCycle === 'annual' ? `$${selectedPlan.price.annual * 12}/year` : `$${selectedPlan.price.monthly}/month`}
            </Button>
          </form>
        </div>
      )}

      {step === 'processing' && (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 text-lg">Processing Payment...</h3>
          <p className="text-slate-500 text-sm mt-1">Please don't close this window</p>
          <p className="text-xs text-slate-400 mt-3">Connecting to Stripe secure payment gateway</p>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-12">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="font-bold text-slate-900 text-xl">Payment Successful! 🎉</h3>
          <p className="text-slate-500 text-sm mt-2">You've upgraded to <strong>{selectedPlan.name}</strong></p>
          <p className="text-xs text-slate-400 mt-1">A receipt has been sent to your email</p>
        </div>
      )}

      {step === 'failed' && (
        <div className="text-center py-8">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="font-bold text-slate-900 text-xl">Payment Failed</h3>
          <p className="text-slate-500 text-sm mt-2">Your card was declined (insufficient funds)</p>
          <p className="text-xs text-slate-400 mt-1">Error: card_declined · insufficient_funds</p>
          <div className="mt-6 space-y-3">
            <Button onClick={() => setStep('card')} className="w-full">Try Another Card</Button>
            <Button variant="ghost" onClick={() => { onClose(); setStep('card'); }} className="w-full">Cancel</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function Billing() {
  const { currentCompany, currentUser, currentSubscription, currentPlan, upgradePlan, cancelSubscription } = useAppStore();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'invoices' | 'history' | 'payment'>('plan');

  const invoices = db.getInvoices(currentCompany?.id || '');
  const billingHistory = db.getBillingHistory(currentCompany?.id || '');

  const handlePlanSelect = (planId: PlanId) => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || plan.id === currentPlan?.id) return;
    if (plan.id === 'free') {
      setShowCancelModal(true);
      return;
    }
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    if (selectedPlan) {
      upgradePlan(selectedPlan.id, billingCycle);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
      paid: 'success', active: 'success',
      open: 'warning', past_due: 'danger',
      failed: 'danger', void: 'default' as any,
    };
    return <Badge variant={map[status] || 'default'} className="capitalize">{status.replace('_', ' ')}</Badge>;
  };

  const getEventIcon = (event: string) => {
    if (event.includes('succeeded') || event.includes('created')) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (event.includes('failed')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (event.includes('cancelled')) return <XCircle className="h-4 w-4 text-amber-500" />;
    if (event.includes('upgraded')) return <ArrowUpRight className="h-4 w-4 text-indigo-500" />;
    return <RefreshCw className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Billing & Subscription</h2>
          <p className="text-slate-500 mt-0.5 text-sm">Manage your plan, invoices, and payment methods</p>
        </div>
        {currentSubscription?.cancelAtPeriodEnd && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-700 font-medium">
              Cancels {format(parseISO(currentSubscription.currentPeriodEnd), 'MMM d, yyyy')}
            </span>
          </div>
        )}
      </div>

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Plan</p>
                {getStatusBadge(currentSubscription?.status || 'active')}
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{currentPlan?.name}</h3>
              <p className="text-slate-500 text-sm mt-1">
                {currentSubscription?.billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'} ·
                {' '}{formatPrice(currentSubscription?.unitAmount || 0)}/{currentSubscription?.billingCycle === 'annual' ? 'year' : 'month'}
              </p>
            </div>
            <div className="text-3xl">{currentPlan?.id === 'enterprise' ? '🏆' : currentPlan?.id === 'pro' ? '⭐' : '🚀'}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Employees</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {typeof currentPlan?.limits.employees === 'number' ? `Up to ${currentPlan.limits.employees}` : 'Unlimited'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">API Calls/mo</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {typeof currentPlan?.limits.apiCallsPerMonth === 'number'
                  ? currentPlan.limits.apiCallsPerMonth.toLocaleString()
                  : 'Unlimited'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">Data Retention</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {typeof currentPlan?.limits.dataRetentionDays === 'number'
                  ? `${currentPlan.limits.dataRetentionDays} days`
                  : 'Unlimited'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Billing Period</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">Period Start</p>
              <p className="text-sm font-semibold text-slate-800">
                {currentSubscription ? format(parseISO(currentSubscription.currentPeriodStart), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Next Renewal</p>
              <p className="text-sm font-semibold text-slate-800">
                {currentSubscription ? format(parseISO(currentSubscription.currentPeriodEnd), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Stripe Customer ID</p>
              <p className="text-xs font-mono text-slate-500">{currentCompany?.stripeCustomerId}</p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">Subscription ID</p>
              <p className="text-xs font-mono text-slate-500">{currentSubscription?.stripeSubscriptionId?.substring(0, 24)}...</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { id: 'plan', label: 'Change Plan', icon: <Star className="h-4 w-4" /> },
          { id: 'invoices', label: 'Invoices', icon: <Receipt className="h-4 w-4" /> },
          { id: 'history', label: 'Billing History', icon: <Clock className="h-4 w-4" /> },
          { id: 'payment', label: 'Payment Method', icon: <CreditCard className="h-4 w-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Plan Selection */}
      {activeTab === 'plan' && (
        <div className="space-y-5">
          {/* Billing Cycle Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', billingCycle === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5', billingCycle === 'annual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500')}
              >
                Annual
                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">Save 20%</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">All plans include a 14-day free trial</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlanId={currentPlan?.id || 'free'}
                billingCycle={billingCycle}
                onSelect={handlePlanSelect}
                isProcessing={isProcessing}
              />
            ))}
          </div>

          {currentSubscription && !currentSubscription.cancelAtPeriodEnd && currentPlan?.id !== 'free' && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-sm text-slate-400 hover:text-red-500 transition-colors underline underline-offset-2"
              >
                Cancel subscription
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <Card>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Invoice History</h3>
              <span className="text-xs text-slate-500">{invoices.length} invoices</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {invoices.map(invoice => (
              <div key={invoice.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{invoice.number}</p>
                    <p className="text-xs text-slate-500">{format(parseISO(invoice.createdAt), 'MMM d, yyyy')}</p>
                    <p className="text-xs text-slate-400">{invoice.items[0]?.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {getStatusBadge(invoice.status)}
                  <span className="font-bold text-slate-900">${invoice.amount.toLocaleString()}</span>
                  {invoice.last4 && (
                    <span className="text-xs text-slate-400 hidden md:block">•••• {invoice.last4}</span>
                  )}
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No invoices yet</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Billing History */}
      {activeTab === 'history' && (
        <Card>
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Billing Event Log</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {billingHistory.map(event => (
              <div key={event.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors">
                <div className="mt-0.5 flex-shrink-0">{getEventIcon(event.event)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{event.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(parseISO(event.createdAt), 'MMM d, yyyy · h:mm a')}</p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5 capitalize">{event.event.replace(/_/g, ' ')}</p>
                </div>
                {event.amount !== undefined && (
                  <span className={cn(
                    'font-bold text-sm flex-shrink-0',
                    event.event.includes('failed') ? 'text-red-500' : 'text-slate-900'
                  )}>
                    {event.event.includes('failed') ? '-' : '+'}${event.amount.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
            {billingHistory.length === 0 && (
              <div className="py-12 text-center text-slate-400">No billing events yet</div>
            )}
          </div>
        </Card>
      )}

      {/* Payment Method */}
      {activeTab === 'payment' && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Saved Payment Methods</h3>
            <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl">
              <div className="h-10 w-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-bold">VISA</div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Visa ending in 4242</p>
                <p className="text-xs text-slate-500">Expires 12/27 · {currentUser?.firstName} {currentUser?.lastName}</p>
              </div>
              <div className="ml-auto">
                <Badge variant="success">Default</Badge>
              </div>
            </div>
            <Button variant="outline" className="mt-4" icon={<CreditCard className="h-4 w-4" />}>
              Add Payment Method
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Billing Address</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p className="font-medium">{currentCompany?.name}</p>
              <p>{currentCompany?.address}</p>
              <p>{currentCompany?.email}</p>
            </div>
            <Button variant="outline" className="mt-4">Update Billing Address</Button>
          </Card>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        selectedPlan={selectedPlan}
        billingCycle={billingCycle}
        onSuccess={handlePaymentSuccess}
      />

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        subtitle="Are you sure you want to cancel?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-medium">You will lose access to:</p>
            <ul className="mt-2 space-y-1">
              {currentPlan?.features.slice(0, 4).map((f, i) => (
                <li key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                  <XCircle className="h-3 w-3" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-slate-600">
            Your subscription will remain active until <strong>{currentSubscription ? format(parseISO(currentSubscription.currentPeriodEnd), 'MMM d, yyyy') : '—'}</strong>.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelModal(false)}>Keep Plan</Button>
            <Button variant="danger" className="flex-1" onClick={() => { cancelSubscription(); setShowCancelModal(false); }}>Cancel Subscription</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


