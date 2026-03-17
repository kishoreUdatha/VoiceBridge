/**
 * Subscription Management Page
 * Manage subscription, usage, and billing
 */

import { useSubscription } from './hooks';
import {
  LoadingSpinner,
  CurrentPlanSection,
  PlansGrid,
  BillingHistoryTable,
  CancelModal,
  AddOnModal,
} from './components';

export default function SubscriptionManagementPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription & Billing</h1>
          <p className="text-slate-500">Manage your subscription, usage, and billing</p>
        </div>
      </div>

      <CurrentPlanSection
        subscription={subscription}
        actionLoading={actionLoading}
        onOpenAddOnModal={openAddOnModal}
        onOpenCancelModal={() => setShowCancelModal(true)}
        onReactivate={handleReactivate}
      />

      <PlansGrid
        plans={plans}
        currentPlanId={subscription?.planId}
        onUpgrade={handleUpgrade}
      />

      <BillingHistoryTable billingHistory={billingHistory} />

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
