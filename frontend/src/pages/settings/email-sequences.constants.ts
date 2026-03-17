/**
 * Email Sequences Constants
 */

import { TriggerType, SequenceFormData, StepFormData } from './email-sequences.types';

export const TRIGGER_TYPES: TriggerType[] = [
  { id: 'MANUAL', label: 'Manual Enrollment', description: 'Manually add leads to this sequence' },
  { id: 'LEAD_CREATED', label: 'Lead Created', description: 'When a new lead is created' },
  { id: 'STAGE_CHANGE', label: 'Stage Change', description: 'When lead enters a specific stage' },
  { id: 'VOICE_SESSION', label: 'Voice Session', description: 'After AI voice conversation' },
];

export const INITIAL_SEQUENCE_FORM: SequenceFormData = {
  name: '',
  description: '',
  triggerType: 'VOICE_SESSION',
  sendOnWeekends: false,
  sendTimeStart: '09:00',
  sendTimeEnd: '18:00',
};

export const INITIAL_STEP_FORM: StepFormData = {
  delayDays: 1,
  delayHours: 0,
  subject: '',
  body: '',
};

export function getTriggerLabel(type: string): string {
  return TRIGGER_TYPES.find(t => t.id === type)?.label || type;
}

export function formatDelay(delayDays: number, delayHours: number, _isFirst?: boolean): string {
  let delay = '';
  if (delayDays > 0) {
    delay += `${delayDays} day${delayDays > 1 ? 's' : ''}`;
  }
  if (delayDays > 0 && delayHours > 0) {
    delay += ', ';
  }
  if (delayHours > 0) {
    delay += `${delayHours} hour${delayHours > 1 ? 's' : ''}`;
  }
  if (delayDays === 0 && delayHours === 0) {
    delay = 'Immediately';
  }
  return delay;
}
