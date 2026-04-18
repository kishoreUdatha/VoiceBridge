/**
 * Numbers Shop Page
 * Phone number management - Connect your own Exotel account (BYOC)
 */

import { useState } from 'react';
import {
  PhoneIcon,
  WalletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useNumbersShop } from './hooks';
import {
  AddFundsModal,
  ExotelConnectionModal,
} from './components';

export default function NumbersShopPage() {
  const {
    activeTab,
    setActiveTab,
    loading,
    wallet,
    transactions,
    showAddFundsModal,
    setShowAddFundsModal,
    handleAddFunds,
    myNumbers,
    handleReleaseNumber,
    handleImportFromExotel,
    refreshData,
    // Connection
    connectionStatus,
    connectionLoading,
    showConnectionModal,
    setShowConnectionModal,
    handleConnectExotel,
    handleTestConnection,
    handleDisconnectExotel,
  } = useNumbersShop();

  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Import numbers from connected Exotel
  const handleImportFromOwnExotel = async () => {
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await handleImportFromExotel();
      setImportResult({ imported: result.imported, skipped: result.skipped });
      refreshData();
      // Auto close after showing result for 2 seconds
      setTimeout(() => {
        setShowImportModal(false);
        setImportResult(null);
      }, 2000);
    } catch (error: any) {
      console.error('Import failed:', error);
      setImportError(error.response?.data?.error || error.message || 'Failed to import numbers');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Phone Numbers</h1>
              <p className="text-sm text-slate-500">Connect your Exotel account to manage phone numbers</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status */}
              {connectionStatus?.isConnected ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Exotel Connected</span>
                  <button
                    onClick={handleDisconnectExotel}
                    className="ml-1 text-green-600 hover:text-red-600 transition"
                    title="Disconnect"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConnectionModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  <LinkIcon className="w-4 h-4" />
                  Connect Exotel
                </button>
              )}

              {/* Wallet Balance */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                <WalletIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Balance:</span>
                <span className="text-sm font-semibold text-slate-900">${wallet?.balance.toFixed(2) || '0.00'}</span>
                <button
                  onClick={() => setShowAddFundsModal(true)}
                  className="ml-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {[
              { id: 'my-numbers', label: 'My Numbers', count: myNumbers.length },
              { id: 'wallet', label: 'Billing & Wallet' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id || (activeTab === 'shop' && tab.id === 'my-numbers')
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* My Numbers Tab */}
        {(activeTab === 'my-numbers' || activeTab === 'shop') && (
          <div className="space-y-4">
            {/* Connection Card */}
            {!connectionStatus?.isConnected && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <LinkIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">Connect Your Exotel Account</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Link your Exotel account to import and manage your phone numbers. You maintain full control over your numbers and billing with Exotel.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowConnectionModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Connect Account
                      </button>
                      <a
                        href="https://exotel.com/signup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600"
                      >
                        Don't have Exotel? Sign up
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Connected: Show Import Option */}
            {connectionStatus?.isConnected && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">Exotel Connected</h3>
                      <p className="text-sm text-slate-500">Account: {connectionStatus.accountSid}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                  >
                    <CloudArrowDownIcon className="w-4 h-4" />
                    Import Numbers
                  </button>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search numbers..."
                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Numbers List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : myNumbers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PhoneIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No phone numbers yet</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                    {connectionStatus?.isConnected
                      ? 'Import your phone numbers from Exotel to get started'
                      : 'Connect your Exotel account to import your phone numbers'}
                  </p>
                  {connectionStatus?.isConnected ? (
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition mx-auto"
                    >
                      <CloudArrowDownIcon className="w-4 h-4" />
                      Import from Exotel
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowConnectionModal(true)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition mx-auto"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Connect Your Exotel
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Phone Number
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Label
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Assigned To
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Provider
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myNumbers.map((num) => (
                      <tr key={num.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                              <PhoneIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-mono text-sm font-medium text-slate-900">
                              {num.displayNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{num.friendlyName || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            num.status === 'ASSIGNED' ? 'bg-green-100 text-green-700' :
                            num.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {num.status === 'ASSIGNED' ? 'In Use' : num.status === 'AVAILABLE' ? 'Available' : num.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {num.assignedAgent ? (
                            <span className="text-sm text-slate-900">{num.assignedAgent.name}</span>
                          ) : (
                            <span className="text-sm text-slate-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {num.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition">
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReleaseNumber(num.id)}
                              disabled={num.status === 'ASSIGNED'}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Help Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PhoneIcon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">How to get phone numbers</h3>
                  <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                    <li>Create an account at <a href="https://exotel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">exotel.com</a></li>
                    <li>Purchase phone numbers from your Exotel dashboard</li>
                    <li>Connect your Exotel account here using API credentials</li>
                    <li>Import your numbers to use with MyLeadX AI agents</li>
                  </ol>
                  <a
                    href="https://my.exotel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Open Exotel Dashboard
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Wallet Balance</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${wallet?.balance.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <WalletIcon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <button
                  onClick={() => setShowAddFundsModal(true)}
                  className="mt-4 w-full text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 py-2 rounded-lg transition"
                >
                  + Add Funds
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Active Numbers</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{myNumbers.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Numbers imported from your Exotel account
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Exotel Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {connectionStatus?.isConnected ? (
                        <>
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          <span className="text-lg font-semibold text-green-600">Connected</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheckIcon className="w-5 h-5 text-slate-400" />
                          <span className="text-lg font-semibold text-slate-500">Not Connected</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {connectionStatus?.isConnected ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Account: {connectionStatus.accountSid}
                  </p>
                ) : (
                  <button
                    onClick={() => setShowConnectionModal(true)}
                    className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Connect your account →
                  </button>
                )}
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-medium text-slate-900">Transaction History</h3>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <WalletIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                          tx.type === 'CREDIT' ? 'bg-green-100 text-green-600' :
                          tx.type === 'REFUND' ? 'bg-amber-100 text-amber-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {tx.type === 'CREDIT' ? '+' : '−'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500">Bal: ${tx.balanceAfter.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Import from Exotel</h3>
            </div>
            <div className="px-6 py-5">
              {importResult ? (
                // Success state
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Import Complete</h4>
                  <p className="text-sm text-slate-600">
                    {importResult.imported > 0 ? (
                      <>Imported <span className="font-semibold text-green-600">{importResult.imported}</span> new number{importResult.imported !== 1 ? 's' : ''}</>
                    ) : (
                      'No new numbers to import'
                    )}
                    {importResult.skipped > 0 && (
                      <span className="text-slate-500"> · {importResult.skipped} already synced</span>
                    )}
                  </p>
                </div>
              ) : importError ? (
                // Error state
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XMarkIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Import Failed</h4>
                  <p className="text-sm text-red-600 mb-4">{importError}</p>
                  <button
                    onClick={() => setImportError(null)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                // Default state
                <>
                  <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl mb-5">
                    <CloudArrowDownIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-slate-700">
                        This will sync all phone numbers from your connected Exotel account to MyLeadX.
                      </p>
                    </div>
                  </div>
                  {connectionStatus?.isConnected && (
                    <p className="text-sm text-green-600">
                      Connected to: {connectionStatus.accountSid}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              {importResult ? (
                <button
                  onClick={() => { setShowImportModal(false); setImportResult(null); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  Done
                </button>
              ) : importError ? (
                <button
                  onClick={() => { setShowImportModal(false); setImportError(null); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportFromOwnExotel}
                    disabled={importLoading || !connectionStatus?.isConnected}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition"
                  >
                    {importLoading ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CloudArrowDownIcon className="w-4 h-4" />
                        Import Numbers
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && (
        <ExotelConnectionModal
          connectionStatus={connectionStatus}
          onConnect={handleConnectExotel}
          onTestConnection={handleTestConnection}
          onClose={() => setShowConnectionModal(false)}
        />
      )}

      {/* Add Funds Modal */}
      {showAddFundsModal && (
        <AddFundsModal
          onAddFunds={handleAddFunds}
          onClose={() => setShowAddFundsModal(false)}
        />
      )}
    </div>
  );
}
