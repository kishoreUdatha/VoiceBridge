/**
 * Notification Channels Components
 * Toast, Header, Stats, Channel List, Modal
 */

import React from 'react';
import {
  Bell,
  Plus,
  Trash2,
  X,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  Globe,
  Power,
  Activity,
  Clock,
  ChevronRight,
  Shield,
  Zap,
  Link2,
  Check,
} from 'lucide-react';
import {
  NotificationChannel,
  ChannelFormData,
  ToastState,
  ChannelType,
  ModalStep,
} from '../notification-channels.types';
import {
  NOTIFICATION_EVENTS,
  CHANNEL_CONFIGS,
  QUICK_SETUP_PLATFORMS,
} from '../notification-channels.constants';

// Toast Component
interface ToastProps {
  toast: ToastState;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => (
  <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2">
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
      toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
    } text-white`}>
      {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span className="font-medium">{toast.message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-white/20 rounded">
        <X size={14} />
      </button>
    </div>
  </div>
);

// Page Header
interface PageHeaderProps {
  onAddChannel: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ onAddChannel }) => (
  <div className="mb-8">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/20">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Notification Channels</h1>
        </div>
        <p className="text-gray-500 ml-[52px]">
          Receive instant alerts when important events happen in your CRM
        </p>
      </div>
      <button
        onClick={onAddChannel}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
      >
        <Plus size={18} />
        Add Channel
      </button>
    </div>
  </div>
);

// Stats Overview
interface StatsOverviewProps {
  channels: NotificationChannel[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ channels }) => (
  <div className="grid grid-cols-3 gap-4 mb-8">
    <StatCard
      icon={<Activity className="w-5 h-5 text-emerald-600" />}
      iconBg="bg-emerald-100"
      value={channels.reduce((acc, c) => acc + (c.successCount || 0), 0)}
      label="Notifications Sent"
    />
    <StatCard
      icon={<Zap className="w-5 h-5 text-blue-600" />}
      iconBg="bg-blue-100"
      value={channels.filter(c => c.isActive).length}
      label="Active Channels"
    />
    <StatCard
      icon={<Shield className="w-5 h-5 text-violet-600" />}
      iconBg="bg-violet-100"
      value={channels.reduce((acc, c) => acc + (c.events?.length || 0), 0)}
      label="Event Subscriptions"
    />
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
}> = ({ icon, iconBg, value, label }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-center gap-3">
      <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
      <div>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  </div>
);

// Loading State
export const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
  </div>
);

// Empty State
interface EmptyStateProps {
  onSelectPlatform: (type: ChannelType) => void;
  onOpenModal: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPlatform, onOpenModal }) => (
  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
    <div className="p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Bell className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No notification channels</h2>
      <p className="text-gray-500 max-w-sm mx-auto mb-8">
        Connect Slack, Teams, or Discord to get instant alerts for leads, calls, and appointments.
      </p>

      <div className="flex justify-center gap-4 mb-8">
        {QUICK_SETUP_PLATFORMS.map(type => {
          const cfg = CHANNEL_CONFIGS[type];
          return (
            <button
              key={type}
              onClick={() => onSelectPlatform(type)}
              className="group flex flex-col items-center p-6 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all w-36"
            >
              <img src={cfg.logo!} alt={cfg.name} className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-700">{cfg.name}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onOpenModal}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <Globe size={16} />
        Or use a custom webhook
        <ChevronRight size={16} />
      </button>
    </div>
  </div>
);

// Channel List
interface ChannelListProps {
  channels: NotificationChannel[];
  testingChannel: string | null;
  onTest: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  testingChannel,
  onTest,
  onToggle,
  onDelete,
}) => (
  <div className="space-y-3">
    {channels.map(channel => (
      <ChannelCard
        key={channel.id}
        channel={channel}
        isTesting={testingChannel === channel.id}
        onTest={() => onTest(channel.id)}
        onToggle={() => onToggle(channel.id, channel.isActive)}
        onDelete={() => onDelete(channel.id)}
      />
    ))}
  </div>
);

interface ChannelCardProps {
  channel: NotificationChannel;
  isTesting: boolean;
  onTest: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isTesting,
  onTest,
  onToggle,
  onDelete,
}) => {
  const cfg = CHANNEL_CONFIGS[channel.type];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md ${
      !channel.isActive ? 'opacity-70' : ''
    }`}>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.bgGradient} flex items-center justify-center shadow-sm`}>
              {cfg.logo ? (
                <img src={cfg.logo} alt={cfg.name} className="w-6 h-6" />
              ) : (
                <Globe className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  channel.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {channel.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-sm text-gray-500">{cfg.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onTest}
              disabled={isTesting || !channel.isActive}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Test
            </button>
            <button
              onClick={onToggle}
              className={`p-2 rounded-lg transition ${
                channel.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={channel.isActive ? 'Pause' : 'Activate'}
            >
              <Power size={18} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Events */}
        <div className="mt-4 flex flex-wrap gap-2">
          {channel.events?.map(eventId => {
            const event = NOTIFICATION_EVENTS.find(e => e.id === eventId);
            return event ? (
              <span
                key={eventId}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${cfg.lightBg} ${cfg.lightText} text-xs font-medium rounded-lg`}
              >
                <span>{event.icon}</span>
                {event.label}
              </span>
            ) : null;
          })}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>{channel.successCount || 0} sent</span>
          </div>
          {(channel.failureCount || 0) > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-red-500" />
              <span>{channel.failureCount} failed</span>
            </div>
          )}
          {channel.lastTriggeredAt && (
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>Last: {new Date(channel.lastTriggeredAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Add Channel Modal
interface AddChannelModalProps {
  modalStep: ModalStep;
  formData: ChannelFormData;
  loading: boolean;
  onClose: () => void;
  onSelectPlatform: (type: ChannelType) => void;
  onGoBack: () => void;
  onUpdateField: <K extends keyof ChannelFormData>(key: K, value: ChannelFormData[K]) => void;
  onToggleEvent: (eventId: string) => void;
  onCreate: () => void;
}

export const AddChannelModal: React.FC<AddChannelModalProps> = ({
  modalStep,
  formData,
  loading,
  onClose,
  onSelectPlatform,
  onGoBack,
  onUpdateField,
  onToggleEvent,
  onCreate,
}) => {
  const config = CHANNEL_CONFIGS[formData.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {modalStep === 'select' ? (
          <SelectPlatformStep onClose={onClose} onSelectPlatform={onSelectPlatform} />
        ) : (
          <ConfigureChannelStep
            formData={formData}
            config={config}
            loading={loading}
            onClose={onClose}
            onGoBack={onGoBack}
            onUpdateField={onUpdateField}
            onToggleEvent={onToggleEvent}
            onCreate={onCreate}
          />
        )}
      </div>
    </div>
  );
};

interface SelectPlatformStepProps {
  onClose: () => void;
  onSelectPlatform: (type: ChannelType) => void;
}

const SelectPlatformStep: React.FC<SelectPlatformStepProps> = ({ onClose, onSelectPlatform }) => (
  <>
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Add Notification Channel</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <X size={20} className="text-gray-500" />
        </button>
      </div>
      <p className="text-sm text-gray-500 mt-1">Choose where you want to receive notifications</p>
    </div>

    <div className="p-6 grid grid-cols-2 gap-3">
      {(Object.keys(CHANNEL_CONFIGS) as ChannelType[]).map(type => {
        const cfg = CHANNEL_CONFIGS[type];
        return (
          <button
            key={type}
            onClick={() => onSelectPlatform(type)}
            className="group flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cfg.bgGradient} flex items-center justify-center`}>
              {cfg.logo ? (
                <img src={cfg.logo} alt={cfg.name} className="w-5 h-5" />
              ) : (
                <Globe className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{cfg.name}</p>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition" />
          </button>
        );
      })}
    </div>
  </>
);

interface ConfigureChannelStepProps {
  formData: ChannelFormData;
  config: typeof CHANNEL_CONFIGS[ChannelType];
  loading: boolean;
  onClose: () => void;
  onGoBack: () => void;
  onUpdateField: <K extends keyof ChannelFormData>(key: K, value: ChannelFormData[K]) => void;
  onToggleEvent: (eventId: string) => void;
  onCreate: () => void;
}

const ConfigureChannelStep: React.FC<ConfigureChannelStepProps> = ({
  formData,
  config,
  loading,
  onClose,
  onGoBack,
  onUpdateField,
  onToggleEvent,
  onCreate,
}) => (
  <>
    <div className={`p-6 bg-gradient-to-r ${config.bgGradient}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            {config.logo ? (
              <img src={config.logo} alt={config.name} className="w-5 h-5" />
            ) : (
              <Globe className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Connect {config.name}</h2>
            <p className="text-sm text-white/70">Configure your webhook settings</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
          <X size={20} className="text-white" />
        </button>
      </div>
    </div>

    <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => onUpdateField('name', e.target.value)}
          placeholder={`My ${config.name} Channel`}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition"
        />
      </div>

      {/* Webhook URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook URL</label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="url"
            value={formData.webhookUrl}
            onChange={e => onUpdateField('webhookUrl', e.target.value)}
            placeholder={config.placeholder}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition text-sm"
          />
        </div>

        {/* Instructions */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-2">How to get your webhook URL:</p>
          <ol className="text-xs text-gray-500 space-y-1">
            {config.instructions.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex-shrink-0 w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-medium">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Events */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subscribe to Events</label>
        <div className="space-y-2">
          {NOTIFICATION_EVENTS.map(event => (
            <label
              key={event.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                formData.events.includes(event.id)
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                formData.events.includes(event.id) ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
              }`}>
                {formData.events.includes(event.id) && <Check size={12} className="text-white" />}
              </div>
              <input
                type="checkbox"
                checked={formData.events.includes(event.id)}
                onChange={() => onToggleEvent(event.id)}
                className="sr-only"
              />
              <span className="text-lg">{event.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{event.label}</p>
                <p className="text-xs text-gray-500">{event.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50">
      <button onClick={onGoBack} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
        ← Back
      </button>
      <button
        onClick={onCreate}
        disabled={loading || !formData.name || !formData.webhookUrl || formData.events.length === 0}
        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
        Create Channel
      </button>
    </div>
  </>
);

// CSS Animation Styles
export const AnimationStyles: React.FC = () => (
  <style>{`
    @keyframes slide-in-from-top-2 {
      from { transform: translateY(-8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-in { animation: slide-in-from-top-2 0.2s ease-out; }
  `}</style>
);
