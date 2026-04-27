/**
 * Bulk WhatsApp Hook
 * Handles state management, file processing, and API calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../../services/api';
import {
  Recipient,
  MediaFile,
  RecipientStats,
  SendProgress,
  WhatsAppTemplate,
  MessageMode,
} from '../bulk-whatsapp.types';
import { parsePhoneNumbers, getMediaType } from '../bulk-whatsapp.constants';

interface UseBulkWhatsAppReturn {
  // State
  message: string;
  setMessage: (message: string) => void;
  recipients: Recipient[];
  phoneInput: string;
  setPhoneInput: (input: string) => void;
  campaignName: string;
  setCampaignName: (name: string) => void;
  sending: boolean;
  progress: SendProgress;
  whatsappConfigured: boolean | null;
  mediaFiles: MediaFile[];
  stats: RecipientStats;
  loadingLeads: boolean;

  // Template state
  messageMode: MessageMode;
  setMessageMode: (mode: MessageMode) => void;
  templates: WhatsAppTemplate[];
  selectedTemplate: WhatsAppTemplate | null;
  setSelectedTemplate: (template: WhatsAppTemplate | null) => void;
  templateParams: string[];
  setTemplateParams: (params: string[]) => void;
  loadingTemplates: boolean;
  templateError: string | null;

  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>;
  imageInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  audioInputRef: React.RefObject<HTMLInputElement>;
  docInputRef: React.RefObject<HTMLInputElement>;

  // Actions
  handleAddPhones: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeRecipient: (id: string) => void;
  clearAllRecipients: () => void;
  removeMedia: (index: number) => void;
  handleSendBulk: () => Promise<void>;
  addNamePlaceholder: () => void;
  loadLeadsFromCRM: (filter?: { stageId?: string; source?: string }) => Promise<void>;
  fetchTemplates: () => Promise<void>;
}

export function useBulkWhatsApp(): UseBulkWhatsAppReturn {
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgress>({ sent: 0, total: 0 });
  const [whatsappConfigured, setWhatsappConfigured] = useState<boolean | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Template state
  const [messageMode, setMessageMode] = useState<MessageMode>('freeform');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkWhatsAppConfig();
  }, []);

  const checkWhatsAppConfig = async () => {
    try {
      // Check if WhatsApp is configured in organization settings
      const response = await api.get('/organization/settings/whatsapp');
      const config = response.data.data || response.data;
      // Check if we have at least accessToken or phoneNumberId configured
      const isConfigured = !!(config?.accessToken || config?.phoneNumberId || config?.isConfigured);
      setWhatsappConfigured(isConfigured);
    } catch {
      setWhatsappConfigured(false);
    }
  };

  // Template fetch error state
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Fetch approved templates from Meta
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplateError(null);
    try {
      const response = await api.get('/whatsapp/templates');
      const data = response.data.data || response.data;
      console.log('[Templates] Raw data from API:', data);
      // Filter only approved/active templates (Meta returns APPROVED or sometimes with quality suffix)
      const approvedTemplates = Array.isArray(data)
        ? data.filter((t: WhatsAppTemplate) => {
            const status = (t.status || '').toUpperCase();
            return status === 'APPROVED' || status.startsWith('APPROVED') || status === 'ACTIVE';
          })
        : [];
      setTemplates(approvedTemplates);
      if (approvedTemplates.length === 0 && Array.isArray(data) && data.length > 0) {
        setTemplateError('No approved templates found. Templates must be approved by Meta before use.');
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch templates';
      if (errorMessage.includes('Business Account ID')) {
        setTemplateError('Business Account ID not configured. Go to Settings > WhatsApp to add it.');
      } else if (errorMessage.includes('nonexisting field')) {
        setTemplateError('Invalid Business Account ID. Please check your WhatsApp settings.');
      } else {
        setTemplateError(errorMessage);
      }
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const handleAddPhones = useCallback(() => {
    const phones = parsePhoneNumbers(phoneInput);
    const newRecipients: Recipient[] = phones
      .filter((phone) => !recipients.some((r) => r.phone === phone))
      .map((phone) => ({
        id: crypto.randomUUID(),
        phone,
        status: 'pending' as const,
      }));

    setRecipients([...recipients, ...newRecipients]);
    setPhoneInput('');
  }, [phoneInput, recipients]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const newRecipients: Recipient[] = [];

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          data.forEach((row, index) => {
            if (index === 0) {
              const firstCell = String(row[0] || '').toLowerCase();
              if (
                firstCell.includes('phone') ||
                firstCell.includes('mobile') ||
                firstCell.includes('number') ||
                firstCell.includes('name') ||
                isNaN(Number(firstCell.replace(/[^0-9]/g, '')))
              ) {
                return;
              }
            }

            const phone = String(row[0] || '').trim();
            const name = String(row[1] || '').trim() || undefined;

            if (phone && phone.length >= 10) {
              const normalizedPhone = parsePhoneNumbers(phone)[0];
              if (
                normalizedPhone &&
                !recipients.some((r) => r.phone === normalizedPhone) &&
                !newRecipients.some((r) => r.phone === normalizedPhone)
              ) {
                newRecipients.push({
                  id: crypto.randomUUID(),
                  phone: normalizedPhone,
                  name,
                  status: 'pending',
                });
              }
            }
          });
        } else {
          const text = await file.text();
          const lines = text.split(/\r?\n/);

          lines.forEach((line, index) => {
            if (index === 0) {
              const lowerLine = line.toLowerCase();
              if (
                lowerLine.includes('phone') ||
                lowerLine.includes('mobile') ||
                lowerLine.includes('number')
              ) {
                return;
              }
            }

            const parts = line.split(/[,\t]/).map((p) => p.trim().replace(/"/g, ''));
            const phone = parts[0];
            const name = parts[1] || undefined;

            if (phone && phone.length >= 10) {
              const normalizedPhone = parsePhoneNumbers(phone)[0];
              if (
                normalizedPhone &&
                !recipients.some((r) => r.phone === normalizedPhone) &&
                !newRecipients.some((r) => r.phone === normalizedPhone)
              ) {
                newRecipients.push({
                  id: crypto.randomUUID(),
                  phone: normalizedPhone,
                  name,
                  status: 'pending',
                });
              }
            }
          });
        }

        if (newRecipients.length > 0) {
          setRecipients([...recipients, ...newRecipients]);
        } else {
          alert(
            'No valid phone numbers found in the file. Make sure column A contains phone numbers (10+ digits).'
          );
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error reading file: ' + (error as Error).message);
      }

      e.target.value = '';
    },
    [recipients]
  );

  const handleMediaUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newMediaFiles: MediaFile[] = [];

      Array.from(files).forEach((file) => {
        const mediaType = getMediaType(file);
        const mediaFile: MediaFile = {
          file,
          type: mediaType,
          name: file.name,
        };

        if (mediaType === 'image' || mediaType === 'video') {
          mediaFile.preview = URL.createObjectURL(file);
        }

        newMediaFiles.push(mediaFile);
      });

      setMediaFiles([...mediaFiles, ...newMediaFiles]);
      e.target.value = '';
    },
    [mediaFiles]
  );

  const removeRecipient = useCallback(
    (id: string) => {
      setRecipients(recipients.filter((r) => r.id !== id));
    },
    [recipients]
  );

  const clearAllRecipients = useCallback(() => {
    setRecipients([]);
  }, []);

  const removeMedia = useCallback(
    (index: number) => {
      const media = mediaFiles[index];
      if (media.preview) {
        URL.revokeObjectURL(media.preview);
      }
      setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    },
    [mediaFiles]
  );

  const handleSendBulk = useCallback(async () => {
    // Validate based on message mode
    if (messageMode === 'template') {
      if (!selectedTemplate || recipients.length === 0) return;
    } else {
      if ((!message.trim() && mediaFiles.length === 0) || recipients.length === 0) return;
    }

    setSending(true);
    setProgress({ sent: 0, total: recipients.length });

    try {
      const updatedRecipients = [...recipients];

      // Prepare media data for attachments (only for freeform mode)
      let mediaData: { type: string; data: string; filename: string }[] = [];
      if (messageMode === 'freeform' && mediaFiles.length > 0) {
        mediaData = await Promise.all(
          mediaFiles.map(async (media) => {
            const reader = new FileReader();
            return new Promise<{ type: string; data: string; filename: string }>((resolve) => {
              reader.onload = () => {
                resolve({
                  type: media.type,
                  data: reader.result as string,
                  filename: media.name,
                });
              };
              reader.readAsDataURL(media.file);
            });
          })
        );
      }

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        try {
          let response;

          if (messageMode === 'template' && selectedTemplate) {
            // Send template message
            const templatePayload = {
              to: recipient.phone,
              templateName: selectedTemplate.name,
              language: selectedTemplate.language,
              templateParams: templateParams.map((param) =>
                param.replace(/{name}/g, recipient.name || '')
              ),
            };
            response = await api.post('/whatsapp/send-template', templatePayload);
          } else {
            // Send freeform message
            const requestPayload: {
              to: string;
              message: string;
              media?: { type: string; data: string; filename: string }[];
            } = {
              to: recipient.phone,
              message: message.replace(/{name}/g, recipient.name || ''),
            };

            // Include media attachments if available
            if (mediaData && mediaData.length > 0) {
              requestPayload.media = mediaData;
            }

            // Use the multi-provider messaging API
            response = await api.post('/messaging/whatsapp', requestPayload);
          }

          const result = response.data.data || response.data;
          updatedRecipients[i] = {
            ...recipient,
            status: result.success !== false ? 'sent' : 'failed',
            messageId: result.messageId,
            error: result.success !== false ? undefined : result.error || 'Failed to send',
          };
        } catch (error: any) {
          updatedRecipients[i] = {
            ...recipient,
            status: 'failed',
            error: error.response?.data?.message || error.message,
          };
        }

        setRecipients([...updatedRecipients]);
        setProgress({ sent: i + 1, total: recipients.length });

        // Rate limiting: 200ms delay between messages to avoid API limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Bulk send failed:', error);
    } finally {
      setSending(false);
    }
  }, [message, mediaFiles, recipients, messageMode, selectedTemplate, templateParams]);

  const addNamePlaceholder = useCallback(() => {
    setMessage(message + '{name}');
  }, [message]);

  // Load leads from CRM database
  const loadLeadsFromCRM = useCallback(
    async (filter?: { stageId?: string; source?: string }) => {
      setLoadingLeads(true);
      try {
        // Load leads in batches (max 100 per request)
        const allLeads: any[] = [];
        let page = 1;
        const limit = 100;
        let hasMore = true;

        while (hasMore && page <= 10) { // Max 10 pages = 1000 leads
          const params = new URLSearchParams();
          params.set('page', String(page));
          params.set('limit', String(limit));
          if (filter?.stageId) params.set('stageId', filter.stageId);
          if (filter?.source) params.set('source', filter.source);

          const response = await api.get(`/leads?${params.toString()}`);
          const leads = response.data.data || response.data.leads || [];
          allLeads.push(...leads);

          // Check if there are more pages
          const pagination = response.data.pagination;
          hasMore = pagination ? page < pagination.totalPages : leads.length === limit;
          page++;
        }

        const leads = allLeads;

        const newRecipients: Recipient[] = [];
        leads.forEach((lead: any) => {
          const phone = lead.phone || lead.alternatePhone;
          if (phone) {
            const normalizedPhone = parsePhoneNumbers(phone)[0];
            if (
              normalizedPhone &&
              !recipients.some((r) => r.phone === normalizedPhone) &&
              !newRecipients.some((r) => r.phone === normalizedPhone)
            ) {
              newRecipients.push({
                id: crypto.randomUUID(),
                phone: normalizedPhone,
                name: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || undefined,
                status: 'pending',
              });
            }
          }
        });

        if (newRecipients.length > 0) {
          setRecipients([...recipients, ...newRecipients]);
        } else {
          alert('No leads found with phone numbers.');
        }
      } catch (error) {
        console.error('Error loading leads:', error);
        alert('Failed to load leads from CRM');
      } finally {
        setLoadingLeads(false);
      }
    },
    [recipients]
  );

  const stats: RecipientStats = {
    total: recipients.length,
    pending: recipients.filter((r) => r.status === 'pending').length,
    sent: recipients.filter((r) => r.status === 'sent').length,
    delivered: recipients.filter((r) => r.status === 'delivered').length,
    read: recipients.filter((r) => r.status === 'read').length,
    failed: recipients.filter((r) => r.status === 'failed').length,
  };

  return {
    message,
    setMessage,
    recipients,
    phoneInput,
    setPhoneInput,
    campaignName,
    setCampaignName,
    sending,
    progress,
    whatsappConfigured,
    mediaFiles,
    stats,
    loadingLeads,
    // Template state
    messageMode,
    setMessageMode,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    templateParams,
    setTemplateParams,
    loadingTemplates,
    templateError,
    // Refs
    fileInputRef,
    imageInputRef,
    videoInputRef,
    audioInputRef,
    docInputRef,
    // Actions
    handleAddPhones,
    handleFileUpload,
    handleMediaUpload,
    removeRecipient,
    clearAllRecipients,
    removeMedia,
    handleSendBulk,
    addNamePlaceholder,
    loadLeadsFromCRM,
    fetchTemplates,
  };
}

export default useBulkWhatsApp;
