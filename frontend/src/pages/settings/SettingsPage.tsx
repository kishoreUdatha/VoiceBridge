/**
 * Settings Page - Clean, organized settings hub
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCircleIcon,
  BellIcon,
  EyeIcon,
  TableCellsIcon,
  ArrowPathIcon,
  FlagIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  FunnelIcon,
  LinkIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  TagIcon,
  CalendarIcon,
  DocumentTextIcon,
  PhoneIcon,
  EnvelopeIcon,
  CubeIcon,
  PaintBrushIcon,
  CreditCardIcon,
  WalletIcon,
  MicrophoneIcon,
  CurrencyRupeeIcon,
  MapPinIcon,
  BanknotesIcon,
  ClockIcon,
  SparklesIcon,
  Cog6ToothIcon,
  InboxIcon,
  GlobeAltIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface SettingItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface SettingCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: SettingItem[];
}

const settingsCategories: SettingCategory[] = [
  {
    id: 'account',
    name: 'Account & Preferences',
    icon: UserCircleIcon,
    color: 'text-blue-600 bg-blue-50',
    items: [
      { id: 'profile', name: 'Profile', description: 'Your personal info', icon: UserCircleIcon, path: '/settings/profile' },
      { id: 'preferences', name: 'Preferences', description: 'Language, timezone', icon: AdjustmentsHorizontalIcon, path: '/settings/preferences' },
      { id: 'accessibility', name: 'Accessibility', description: 'Display options', icon: EyeIcon, path: '/settings/accessibility' },
      { id: 'notifications', name: 'Notifications', description: 'Alert preferences', icon: BellIcon, path: '/settings/notification-preferences' },
    ],
  },
  {
    id: 'leads',
    name: 'Lead Management',
    icon: UsersIcon,
    color: 'text-green-600 bg-green-50',
    items: [
      { id: 'pipeline', name: 'Pipeline Stages', description: 'Configure stages', icon: FunnelIcon, path: '/settings/pipeline' },
      { id: 'tags', name: 'Lead Tags', description: 'Categorize leads', icon: TagIcon, path: '/settings/tags' },
      { id: 'priority', name: 'Lead Priority', description: 'Priority levels', icon: FlagIcon, path: '/settings/lead-priority' },
      { id: 'sources', name: 'Lead Sources', description: 'Source tracking', icon: TagIcon, path: '/settings/lead-sources' },
      { id: 'custom-fields', name: 'Custom Fields', description: 'Extra lead fields', icon: DocumentTextIcon, path: '/settings/custom-contact-property' },
      { id: 'auto-assign', name: 'Auto Assignment', description: 'Assignment rules', icon: UsersIcon, path: '/settings/auto-assign' },
      { id: 'lead-routing', name: 'Lead Routing', description: 'Visual rule builder', icon: MapPinIcon, path: '/settings/lead-routing' },
      { id: 'lead-management', name: 'Lead Management', description: 'Lead settings', icon: Cog6ToothIcon, path: '/settings/lead-management' },
      { id: 'columns', name: 'Table Columns', description: 'Show/hide columns', icon: TableCellsIcon, path: '/settings/manage-columns' },
      { id: 'field-permissions', name: 'Field Permissions', description: 'Role visibility', icon: ShieldCheckIcon, path: '/settings/field-permissions' },
    ],
  },
  {
    id: 'communication',
    name: 'Calling & Messaging',
    icon: PhoneIcon,
    color: 'text-teal-600 bg-teal-50',
    items: [
      { id: 'phone-numbers', name: 'Phone Numbers', description: 'Manage phone numbers', icon: PhoneIcon, path: '/settings/phone-numbers' },
      { id: 'telecaller-numbers', name: 'Telecaller Numbers', description: 'Assign to telecallers', icon: PhoneIcon, path: '/settings/telecaller-numbers' },
      { id: 'call-outcomes', name: 'Call Outcomes', description: 'Custom call outcomes', icon: PhoneIcon, path: '/settings/call-outcomes' },
      { id: 'voice-minutes', name: 'Voice Minutes', description: 'Call credits & usage', icon: ClockIcon, path: '/settings/voice-minutes' },
      { id: 'ai-scripts', name: 'AI Voice Scripts', description: 'AI call scripts', icon: MicrophoneIcon, path: '/settings/ai-scripts' },
      { id: 'recording-cleanup', name: 'Recording Cleanup', description: 'Cleanup logs', icon: TrashIcon, path: '/settings/recording-cleanup' },
      { id: 'whatsapp', name: 'WhatsApp', description: 'Business API', icon: ChatBubbleLeftRightIcon, path: '/settings/whatsapp' },
      { id: 'whatsapp-templates', name: 'WhatsApp Templates', description: 'Message templates', icon: DocumentTextIcon, path: '/settings/whatsapp-templates' },
      { id: 'email', name: 'Email Settings', description: 'SMTP config', icon: EnvelopeIcon, path: '/settings/email' },
      { id: 'email-templates', name: 'Email Templates', description: 'Email builder', icon: DocumentTextIcon, path: '/settings/email-templates' },
      { id: 'sms', name: 'SMS', description: 'SMS gateway', icon: ChatBubbleLeftRightIcon, path: '/settings/sms' },
      { id: 'notification-channels', name: 'Notification Channels', description: 'Channel config', icon: BellIcon, path: '/settings/notifications' },
    ],
  },
  {
    id: 'automation',
    name: 'Automation',
    icon: SparklesIcon,
    color: 'text-amber-600 bg-amber-50',
    items: [
      { id: 'workflow', name: 'Workflows', description: 'Automation rules', icon: CubeIcon, path: '/settings/workflows' },
      { id: 'automations', name: 'Smart Automations', description: 'Birthday, re-engagement, SLA', icon: SparklesIcon, path: '/settings/automations' },
      { id: 'appointment-reminders', name: 'Appointment Reminders', description: 'Auto-reminders', icon: BellIcon, path: '/settings/appointment-reminders' },
      { id: 'post-call', name: 'Post-Call Messaging', description: 'Auto follow-up', icon: ChatBubbleLeftRightIcon, path: '/settings/post-call-messaging' },
      { id: 'email-sequences', name: 'Email Sequences', description: 'Drip campaigns', icon: EnvelopeIcon, path: '/settings/email-sequences' },
      { id: 'followup', name: 'Follow-up Rules', description: 'Reminder settings', icon: CalendarIcon, path: '/settings/follow-up-config' },
      { id: 'retry', name: 'Retry Settings', description: 'Call/message retries', icon: ArrowPathIcon, path: '/settings/retry-settings' },
      { id: 'assignment-schedules', name: 'Assignment Schedules', description: 'Time-based rules', icon: ClockIcon, path: '/settings/assignment-schedules' },
      { id: 'reports', name: 'Auto Reports', description: 'Scheduled reports', icon: ChartBarIcon, path: '/settings/automatic-reports' },
    ],
  },
  {
    id: 'organization',
    name: 'Organization & Billing',
    icon: BuildingOfficeIcon,
    color: 'text-indigo-600 bg-indigo-50',
    items: [
      { id: 'institution', name: 'Institution', description: 'Company details', icon: BuildingOfficeIcon, path: '/settings/institution' },
      { id: 'industry', name: 'Industry', description: 'Industry settings', icon: GlobeAltIcon, path: '/settings/industry' },
      { id: 'branding', name: 'Branding', description: 'Logo, colors, name', icon: PaintBrushIcon, path: '/settings/branding' },
      { id: 'branches', name: 'Branches', description: 'Branch locations', icon: MapPinIcon, path: '/settings/branches' },
      { id: 'roles', name: 'Roles & Permissions', description: 'Access control', icon: ShieldCheckIcon, path: '/roles' },
      { id: 'labels', name: 'Custom Labels', description: 'Field naming', icon: TagIcon, path: '/settings/crm-customization' },
      { id: 'billing-dashboard', name: 'Billing', description: 'Plans & invoices', icon: CreditCardIcon, path: '/settings/billing' },
      { id: 'razorpay', name: 'Payment Gateway', description: 'Razorpay config', icon: CurrencyRupeeIcon, path: '/settings/razorpay' },
      { id: 'payment-categories', name: 'Payment Categories', description: 'Payment types', icon: BanknotesIcon, path: '/settings/payment-categories' },
      { id: 'commission', name: 'Commission', description: 'Sales commission', icon: WalletIcon, path: '/settings/commission' },
      { id: 'integrations', name: 'Integrations', description: 'Third-party apps', icon: LinkIcon, path: '/settings/integrations' },
      { id: 'calendar', name: 'Calendar Sync', description: 'Google/Outlook', icon: CalendarIcon, path: '/settings/calendar' },
      { id: 'crm-integration', name: 'CRM Integration', description: 'External CRMs', icon: InboxIcon, path: '/settings/crm-integration' },
      { id: 'advanced', name: 'Advanced', description: 'API & webhooks', icon: Cog6ToothIcon, path: '/settings/integrations-advanced' },
    ],
  },
];

export default function SettingsPage() {
  const [search, setSearch] = useState('');

  // Filter based on search
  const filtered = settingsCategories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(
        item =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(cat => cat.items.length > 0);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search settings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
      </div>

      {/* Settings Grid */}
      <div className="space-y-6">
        {filtered.map((category) => (
          <div key={category.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Category Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className={`p-1.5 rounded-md ${category.color}`}>
                <category.icon className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm">{category.name}</h2>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {category.items.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-slate-400 group-hover:text-primary-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{item.name}</div>
                    <div className="text-xs text-slate-500 truncate">{item.description}</div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-primary-500 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {search && filtered.length === 0 && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No settings found for "{search}"</p>
          <button
            onClick={() => setSearch('')}
            className="mt-3 text-sm text-primary-600 hover:text-primary-700"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
