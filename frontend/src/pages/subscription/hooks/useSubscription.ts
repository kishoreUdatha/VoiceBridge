/**
 * Subscription Hook
 * Manages subscription state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import subscriptionService, { Subscription, Plan } from '../../../services/subscription.service';
import { BillingHistoryItem } from '../subscription.types';

export function useSubscription() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [defaultAddOn, setDefaultAddOn] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [sub, plansData, history] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getPlans(),
        subscriptionService.getBillingHistory(),
      ]);
      setSubscription(sub);
      setPlans(plansData.plans);
      setBillingHistory(history);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Check if we need to open add-on modal from URL params
    const buyCredits = searchParams.get('buyCredits');
    if (buyCredits) {
      setDefaultAddOn(buyCredits);
      setShowAddOnModal(true);
      // Clear the param
      searchParams.delete('buyCredits');
      setSearchParams(searchParams);
    }
  }, [loadData, searchParams, setSearchParams]);

  const handleUpgrade = useCallback((planId: string) => {
    navigate(`/subscription/checkout?plan=${planId}&billing=${subscription?.billingCycle || 'annual'}`);
  }, [navigate, subscription?.billingCycle]);

  const handleCancel = useCallback(async () => {
    setActionLoading(true);
    try {
      await subscriptionService.cancelSubscription(cancelReason);
      setShowCancelModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    } finally {
      setActionLoading(false);
    }
  }, [cancelReason, loadData]);

  const handleReactivate = useCallback(async () => {
    setActionLoading(true);
    try {
      await subscriptionService.reactivateSubscription();
      loadData();
    } catch (err) {
      console.error('Failed to reactivate subscription:', err);
    } finally {
      setActionLoading(false);
    }
  }, [loadData]);

  const openAddOnModal = useCallback(() => {
    setShowAddOnModal(true);
  }, []);

  const closeAddOnModal = useCallback(() => {
    setShowAddOnModal(false);
    setDefaultAddOn(null);
  }, []);

  const onAddOnSuccess = useCallback(() => {
    setShowAddOnModal(false);
    setDefaultAddOn(null);
    loadData();
  }, [loadData]);

  return {
    // State
    subscription,
    plans,
    billingHistory,
    loading,
    actionLoading,
    showCancelModal,
    showAddOnModal,
    defaultAddOn,
    cancelReason,
    // Actions
    setShowCancelModal,
    setCancelReason,
    handleUpgrade,
    handleCancel,
    handleReactivate,
    openAddOnModal,
    closeAddOnModal,
    onAddOnSuccess,
  };
}
