/**
 * Lead Detail Page Constants
 * Shared configuration for lead detail components
 */

import {
  DocumentIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ChatBubbleOvalLeftIcon,
  PhoneIcon,
  CalendarIcon,
  PaperClipIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export const statusOptions = [
  { value: 'NEW', label: 'New Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-green-100 text-green-700' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-purple-100 text-purple-700' },
  { value: 'WON', label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'LOST', label: 'Lost', color: 'bg-red-100 text-red-700' },
  { value: 'FOLLOW_UP', label: 'Follow Up', color: 'bg-orange-100 text-orange-700' },
  { value: 'NOT_CONNECTED', label: 'Not Yet Connected', color: 'bg-gray-100 text-gray-700' },
];

export const tabs = [
  { id: 'overview', label: 'Overview', icon: DocumentIcon },
  { id: 'interests', label: 'Interests', icon: ClipboardDocumentListIcon },
  { id: 'timelines', label: 'Timelines', icon: ClockIcon },
  { id: 'notes', label: 'Notes', icon: ChatBubbleOvalLeftIcon },
  { id: 'calls', label: 'Calls', icon: PhoneIcon },
  { id: 'followups', label: 'Follow-ups', icon: CalendarIcon },
  { id: 'tasks', label: 'Tasks', icon: ClipboardDocumentListIcon },
  { id: 'attachments', label: 'Attachments', icon: PaperClipIcon },
  { id: 'queries', label: 'Queries', icon: QuestionMarkCircleIcon },
  { id: 'applications', label: 'Applications', icon: DocumentTextIcon },
];

export const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export const taskStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export const followUpStatusColors: Record<string, string> = {
  UPCOMING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  MISSED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-yellow-100 text-yellow-700',
};

export const queryStatusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

export const applicationStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ENROLLED: 'bg-emerald-100 text-emerald-700',
};

// Admission Status Options for Education CRM
export const admissionStatusOptions = [
  { value: 'INQUIRY', label: 'Inquiry', color: 'bg-slate-100 text-slate-700', step: 1 },
  { value: 'INTERESTED', label: 'Interested', color: 'bg-blue-100 text-blue-700', step: 2 },
  { value: 'VISIT_SCHEDULED', label: 'Visit Scheduled', color: 'bg-indigo-100 text-indigo-700', step: 3 },
  { value: 'VISIT_COMPLETED', label: 'Visit Completed', color: 'bg-purple-100 text-purple-700', step: 4 },
  { value: 'DOCUMENTS_PENDING', label: 'Documents Pending', color: 'bg-orange-100 text-orange-700', step: 5 },
  { value: 'ADMISSION_PROCESSING', label: 'Processing', color: 'bg-yellow-100 text-yellow-700', step: 6 },
  { value: 'PAYMENT_PENDING', label: 'Payment Pending', color: 'bg-amber-100 text-amber-700', step: 7 },
  { value: 'ADMITTED', label: 'Admitted', color: 'bg-green-100 text-green-700', step: 8 },
  { value: 'ENROLLED', label: 'Enrolled', color: 'bg-emerald-100 text-emerald-700', step: 9 },
  { value: 'DROPPED', label: 'Dropped', color: 'bg-red-100 text-red-700', step: -1 },
];

export const admissionTypeOptions = [
  { value: 'DONATION', label: 'Donation', color: 'bg-purple-100 text-purple-700' },
  { value: 'NON_DONATION', label: 'Non-Donation', color: 'bg-blue-100 text-blue-700' },
  { value: 'NRI', label: 'NRI', color: 'bg-amber-100 text-amber-700' },
  { value: 'SCHOLARSHIP', label: 'Scholarship', color: 'bg-green-100 text-green-700' },
];

export const getAdmissionStatusInfo = (status: string) => {
  return admissionStatusOptions.find(s => s.value === status) || admissionStatusOptions[0];
};

export const getStatusInfo = (status: string) => {
  return statusOptions.find(s => s.value === status) || statusOptions[0];
};

export const getActivityIcon = (type: string) => {
  switch (type) {
    case 'NOTE_ADDED': return ChatBubbleOvalLeftIcon;
    case 'CALL_MADE': return PhoneIcon;
    case 'TASK_CREATED':
    case 'TASK_COMPLETED': return ClipboardDocumentListIcon;
    case 'FOLLOWUP_SCHEDULED':
    case 'FOLLOWUP_COMPLETED': return CalendarIcon;
    case 'DOCUMENT_UPLOADED': return PaperClipIcon;
    case 'APPLICATION_SUBMITTED': return DocumentTextIcon;
    case 'LEAD_DATA_UPDATED': return PencilSquareIcon;
    case 'STAGE_CHANGED': return ArrowPathIcon;
    default: return DocumentIcon;
  }
};
