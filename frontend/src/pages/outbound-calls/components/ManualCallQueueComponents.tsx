/**
 * Manual Call Queue Components
 * Header, Contact List, Details Panel, Schedule Modal
 */

import React from 'react';
import {
  ArrowLeft,
  Phone,
  PhoneCall,
  User,
  Mail,
  Calendar,
  Clock,
  SkipForward,
  Ban,
  AlertCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  FileText,
  Play,
} from 'lucide-react';
import {
  Campaign,
  Contact,
  QueueStats,
  ScheduleData,
  ContactStatus,
} from '../manual-call-queue.types';
import {
  STATUS_COLORS,
  OUTCOME_COLORS,
  FILTER_OPTIONS,
  formatDuration,
  getSentimentColor,
} from '../manual-call-queue.constants';

// Loading State
export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="animate-spin text-blue-600" size={32} />
  </div>
);

// Error Banner
interface ErrorBannerProps {
  error: string;
  onClear: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onClear }) => (
  <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
    <AlertCircle size={20} />
    {error}
    <button onClick={onClear} className="ml-auto text-red-500 hover:text-red-700">
      <XCircle size={18} />
    </button>
  </div>
);

// Header Component
interface HeaderProps {
  campaign: Campaign | null;
  stats: QueueStats | null;
  filter: ContactStatus;
  onFilterChange: (filter: ContactStatus) => void;
  onRefresh: () => void;
  onStartCampaign: () => void;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  campaign,
  stats,
  filter,
  onFilterChange,
  onRefresh,
  onStartCampaign,
  onBack,
}) => (
  <div className="bg-white border-b px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {campaign?.name} - Manual Call Queue
          </h1>
          <p className="text-sm text-gray-600">
            Agent: {campaign?.agent.name} | Mode: Manual Calling
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
        {campaign?.status === 'DRAFT' && (
          <button
            onClick={onStartCampaign}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Play size={18} />
            Start Campaign
          </button>
        )}
      </div>
    </div>

    {/* Stats */}
    {stats && (
      <div className="flex gap-6 mt-4">
        <StatItem value={stats.total} label="Total" color="text-gray-900" />
        <StatItem value={stats.pending} label="Pending" color="text-yellow-600" />
        <StatItem value={stats.inProgress} label="In Progress" color="text-blue-600" />
        <StatItem value={stats.completed} label="Completed" color="text-green-600" />
        <StatItem value={stats.failed} label="Failed" color="text-red-600" />
      </div>
    )}

    {/* Filter Tabs */}
    <div className="flex gap-2 mt-4">
      {FILTER_OPTIONS.map((status) => (
        <button
          key={status}
          onClick={() => onFilterChange(status as ContactStatus)}
          className={`px-3 py-1.5 text-sm rounded-lg transition ${
            filter === status
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {status}
        </button>
      ))}
    </div>
  </div>
);

const StatItem: React.FC<{ value: number; label: string; color: string }> = ({
  value,
  label,
  color,
}) => (
  <div className="text-center">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

// Contact List
interface ContactListProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  callingContact: string | null;
  onSelectContact: (contact: Contact) => void;
  onCall: (contact: Contact) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  selectedContact,
  callingContact,
  onSelectContact,
  onCall,
}) => (
  <div className="w-1/2 border-r overflow-y-auto">
    {contacts.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Phone size={48} className="mb-4 text-gray-300" />
        <p>No contacts in queue</p>
      </div>
    ) : (
      <div className="divide-y">
        {contacts.map((contact) => (
          <ContactListItem
            key={contact.id}
            contact={contact}
            isSelected={selectedContact?.id === contact.id}
            isCalling={callingContact === contact.id}
            onSelect={() => onSelectContact(contact)}
            onCall={() => onCall(contact)}
            callingDisabled={callingContact !== null}
          />
        ))}
      </div>
    )}
  </div>
);

interface ContactListItemProps {
  contact: Contact;
  isSelected: boolean;
  isCalling: boolean;
  onSelect: () => void;
  onCall: () => void;
  callingDisabled: boolean;
}

const ContactListItem: React.FC<ContactListItemProps> = ({
  contact,
  isSelected,
  isCalling,
  onSelect,
  onCall,
  callingDisabled,
}) => (
  <div
    className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
      isSelected ? 'bg-blue-50' : ''
    } ${isCalling ? 'bg-green-50' : ''}`}
    onClick={onSelect}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-400" />
          <span className="font-medium text-gray-900">
            {contact.name || contact.lead?.firstName || 'Unknown'}
            {contact.lead?.lastName ? ` ${contact.lead.lastName}` : ''}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[contact.status]}`}>
            {contact.status}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Phone size={14} />
            {contact.phone}
          </span>
          {contact.email && (
            <span className="flex items-center gap-1">
              <Mail size={14} />
              {contact.email}
            </span>
          )}
        </div>
        {contact.lastCall && (
          <div className="mt-2 text-xs text-gray-500">
            Last call: {contact.lastCall.outcome || contact.lastCall.status}
            {contact.lastCall.duration && ` (${formatDuration(contact.lastCall.duration)})`}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        {contact.status === 'PENDING' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCall();
            }}
            disabled={callingDisabled}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              isCalling
                ? 'bg-green-100 text-green-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {isCalling ? (
              <>
                <PhoneCall size={16} className="animate-pulse" />
                Calling...
              </>
            ) : (
              <>
                <Phone size={16} />
                Call
              </>
            )}
          </button>
        )}
        {contact.status === 'IN_PROGRESS' && (
          <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm">
            <PhoneCall size={16} className="animate-pulse" />
            On Call
          </span>
        )}
      </div>
    </div>
  </div>
);

// Contact Details Panel
interface ContactDetailsPanelProps {
  contact: Contact | null;
  callingContact: string | null;
  onCall: (contact: Contact) => void;
  onSchedule: (contactId: string) => void;
  onSkip: (contactId: string) => void;
  onDNC: (contactId: string) => void;
  onNavigateToLead: (leadId: string) => void;
}

export const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = ({
  contact,
  callingContact,
  onCall,
  onSchedule,
  onSkip,
  onDNC,
  onNavigateToLead,
}) => (
  <div className="w-1/2 overflow-y-auto bg-gray-50">
    {contact ? (
      <div className="p-6">
        {/* Contact Header */}
        <ContactHeader
          contact={contact}
          callingContact={callingContact}
          onCall={() => onCall(contact)}
          onSchedule={() => onSchedule(contact.id)}
          onSkip={() => onSkip(contact.id)}
          onDNC={() => onDNC(contact.id)}
        />

        {/* Lead Information */}
        {contact.lead && (
          <LeadInfoCard lead={contact.lead} onNavigate={() => onNavigateToLead(contact.lead!.id)} />
        )}

        {/* Last Call */}
        {contact.lastCall && <LastCallCard lastCall={contact.lastCall} />}

        {/* Attempts Info */}
        <AttemptsCard contact={contact} />
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <FileText size={48} className="mb-4 text-gray-300" />
        <p>Select a contact to view details</p>
      </div>
    )}
  </div>
);

interface ContactHeaderProps {
  contact: Contact;
  callingContact: string | null;
  onCall: () => void;
  onSchedule: () => void;
  onSkip: () => void;
  onDNC: () => void;
}

const ContactHeader: React.FC<ContactHeaderProps> = ({
  contact,
  callingContact,
  onCall,
  onSchedule,
  onSkip,
  onDNC,
}) => (
  <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {contact.name || contact.lead?.firstName || 'Unknown Contact'}
          {contact.lead?.lastName ? ` ${contact.lead.lastName}` : ''}
        </h2>
        <p className="text-gray-600">{contact.phone}</p>
        {contact.email && <p className="text-gray-500 text-sm">{contact.email}</p>}
      </div>
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[contact.status]}`}>
        {contact.status}
      </span>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2 mt-4">
      {contact.status === 'PENDING' && (
        <>
          <button
            onClick={onCall}
            disabled={callingContact !== null}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Phone size={20} />
            Call Now
          </button>
          <button
            onClick={onSchedule}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
          >
            <Calendar size={20} />
            Schedule
          </button>
          <button
            onClick={onSkip}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <SkipForward size={20} />
            Skip
          </button>
          <button
            onClick={onDNC}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            <Ban size={20} />
            DNC
          </button>
        </>
      )}
      {contact.status === 'IN_PROGRESS' && (
        <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg">
          <PhoneCall size={20} className="animate-pulse" />
          Call in Progress...
        </div>
      )}
    </div>
  </div>
);

interface LeadInfoCardProps {
  lead: Contact['lead'];
  onNavigate: () => void;
}

const LeadInfoCard: React.FC<LeadInfoCardProps> = ({ lead, onNavigate }) => {
  if (!lead) return null;

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <User size={18} />
        Lead Information
      </h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Source</p>
          <p className="font-medium">{lead.source || 'Unknown'}</p>
        </div>
        <div>
          <p className="text-gray-500">Created</p>
          <p className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</p>
        </div>
        {lead.customFields &&
          Object.entries(lead.customFields as Record<string, unknown>).map(([key, value]) => (
            <div key={key}>
              <p className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="font-medium">{String(value)}</p>
            </div>
          ))}
      </div>
      <button
        onClick={onNavigate}
        className="mt-3 text-blue-600 text-sm hover:underline flex items-center gap-1"
      >
        View Full Lead Profile
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

interface LastCallCardProps {
  lastCall: Contact['lastCall'];
}

const LastCallCard: React.FC<LastCallCardProps> = ({ lastCall }) => {
  if (!lastCall) return null;

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Phone size={18} />
        Last Call
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className="font-medium">{lastCall.status}</span>
        </div>
        {lastCall.outcome && (
          <div className="flex justify-between">
            <span className="text-gray-500">Outcome</span>
            <span className={`px-2 py-0.5 rounded text-xs ${OUTCOME_COLORS[lastCall.outcome] || 'bg-gray-100'}`}>
              {lastCall.outcome}
            </span>
          </div>
        )}
        {lastCall.duration && (
          <div className="flex justify-between">
            <span className="text-gray-500">Duration</span>
            <span className="font-medium">{formatDuration(lastCall.duration)}</span>
          </div>
        )}
        {lastCall.sentiment && (
          <div className="flex justify-between">
            <span className="text-gray-500">Sentiment</span>
            <span className={`px-2 py-0.5 rounded text-xs ${getSentimentColor(lastCall.sentiment)}`}>
              {lastCall.sentiment}
            </span>
          </div>
        )}
        {lastCall.summary && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-xs mb-1">AI Summary</p>
            <p className="text-gray-700">{lastCall.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface AttemptsCardProps {
  contact: Contact;
}

const AttemptsCard: React.FC<AttemptsCardProps> = ({ contact }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm">
    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
      <Clock size={18} />
      Call Attempts
    </h3>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">Total Attempts</span>
        <span className="font-medium">{contact.attempts}</span>
      </div>
      {contact.lastAttemptAt && (
        <div className="flex justify-between">
          <span className="text-gray-500">Last Attempt</span>
          <span className="font-medium">{new Date(contact.lastAttemptAt).toLocaleString()}</span>
        </div>
      )}
      {contact.nextAttemptAt && (
        <div className="flex justify-between">
          <span className="text-gray-500">Scheduled For</span>
          <span className="font-medium text-purple-600">
            {new Date(contact.nextAttemptAt).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  </div>
);

// Schedule Modal
interface ScheduleModalProps {
  scheduleData: ScheduleData;
  onUpdate: (data: ScheduleData) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  scheduleData,
  onUpdate,
  onSubmit,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 className="text-lg font-semibold mb-4">Schedule Call</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={scheduleData.date}
            onChange={(e) => onUpdate({ ...scheduleData, date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <input
            type="time"
            value={scheduleData.time}
            onChange={(e) => onUpdate({ ...scheduleData, time: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea
            value={scheduleData.notes}
            onChange={(e) => onUpdate({ ...scheduleData, notes: e.target.value })}
            placeholder="Reason for scheduling..."
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!scheduleData.date || !scheduleData.time}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Schedule
        </button>
      </div>
    </div>
  </div>
);
