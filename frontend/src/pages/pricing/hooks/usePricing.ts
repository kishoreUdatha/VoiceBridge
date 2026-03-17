/**
 * Pricing Page Hook
 * Manages billing toggle and plan selection logic
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

export function usePricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const handleSelectPlan = useCallback((planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@voicecrm.com?subject=Enterprise Plan Inquiry';
      return;
    }
    const billingParam = isAnnual ? 'annual' : 'monthly';
    if (isAuthenticated) {
      navigate(`/subscription/checkout?plan=${planId}&billing=${billingParam}`);
    } else {
      navigate(`/register?plan=${planId}&billing=${billingParam}`);
    }
  }, [isAnnual, isAuthenticated, navigate]);

  const toggleBilling = useCallback((annual: boolean) => {
    setIsAnnual(annual);
  }, []);

  const toggleComparison = useCallback(() => {
    setShowComparison(prev => !prev);
  }, []);

  return {
    isAnnual,
    showComparison,
    toggleBilling,
    toggleComparison,
    handleSelectPlan,
  };
}
