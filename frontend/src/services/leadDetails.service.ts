import api from './api';

// ==================== NOTES ====================

export interface LeadNote {
  id: string;
  leadId: string;
  userId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export const getNotes = async (leadId: string): Promise<LeadNote[]> => {
  const response = await api.get(`/lead-details/${leadId}/notes`);
  return response.data.data;
};

export const createNote = async (leadId: string, data: { content: string; isPinned?: boolean }): Promise<LeadNote> => {
  const response = await api.post(`/lead-details/${leadId}/notes`, data);
  return response.data.data;
};

export const updateNote = async (leadId: string, noteId: string, data: { content?: string; isPinned?: boolean }): Promise<LeadNote> => {
  const response = await api.put(`/lead-details/${leadId}/notes/${noteId}`, data);
  return response.data.data;
};

export const deleteNote = async (leadId: string, noteId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/notes/${noteId}`);
};

// ==================== TASKS ====================

export interface LeadTask {
  id: string;
  leadId: string;
  assigneeId: string;
  createdById: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getTasks = async (leadId: string): Promise<LeadTask[]> => {
  const response = await api.get(`/lead-details/${leadId}/tasks`);
  return response.data.data;
};

export const createTask = async (leadId: string, data: {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string;
}): Promise<LeadTask> => {
  const response = await api.post(`/lead-details/${leadId}/tasks`, data);
  return response.data.data;
};

export const updateTask = async (leadId: string, taskId: string, data: {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assigneeId?: string;
}): Promise<LeadTask> => {
  const response = await api.put(`/lead-details/${leadId}/tasks/${taskId}`, data);
  return response.data.data;
};

export const deleteTask = async (leadId: string, taskId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/tasks/${taskId}`);
};

// ==================== FOLLOW-UPS ====================

export interface FollowUp {
  id: string;
  leadId: string;
  assigneeId: string;
  createdById: string;
  scheduledAt: string;
  message?: string;
  notes?: string;
  status: 'UPCOMING' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getFollowUps = async (leadId: string): Promise<FollowUp[]> => {
  const response = await api.get(`/lead-details/${leadId}/follow-ups`);
  return response.data.data;
};

export const createFollowUp = async (leadId: string, data: {
  scheduledAt: string;
  message?: string;
  notes?: string;
  assigneeId?: string;
}): Promise<FollowUp> => {
  const response = await api.post(`/lead-details/${leadId}/follow-ups`, data);
  return response.data.data;
};

export const updateFollowUp = async (leadId: string, followUpId: string, data: {
  scheduledAt?: string;
  message?: string;
  notes?: string;
  status?: 'UPCOMING' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED';
  assigneeId?: string;
}): Promise<FollowUp> => {
  const response = await api.put(`/lead-details/${leadId}/follow-ups/${followUpId}`, data);
  return response.data.data;
};

export const deleteFollowUp = async (leadId: string, followUpId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/follow-ups/${followUpId}`);
};

// ==================== ATTACHMENTS ====================

export interface LeadAttachment {
  id: string;
  leadId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export const getAttachments = async (leadId: string): Promise<LeadAttachment[]> => {
  const response = await api.get(`/lead-details/${leadId}/attachments`);
  return response.data.data;
};

export const uploadAttachment = async (leadId: string, file: File): Promise<LeadAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/lead-details/${leadId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const deleteAttachment = async (leadId: string, attachmentId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/attachments/${attachmentId}`);
};

// ==================== QUERIES ====================

export interface LeadQuery {
  id: string;
  leadId: string;
  query: string;
  response?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const getQueries = async (leadId: string): Promise<LeadQuery[]> => {
  const response = await api.get(`/lead-details/${leadId}/queries`);
  return response.data.data;
};

export const createQuery = async (leadId: string, data: { query: string }): Promise<LeadQuery> => {
  const response = await api.post(`/lead-details/${leadId}/queries`, data);
  return response.data.data;
};

export const updateQuery = async (leadId: string, queryId: string, data: {
  response?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}): Promise<LeadQuery> => {
  const response = await api.put(`/lead-details/${leadId}/queries/${queryId}`, data);
  return response.data.data;
};

export const deleteQuery = async (leadId: string, queryId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/queries/${queryId}`);
};

// ==================== APPLICATIONS ====================

export interface LeadApplication {
  id: string;
  leadId: string;
  applicationNo: string;
  programName?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ENROLLED';
  submittedAt?: string;
  documents: any[];
  createdAt: string;
  updatedAt: string;
}

export const getApplications = async (leadId: string): Promise<LeadApplication[]> => {
  const response = await api.get(`/lead-details/${leadId}/applications`);
  return response.data.data;
};

export const createApplication = async (leadId: string, data: {
  programName?: string;
  documents?: any[];
}): Promise<LeadApplication> => {
  const response = await api.post(`/lead-details/${leadId}/applications`, data);
  return response.data.data;
};

export const updateApplication = async (leadId: string, applicationId: string, data: {
  programName?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ENROLLED';
  documents?: any[];
}): Promise<LeadApplication> => {
  const response = await api.put(`/lead-details/${leadId}/applications/${applicationId}`, data);
  return response.data.data;
};

export const deleteApplication = async (leadId: string, applicationId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/applications/${applicationId}`);
};

// ==================== ACTIVITIES (Timeline) ====================

export interface LeadActivity {
  id: string;
  leadId: string;
  userId?: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export const getActivities = async (leadId: string, limit?: number, offset?: number): Promise<{
  data: LeadActivity[];
  pagination: { total: number; limit: number; offset: number };
}> => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  const response = await api.get(`/lead-details/${leadId}/activities?${params.toString()}`);
  return response.data;
};

export const createActivity = async (leadId: string, data: {
  title: string;
  description?: string;
  type?: string;
  metadata?: Record<string, any>;
}): Promise<LeadActivity> => {
  const response = await api.post(`/lead-details/${leadId}/activities`, data);
  return response.data.data;
};

// ==================== INTERESTS ====================

export interface Interest {
  id?: string;
  name: string;
  category?: string;
  notes?: string;
}

export const getInterests = async (leadId: string): Promise<Interest[]> => {
  const response = await api.get(`/lead-details/${leadId}/interests`);
  return response.data.data;
};

export const updateInterests = async (leadId: string, interests: Interest[]): Promise<Interest[]> => {
  const response = await api.put(`/lead-details/${leadId}/interests`, { interests });
  return response.data.data;
};

// ==================== CALL LOGS ====================

export interface CallLog {
  id: string;
  leadId?: string;
  callerId: string;
  phoneNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  callType: 'MANUAL' | 'AI' | 'IVRS' | 'PERSONAL';
  status: 'INITIATED' | 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'FAILED' | 'BUSY' | 'NO_ANSWER';
  duration?: number;
  recordingUrl?: string;
  transcript?: string;
  notes?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  caller: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getCallLogs = async (leadId: string): Promise<CallLog[]> => {
  const response = await api.get(`/lead-details/${leadId}/calls`);
  return response.data.data;
};

export const createCallLog = async (leadId: string, data: {
  phoneNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  callType?: 'MANUAL' | 'AI' | 'IVRS' | 'PERSONAL';
  status?: string;
  duration?: number;
  notes?: string;
  recordingUrl?: string;
}): Promise<CallLog> => {
  const response = await api.post(`/lead-details/${leadId}/calls`, data);
  return response.data.data;
};

// ==================== WHATSAPP LOGS ====================

export interface WhatsAppLog {
  id: string;
  leadId?: string;
  userId?: string;
  phone: string;
  message: string;
  mediaUrl?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  providerMsgId?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getWhatsAppLogs = async (leadId: string): Promise<WhatsAppLog[]> => {
  const response = await api.get(`/lead-details/${leadId}/whatsapp`);
  return response.data.data;
};

export const sendWhatsApp = async (leadId: string, data: { message: string; mediaUrl?: string }): Promise<WhatsAppLog> => {
  const response = await api.post(`/lead-details/${leadId}/whatsapp`, data);
  return response.data.data;
};

// ==================== SMS LOGS ====================

export interface SmsLog {
  id: string;
  leadId?: string;
  userId?: string;
  phone: string;
  message: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  providerMsgId?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getSmsLogs = async (leadId: string): Promise<SmsLog[]> => {
  const response = await api.get(`/lead-details/${leadId}/sms`);
  return response.data.data;
};

export const sendSms = async (leadId: string, data: { message: string }): Promise<SmsLog> => {
  const response = await api.post(`/lead-details/${leadId}/sms`, data);
  return response.data.data;
};

// ==================== PAYMENTS ====================

export interface LeadPayment {
  id: string;
  amount: number;
  currency: string;
  paymentType: 'REGISTRATION' | 'TUITION' | 'EXAM' | 'HOSTEL' | 'OTHER';
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIAL';
  transactionId?: string;
  receiptNo?: string;
  paidAt?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export const getPayments = async (leadId: string): Promise<LeadPayment[]> => {
  const response = await api.get(`/lead-details/${leadId}/payments`);
  return response.data.data;
};

export const createPayment = async (leadId: string, data: Omit<LeadPayment, 'id' | 'createdAt'>): Promise<LeadPayment> => {
  const response = await api.post(`/lead-details/${leadId}/payments`, data);
  return response.data.data;
};

export const updatePayment = async (leadId: string, paymentId: string, data: Partial<LeadPayment>): Promise<LeadPayment> => {
  const response = await api.put(`/lead-details/${leadId}/payments/${paymentId}`, data);
  return response.data.data;
};

export const deletePayment = async (leadId: string, paymentId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/payments/${paymentId}`);
};

// ==================== DOCUMENTS ====================

export interface LeadDocument {
  id: string;
  documentType: 'ID_PROOF' | 'ADDRESS_PROOF' | 'PHOTO' | 'CERTIFICATE' | 'MARKSHEET' | 'OTHER';
  documentName: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  uploadedAt: string;
}

export const getDocuments = async (leadId: string): Promise<LeadDocument[]> => {
  const response = await api.get(`/lead-details/${leadId}/documents`);
  return response.data.data;
};

export const uploadDocument = async (
  leadId: string,
  file: File,
  documentType: LeadDocument['documentType'],
  documentName: string
): Promise<LeadDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  formData.append('documentName', documentName);
  const response = await api.post(`/lead-details/${leadId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const updateDocument = async (
  leadId: string,
  documentId: string,
  data: { status?: LeadDocument['status']; rejectionReason?: string }
): Promise<LeadDocument> => {
  const response = await api.put(`/lead-details/${leadId}/documents/${documentId}`, data);
  return response.data.data;
};

export const deleteDocument = async (leadId: string, documentId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/documents/${documentId}`);
};

export default {
  // Notes
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  // Tasks
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  // Follow-ups
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  // Attachments
  getAttachments,
  uploadAttachment,
  deleteAttachment,
  // Queries
  getQueries,
  createQuery,
  updateQuery,
  deleteQuery,
  // Applications
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
  // Activities
  getActivities,
  createActivity,
  // Interests
  getInterests,
  updateInterests,
  // Call logs
  getCallLogs,
  createCallLog,
  // WhatsApp
  getWhatsAppLogs,
  sendWhatsApp,
  // SMS
  getSmsLogs,
  sendSms,
  // Payments
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  // Documents
  getDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
};
