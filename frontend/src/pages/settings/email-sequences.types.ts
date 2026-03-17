/**
 * Email Sequences Types
 */

export interface EmailSequenceStep {
  id: string;
  stepNumber: number;
  delayDays: number;
  delayHours: number;
  subject: string;
  body: string;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
}

export interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  triggerStageId: string | null;
  sendOnWeekends: boolean;
  sendTimeStart: string;
  sendTimeEnd: string;
  totalEnrolled: number;
  totalCompleted: number;
  totalUnsubscribed: number;
  steps: EmailSequenceStep[];
}

export interface SequenceFormData {
  name: string;
  description: string;
  triggerType: string;
  sendOnWeekends: boolean;
  sendTimeStart: string;
  sendTimeEnd: string;
}

export interface StepFormData {
  delayDays: number;
  delayHours: number;
  subject: string;
  body: string;
}

export interface TriggerType {
  id: string;
  label: string;
  description: string;
}
