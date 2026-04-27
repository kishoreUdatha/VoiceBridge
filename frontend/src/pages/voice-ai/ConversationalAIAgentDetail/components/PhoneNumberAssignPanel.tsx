/**
 * Phone Number Assignment Panel
 *
 * Right-side sliding panel for assigning phone numbers to voice agents
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Phone, Check, Loader2, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';

interface PhoneNumber {
  id: string;
  number: string;
  displayNumber?: string;
  friendlyName?: string;
  provider: string;
  status: string;
  assignedToAgentId?: string | null;
  assignedToAgent?: {
    id: string;
    name: string;
  } | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  assignedNumbers: { id: string; number: string; displayNumber?: string }[];
  onNumberAssigned: (number: PhoneNumber) => void;
  onNumberUnassigned: (numberId: string) => void;
}

export function PhoneNumberAssignPanel({
  isOpen,
  onClose,
  agentId,
  agentName,
  assignedNumbers,
  onNumberAssigned,
  onNumberUnassigned,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Fetch available phone numbers
  useEffect(() => {
    if (isOpen) {
      fetchPhoneNumbers();
    }
  }, [isOpen]);

  const fetchPhoneNumbers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/phone-numbers');
      if (response.data.success) {
        setPhoneNumbers(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error);
      toast.error('Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (phoneNumber: PhoneNumber) => {
    try {
      setAssigning(phoneNumber.id);
      await api.post(`/phone-numbers/${phoneNumber.id}/assign`, {
        agentId,
      });
      onNumberAssigned(phoneNumber);
      toast.success(`${phoneNumber.displayNumber || phoneNumber.number} assigned to ${agentName}`);
      // Refresh the list
      fetchPhoneNumbers();
    } catch (error: any) {
      console.error('Failed to assign number:', error);
      toast.error(error.response?.data?.message || 'Failed to assign number');
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassign = async (phoneNumber: PhoneNumber) => {
    try {
      setAssigning(phoneNumber.id);
      await api.post(`/phone-numbers/${phoneNumber.id}/unassign`);
      onNumberUnassigned(phoneNumber.id);
      toast.success(`${phoneNumber.displayNumber || phoneNumber.number} unassigned`);
      // Refresh the list
      fetchPhoneNumbers();
    } catch (error: any) {
      console.error('Failed to unassign number:', error);
      toast.error(error.response?.data?.message || 'Failed to unassign number');
    } finally {
      setAssigning(null);
    }
  };

  const filteredNumbers = phoneNumbers.filter((num) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      num.number.includes(query) ||
      num.displayNumber?.toLowerCase().includes(query) ||
      num.friendlyName?.toLowerCase().includes(query) ||
      num.provider.toLowerCase().includes(query)
    );
  });

  const availableNumbers = filteredNumbers.filter(
    (num) => num.status === 'AVAILABLE' || num.status === 'ACTIVE'
  );
  const assignedToThisAgent = filteredNumbers.filter(
    (num) => num.assignedToAgentId === agentId
  );
  const assignedToOthers = filteredNumbers.filter(
    (num) => num.assignedToAgentId && num.assignedToAgentId !== agentId
  );

  const providerColors: Record<string, string> = {
    PLIVO: 'bg-green-100 text-green-700',
    EXOTEL: 'bg-blue-100 text-blue-700',
    TWILIO: 'bg-red-100 text-red-700',
    MSG91: 'bg-purple-100 text-purple-700',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Assign Phone Number</h2>
                <p className="text-sm text-gray-500">Select a number for {agentName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search phone numbers..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : phoneNumbers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Phone className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No phone numbers</p>
                  <p className="text-xs text-gray-500 mb-3">
                    You haven't added any phone numbers yet
                  </p>
                  <a
                    href="/numbers-shop"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Buy a number →
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Assigned to this agent */}
                  {assignedToThisAgent.length > 0 && (
                    <div className="p-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Assigned to this agent ({assignedToThisAgent.length})
                      </h3>
                      <div className="space-y-2">
                        {assignedToThisAgent.map((num) => (
                          <div
                            key={num.id}
                            className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                                <Phone className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 font-mono">
                                  {num.displayNumber || num.number}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${providerColors[num.provider] || 'bg-gray-100 text-gray-600'}`}>
                                    {num.provider}
                                  </span>
                                  {num.friendlyName && (
                                    <span className="text-xs text-gray-500">{num.friendlyName}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnassign(num)}
                              disabled={assigning === num.id}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {assigning === num.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Unassign'
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available numbers */}
                  {availableNumbers.length > 0 && (
                    <div className="p-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Available numbers ({availableNumbers.length})
                      </h3>
                      <div className="space-y-2">
                        {availableNumbers.map((num) => (
                          <div
                            key={num.id}
                            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Phone className="w-4 h-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 font-mono">
                                  {num.displayNumber || num.number}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${providerColors[num.provider] || 'bg-gray-100 text-gray-600'}`}>
                                    {num.provider}
                                  </span>
                                  {num.friendlyName && (
                                    <span className="text-xs text-gray-500">{num.friendlyName}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAssign(num)}
                              disabled={assigning === num.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {assigning === num.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Assign
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assigned to other agents */}
                  {assignedToOthers.length > 0 && (
                    <div className="p-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                        Assigned to other agents ({assignedToOthers.length})
                      </h3>
                      <div className="space-y-2">
                        {assignedToOthers.map((num) => (
                          <div
                            key={num.id}
                            className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-60"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Phone className="w-4 h-4 text-gray-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 font-mono">
                                  {num.displayNumber || num.number}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${providerColors[num.provider] || 'bg-gray-100 text-gray-600'}`}>
                                    {num.provider}
                                  </span>
                                  <span className="text-xs text-amber-600">
                                    → {num.assignedToAgent?.name || 'Another agent'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">In use</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No results */}
                  {filteredNumbers.length === 0 && searchQuery && (
                    <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">
                        No numbers matching "{searchQuery}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
              <a
                href="/numbers-shop"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Buy new number
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PhoneNumberAssignPanel;
