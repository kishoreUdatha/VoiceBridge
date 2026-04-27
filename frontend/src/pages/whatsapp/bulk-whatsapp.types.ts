/**
 * Bulk WhatsApp Types
 */

export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Recipient {
  id: string;
  phone: string;
  name?: string;
  status: RecipientStatus;
  messageId?: string;
  error?: string;
}

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaFile {
  file: File;
  type: MediaType;
  preview?: string;
  name: string;
}

export interface RecipientStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface SendProgress {
  sent: number;
  total: number;
}

export interface BulkWhatsAppFormData {
  message: string;
  campaignName: string;
  phoneInput: string;
}

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  language: string;
  category: string;
  components: WhatsAppTemplateComponent[];
}

export type MessageMode = 'freeform' | 'template';
