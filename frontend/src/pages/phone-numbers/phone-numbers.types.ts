/**
 * Phone Numbers Page Types
 */

import {
  PhoneNumber,
  PhoneNumberStats,
  CreatePhoneNumberInput,
  UpdatePhoneNumberInput,
} from '../../services/phone-number.service';

export type { PhoneNumber, PhoneNumberStats, CreatePhoneNumberInput, UpdatePhoneNumberInput };

export interface Agent {
  id: string;
  name: string;
}

export type PhoneProvider = 'EXOTEL' | 'TWILIO' | 'PLIVO' | 'MSG91' | 'MANUAL';
export type PhoneType = 'LOCAL' | 'TOLL_FREE' | 'MOBILE' | 'VIRTUAL';

export interface PhoneNumberFormData {
  number: string;
  friendlyName: string;
  provider: PhoneProvider;
  type: PhoneType;
  monthlyRent: number;
  perMinuteRate: number;
  region: string;
  city: string;
  notes: string;
}

export type PhoneNumberStatus = '' | 'AVAILABLE' | 'ASSIGNED' | 'DISABLED' | 'PENDING';
