import { CallOutcome, LeadStatus } from '../types';

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Indian phone number format
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  // Return original if can't format
  return phone;
};

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }

  return `${pad(minutes)}:${pad(secs)}`;
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  // Format as date for older items
  return formatDate(dateString);
};

/**
 * Format date to readable string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format time only
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get greeting based on time of day
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good Morning';
  } else if (hour < 17) {
    return 'Good Afternoon';
  } else {
    return 'Good Evening';
  }
};

/**
 * Format call outcome for display
 */
export const formatOutcome = (outcome: CallOutcome): string => {
  const outcomeMap: Record<CallOutcome, string> = {
    INTERESTED: 'Interested',
    NOT_INTERESTED: 'Not Interested',
    CALLBACK: 'Callback Requested',
    CONVERTED: 'Converted',
    NO_ANSWER: 'No Answer',
    BUSY: 'Busy',
    WRONG_NUMBER: 'Wrong Number',
    VOICEMAIL: 'Voicemail',
  };

  return outcomeMap[outcome] || outcome;
};

/**
 * Get outcome color
 */
export const getOutcomeColor = (outcome: CallOutcome): string => {
  const colorMap: Record<CallOutcome, string> = {
    INTERESTED: '#10B981', // green
    NOT_INTERESTED: '#EF4444', // red
    CALLBACK: '#F59E0B', // amber
    CONVERTED: '#22C55E', // bright green
    NO_ANSWER: '#6B7280', // gray
    BUSY: '#F97316', // orange
    WRONG_NUMBER: '#DC2626', // dark red
    VOICEMAIL: '#8B5CF6', // purple
  };

  return colorMap[outcome] || '#6B7280';
};

/**
 * Format lead status for display
 */
export const formatLeadStatus = (status: LeadStatus): string => {
  const statusMap: Record<LeadStatus, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    QUALIFIED: 'Qualified',
    NEGOTIATION: 'In Negotiation',
    CONVERTED: 'Converted',
    LOST: 'Lost',
  };

  return statusMap[status] || status;
};

/**
 * Get lead status color
 */
export const getLeadStatusColor = (status: LeadStatus): string => {
  const colorMap: Record<LeadStatus, string> = {
    NEW: '#3B82F6', // blue
    CONTACTED: '#8B5CF6', // purple
    QUALIFIED: '#10B981', // green
    NEGOTIATION: '#F59E0B', // amber
    CONVERTED: '#22C55E', // bright green
    LOST: '#EF4444', // red
  };

  return colorMap[status] || '#6B7280';
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format large numbers (e.g., 1234 -> 1.2K)
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';

  const parts = name.trim().split(' ').filter(Boolean);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Get display name - if firstName contains lastName, show only firstName
 * Otherwise combine firstName + lastName
 */
export const getDisplayName = (firstName?: string | null, lastName?: string | null): string => {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();

  if (!first) return last || '';
  if (!last) return first;

  // If firstName already contains lastName, return firstName only
  if (first.toLowerCase().includes(last.toLowerCase())) {
    return first;
  }

  return `${first} ${last}`;
};

/**
 * Get initials from firstName and lastName with smart logic
 */
export const getNameInitials = (firstName?: string | null, lastName?: string | null): string => {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();

  if (!first && !last) return '?';

  // If no lastName or firstName contains lastName, use initials from firstName parts
  if (!last || first.toLowerCase().includes(last.toLowerCase())) {
    const nameParts = first.split(' ').filter(Boolean);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  }

  // Otherwise use first initial from firstName and lastName
  return ((first[0] || '') + (last[0] || '')).toUpperCase();
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
