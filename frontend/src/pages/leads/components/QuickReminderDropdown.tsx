/**
 * Quick Reminder Dropdown
 * 1-click reminder scheduling for leads
 */

import { useState, useRef, useEffect } from 'react';
import { ClockIcon, BellAlertIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  scheduledCallsService,
  REMINDER_OPTIONS,
  QuickReminderMinutes,
} from '../../../services/scheduled-calls.service';

interface QuickReminderDropdownProps {
  leadId: string;
  leadName: string;
  compact?: boolean;
}

export default function QuickReminderDropdown({
  leadId,
  leadName,
  compact = false,
}: QuickReminderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentReminder, setRecentReminder] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSetReminder = async (minutes: QuickReminderMinutes) => {
    setLoading(true);
    try {
      await scheduledCallsService.createQuickReminder(leadId, minutes);

      const option = REMINDER_OPTIONS.find(o => o.value === minutes);
      const timeLabel = option?.label.toLowerCase() || `in ${minutes} minutes`;

      toast.success(`Reminder set for ${leadName} ${timeLabel}`, {
        icon: '🔔',
        duration: 3000,
      });

      setRecentReminder(option?.label || null);
      setIsOpen(false);

      // Clear the recent reminder indicator after 5 seconds
      setTimeout(() => setRecentReminder(null), 5000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to set reminder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 transition-colors ${
          compact
            ? 'p-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600'
            : 'px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-medium'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Set Reminder"
      >
        {loading ? (
          <div className="h-3.5 w-3.5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        ) : recentReminder ? (
          <CheckIcon className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <BellAlertIcon className={compact ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        )}
        {!compact && <span>{recentReminder || 'Remind'}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-700">Set Reminder</p>
            <p className="text-xs text-slate-500 mt-0.5">Call back this lead</p>
          </div>

          {REMINDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSetReminder(option.value)}
              disabled={loading}
              className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors"
            >
              <ClockIcon className="h-4 w-4 text-slate-400" />
              {option.label}
            </button>
          ))}

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                toast('Custom scheduling coming soon!', { icon: '📅' });
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-2 transition-colors"
            >
              <ClockIcon className="h-4 w-4 text-slate-400" />
              Custom time...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
