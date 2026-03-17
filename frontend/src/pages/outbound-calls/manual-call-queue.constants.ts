/**
 * Manual Call Queue Constants
 */

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  DO_NOT_CALL: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-purple-100 text-purple-700',
};

export const OUTCOME_COLORS: Record<string, string> = {
  INTERESTED: 'bg-green-100 text-green-700',
  CONVERTED: 'bg-green-100 text-green-700',
  NOT_INTERESTED: 'bg-red-100 text-red-700',
  CALLBACK_REQUESTED: 'bg-blue-100 text-blue-700',
  NEEDS_FOLLOWUP: 'bg-yellow-100 text-yellow-700',
  NO_ANSWER: 'bg-gray-100 text-gray-700',
  BUSY: 'bg-orange-100 text-orange-700',
  VOICEMAIL: 'bg-purple-100 text-purple-700',
};

export const FILTER_OPTIONS = ['ALL', 'PENDING', 'SCHEDULED', 'COMPLETED', 'FAILED'] as const;

export const INITIAL_SCHEDULE_DATA = {
  contactId: '',
  date: '',
  time: '',
  notes: '',
};

export const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getSentimentColor = (sentiment: string | null): string => {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-100 text-green-700';
    case 'negative':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};
