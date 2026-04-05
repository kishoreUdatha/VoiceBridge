/**
 * Subscription Management Components
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PlusIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Subscription, Plan } from '../../../services/subscription.service';
import subscriptionService from '../../../services/subscription.service';
import { BillingHistoryItem } from '../subscription.types';
import {
  formatCurrency,
  formatDate,
  getUsageColor,
  ADD_ONS,
  getAddOnPrice,
} from '../subscription.constants';

// Loading Spinner
export const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
  </div>
);

// Usage Card
interface UsageCardProps {
  label: string;
  used: number;
  limit: number;
}

export const UsageCard: React.FC<UsageCardProps> = ({ label, used, limit }) => {
  const percentage = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const color = getUsageColor(percentage);

  return (
    <div className="p-3 bg-slate-50 rounded-lg">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs text-slate-500">
          {used.toLocaleString()} / {limit === -1 ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${limit === -1 ? 0 : percentage}%` }}
        />
      </div>
      {percentage >= 90 && limit !== -1 && (
        <p className="text-[10px] text-red-600 mt-1">Approaching limit</p>
      )}
    </div>
  );
};

// Current Plan Section
interface CurrentPlanSectionProps {
  subscription: Subscription | null;
  actionLoading: boolean;
  onOpenAddOnModal: () => void;
  onOpenCancelModal: () => void;
  onReactivate: () => void;
}

export const CurrentPlanSection: React.FC<CurrentPlanSectionProps> = ({
  subscription,
  actionLoading,
  onOpenAddOnModal,
  onOpenCancelModal,
  onReactivate,
}) => (
  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
    <div className="p-4 border-b border-slate-100">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {subscription?.plan.name || 'Starter'} Plan
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              subscription?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              subscription?.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
              subscription?.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {subscription?.status || 'TRIAL'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {subscription?.userCount || 1} user{(subscription?.userCount || 1) > 1 ? 's' : ''} •
            {subscription?.billingCycle === 'annual' ? ' Annual' : ' Monthly'} billing
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-slate-900">
            {formatCurrency(subscription?.amount || 0)}
            <span className="text-xs font-normal text-slate-500">/month</span>
          </p>
          {subscription?.currentPeriodEnd && (
            <p className="text-xs text-slate-500 mt-0.5">
              <ClockIcon className="w-3 h-3 inline mr-1" />
              Renews {formatDate(subscription.currentPeriodEnd)}
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Usage Stats */}
    <div className="p-4">
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
        Usage This Month
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <UsageCard
          label="Leads"
          used={subscription?.usage.leadsCount || 0}
          limit={subscription?.plan.features.maxLeads || 1000}
        />
        <UsageCard
          label="AI Calls"
          used={subscription?.usage.aiCallsCount || 0}
          limit={subscription?.plan.features.aiCallsPerMonth || 0}
        />
        <UsageCard
          label="SMS"
          used={subscription?.usage.smsCount || 0}
          limit={subscription?.plan.features.smsPerMonth || 0}
        />
        <UsageCard
          label="Emails"
          used={subscription?.usage.emailsCount || 0}
          limit={subscription?.plan.features.emailsPerMonth || 500}
        />
      </div>
    </div>

    {/* Actions */}
    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onOpenAddOnModal}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <PlusIcon className="w-4 h-4 mr-1.5" />
          Buy Add-ons
        </button>

        {subscription?.status === 'ACTIVE' && (
          <button
            onClick={onOpenCancelModal}
            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            Cancel
          </button>
        )}

        {subscription?.status === 'CANCELLED' && (
          <button
            onClick={onReactivate}
            disabled={actionLoading}
            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Reactivate
          </button>
        )}
      </div>
    </div>
  </div>
);

// Plans Grid
interface PlansGridProps {
  plans: Plan[];
  currentPlanId?: string;
  onUpgrade: (planId: string) => void;
}

export const PlansGrid: React.FC<PlansGridProps> = ({ plans, currentPlanId, onUpgrade }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-4">
    <h2 className="text-sm font-semibold text-slate-900 mb-3">Available Plans</h2>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlanId === plan.id;
        const isUpgrade = plans.indexOf(plan) > plans.findIndex(p => p.id === currentPlanId);

        return (
          <div
            key={plan.id}
            className={`p-3 rounded-lg border ${
              isCurrentPlan
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-semibold text-slate-900">{plan.name}</h3>
              {isCurrentPlan && (
                <span className="px-1.5 py-0.5 bg-primary-500 text-white text-[10px] rounded-full">
                  Current
                </span>
              )}
            </div>

            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(plan.monthlyPrice)}
              <span className="text-xs font-normal text-slate-500">/user</span>
            </p>

            <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
              <li>{plan.features.maxLeads === -1 ? 'Unlimited' : plan.features.maxLeads.toLocaleString()} leads</li>
              <li>{plan.features.aiCallsPerMonth === -1 ? 'Unlimited' : plan.features.aiCallsPerMonth} AI calls/mo</li>
              <li>{plan.features.voiceAgents === -1 ? 'Unlimited' : plan.features.voiceAgents} Voice agents</li>
            </ul>

            {!isCurrentPlan && plan.id !== 'enterprise' && (
              <button
                onClick={() => onUpgrade(plan.id)}
                className={`w-full mt-3 inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-lg ${
                  isUpgrade
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isUpgrade ? (
                  <>
                    <ArrowUpIcon className="w-3 h-3 mr-1" />
                    Upgrade
                  </>
                ) : (
                  <>
                    <ArrowDownIcon className="w-3 h-3 mr-1" />
                    Downgrade
                  </>
                )}
              </button>
            )}

            {plan.id === 'enterprise' && !isCurrentPlan && (
              <button
                onClick={() => window.location.href = 'mailto:sales@yourcrm.com'}
                className="w-full mt-3 px-2 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Contact Sales
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

// Billing History Table
interface BillingHistoryTableProps {
  billingHistory: BillingHistoryItem[];
}

export const BillingHistoryTable: React.FC<BillingHistoryTableProps> = ({ billingHistory }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-4">
    <h2 className="text-sm font-semibold text-slate-900 mb-3">Billing History</h2>

    {billingHistory.length === 0 ? (
      <p className="text-slate-500 text-center py-6 text-sm">No billing history yet</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {billingHistory.map((item) => (
              <tr key={item.id} className="text-xs">
                <td className="py-2 text-slate-900">
                  {formatDate(item.createdAt)}
                </td>
                <td className="py-2 text-slate-600">
                  {item.planName} Plan - {item.billingCycle}
                </td>
                <td className="py-2 text-slate-900 font-medium">
                  {formatCurrency(item.amount)}
                </td>
                <td className="py-2">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    item.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-2">
                  {item.razorpayPaymentId && (
                    <button
                      onClick={() => window.open(`/api/subscription/invoice/${item.id}`, '_blank')}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// Cancel Modal
interface CancelModalProps {
  show: boolean;
  subscription: Subscription | null;
  cancelReason: string;
  actionLoading: boolean;
  onClose: () => void;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  show,
  subscription,
  cancelReason,
  actionLoading,
  onClose,
  onReasonChange,
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Cancel Subscription</h3>
        </div>

        <p className="text-slate-600 mb-4">
          Are you sure you want to cancel? You'll still have access until{' '}
          {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'the end of your billing period'}.
        </p>

        <textarea
          value={cancelReason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Please tell us why you're cancelling (optional)"
          className="w-full p-3 border border-slate-200 rounded-lg mb-4"
          rows={3}
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Keep Subscription
          </button>
          <button
            onClick={onCancel}
            disabled={actionLoading}
            className="flex-1 btn bg-red-600 text-white hover:bg-red-700"
          >
            {actionLoading ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add-on Modal
interface AddOnModalProps {
  show: boolean;
  planId: string;
  defaultAddOn?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddOnModal: React.FC<AddOnModalProps> = ({
  show,
  planId,
  defaultAddOn,
  onClose,
  onSuccess,
}) => {
  const [selectedAddOn, setSelectedAddOn] = useState<string>(defaultAddOn || 'voiceMinutes');
  const [quantity, setQuantity] = useState(defaultAddOn === 'voiceMinutes' ? 100 : 100);
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handlePurchase = async () => {
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const result = await subscriptionService.purchaseAddOn(
        selectedAddOn as 'voiceMinutes' | 'sms' | 'whatsapp' | 'leads' | 'phoneNumbers' | 'voiceAgents',
        quantity
      );

      const { order, keyId } = result;

      if (!order || !keyId) {
        toast.error('Invalid response from server. Please try again.');
        setLoading(false);
        return;
      }

      await subscriptionService.openCheckout(
        order,
        keyId,
        { name: '', email: '' },
        async (response) => {
          try {
            await subscriptionService.verifyAddOnPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            toast.success('Purchase successful! Credits have been added.');
            onSuccess();
          } catch (verifyErr: unknown) {
            console.error('Payment verification failed:', verifyErr);
            const error = verifyErr as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Payment verification failed');
            setLoading(false);
          }
        },
        (error) => {
          console.error('Payment cancelled or failed:', error);
          if (error.message !== 'Payment cancelled by user') {
            toast.error(error.description || error.message || 'Payment failed');
          }
          setLoading(false);
        }
      );
    } catch (err: unknown) {
      console.error('Failed to purchase add-on:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to initiate purchase';
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const selectedAddonDetails = ADD_ONS.find(a => a.id === selectedAddOn);
  const pricePerUnit = getAddOnPrice(selectedAddOn, planId);
  const totalPrice = pricePerUnit * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Buy Extra Credits</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Add-on Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              What do you need?
            </label>
            <select
              value={selectedAddOn}
              onChange={(e) => {
                setSelectedAddOn(e.target.value);
                const addon = ADD_ONS.find(a => a.id === e.target.value);
                setQuantity(addon?.defaultQty || 100);
              }}
              className="w-full p-3 border border-slate-200 rounded-lg text-slate-900 font-medium"
            >
              {ADD_ONS.map((addon) => (
                <option key={addon.id} value={addon.id}>
                  {addon.name}
                </option>
              ))}
            </select>
            {selectedAddonDetails && (
              <p className="text-sm text-slate-500 mt-1">{selectedAddonDetails.description}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              How many {selectedAddonDetails?.unit || 'units'}?
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min={1}
              className="w-full p-3 border border-slate-200 rounded-lg text-slate-900 font-medium"
            />
          </div>

          {/* Price Breakdown */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Price per {selectedAddonDetails?.unit || 'unit'}</span>
              <span className="font-semibold text-slate-900">₹{pricePerUnit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Quantity</span>
              <span className="font-semibold text-slate-900">{quantity} {selectedAddonDetails?.unit || 'units'}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="font-semibold text-slate-900">Total Amount</span>
              <span className="text-xl font-bold text-primary-600">₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading || quantity <= 0}
            className="flex-1 btn btn-primary"
          >
            {loading ? 'Processing...' : 'Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
};
