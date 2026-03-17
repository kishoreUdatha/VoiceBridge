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
      const response = await api.get('/exotel/whatsapp/status');
      setWhatsappConfigured(response.data.data?.configured ?? response.data.configured);
    } catch {
      setWhatsappConfigured(false);
    }
  };

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
    if ((!message.trim() && mediaFiles.length === 0) || recipients.length === 0) return;

    setSending(true);
    setProgress({ sent: 0, total: recipients.length });

    try {
      const updatedRecipients = [...recipients];

      const mediaData = await Promise.all(
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

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        try {
          const response = await api.post('/exotel/whatsapp/send', {
            to: recipient.phone,
            message: message.replace(/{name}/g, recipient.name || ''),
            media: mediaData.length > 0 ? mediaData : undefined,
          });

          updatedRecipients[i] = {
            ...recipient,
            status: 'sent',
            messageId: response.data.messageId,
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

        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Bulk send failed:', error);
    } finally {
      setSending(false);
    }
  }, [message, mediaFiles, recipients]);

  const addNamePlaceholder = useCallback(() => {
    setMessage(message + '{name}');
  }, [message]);

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
    fileInputRef,
    imageInputRef,
    videoInputRef,
    audioInputRef,
    docInputRef,
    handleAddPhones,
    handleFileUpload,
    handleMediaUpload,
    removeRecipient,
    clearAllRecipients,
    removeMedia,
    handleSendBulk,
    addNamePlaceholder,
  };
}

export default useBulkWhatsApp;
