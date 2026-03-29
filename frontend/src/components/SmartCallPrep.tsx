/**
 * Smart Call Prep Component
 * Shows AI-generated suggestions before making a call to a lead
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface CallPrepSuggestions {
  recommendedOpening: string;
  thingsToAvoid: string[];
  talkingPoints: string[];
  objectionPrep: Array<{
    objection: string;
    suggestedResponse: string;
  }>;
  leadContext: {
    interestLevel: 'low' | 'medium' | 'high';
    mainConcerns: string[];
    decisionMakerStatus: string;
    preferredChannel: string;
    bestTimeToCall: string;
  };
  previousCallsSummary: string;
  confidenceScore: number;
}

interface SmartCallPrepProps {
  phoneNumber: string;
  leadName?: string;
  isOpen: boolean;
  onClose: () => void;
  onProceedToCall: () => void;
}

export const SmartCallPrep: React.FC<SmartCallPrepProps> = ({
  phoneNumber,
  leadName,
  isOpen,
  onClose,
  onProceedToCall,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<CallPrepSuggestions | null>(null);
  const [hasPreviousCalls, setHasPreviousCalls] = useState(false);
  const [totalPreviousCalls, setTotalPreviousCalls] = useState(0);
  const [activeTab, setActiveTab] = useState<'prep' | 'objections' | 'context'>('prep');

  useEffect(() => {
    if (isOpen && phoneNumber) {
      fetchCallPrep();
    }
  }, [isOpen, phoneNumber]);

  const fetchCallPrep = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/outbound-calls/call-prep/${encodeURIComponent(phoneNumber)}`, {
        params: { leadName },
      });
      if (response.data.success) {
        setPrep(response.data.data.prep);
        setHasPreviousCalls(response.data.data.hasPreviousCalls);
        setTotalPreviousCalls(response.data.data.totalPreviousCalls || 0);
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load call prep');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getInterestColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📞</span>
                <div>
                  <h2 className="text-white font-semibold text-sm">Smart Call Prep</h2>
                  <p className="text-blue-100 text-xs">
                    {leadName || phoneNumber} • {totalPreviousCalls} previous call{totalPreviousCalls !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600 text-sm">Analyzing previous calls...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 text-sm mb-2">{error}</div>
                <button
                  onClick={fetchCallPrep}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : prep ? (
              <>
                {/* Previous Calls Summary */}
                {hasPreviousCalls && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-blue-800">{prep.previousCallsSummary}</p>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-3 border-b">
                  <button
                    onClick={() => setActiveTab('prep')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t ${
                      activeTab === 'prep'
                        ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Call Prep
                  </button>
                  <button
                    onClick={() => setActiveTab('objections')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t ${
                      activeTab === 'objections'
                        ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Objection Prep
                  </button>
                  <button
                    onClick={() => setActiveTab('context')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t ${
                      activeTab === 'context'
                        ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Lead Context
                  </button>
                </div>

                {activeTab === 'prep' && (
                  <div className="space-y-3">
                    {/* Recommended Opening */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-green-500">🎯</span>
                        <span className="text-xs font-semibold text-gray-700">Recommended Opening</span>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                        <p className="text-sm text-green-800 italic">"{prep.recommendedOpening}"</p>
                      </div>
                    </div>

                    {/* Things to Avoid */}
                    {prep.thingsToAvoid.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-red-500">⚠️</span>
                          <span className="text-xs font-semibold text-gray-700">Things to Avoid</span>
                        </div>
                        <div className="space-y-1">
                          {prep.thingsToAvoid.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-red-50 rounded p-2">
                              <span className="text-red-400 text-xs">✗</span>
                              <span className="text-xs text-red-700">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Talking Points */}
                    {prep.talkingPoints.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-blue-500">💡</span>
                          <span className="text-xs font-semibold text-gray-700">Key Talking Points</span>
                        </div>
                        <div className="space-y-1">
                          {prep.talkingPoints.map((point, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-blue-50 rounded p-2">
                              <span className="text-blue-500 text-xs font-bold">{idx + 1}.</span>
                              <span className="text-xs text-blue-800">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'objections' && (
                  <div className="space-y-2">
                    {prep.objectionPrep.length > 0 ? (
                      prep.objectionPrep.map((item, idx) => (
                        <div key={idx} className="border border-amber-200 rounded-lg overflow-hidden">
                          <div className="bg-amber-50 px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-500">🛡️</span>
                              <span className="text-xs font-medium text-amber-800">
                                If they say: "{item.objection}"
                              </span>
                            </div>
                          </div>
                          <div className="bg-white px-3 py-2">
                            <div className="flex items-start gap-1.5">
                              <span className="text-green-500 text-xs">→</span>
                              <span className="text-xs text-gray-700">{item.suggestedResponse}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-500 text-xs">
                        No specific objections detected from previous calls.
                        <br />Be prepared for common objections like pricing and timing.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'context' && (
                  <div className="space-y-3">
                    {/* Interest Level */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                      <span className="text-xs text-gray-600">Interest Level</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getInterestColor(prep.leadContext.interestLevel)}`}>
                        {prep.leadContext.interestLevel.toUpperCase()}
                      </span>
                    </div>

                    {/* Main Concerns */}
                    {prep.leadContext.mainConcerns.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-700">Main Concerns:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {prep.leadContext.mainConcerns.map((concern, idx) => (
                            <span key={idx} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                              {concern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Context */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-[10px] text-gray-500 block">Decision Maker</span>
                        <span className="text-xs text-gray-800">{prep.leadContext.decisionMakerStatus}</span>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-[10px] text-gray-500 block">Preferred Channel</span>
                        <span className="text-xs text-gray-800">{prep.leadContext.preferredChannel}</span>
                      </div>
                      <div className="bg-gray-50 rounded p-2 col-span-2">
                        <span className="text-[10px] text-gray-500 block">Best Time to Call</span>
                        <span className="text-xs text-gray-800">{prep.leadContext.bestTimeToCall}</span>
                      </div>
                    </div>

                    {/* Confidence Score */}
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">AI Confidence</span>
                        <span className="text-xs font-semibold text-gray-800">{prep.confidenceScore}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            prep.confidenceScore >= 70 ? 'bg-green-500' :
                            prep.confidenceScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${prep.confidenceScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-3 bg-gray-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={onProceedToCall}
              className="px-4 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Proceed to Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartCallPrep;
