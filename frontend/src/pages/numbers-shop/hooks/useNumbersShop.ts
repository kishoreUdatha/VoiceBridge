/**
 * Numbers Shop Hook
 * Manages state and operations for phone number marketplace
 *
 * Supports two options:
 * 1. Connect Your Exotel (BYOC) - Use your own Exotel account
 * 2. Buy from MyLeadX (PLATFORM) - Purchase numbers from our pool
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import numbersShopService, {
  ExotelConnectionStatus,
  ExotelCredentials,
} from '../../../services/numbers-shop.service';
import {
  WalletInfo,
  WalletTransaction,
  AvailableNumber,
  PurchasedNumber,
  KycStatus,
  NumbersShopFilters,
  TabType,
} from '../numbers-shop.types';

export function useNumbersShop() {
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('shop');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Exotel Connection State
  const [connectionStatus, setConnectionStatus] = useState<ExotelConnectionStatus | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);

  // Wallet State
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);

  // KYC State
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);

  // Numbers State
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [myNumbers, setMyNumbers] = useState<PurchasedNumber[]>([]);

  // Filters
  const [filters, setFilters] = useState<NumbersShopFilters>({
    country: 'IN',
    type: '',
    pattern: '',
  });

  // Purchase Modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null);

  // Add Funds Modal
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);

  // Connection Modal
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // ==================== EXOTEL CONNECTION ====================

  // Load Exotel connection status
  const loadConnectionStatus = useCallback(async () => {
    try {
      setConnectionLoading(true);
      const status = await numbersShopService.getConnectionStatus();
      setConnectionStatus(status);
    } catch (error) {
      console.error('Failed to load connection status:', error);
    } finally {
      setConnectionLoading(false);
    }
  }, []);

  // Connect Exotel account
  const handleConnectExotel = async (credentials: ExotelCredentials) => {
    try {
      setConnectionLoading(true);
      const result = await numbersShopService.connectExotel(credentials);
      toast.success(result.message || 'Exotel account connected successfully');
      setShowConnectionModal(false);
      loadConnectionStatus();
      loadWallet(); // Refresh wallet (KYC may have been auto-verified)
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to connect Exotel';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setConnectionLoading(false);
    }
  };

  // Test Exotel credentials
  const handleTestConnection = async (credentials: ExotelCredentials) => {
    try {
      const result = await numbersShopService.testExotelConnection(credentials);
      if (result.success) {
        toast.success(`Connection successful! Balance: $${result.balance?.toFixed(2) || '0.00'}`);
      } else {
        toast.error(result.message || 'Connection test failed');
      }
      return result;
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Connection test failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Disconnect Exotel account
  const handleDisconnectExotel = async () => {
    if (!confirm('Are you sure you want to disconnect your Exotel account? Your imported numbers will remain in MyLeadX.')) {
      return;
    }

    try {
      setConnectionLoading(true);
      await numbersShopService.disconnectExotel();
      toast.success('Exotel account disconnected');
      loadConnectionStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to disconnect');
    } finally {
      setConnectionLoading(false);
    }
  };

  // ==================== WALLET ====================

  // Load wallet info
  const loadWallet = useCallback(async () => {
    try {
      const data = await numbersShopService.getWalletBalance();
      setWallet(data);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  }, []);

  // Load KYC status
  const loadKycStatus = useCallback(async () => {
    try {
      const data = await numbersShopService.getKycStatus();
      setKycStatus(data);
    } catch (error) {
      console.error('Failed to load KYC status:', error);
    }
  }, []);

  // Load available numbers
  const loadAvailableNumbers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await numbersShopService.listAvailableNumbers({
        country: filters.country,
        type: filters.type || undefined,
        pattern: filters.pattern || undefined,
      });
      setAvailableNumbers(data.numbers);
      setWallet(data.wallet);
    } catch (error) {
      console.error('Failed to load available numbers:', error);
      toast.error('Failed to load available numbers');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load my numbers
  const loadMyNumbers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await numbersShopService.getMyNumbers();
      setMyNumbers(data);
    } catch (error) {
      console.error('Failed to load my numbers:', error);
      toast.error('Failed to load your numbers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      const data = await numbersShopService.getTransactionHistory({ limit: 20 });
      setTransactions(data.transactions);
      setTransactionsTotal(data.total);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  // ==================== INITIAL LOAD ====================

  // Initial load
  useEffect(() => {
    loadWallet();
    loadKycStatus();
    loadConnectionStatus();
  }, [loadWallet, loadKycStatus, loadConnectionStatus]);

  useEffect(() => {
    // Always load my numbers for shop and my-numbers tabs
    if (activeTab === 'shop' || activeTab === 'my-numbers') {
      loadMyNumbers();
      loadAvailableNumbers();
    } else if (activeTab === 'wallet') {
      loadTransactions();
    }
  }, [activeTab, loadAvailableNumbers, loadMyNumbers, loadTransactions]);

  // ==================== SEARCH ====================

  // Search numbers
  const handleSearch = useCallback(async () => {
    if (!filters.pattern || filters.pattern.length < 2) {
      loadAvailableNumbers();
      return;
    }

    try {
      setLoading(true);
      const data = await numbersShopService.searchNumbers({
        pattern: filters.pattern,
        country: filters.country,
        type: filters.type || undefined,
      });
      setAvailableNumbers(data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [filters, loadAvailableNumbers]);

  // ==================== PURCHASE ====================

  // Purchase number
  const handlePurchase = async (friendlyName?: string) => {
    if (!selectedNumber) return;

    // Check KYC for Indian numbers
    if (selectedNumber.phoneNumber.startsWith('+91') && !wallet?.kycVerified) {
      toast.error('KYC verification required for Indian numbers');
      setShowKycModal(true);
      return;
    }

    // Check balance
    if (wallet && wallet.balance < selectedNumber.monthlyPrice) {
      toast.error('Insufficient wallet balance');
      setShowAddFundsModal(true);
      return;
    }

    try {
      setPurchasing(true);
      await numbersShopService.purchaseNumber({
        phoneNumber: selectedNumber.phoneNumber,
        friendlyName,
      });

      toast.success(`Phone number ${selectedNumber.displayNumber} purchased successfully!`);
      setShowPurchaseModal(false);
      setSelectedNumber(null);

      // Refresh data
      loadWallet();
      loadAvailableNumbers();
      loadMyNumbers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to purchase number');
    } finally {
      setPurchasing(false);
    }
  };

  // ==================== IMPORT ====================

  // Import from own Exotel
  const handleImportFromExotel = async () => {
    try {
      setLoading(true);
      const result = await numbersShopService.importFromExotel();
      toast.success(`Imported ${result.imported} numbers, skipped ${result.skipped} duplicates`);
      loadMyNumbers();
      loadWallet(); // Refresh wallet (KYC may have been auto-verified)
      return result;
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to import numbers';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================== ADD FUNDS ====================

  // Add funds
  const handleAddFunds = async (amount: number) => {
    try {
      // For demo, directly add funds without payment gateway
      await numbersShopService.addFunds(amount, {
        description: 'Manual wallet top-up',
      });

      toast.success(`$${amount.toFixed(2)} added to wallet`);
      setShowAddFundsModal(false);
      loadWallet();
      loadTransactions();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to add funds');
    }
  };

  // ==================== KYC ====================

  // Submit KYC
  const handleSubmitKyc = async (documents: {
    panNumber?: string;
    gstNumber?: string;
  }) => {
    try {
      const result = await numbersShopService.submitKyc(documents);

      if (result.kycVerified) {
        toast.success('KYC verification completed!');
        setShowKycModal(false);
        loadKycStatus();
        loadWallet();
      } else {
        toast.error('KYC verification failed. Please check your documents.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'KYC submission failed');
    }
  };

  // ==================== RELEASE ====================

  // Release number
  const handleReleaseNumber = async (id: string) => {
    if (!confirm('Are you sure you want to release this number? This action cannot be undone.')) {
      return;
    }

    try {
      await numbersShopService.releaseNumber(id);
      toast.success('Number released successfully');
      loadMyNumbers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to release number');
    }
  };

  // Open purchase modal
  const openPurchaseModal = (number: AvailableNumber) => {
    setSelectedNumber(number);
    setShowPurchaseModal(true);
  };

  // Update filters
  const updateFilters = (newFilters: Partial<NumbersShopFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    // UI State
    activeTab,
    setActiveTab,
    loading,
    purchasing,

    // Exotel Connection
    connectionStatus,
    connectionLoading,
    showConnectionModal,
    setShowConnectionModal,
    handleConnectExotel,
    handleTestConnection,
    handleDisconnectExotel,

    // Wallet
    wallet,
    transactions,
    transactionsTotal,
    showAddFundsModal,
    setShowAddFundsModal,
    handleAddFunds,

    // KYC
    kycStatus,
    showKycModal,
    setShowKycModal,
    handleSubmitKyc,

    // Numbers
    availableNumbers,
    myNumbers,

    // Filters
    filters,
    updateFilters,
    handleSearch,

    // Purchase
    showPurchaseModal,
    setShowPurchaseModal,
    selectedNumber,
    openPurchaseModal,
    handlePurchase,

    // Import
    handleImportFromExotel,

    // Actions
    handleReleaseNumber,
    refreshData: () => {
      loadWallet();
      loadConnectionStatus();
      // Always refresh both myNumbers and availableNumbers for main tabs
      if (activeTab === 'shop' || activeTab === 'my-numbers') {
        loadMyNumbers();
        loadAvailableNumbers();
      }
      if (activeTab === 'wallet') loadTransactions();
    },
  };
}
