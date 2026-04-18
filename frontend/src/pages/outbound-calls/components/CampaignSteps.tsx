/**
 * Campaign Step Components
 * Step UI components for campaign creation wizard
 */

import React from 'react';
import {
  Bot,
  Users,
  Settings,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  Database,
  CheckSquare,
  Square,
  Phone,
  Zap,
  MousePointer,
  Cpu,
} from 'lucide-react';
import {
  VoiceAgent,
  Contact,
  Lead,
  CampaignFormData,
  ContactSource,
  LeadFilter,
  RawImportRecord,
  RawImportFilter,
} from '../create-campaign.types';
import { industryLabels } from '../create-campaign.constants';

// Step Indicators
interface StepIndicatorsProps {
  step: number;
}

export const StepIndicators: React.FC<StepIndicatorsProps> = ({ step }) => (
  <div className="flex items-center gap-4 mb-6">
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
      <Bot size={18} />
      <span className="font-medium">1. Agent</span>
    </div>
    <div className="w-8 h-0.5 bg-gray-200"></div>
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
      <Users size={18} />
      <span className="font-medium">2. Contacts</span>
    </div>
    <div className="w-8 h-0.5 bg-gray-200"></div>
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${step === 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
      <Settings size={18} />
      <span className="font-medium">3. Settings</span>
    </div>
  </div>
);

// Step 1: Select Agent
interface Step1Props {
  formData: CampaignFormData;
  agents: VoiceAgent[];
  loading: boolean;
  error: string | null;
  onFormChange: (data: Partial<CampaignFormData>) => void;
  onNext: () => void;
}

export const Step1SelectAgent: React.FC<Step1Props> = ({
  formData,
  agents,
  loading,
  error,
  onFormChange,
  onNext,
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <h2 className="text-xl font-semibold mb-4">Select AI Agent</h2>

    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Campaign Name
      </label>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => onFormChange({ name: e.target.value })}
        placeholder="e.g., April Lead Followup"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Description (Optional)
      </label>
      <textarea
        value={formData.description}
        onChange={(e) => onFormChange({ description: e.target.value })}
        placeholder="Brief description of this campaign..."
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {loading ? (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
        <p className="text-gray-500 mt-2">Loading agents...</p>
      </div>
    ) : agents.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Bot className="mx-auto mb-2 text-gray-300" size={48} />
        <p>No active AI agents found</p>
        <a href="/voice-ai/create" className="text-blue-600 hover:underline mt-2 inline-block">
          Create your first agent
        </a>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onFormChange({ agentId: agent.id })}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              formData.agentId === agent.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                formData.agentId === agent.id ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Bot size={20} className={formData.agentId === agent.id ? 'text-blue-600' : 'text-gray-600'} />
              </div>
              <div>
                <p className="font-medium text-gray-900">{agent.name}</p>
                <p className="text-sm text-gray-500">{industryLabels[agent.industry] || agent.industry}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    )}

    {error && (
      <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
        {error}
      </div>
    )}

    <div className="flex justify-end mt-6">
      <button
        onClick={onNext}
        disabled={!formData.name || !formData.agentId}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next: Add Contacts
      </button>
    </div>
  </div>
);

// Step 2: Add Contacts
interface Step2Props {
  contactSource: ContactSource;
  leads: Lead[];
  rawImportRecords: RawImportRecord[];
  contacts: Contact[];
  selectedLeadIds: string[];
  selectedRawImportIds: string[];
  selectAll: boolean;
  selectAllRawImports: boolean;
  leadFilter: LeadFilter;
  rawImportFilter: RawImportFilter;
  loadingLeads: boolean;
  loadingRawImports: boolean;
  error: string | null;
  onContactSourceChange: (source: ContactSource) => void;
  onLeadFilterChange: (filter: Partial<LeadFilter>) => void;
  onRawImportFilterChange: (filter: Partial<RawImportFilter>) => void;
  onToggleLeadSelection: (leadId: string) => void;
  onToggleRawImportSelection: (recordId: string) => void;
  onSelectAll: () => void;
  onSelectAllRawImports: () => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
  onUpdateContact: (index: number, field: keyof Contact, value: string) => void;
  onFileUpload: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step2AddContacts: React.FC<Step2Props> = ({
  contactSource,
  leads,
  rawImportRecords,
  contacts,
  selectedLeadIds,
  selectedRawImportIds,
  selectAll,
  selectAllRawImports,
  leadFilter,
  rawImportFilter,
  loadingLeads,
  loadingRawImports,
  error,
  onContactSourceChange,
  onLeadFilterChange,
  onRawImportFilterChange,
  onToggleLeadSelection,
  onToggleRawImportSelection,
  onSelectAll,
  onSelectAllRawImports,
  onAddContact,
  onRemoveContact,
  onUpdateContact,
  onFileUpload,
  onBack,
  onNext,
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <h2 className="text-xl font-semibold mb-4">Add Contacts</h2>

    {/* Contact Source Tabs */}
    <div className="flex border-b border-gray-200 mb-6">
      <button
        onClick={() => onContactSourceChange('rawImports')}
        className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
          contactSource === 'rawImports'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        <Database size={18} />
        Import Data
      </button>
      <button
        onClick={() => onContactSourceChange('leads')}
        className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
          contactSource === 'leads'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        <Users size={18} />
        Leads
      </button>
      <button
        onClick={() => onContactSourceChange('csv')}
        className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
          contactSource === 'csv'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        <Upload size={18} />
        Upload File
      </button>
      <button
        onClick={() => onContactSourceChange('manual')}
        className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
          contactSource === 'manual'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        <Plus size={18} />
        Manual Entry
      </button>
    </div>

    {/* Raw Imports Selection */}
    {contactSource === 'rawImports' && (
      <RawImportsSelection
        records={rawImportRecords}
        selectedIds={selectedRawImportIds}
        selectAll={selectAllRawImports}
        filter={rawImportFilter}
        loading={loadingRawImports}
        onFilterChange={onRawImportFilterChange}
        onToggleSelection={onToggleRawImportSelection}
        onSelectAll={onSelectAllRawImports}
      />
    )}

    {/* Leads Selection */}
    {contactSource === 'leads' && (
      <LeadsSelection
        leads={leads}
        selectedLeadIds={selectedLeadIds}
        selectAll={selectAll}
        leadFilter={leadFilter}
        loadingLeads={loadingLeads}
        onLeadFilterChange={onLeadFilterChange}
        onToggleLeadSelection={onToggleLeadSelection}
        onSelectAll={onSelectAll}
      />
    )}

    {/* CSV Upload */}
    {contactSource === 'csv' && (
      <CSVUpload contacts={contacts} onFileUpload={onFileUpload} />
    )}

    {/* Manual Entry */}
    {contactSource === 'manual' && (
      <ManualEntry
        contacts={contacts}
        onAddContact={onAddContact}
        onRemoveContact={onRemoveContact}
        onUpdateContact={onUpdateContact}
      />
    )}

    {error && (
      <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
        {error}
      </div>
    )}

    <div className="flex justify-between mt-6">
      <button
        onClick={onBack}
        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
      >
        Back
      </button>
      <button
        onClick={onNext}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Next: Settings
      </button>
    </div>
  </div>
);

// Leads Selection Sub-component
interface LeadsSelectionProps {
  leads: Lead[];
  selectedLeadIds: string[];
  selectAll: boolean;
  leadFilter: LeadFilter;
  loadingLeads: boolean;
  onLeadFilterChange: (filter: Partial<LeadFilter>) => void;
  onToggleLeadSelection: (leadId: string) => void;
  onSelectAll: () => void;
}

const LeadsSelection: React.FC<LeadsSelectionProps> = ({
  leads,
  selectedLeadIds,
  selectAll,
  leadFilter,
  loadingLeads,
  onLeadFilterChange,
  onToggleLeadSelection,
  onSelectAll,
}) => (
  <div>
    <div className="flex gap-4 mb-4">
      <select
        value={leadFilter.source}
        onChange={(e) => onLeadFilterChange({ source: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-lg"
      >
        <option value="">All Sources</option>
        <option value="BULK_UPLOAD">Bulk Upload</option>
        <option value="MANUAL">Manual Entry</option>
        <option value="CHATBOT">Chatbot</option>
        <option value="WEBSITE">Website</option>
      </select>
      <input
        type="text"
        placeholder="Search by name or phone..."
        value={leadFilter.search}
        onChange={(e) => onLeadFilterChange({ search: e.target.value })}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
      />
    </div>

    <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
      <label className="flex items-center gap-2 cursor-pointer">
        <button onClick={onSelectAll} className="text-gray-600">
          {selectAll ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
        </button>
        <span className="font-medium">Select All ({leads.length} leads)</span>
      </label>
      <span className="text-blue-600 font-medium">{selectedLeadIds.length} selected</span>
    </div>

    {loadingLeads ? (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
        <p className="text-gray-500 mt-2">Loading leads...</p>
      </div>
    ) : leads.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Users className="mx-auto mb-2 text-gray-300" size={48} />
        <p>No leads found with phone numbers</p>
      </div>
    ) : (
      <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
        {leads.map((lead) => (
          <label
            key={lead.id}
            className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
              selectedLeadIds.includes(lead.id) ? 'bg-blue-50' : ''
            }`}
          >
            <button
              onClick={(e) => { e.preventDefault(); onToggleLeadSelection(lead.id); }}
              className="text-gray-600"
            >
              {selectedLeadIds.includes(lead.id) ? (
                <CheckSquare size={20} className="text-blue-600" />
              ) : (
                <Square size={20} />
              )}
            </button>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{lead.firstName} {lead.lastName || ''}</p>
              <p className="text-sm text-gray-500">{lead.phone}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
              {lead.source || 'Unknown'}
            </span>
          </label>
        ))}
      </div>
    )}
  </div>
);

// Raw Imports Selection Sub-component
interface RawImportsSelectionProps {
  records: RawImportRecord[];
  selectedIds: string[];
  selectAll: boolean;
  filter: RawImportFilter;
  loading: boolean;
  onFilterChange: (filter: Partial<RawImportFilter>) => void;
  onToggleSelection: (recordId: string) => void;
  onSelectAll: () => void;
}

const RawImportsSelection: React.FC<RawImportsSelectionProps> = ({
  records,
  selectedIds,
  selectAll,
  filter,
  loading,
  onFilterChange,
  onToggleSelection,
  onSelectAll,
}) => (
  <div>
    <div className="flex gap-4 mb-4">
      <select
        value={filter.status}
        onChange={(e) => onFilterChange({ status: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-lg"
      >
        <option value="">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="ASSIGNED">Assigned</option>
        <option value="INTERESTED">Interested</option>
        <option value="NOT_INTERESTED">Not Interested</option>
        <option value="NO_ANSWER">No Answer</option>
        <option value="CALLBACK_REQUESTED">Callback Requested</option>
      </select>
      <input
        type="text"
        placeholder="Search by name or phone..."
        value={filter.search}
        onChange={(e) => onFilterChange({ search: e.target.value })}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
      />
    </div>

    <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
      <label className="flex items-center gap-2 cursor-pointer">
        <button onClick={onSelectAll} className="text-gray-600">
          {selectAll ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
        </button>
        <span className="font-medium">Select All ({records.length} records)</span>
      </label>
      <span className="text-blue-600 font-medium">{selectedIds.length} selected</span>
    </div>

    {loading ? (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
        <p className="text-gray-500 mt-2">Loading records...</p>
      </div>
    ) : records.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        <Database className="mx-auto mb-2 text-gray-300" size={48} />
        <p>No records found with phone numbers</p>
        <a href="/import-data" className="text-blue-600 hover:underline mt-2 inline-block">
          Import data first
        </a>
      </div>
    ) : (
      <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
        {records.map((record) => (
          <label
            key={record.id}
            className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
              selectedIds.includes(record.id) ? 'bg-blue-50' : ''
            }`}
          >
            <button
              onClick={(e) => { e.preventDefault(); onToggleSelection(record.id); }}
              className="text-gray-600"
            >
              {selectedIds.includes(record.id) ? (
                <CheckSquare size={20} className="text-blue-600" />
              ) : (
                <Square size={20} />
              )}
            </button>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{record.firstName} {record.lastName || ''}</p>
              <p className="text-sm text-gray-500">{record.phone}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              record.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
              record.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
              record.status === 'INTERESTED' ? 'bg-green-100 text-green-700' :
              record.status === 'NOT_INTERESTED' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {record.status}
            </span>
          </label>
        ))}
      </div>
    )}
  </div>
);

// CSV Upload Sub-component
interface CSVUploadProps {
  contacts: Contact[];
  onFileUpload: (file: File) => void;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ contacts, onFileUpload }) => (
  <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
    <div className="text-center">
      <Upload className="mx-auto text-gray-400 mb-2" size={32} />
      <p className="text-gray-600 mb-2">Upload CSV or Excel file with contacts</p>
      <p className="text-sm text-gray-500 mb-4">
        File should have: Phone Number, Name (columns can be in any order)
      </p>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
        className="hidden"
        id="csv-upload"
      />
      <label
        htmlFor="csv-upload"
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
      >
        <Upload size={16} />
        Choose File
      </label>
    </div>
    {contacts.filter(c => c.phone).length > 0 && (
      <div className="mt-4">
        <div className="p-3 bg-green-50 rounded-lg text-center mb-3">
          <p className="text-green-700">
            <strong>{contacts.filter(c => c.phone).length}</strong> contacts loaded
          </p>
        </div>
        <div className="bg-white rounded-lg border">
          <div className="px-3 py-2 border-b bg-gray-50 text-xs font-medium text-gray-600 grid grid-cols-2">
            <span>Phone</span>
            <span>Name</span>
          </div>
          {contacts.slice(0, 5).map((c, i) => (
            <div key={i} className="px-3 py-2 border-b last:border-b-0 text-sm grid grid-cols-2">
              <span className="text-gray-900">{c.phone}</span>
              <span className="text-gray-600">{c.name || '-'}</span>
            </div>
          ))}
          {contacts.length > 5 && (
            <div className="px-3 py-2 text-xs text-gray-500 text-center">
              ... and {contacts.length - 5} more contacts
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

// Manual Entry Sub-component
interface ManualEntryProps {
  contacts: Contact[];
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
  onUpdateContact: (index: number, field: keyof Contact, value: string) => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({
  contacts,
  onAddContact,
  onRemoveContact,
  onUpdateContact,
}) => (
  <>
    <div className="space-y-3">
      {contacts.map((contact, index) => (
        <div key={index} className="flex gap-3">
          <input
            type="tel"
            value={contact.phone}
            onChange={(e) => onUpdateContact(index, 'phone', e.target.value)}
            placeholder="+919876543210"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            value={contact.name}
            onChange={(e) => onUpdateContact(index, 'name', e.target.value)}
            placeholder="Contact name (optional)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <button
            onClick={() => onRemoveContact(index)}
            disabled={contacts.length === 1}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"
          >
            <Trash2 size={20} />
          </button>
        </div>
      ))}
    </div>
    <button
      onClick={onAddContact}
      className="flex items-center gap-2 mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
    >
      <Plus size={18} />
      Add Another Contact
    </button>
  </>
);

// Step 3: Configure Settings
interface Step3Props {
  formData: CampaignFormData;
  agents: VoiceAgent[];
  contactSource: ContactSource;
  selectedLeadIds: string[];
  selectedRawImportIds: string[];
  contacts: Contact[];
  submitting: boolean;
  onFormChange: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const Step3Settings: React.FC<Step3Props> = ({
  formData,
  agents,
  contactSource,
  selectedLeadIds,
  selectedRawImportIds,
  contacts,
  submitting,
  onFormChange,
  onBack,
  onSubmit,
}) => {
  const contactCount = contactSource === 'leads'
    ? selectedLeadIds.length
    : contactSource === 'rawImports'
    ? selectedRawImportIds.length
    : contacts.filter((c) => c.phone.trim()).length;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Campaign Settings</h2>

      <div className="space-y-6">
        {/* Calling Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Phone className="inline mr-2" size={16} />
            Calling Mode
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onFormChange({ callingMode: 'MANUAL', maxConcurrentCalls: 1 })}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                formData.callingMode === 'MANUAL'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <MousePointer size={24} className={formData.callingMode === 'MANUAL' ? 'text-green-600' : 'text-gray-400'} />
                <span className="font-semibold text-gray-900">Manual Queue</span>
              </div>
              <p className="text-sm text-gray-500">
                You control when each call starts. Best for high-value leads.
              </p>
            </button>

            <button
              onClick={() => onFormChange({ callingMode: 'AUTOMATIC', maxConcurrentCalls: 2 })}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                formData.callingMode === 'AUTOMATIC'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Cpu size={24} className={formData.callingMode === 'AUTOMATIC' ? 'text-blue-600' : 'text-gray-400'} />
                <span className="font-semibold text-gray-900">Auto-Dialer</span>
              </div>
              <p className="text-sm text-gray-500">
                Calls made automatically with concurrent calling.
              </p>
            </button>
          </div>
        </div>

        {/* Concurrent Calls Slider (only for auto mode) */}
        {formData.callingMode === 'AUTOMATIC' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Zap className="inline mr-2" size={16} />
              Concurrent Calls: <span className="text-blue-600 font-bold">{formData.maxConcurrentCalls}</span>
            </label>
            <input
              type="range"
              min="2"
              max="20"
              value={formData.maxConcurrentCalls}
              onChange={(e) => onFormChange({ maxConcurrentCalls: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2 calls</span>
              <span>10 calls</span>
              <span>20 calls</span>
            </div>
          </div>
        )}

        {/* Calling Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="inline mr-2" size={16} />
            Calling Hours
          </label>
          <div className="flex items-center gap-3">
            <select
              value={formData.callsBetweenHours.start}
              onChange={(e) => onFormChange({
                callsBetweenHours: { ...formData.callsBetweenHours, start: parseInt(e.target.value) }
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i}:00</option>
              ))}
            </select>
            <span className="text-gray-500">to</span>
            <select
              value={formData.callsBetweenHours.end}
              onChange={(e) => onFormChange({
                callsBetweenHours: { ...formData.callsBetweenHours, end: parseInt(e.target.value) }
              })}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i}:00</option>
              ))}
            </select>
          </div>
        </div>

        {/* Retry Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Retry Attempts
          </label>
          <select
            value={formData.retryAttempts}
            onChange={(e) => onFormChange({ retryAttempts: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            {[0, 1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>{n} retr{n === 1 ? 'y' : 'ies'} for failed calls</option>
            ))}
          </select>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline mr-2" size={16} />
            Schedule (Optional)
          </label>
          <input
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={(e) => onFormChange({ scheduledAt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to start manually</p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Campaign Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Campaign Name</p>
            <p className="font-medium">{formData.name}</p>
          </div>
          <div>
            <p className="text-gray-500">AI Agent</p>
            <p className="font-medium">{agents.find((a) => a.id === formData.agentId)?.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Total Contacts</p>
            <p className="font-medium">{contactCount}</p>
          </div>
          <div>
            <p className="text-gray-500">Trigger Mode</p>
            <p className="font-medium flex items-center gap-1">
              {formData.callingMode === 'MANUAL' ? (
                <>
                  <MousePointer size={14} className="text-green-600" />
                  Manual Queue
                </>
              ) : (
                <>
                  <Cpu size={14} className="text-blue-600" />
                  Auto {formData.maxConcurrentCalls > 1 ? `(${formData.maxConcurrentCalls}x)` : ''}
                </>
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Calling Hours</p>
            <p className="font-medium">{formData.callsBetweenHours.start}:00 - {formData.callsBetweenHours.end}:00</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Creating...
            </>
          ) : (
            'Create Campaign'
          )}
        </button>
      </div>
    </div>
  );
};
