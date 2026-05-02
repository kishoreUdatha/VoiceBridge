/**
 * Assignment Side Panel Components
 * Telecaller and AI Campaign assignment panels
 */

import React, { useState, useMemo } from 'react';
import {
  XMarkIcon,
  UserGroupIcon,
  CpuChipIcon,
  PhoneIcon,
  ClockIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Telecaller {
  id: string;
  firstName: string;
  lastName: string;
  activeRecordCount?: number;
  role?: string;
  roleSlug?: string;
}

// Telecaller Assignment Panel
interface TelecallerPanelProps {
  selectedRecordsCount: number;
  telecallers: Telecaller[];
  selectedTelecallers: string[];
  onToggleTelecaller: (id: string) => void;
  onAssign: () => void;
  onClose: () => void;
}

export const TelecallerAssignPanel: React.FC<TelecallerPanelProps> = ({
  selectedRecordsCount,
  telecallers,
  selectedTelecallers,
  onToggleTelecaller,
  onAssign,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter telecallers based on search query
  const filteredTelecallers = useMemo(() => {
    if (!searchQuery.trim()) return telecallers;
    const query = searchQuery.toLowerCase();
    return telecallers.filter(
      (t) =>
        t.firstName.toLowerCase().includes(query) ||
        t.lastName.toLowerCase().includes(query) ||
        t.role?.toLowerCase().includes(query) ||
        t.roleSlug?.toLowerCase().includes(query)
    );
  }, [telecallers, searchQuery]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed top-11 left-0 right-0 bottom-0 lg:left-52 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed top-11 right-0 bottom-0 w-96 max-w-[calc(100vw-13rem)] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-50">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-900">
            <UserGroupIcon className="h-5 w-5 text-blue-600" />
            Assign to Telecallers
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-blue-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Selected Records Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserGroupIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">{selectedRecordsCount} Records Selected</p>
                <p className="text-xs text-blue-600">Will be distributed round-robin</p>
              </div>
            </div>
          </div>

          {/* Telecaller Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Select Telecallers
            </label>

            {/* Search Input */}
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {telecallers.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <UserGroupIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">No telecallers available</p>
              </div>
            ) : filteredTelecallers.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <MagnifyingGlassIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">No telecallers match "{searchQuery}"</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredTelecallers.map((telecaller) => (
                  <label
                    key={telecaller.id}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTelecallers.includes(telecaller.id)
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTelecallers.includes(telecaller.id)}
                      onChange={() => onToggleTelecaller(telecaller.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {telecaller.firstName} {telecaller.lastName}
                        </p>
                        {telecaller.role && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                            {telecaller.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {telecaller.activeRecordCount || 0} active records
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Distribution Info */}
          {selectedTelecallers.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <p className="font-medium mb-1">Distribution Info:</p>
              <p>Records will be evenly distributed among {selectedTelecallers.length} selected telecaller(s).</p>
              <p className="mt-1">~{Math.ceil(selectedRecordsCount / selectedTelecallers.length)} records per telecaller</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 space-y-3">
          <button
            onClick={onAssign}
            disabled={selectedTelecallers.length === 0}
            className="w-full btn text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <UserGroupIcon className="h-4 w-4" />
            Assign to {selectedTelecallers.length || 0} Telecaller(s)
          </button>
          <button onClick={onClose} className="w-full btn btn-outline text-sm py-2 rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
};

// AI Campaign Panel
interface AICampaignPanelProps {
  selectedRecordsCount: number;
  campaignName: string;
  callingHoursStart: string;
  callingHoursEnd: string;
  voiceAgents: VoiceAgent[];
  selectedAgent: string;
  isCreating: boolean;
  onCampaignNameChange: (name: string) => void;
  onCallingHoursStartChange: (time: string) => void;
  onCallingHoursEndChange: (time: string) => void;
  onAgentSelect: (agentId: string) => void;
  onCreateCampaign: () => void;
  onCreateAgent: () => void;
  onClose: () => void;
}

export const AICampaignPanel: React.FC<AICampaignPanelProps> = ({
  selectedRecordsCount,
  campaignName,
  callingHoursStart,
  callingHoursEnd,
  voiceAgents,
  selectedAgent,
  isCreating,
  onCampaignNameChange,
  onCallingHoursStartChange,
  onCallingHoursEndChange,
  onAgentSelect,
  onCreateCampaign,
  onCreateAgent,
  onClose,
}) => (
  <>
    {/* Backdrop */}
    <div
      className="fixed top-11 left-0 right-0 bottom-0 lg:left-52 bg-black bg-opacity-30 z-40"
      onClick={onClose}
    />

    {/* Side Panel */}
    <div className="fixed top-11 right-0 bottom-0 w-96 max-w-[calc(100vw-13rem)] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-purple-50">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-purple-900">
          <CpuChipIcon className="h-5 w-5 text-purple-600" />
          AI Calling Campaign
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-purple-100"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Selected Records Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <PhoneIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900">{selectedRecordsCount} Records Selected</p>
              <p className="text-xs text-purple-600">Will be called by AI agent</p>
            </div>
          </div>
        </div>

        {/* Campaign Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Campaign Name</label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => onCampaignNameChange(e.target.value)}
            placeholder="Enter campaign name"
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* AI Agent Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">AI Voice Agent</label>
          {voiceAgents.filter((a) => a.isActive).length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <CpuChipIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-xs mb-3">No AI agents available</p>
              <button onClick={onCreateAgent} className="btn btn-outline btn-sm text-xs">
                Create AI Agent
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {voiceAgents
                .filter((a) => a.isActive)
                .map((agent) => (
                  <label
                    key={agent.id}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAgent === agent.id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="agent"
                      value={agent.id}
                      checked={selectedAgent === agent.id}
                      onChange={(e) => onAgentSelect(e.target.value)}
                      className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                      {agent.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
                      )}
                    </div>
                  </label>
                ))}
            </div>
          )}
        </div>

        {/* Calling Hours */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Calling Hours</label>
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">Start Time</label>
              <input
                type="time"
                value={callingHoursStart}
                onChange={(e) => onCallingHoursStartChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <span className="text-gray-400 mt-4">→</span>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 mb-1">End Time</label>
              <input
                type="time"
                value={callingHoursEnd}
                onChange={(e) => onCallingHoursEndChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            Calls will only be made during these hours
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 p-4 space-y-3">
        <button
          onClick={onCreateCampaign}
          disabled={!selectedAgent || !campaignName.trim() || isCreating}
          className="w-full btn text-sm bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Campaign...
            </>
          ) : (
            <>
              <PhoneIcon className="h-4 w-4" />
              Start Campaign
            </>
          )}
        </button>
        <button onClick={onClose} className="w-full btn btn-outline text-sm py-2 rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  </>
);
