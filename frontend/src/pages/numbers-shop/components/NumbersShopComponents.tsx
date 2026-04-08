/**
 * Numbers Shop Components
 * Professional UI components for phone number marketplace
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  PhoneIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  LinkIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import {
  WalletInfo,
  WalletTransaction,
  AvailableNumber,
  KycStatus,
} from '../numbers-shop.types';
import { ExotelCredentials, ExotelConnectionStatus } from '../../../services/numbers-shop.service';

// ==================== EXOTEL CONNECTION MODAL ====================

interface ExotelConnectionModalProps {
  connectionStatus: ExotelConnectionStatus | null;
  onConnect: (credentials: ExotelCredentials) => Promise<{ success: boolean; error?: string }>;
  onTestConnection: (credentials: ExotelCredentials) => Promise<{ success: boolean; message: string; balance?: number }>;
  onClose: () => void;
}

export function ExotelConnectionModal({
  connectionStatus,
  onConnect,
  onTestConnection,
  onClose,
}: ExotelConnectionModalProps) {
  const [accountSid, setAccountSid] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [callerId, setCallerId] = useState('');
  const [subdomain, setSubdomain] = useState('api.exotel.com');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; balance?: number } | null>(null);

  const isValid = accountSid && apiKey && apiToken;

  const handleTest = async () => {
    if (!isValid) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTestConnection({
        accountSid,
        apiKey,
        apiToken,
        subdomain,
      });
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!isValid) return;
    setConnecting(true);
    try {
      const result = await onConnect({
        accountSid,
        apiKey,
        apiToken,
        callerId,
        subdomain,
      });
      if (result.success) {
        onClose();
      }
    } finally {
      setConnecting(false);
    }
  };

  // Prevent body scroll when panel is open
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Prevent scroll propagation
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  return createPortal(
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
      onWheel={handleWheel}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* Backdrop - covers everything including sidebar */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        className="absolute top-0 right-0 w-80 bg-white shadow-2xl flex flex-col h-full overflow-hidden"
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
              <LinkIcon className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white">Connect Exotel</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Info Banner */}
          <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-1.5">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <p className="text-[11px] text-blue-700">Credentials are encrypted and stored securely.</p>
            </div>
          </div>

          {/* Form */}
          <div className="px-3 py-3 space-y-3">
            {/* Section: Required */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Required
              </h4>

              {/* Account SID */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Account SID</label>
                <input
                  type="text"
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                  placeholder="your_exotel_sid"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50 focus:bg-white"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="your_api_key"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50 focus:bg-white"
                />
              </div>

              {/* API Token */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">API Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="your_api_token"
                    className="w-full px-2.5 py-1.5 pr-8 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showToken ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Section: Optional */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Optional
              </h4>

              {/* Caller ID */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Default Caller ID</label>
                <input
                  type="text"
                  value={callerId}
                  onChange={(e) => setCallerId(e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Subdomain */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">API Subdomain</label>
                <select
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50 focus:bg-white cursor-pointer"
                >
                  <option value="api.exotel.com">api.exotel.com (Default)</option>
                  <option value="twilix.exotel.com">twilix.exotel.com</option>
                  <option value="api.in.exotel.com">api.in.exotel.com</option>
                </select>
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`flex items-start gap-2 p-2 rounded text-[11px] ${
                testResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {testResult.success ? (
                  <CheckCircleIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                )}
                <div className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                  <p className="font-medium">{testResult.success ? 'Connected!' : 'Failed'}</p>
                  <p className="opacity-80">{testResult.message}</p>
                  {testResult.balance !== undefined && (
                    <p className="mt-0.5 font-medium">Balance: ${testResult.balance.toFixed(2)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 flex gap-2">
          <button
            onClick={handleTest}
            disabled={!isValid || testing}
            className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 disabled:bg-slate-100 disabled:text-slate-400 transition flex items-center justify-center gap-1.5"
          >
            {testing ? (
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowPathIcon className="w-3.5 h-3.5" />
            )}
            Test
          </button>
          <button
            onClick={handleConnect}
            disabled={!isValid || connecting}
            className="flex-[2] px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
          >
            {connecting ? (
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LinkIcon className="w-3.5 h-3.5" />
            )}
            Connect & Import
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ==================== PURCHASE MODAL ====================

interface PurchaseModalProps {
  number: AvailableNumber;
  wallet: WalletInfo | null;
  purchasing: boolean;
  onPurchase: (friendlyName?: string) => void;
  onClose: () => void;
}

export function PurchaseModal({
  number,
  wallet,
  purchasing,
  onPurchase,
  onClose,
}: PurchaseModalProps) {
  const [friendlyName, setFriendlyName] = useState('');
  const canPurchase = wallet && wallet.balance >= number.monthlyPrice;
  const needsKyc = number.phoneNumber.startsWith('+91') && !wallet?.kycVerified;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Confirm Purchase</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Number Display */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-5">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <PhoneIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-slate-900">{number.displayNumber}</p>
              <p className="text-sm text-slate-500">{number.region} · {number.type}</p>
            </div>
          </div>

          {/* Friendly Name Input */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Friendly Name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="e.g., Sales Line, Support"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          {/* Price Summary */}
          <div className="space-y-2 p-4 bg-blue-50 rounded-xl mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Monthly Cost</span>
              <span className="font-semibold text-slate-900">${number.monthlyPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Your Balance</span>
              <span className={`font-semibold ${canPurchase ? 'text-green-600' : 'text-red-600'}`}>
                ${wallet?.balance.toFixed(2) || '0.00'}
              </span>
            </div>
            {wallet && wallet.balance >= number.monthlyPrice && (
              <div className="flex justify-between text-sm pt-2 border-t border-blue-100">
                <span className="text-slate-600">Remaining Balance</span>
                <span className="font-semibold text-slate-900">
                  ${(wallet.balance - number.monthlyPrice).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Warnings */}
          {!canPurchase && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm mb-4">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Insufficient balance. Please add funds to continue.</span>
            </div>
          )}

          {needsKyc && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
              <ShieldCheckIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>KYC verification is required for Indian numbers.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onPurchase(friendlyName || undefined)}
            disabled={!canPurchase || purchasing || needsKyc}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {purchasing ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Purchase · $${number.monthlyPrice.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== ADD FUNDS MODAL ====================

interface AddFundsModalProps {
  onAddFunds: (amount: number) => void;
  onClose: () => void;
}

export function AddFundsModal({ onAddFunds, onClose }: AddFundsModalProps) {
  const [amount, setAmount] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const presetAmounts = [10, 25, 50, 100];

  const handleSubmit = async () => {
    setLoading(true);
    await onAddFunds(amount);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Add Funds to Wallet</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Quick Select Amounts */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset)}
                className={`py-3 rounded-lg border-2 text-sm font-semibold transition ${
                  amount === preset
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Custom Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2.5 text-lg font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-slate-500 text-center">
            For demo purposes, funds are added instantly. In production, this integrates with Razorpay.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={amount <= 0 || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              `Add $${amount.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== KYC MODAL ====================

interface KycModalProps {
  kycStatus: KycStatus | null;
  onSubmit: (documents: { panNumber?: string; gstNumber?: string }) => void;
  onClose: () => void;
}

export function KycModal({ kycStatus, onSubmit, onClose }: KycModalProps) {
  const [panNumber, setPanNumber] = useState(kycStatus?.documents.panNumber || '');
  const [gstNumber, setGstNumber] = useState(kycStatus?.documents.gstNumber || '');
  const [loading, setLoading] = useState(false);

  const isValidPan = !panNumber || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber);
  const isValidGst = !gstNumber || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber);
  const canSubmit = panNumber && isValidPan && isValidGst;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    await onSubmit({ panNumber: panNumber || undefined, gstNumber: gstNumber || undefined });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">KYC Verification</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl mb-5">
            <ShieldCheckIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-slate-900">Required for Indian Numbers</p>
              <p className="text-sm text-slate-600 mt-0.5">
                TRAI regulations require KYC verification to purchase Indian phone numbers.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                PAN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={`w-full px-3 py-2.5 text-sm uppercase border rounded-lg focus:ring-2 focus:ring-blue-500 transition ${
                  panNumber && !isValidPan ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {panNumber && !isValidPan && (
                <p className="text-xs text-red-600 mt-1">Invalid PAN format</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                GST Number <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className={`w-full px-3 py-2.5 text-sm uppercase border rounded-lg focus:ring-2 focus:ring-blue-500 transition ${
                  gstNumber && !isValidGst ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {gstNumber && !isValidGst && (
                <p className="text-xs text-red-600 mt-1">Invalid GST format</p>
              )}
            </div>
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-slate-500 text-center mt-5">
            Your documents are securely stored and used only for regulatory compliance.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Verify KYC
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== LEGACY EXPORTS (for compatibility) ====================

export function WalletCard() { return null; }
export function Tabs() { return null; }
export function Filters() { return null; }
export function AvailableNumbersTable() { return null; }
export function MyNumbersTable() { return null; }
export function TransactionsList() { return null; }
