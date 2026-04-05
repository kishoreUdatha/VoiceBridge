/**
 * Subscription Management Page
 * Manage subscription, usage, and billing
 */

import { useState } from 'react';
import {
  InformationCircleIcon,
  LockClosedIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { useSubscription } from './hooks';
import {
  LoadingSpinner,
  PlansGrid,
  CancelModal,
  AddOnModal,
} from './components';

// Circular Progress Component
const CircularProgress = ({
  used,
  total,
  label,
  color = '#0EA5E9'
}: {
  used: number;
  total: number;
  label?: string;
  color?: string;
}) => {
  const safeUsed = Number(used) || 0;
  const safeTotal = Number(total) || 0;
  const percentage = safeTotal > 0 ? Math.min(100, (safeUsed / safeTotal) * 100) : 0;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="#E2E8F0"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] text-slate-400">Total</span>
        <span className="text-sm font-bold text-slate-700">{label || safeTotal}</span>
      </div>
    </div>
  );
};

// Usage Card with Progress
const UsageCardWithProgress = ({
  title,
  used,
  total,
  label,
  color = '#0EA5E9',
}: {
  title: string;
  used: number;
  total: number;
  label?: string;
  color?: string;
}) => {
  const remaining = Math.max(0, total - used);
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <InformationCircleIcon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="flex justify-center mb-3">
        <CircularProgress used={used} total={total} label={label} color={color} />
      </div>
      <div className="flex justify-between text-xs">
        <div>
          <span className="text-slate-500">Remaining</span>
          <p className="font-semibold text-cyan-600">{label ? `${remaining} ${label.replace(/[0-9]/g, '')}` : remaining}</p>
        </div>
        <div className="text-right">
          <span className="text-slate-500">Used</span>
          <p className="font-semibold text-emerald-600">{used}</p>
        </div>
      </div>
    </div>
  );
};

// Locked Feature Card
const LockedFeatureCard = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-slate-700">{title}</span>
      <InformationCircleIcon className="w-4 h-4 text-slate-400" />
    </div>
    <div className="flex flex-col items-center py-4">
      {icon || <LockClosedIcon className="w-8 h-8 text-slate-300 mb-2" />}
      <p className="text-xs text-slate-400 text-center mb-3">{description}</p>
      <button className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50">
        Upgrade to paid plan
      </button>
    </div>
  </div>
);

// Active Feature Card
const ActiveFeatureCard = ({
  title,
  icon,
  description,
}: {
  title: string;
  icon: React.ReactNode;
  description?: string;
}) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-slate-700">{title}</span>
      <InformationCircleIcon className="w-4 h-4 text-slate-400" />
    </div>
    <div className="flex flex-col items-center py-4">
      {icon}
      {description && <p className="text-xs text-slate-500 text-center mt-2">{description}</p>}
    </div>
  </div>
);

export default function SubscriptionManagementPage() {
  const [activeTab, setActiveTab] = useState<'usage' | 'subscription'>('usage');

  const {
    subscription,
    plans,
    billingHistory,
    loading,
    actionLoading,
    showCancelModal,
    showAddOnModal,
    defaultAddOn,
    cancelReason,
    setShowCancelModal,
    setCancelReason,
    handleUpgrade,
    handleCancel,
    handleReactivate,
    openAddOnModal,
    closeAddOnModal,
    onAddOnSuccess,
  } = useSubscription();

  if (loading) {
    return <LoadingSpinner />;
  }

  const usage = {
    leadsCount: subscription?.usage?.leadsCount ?? 0,
    aiCallsCount: subscription?.usage?.aiCallsCount ?? 0,
    smsCount: subscription?.usage?.smsCount ?? 0,
    emailsCount: subscription?.usage?.emailsCount ?? 0,
  };
  const limits = {
    maxLeads: subscription?.plan?.features?.maxLeads ?? 1000,
    aiCallsPerMonth: subscription?.plan?.features?.aiCallsPerMonth ?? 100,
    smsPerMonth: subscription?.plan?.features?.smsPerMonth ?? 100,
    emailsPerMonth: subscription?.plan?.features?.emailsPerMonth ?? 500,
  };

  const isPaidPlan = subscription?.planId !== 'free' && subscription?.planId !== 'starter';

  return (
    <div className="space-y-4">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('usage')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'usage'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Usage Statistics
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'subscription'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Subscription Details
          </button>
          <div className="flex items-center gap-1.5 pb-3">
            <CheckBadgeIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-700">{subscription?.plan?.name || 'Starter'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 pb-3">
          <span className="text-xs text-slate-400">
            Data shown upto: <span className="text-slate-600">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {' · '}Next renews date: <span className="text-slate-600">{new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </span>
          <button
            onClick={() => setActiveTab('subscription')}
            className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Manage Subscription
          </button>
        </div>
      </div>

      {/* Usage Statistics Tab */}
      {activeTab === 'usage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Leads Count */}
          <UsageCardWithProgress
            title="Leads"
            used={usage.leadsCount}
            total={limits.maxLeads}
            color="#0EA5E9"
          />

          {/* AI Voice Calls */}
          <UsageCardWithProgress
            title="AI Voice Calls"
            used={usage.aiCallsCount}
            total={limits.aiCallsPerMonth}
            color="#8B5CF6"
          />

          {/* SMS Credits */}
          <UsageCardWithProgress
            title="SMS Credits"
            used={usage.smsCount}
            total={limits.smsPerMonth}
            color="#10B981"
          />

          {/* Email Credits */}
          <UsageCardWithProgress
            title="Email Credits"
            used={usage.emailsCount}
            total={limits.emailsPerMonth}
            color="#F59E0B"
          />

          {/* Voice Agents */}
          {isPaidPlan ? (
            <ActiveFeatureCard
              title="Voice Agents"
              icon={<CheckBadgeIcon className="w-8 h-8 text-emerald-500" />}
              description="AI-powered voice agents enabled"
            />
          ) : (
            <LockedFeatureCard
              title="Voice Agents"
              description="AI Voice Agents are only available under paid plans"
            />
          )}

          {/* Field Sales */}
          {isPaidPlan ? (
            <ActiveFeatureCard
              title="Field Sales"
              icon={<CheckBadgeIcon className="w-8 h-8 text-emerald-500" />}
              description="GPS tracking & visit management enabled"
            />
          ) : (
            <LockedFeatureCard
              title="Field Sales"
              description="Field Sales tracking is only available under paid plans"
            />
          )}

          {/* Campaigns */}
          {isPaidPlan ? (
            <ActiveFeatureCard
              title="Campaigns"
              icon={<CheckBadgeIcon className="w-8 h-8 text-emerald-500" />}
              description="Marketing campaigns enabled"
            />
          ) : (
            <LockedFeatureCard
              title="Campaigns"
              description="Marketing Campaigns are only available under paid plans"
            />
          )}

          {/* WhatsApp Business */}
          {isPaidPlan ? (
            <ActiveFeatureCard
              title="WhatsApp Business"
              icon={<CheckBadgeIcon className="w-8 h-8 text-emerald-500" />}
              description="WhatsApp messaging enabled"
            />
          ) : (
            <LockedFeatureCard
              title="WhatsApp Business"
              description="WhatsApp Business is only available under paid plans"
            />
          )}

          {/* Telecaller App */}
          {isPaidPlan ? (
            <ActiveFeatureCard
              title="Telecaller App"
              icon={<CheckBadgeIcon className="w-8 h-8 text-emerald-500" />}
              description="Mobile app for telecallers"
            />
          ) : (
            <LockedFeatureCard
              title="Telecaller App"
              description="Telecaller Mobile App is only available under paid plans"
            />
          )}

          {/* Call Monitoring */}
          {isPaidPlan ? (
            <ActiveFeatureCard
              title="Call Monitoring"
              icon={<CheckBadgeIcon className="w-8 h-8 text-emerald-500" />}
              description="Real-time call monitoring enabled"
            />
          ) : (
            <LockedFeatureCard
              title="Call Monitoring"
              description="Call Monitoring is only available under paid plans"
            />
          )}

          {/* Analytics Dashboard */}
          {isPaidPlan ? (
            <ActiveFeatureCard
              title="Analytics"
              icon={<CheckBadgeIcon className="w-8 h-8 text-emerald-500" />}
              description="Advanced analytics & reports"
            />
          ) : (
            <LockedFeatureCard
              title="Analytics"
              description="Advanced Analytics are only available under paid plans"
            />
          )}

          {/* Bulk Data Import */}
          {isPaidPlan ? (
            <ActiveFeatureCard
              title="Bulk Import"
              icon={<CheckBadgeIcon className="w-8 h-8 text-emerald-500" />}
              description="Import leads from Excel/CSV"
            />
          ) : (
            <LockedFeatureCard
              title="Bulk Import"
              description="Bulk Data Import is only available under paid plans"
            />
          )}
        </div>
      )}

      {/* Add Ons Section */}
      {activeTab === 'usage' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-700">Add Ons</span>
            <InformationCircleIcon className="w-4 h-4 text-slate-400" />
          </div>
          {isPaidPlan ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => openAddOnModal('ai-calls')}
                className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <p className="text-sm font-medium text-slate-700">Extra AI Calls</p>
                <p className="text-xs text-slate-500">+100 calls / ₹500</p>
              </button>
              <button
                onClick={() => openAddOnModal('sms')}
                className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <p className="text-sm font-medium text-slate-700">Extra SMS</p>
                <p className="text-xs text-slate-500">+500 SMS / ₹300</p>
              </button>
              <button
                onClick={() => openAddOnModal('emails')}
                className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <p className="text-sm font-medium text-slate-700">Extra Emails</p>
                <p className="text-xs text-slate-500">+1000 emails / ₹200</p>
              </button>
              <button
                onClick={() => openAddOnModal('leads')}
                className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <p className="text-sm font-medium text-slate-700">Extra Leads</p>
                <p className="text-xs text-slate-500">+1000 leads / ₹500</p>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6">
              <LockClosedIcon className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400 text-center mb-3">Add ons are only available for premium plans</p>
              <button
                onClick={() => setActiveTab('subscription')}
                className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
              >
                Upgrade to paid plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Subscription Details Tab */}
      {activeTab === 'subscription' && (
        <>
          <PlansGrid
            plans={plans}
            currentPlanId={subscription?.planId}
            onUpgrade={handleUpgrade}
          />
        </>
      )}

      {/* Modals */}
      <CancelModal
        show={showCancelModal}
        subscription={subscription}
        cancelReason={cancelReason}
        actionLoading={actionLoading}
        onClose={() => setShowCancelModal(false)}
        onReasonChange={setCancelReason}
        onCancel={handleCancel}
      />

      <AddOnModal
        show={showAddOnModal}
        planId={subscription?.planId || 'starter'}
        defaultAddOn={defaultAddOn}
        onClose={closeAddOnModal}
        onSuccess={onAddOnSuccess}
      />
    </div>
  );
}
