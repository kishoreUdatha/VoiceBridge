/**
 * Instagram Lead Setup Constants
 */

import {
  LinkIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { SetupStep } from './instagram-lead-setup.types';

export const SETUP_STEPS: SetupStep[] = [
  { id: 1, name: 'Connect Account', icon: LinkIcon },
  { id: 2, name: 'Select Page & Forms', icon: DocumentTextIcon },
  { id: 3, name: 'Field Mapping', icon: Cog6ToothIcon },
  { id: 4, name: 'Webhook Setup', icon: BellAlertIcon },
];

export const CRM_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'address', label: 'Address' },
  { key: 'courseId', label: 'Course Interest' },
  { key: 'sourceDetails', label: 'Source Details' },
];

export const AUTO_MAP: Record<string, string> = {
  email: 'email',
  phone_number: 'phone',
  first_name: 'firstName',
  last_name: 'lastName',
  full_name: 'firstName',
  city: 'city',
  state: 'state',
  country: 'country',
  street_address: 'address',
};

export const copyToClipboard = (text: string, onSuccess: () => void) => {
  navigator.clipboard.writeText(text);
  onSuccess();
};
