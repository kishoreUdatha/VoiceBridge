/**
 * Phone Numbers Page Constants
 */

import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

export const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'PENDING', label: 'Pending' },
];

export const PROVIDERS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'EXOTEL', label: 'Exotel' },
  { value: 'TWILIO', label: 'Twilio' },
  { value: 'PLIVO', label: 'Plivo' },
  { value: 'MSG91', label: 'MSG91' },
];

export const PHONE_TYPES = [
  { value: 'LOCAL', label: 'Local' },
  { value: 'TOLL_FREE', label: 'Toll-Free' },
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'ASSIGNED':
      return <UserPlusIcon className="w-5 h-5 text-blue-500" />;
    case 'DISABLED':
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    case 'PENDING':
      return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    default:
      return <ExclamationCircleIcon className="w-5 h-5 text-gray-500" />;
  }
};

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-green-100 text-green-700';
    case 'ASSIGNED':
      return 'bg-blue-100 text-blue-700';
    case 'DISABLED':
      return 'bg-red-100 text-red-700';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

import { PhoneNumberFormData, PhoneProvider, PhoneType } from './phone-numbers.types';

export const createInitialFormData = (phoneNumber: {
  number?: string;
  friendlyName?: string | null;
  provider?: string;
  type?: string;
  monthlyRent?: number;
  perMinuteRate?: number;
  region?: string | null;
  city?: string | null;
  notes?: string | null;
} | null): PhoneNumberFormData => ({
  number: phoneNumber?.number || '',
  friendlyName: phoneNumber?.friendlyName || '',
  provider: (phoneNumber?.provider as PhoneProvider) || 'MANUAL',
  type: (phoneNumber?.type as PhoneType) || 'LOCAL',
  monthlyRent: phoneNumber?.monthlyRent || 0,
  perMinuteRate: phoneNumber?.perMinuteRate || 0,
  region: phoneNumber?.region || '',
  city: phoneNumber?.city || '',
  notes: phoneNumber?.notes || '',
});
