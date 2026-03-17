/**
 * Raw Import Detail Page Constants
 */

import { RawImportRecordStatus } from '../../services/rawImport.service';

export const STATUS_TABS: { key: RawImportRecordStatus | 'ALL'; label: string; color: string }[] = [
  { key: 'ALL', label: 'All', color: 'gray' },
  { key: 'PENDING', label: 'Pending', color: 'yellow' },
  { key: 'ASSIGNED', label: 'Assigned', color: 'blue' },
  { key: 'CALLING', label: 'Calling', color: 'purple' },
  { key: 'INTERESTED', label: 'Interested', color: 'green' },
  { key: 'NOT_INTERESTED', label: 'Not Interested', color: 'red' },
  { key: 'CONVERTED', label: 'Converted', color: 'primary' },
];

export const STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  CALLING: 'bg-purple-100 text-purple-800',
  INTERESTED: 'bg-green-100 text-green-800',
  NOT_INTERESTED: 'bg-red-100 text-red-800',
  NO_ANSWER: 'bg-gray-100 text-gray-800',
  CALLBACK_REQUESTED: 'bg-orange-100 text-orange-800',
  CONVERTED: 'bg-primary-100 text-primary-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export const SOURCE_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  'AD_FACEBOOK': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Facebook' },
  'AD_INSTAGRAM': { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Instagram' },
  'AD_GOOGLE': { bg: 'bg-red-100', text: 'text-red-800', label: 'Google Ads' },
  'AD_LINKEDIN': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'LinkedIn' },
  'FORM': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Form' },
  'LANDING_PAGE': { bg: 'bg-green-100', text: 'text-green-800', label: 'Landing Page' },
  'WEBSITE': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Website' },
  'BULK_UPLOAD': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'CSV Upload' },
  'WHATSAPP': { bg: 'bg-green-100', text: 'text-green-800', label: 'WhatsApp' },
  'API': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'API' },
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
