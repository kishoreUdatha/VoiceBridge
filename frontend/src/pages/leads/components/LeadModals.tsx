/**
 * Lead Detail Modals - Extracted modal components
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { LeadPayment, LeadDocument } from '../../../services/leadDetails.service';
import { CustomFieldsRenderer } from '../../../components/CustomFieldsRenderer';
import { smsService, SmsTemplate, SmsInfo } from '../../../services/sms.service';
import { templateService, MessageTemplate } from '../../../services/template.service';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ModalWrapper({ isOpen, title, children }: ModalWrapperProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: { title: string; description: string; dueDate: string; priority: string; assigneeId: string }) => void;
  counselors: Array<{ id: string; firstName: string; lastName: string }>;
}

export function TaskModal({ isOpen, onClose, onSubmit, counselors }: TaskModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    assigneeId: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', assigneeId: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Task">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
        <input
          type="datetime-local"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="LOW">Low Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="URGENT">Urgent</option>
        </select>
        <select
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">Assign to me</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.title.trim()} className="btn btn-primary">Create Task</button>
      </div>
    </ModalWrapper>
  );
}

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (followUp: { scheduledAt: string; message: string; notes: string; assigneeId: string }) => void;
  counselors: Array<{ id: string; firstName: string; lastName: string }>;
}

export function FollowUpModal({ isOpen, onClose, onSubmit, counselors }: FollowUpModalProps) {
  const [form, setForm] = useState({
    scheduledAt: '',
    message: '',
    notes: '',
    assigneeId: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ scheduledAt: '', message: '', notes: '', assigneeId: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Schedule Follow-up">
      <div className="space-y-4">
        <input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <input
          type="text"
          placeholder="Message (optional)"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
        <select
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">Assign to me</option>
          {counselors.map((c) => (
            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.scheduledAt} className="btn btn-primary">Schedule</button>
      </div>
    </ModalWrapper>
  );
}

interface QueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: string) => void;
}

export function QueryModal({ isOpen, onClose, onSubmit }: QueryModalProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    onSubmit(query);
    setQuery('');
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Query">
      <textarea
        placeholder="Enter query..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        rows={4}
      />
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!query.trim()} className="btn btn-primary">Add Query</button>
      </div>
    </ModalWrapper>
  );
}

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (programName: string) => void;
}

export function ApplicationModal({ isOpen, onClose, onSubmit }: ApplicationModalProps) {
  const [programName, setProgramName] = useState('');

  const handleSubmit = () => {
    onSubmit(programName);
    setProgramName('');
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="New Application">
      <input
        type="text"
        placeholder="Program Name (optional)"
        value={programName}
        onChange={(e) => setProgramName(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
      />
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} className="btn btn-primary">Create Application</button>
      </div>
    </ModalWrapper>
  );
}

interface InterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (interest: { name: string; category: string; notes: string }) => void;
}

export function InterestModal({ isOpen, onClose, onSubmit }: InterestModalProps) {
  const [form, setForm] = useState({ name: '', category: '', notes: '' });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ name: '', category: '', notes: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Add Interest">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Interest name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <input
          type="text"
          placeholder="Category (optional)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.name.trim()} className="btn btn-primary">Add Interest</button>
      </div>
    </ModalWrapper>
  );
}

interface CallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (callLog: { phoneNumber: string; direction: string; status: string; duration: number; notes: string }) => void;
  defaultPhone?: string;
}

export function CallLogModal({ isOpen, onClose, onSubmit, defaultPhone = '' }: CallLogModalProps) {
  const [form, setForm] = useState({
    phoneNumber: defaultPhone,
    direction: 'OUTBOUND',
    status: 'COMPLETED',
    duration: 0,
    notes: '',
  });

  const handleSubmit = () => {
    onSubmit(form);
    setForm({ phoneNumber: defaultPhone, direction: 'OUTBOUND', status: 'COMPLETED', duration: 0, notes: '' });
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Log Call">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Phone number"
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <select
          value={form.direction}
          onChange={(e) => setForm({ ...form, direction: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="OUTBOUND">Outbound</option>
          <option value="INBOUND">Inbound</option>
        </select>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="COMPLETED">Completed</option>
          <option value="MISSED">Missed</option>
          <option value="NO_ANSWER">No Answer</option>
          <option value="BUSY">Busy</option>
        </select>
        <input
          type="number"
          placeholder="Duration (seconds)"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
        />
        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={!form.phoneNumber} className="btn btn-primary">Log Call</button>
      </div>
    </ModalWrapper>
  );
}

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { message: string; mediaUrl: string }) => void;
  phone: string;
}

// WhatsApp Icon Component
const WhatsAppIconLarge = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export function WhatsAppModal({ isOpen, onClose, onSubmit, phone }: WhatsAppModalProps) {
  const [message, setMessage] = useState('');

  // Format phone number for WhatsApp (remove spaces, dashes, and ensure country code)
  const formatPhoneForWhatsApp = (phoneNumber: string): string => {
    // Remove all non-numeric characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    // If starts with 0, assume Indian number and add 91
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    // If doesn't start with +, assume it needs country code
    if (!cleaned.startsWith('+') && !cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    // Remove + if present (WhatsApp URL doesn't need it)
    cleaned = cleaned.replace('+', '');
    return cleaned;
  };

  const handleSendWhatsApp = () => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');

    // Also call the onSubmit to log the activity
    onSubmit({ message, mediaUrl: '' });

    // Reset and close
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        {/* WhatsApp-style header */}
        <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
          <WhatsAppIconLarge className="h-6 w-6 text-white" />
          <div>
            <h3 className="text-white font-semibold">Send WhatsApp Message</h3>
            <p className="text-green-100 text-xs">Opens WhatsApp to send message</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Recipient */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center">
              <WhatsAppIconLarge className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500">To</p>
              <p className="font-medium text-slate-800">{phone}</p>
            </div>
          </div>

          {/* Message input - WhatsApp style */}
          <div className="relative">
            <textarea
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#25D366] focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          {/* Quick message templates */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Quick Templates</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Hi, following up on our conversation.',
                'Hello! I wanted to check in with you.',
                'Hi, do you have time for a quick call?',
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => setMessage(template)}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                >
                  {template.length > 30 ? template.slice(0, 30) + '...' : template}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={() => {
              setMessage('');
              onClose();
            }}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendWhatsApp}
            disabled={!message.trim()}
            className="px-4 py-2 text-sm bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <WhatsAppIconLarge className="h-4 w-4" />
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string, templateId?: string) => void;
  phone: string;
  leadId?: string;
  leadName?: string;
  leadData?: Record<string, string>;
}

export function SmsModal({ isOpen, onClose, onSubmit, phone, leadId, leadName, leadData = {} }: SmsModalProps) {
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendViaApi, setSendViaApi] = useState(true);
  const [smsInfo, setSmsInfo] = useState<SmsInfo>({ characterCount: 0, smsCount: 0, encoding: 'GSM', remainingInCurrentSms: 160 });

  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Update SMS info when message changes
  useEffect(() => {
    setSmsInfo(smsService.getSmsInfo(message));
  }, [message]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await smsService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load SMS templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      // Substitute variables with lead data
      const variables = {
        firstName: leadData.firstName || leadName?.split(' ')[0] || '',
        lastName: leadData.lastName || leadName?.split(' ').slice(1).join(' ') || '',
        fullName: leadName || '',
        phone: phone,
        ...leadData,
      };
      const substitutedMessage = smsService.substituteVariables(template.content, variables);
      setMessage(substitutedMessage);
    } else {
      setSelectedTemplate(null);
    }
  };

  const handleSendSms = async () => {
    if (sendViaApi && leadId) {
      setSending(true);
      try {
        await smsService.sendSms({
          phone,
          message,
          templateId: selectedTemplate?.msg91TemplateId || selectedTemplate?.id,
          dltTemplateId: selectedTemplate?.dltTemplateId,
          leadId,
        });
        toast.success('SMS sent successfully');
        onSubmit(message, selectedTemplate?.id);
        resetAndClose();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to send SMS');
      } finally {
        setSending(false);
      }
    } else {
      // Fallback to native SMS app
      const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
      window.location.href = smsUrl;
      onSubmit(message, selectedTemplate?.id);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setMessage('');
    setSelectedTemplate(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        {/* SMS-style header */}
        <div className="bg-amber-500 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">Send SMS</h3>
            <p className="text-amber-100 text-xs">{sendViaApi ? 'Send via MSG91' : 'Opens messaging app'}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Recipient */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">To</p>
              <p className="font-medium text-slate-800">{leadName ? `${leadName} (${phone})` : phone}</p>
            </div>
          </div>

          {/* Template selector */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Template (optional)</label>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Select a template or write custom message</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Message input */}
          <div className="relative">
            <textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="absolute bottom-2 right-3 flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded ${smsInfo.encoding === 'UNICODE' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                {smsInfo.encoding}
              </span>
              <span className={`text-xs ${smsInfo.smsCount > 1 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                {smsInfo.characterCount} chars / {smsInfo.smsCount} SMS
              </span>
            </div>
          </div>

          {/* SMS count warning */}
          {smsInfo.smsCount > 1 && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
              <svg className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-700">
                Message will be sent as {smsInfo.smsCount} SMS parts. Each part may incur separate charges.
              </p>
            </div>
          )}

          {/* Send method toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Send via API (MSG91)</span>
            <button
              onClick={() => setSendViaApi(!sendViaApi)}
              className={`relative w-10 h-5 rounded-full transition-colors ${sendViaApi ? 'bg-amber-500' : 'bg-slate-200'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sendViaApi ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>

          {/* Quick message templates */}
          {!selectedTemplate && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Quick Templates</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Please call me back.',
                  'Are you available for a quick call?',
                  'Thank you for your inquiry!',
                ].map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMessage(template)}
                    className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={resetAndClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendSms}
            disabled={!message.trim() || sending}
            className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            Send SMS
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== EMAIL MODAL ====================

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { subject: string; body: string; templateId?: string }) => void;
  email: string;
  leadName?: string;
  leadId?: string;
  leadData?: Record<string, string>;
}

export function EmailModal({ isOpen, onClose, onSubmit, email, leadName, leadId, leadData = {} }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { templates: data } = await templateService.getTemplates({ type: 'EMAIL', isActive: true });
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load email templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const substituteVariables = (text: string, variables: Record<string, string>): string => {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      // Substitute variables with lead data
      const variables = {
        firstName: leadData.firstName || leadName?.split(' ')[0] || '',
        lastName: leadData.lastName || leadName?.split(' ').slice(1).join(' ') || '',
        fullName: leadName || '',
        email: email,
        ...leadData,
      };
      setSubject(substituteVariables(template.subject || '', variables));
      setBody(substituteVariables(template.content, variables));
    } else {
      setSelectedTemplate(null);
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      // Call the onSubmit to send via backend API
      await onSubmit({ subject, body, templateId: selectedTemplate?.id });
      toast.success('Email sent successfully');
      resetAndClose();
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleOpenInClient = () => {
    // Open in default email client with pre-filled content
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    onClose();
  };

  const resetAndClose = () => {
    setSubject('');
    setBody('');
    setSelectedTemplate(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
        {/* Email-style header */}
        <div className="bg-purple-600 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">Compose Email</h3>
            <p className="text-purple-100 text-xs">Send via AWS SES</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Recipient */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500">To</p>
              <p className="font-medium text-slate-800 truncate">{leadName && <span className="text-slate-600">{leadName} &lt;</span>}{email}{leadName && <span className="text-slate-600">&gt;</span>}</p>
            </div>
          </div>

          {/* Template selector */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Template (optional)</label>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Select a template or compose manually</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Subject</label>
            <input
              type="text"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Message</label>
            <textarea
              placeholder="Type your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={6}
            />
          </div>

          {/* Quick templates (only show when no template selected) */}
          {!selectedTemplate && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Quick Templates</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { subject: 'Following up on our conversation', body: 'Hi,\n\nI wanted to follow up on our recent conversation. Please let me know if you have any questions.\n\nBest regards' },
                  { subject: 'Thank you for your inquiry', body: 'Hi,\n\nThank you for reaching out to us. We appreciate your interest.\n\nBest regards' },
                  { subject: 'Meeting request', body: 'Hi,\n\nI would like to schedule a meeting to discuss further. Please let me know your availability.\n\nBest regards' },
                ].map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSubject(template.subject);
                      setBody(template.body);
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                  >
                    {template.subject.length > 25 ? template.subject.slice(0, 25) + '...' : template.subject}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 flex justify-between">
          <button
            onClick={handleOpenInClient}
            disabled={!subject.trim() || !body.trim()}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Email App
          </button>
          <div className="flex gap-3">
            <button
              onClick={resetAndClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={!subject.trim() || !body.trim() || sending}
              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditLeadFormData) => void;
  lead: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    city?: string;
    state?: string;
    country?: string;
    address?: string;
    pincode?: string;
    company?: string;
    designation?: string;
    source?: string;
    priority?: string;
    gender?: string;
    dateOfBirth?: string;
    alternateEmail?: string;
    alternatePhone?: string;
    walkinDate?: string;
    lineupDate?: string;
    preferredLocation?: string;
    totalFees?: number | string;
    // New direct columns
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
    whatsapp?: string;
    occupation?: string;
    budget?: number | string;
    preferredContactMethod?: string;
    preferredContactTime?: string;
    customFields?: Record<string, any>;
  } | null;
}

export interface EditLeadFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  country: string;
  address: string;
  pincode: string;
  company: string;
  designation: string;
  source: string;
  priority: string;
  // Personal Information
  gender: string;
  dateOfBirth: string;
  alternateEmail: string;
  alternatePhone: string;
  // Family & Contact Details (direct columns)
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  whatsapp: string;
  occupation: string;
  budget: string;
  preferredContactMethod: string;
  preferredContactTime: string;
  // Additional Information
  walkinDate: string;
  lineupDate: string;
  preferredLocation: string;
  // Course & Assignment
  centerName: string;
  agentName: string;
  facultyName: string;
  // Fee Details
  totalFees: string;
  paidAmount: string;
  paymentStatus: string;
  installment1: string;
  installment2: string;
  installment3: string;
  // Custom Fields (dynamic)
  customFields: Record<string, any>;
}

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function EditLeadModal({ isOpen, onClose, onSubmit, lead }: EditLeadModalProps) {
  const [emailError, setEmailError] = useState('');
  const [alternateEmailError, setAlternateEmailError] = useState('');
  const [form, setForm] = useState<EditLeadFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    country: '',
    address: '',
    pincode: '',
    company: '',
    designation: '',
    source: '',
    priority: '',
    gender: '',
    dateOfBirth: '',
    alternateEmail: '',
    alternatePhone: '',
    // Family & Contact Details
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    whatsapp: '',
    occupation: '',
    budget: '',
    preferredContactMethod: '',
    preferredContactTime: '',
    // Additional
    walkinDate: '',
    lineupDate: '',
    preferredLocation: '',
    // Course & Assignment
    centerName: '',
    agentName: '',
    facultyName: '',
    // Fee Details
    totalFees: '',
    paidAmount: '',
    paymentStatus: '',
    installment1: '',
    installment2: '',
    installment3: '',
    customFields: {},
  });

  // Reset form when modal opens with lead data
  useEffect(() => {
    if (isOpen && lead) {
      // Reset email errors
      setEmailError('');
      setAlternateEmailError('');

      // Helper to get custom field value
      const getCustomFieldValue = (key: string) => {
        if (lead.customFields && lead.customFields[key]) {
          return String(lead.customFields[key]);
        }
        return '';
      };

      // Format date for input field (YYYY-MM-DD)
      const formatDateForInput = (date: string | undefined) => {
        if (!date) return '';
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';
          return d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setForm({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        phone: lead.phone || '',
        email: lead.email || '',
        city: lead.city || '',
        state: lead.state || '',
        country: lead.country || '',
        address: lead.address || '',
        pincode: lead.pincode || '',
        company: lead.company || '',
        designation: lead.designation || '',
        source: lead.source || '',
        priority: lead.priority || '',
        gender: lead.gender || getCustomFieldValue('gender'),
        dateOfBirth: formatDateForInput(lead.dateOfBirth) || formatDateForInput(getCustomFieldValue('dateOfBirth')),
        alternateEmail: lead.alternateEmail || '',
        alternatePhone: lead.alternatePhone || '',
        // Family & Contact Details - read from direct columns first, fallback to customFields
        fatherName: lead.fatherName || getCustomFieldValue('fatherName') || getCustomFieldValue('father_name') || '',
        fatherPhone: lead.fatherPhone || getCustomFieldValue('fatherPhone') || getCustomFieldValue('father_phone') || '',
        motherName: lead.motherName || getCustomFieldValue('motherName') || getCustomFieldValue('mother_name') || '',
        motherPhone: lead.motherPhone || getCustomFieldValue('motherPhone') || getCustomFieldValue('mother_phone') || '',
        whatsapp: lead.whatsapp || getCustomFieldValue('whatsapp') || '',
        occupation: lead.occupation || getCustomFieldValue('occupation') || '',
        budget: lead.budget ? String(lead.budget) : getCustomFieldValue('budget') || '',
        preferredContactMethod: lead.preferredContactMethod || getCustomFieldValue('preferredContactMethod') || getCustomFieldValue('preferred_contact_method') || '',
        preferredContactTime: lead.preferredContactTime || getCustomFieldValue('preferredContactTime') || getCustomFieldValue('preferred_contact_time') || '',
        // Additional
        walkinDate: formatDateForInput(lead.walkinDate),
        lineupDate: formatDateForInput(lead.lineupDate),
        preferredLocation: lead.preferredLocation || '',
        // Course & Assignment
        centerName: lead.centerName || '',
        agentName: lead.agentName || '',
        facultyName: lead.facultyName || '',
        // Fee Details
        totalFees: lead.totalFees ? String(lead.totalFees) : '',
        paidAmount: lead.paidAmount ? String(lead.paidAmount) : '',
        paymentStatus: lead.paymentStatus || '',
        installment1: lead.installment1 ? String(lead.installment1) : '',
        installment2: lead.installment2 ? String(lead.installment2) : '',
        installment3: lead.installment3 ? String(lead.installment3) : '',
        customFields: lead.customFields || {},
      });
    }
  }, [isOpen, lead]);

  // Handle custom field change
  const handleCustomFieldChange = (fieldSlug: string, value: any) => {
    setForm(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldSlug]: value,
      },
    }));
  };

  const handleSubmit = () => {
    // Validate email before submit
    if (form.email && form.email.trim() && !isValidEmail(form.email.trim())) {
      setEmailError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }
    if (form.alternateEmail && form.alternateEmail.trim() && !isValidEmail(form.alternateEmail.trim())) {
      setAlternateEmailError('Please enter a valid alternate email address');
      toast.error('Please enter a valid alternate email address');
      return;
    }
    onSubmit(form);
    onClose();
  };

  const handleChange = (field: keyof EditLeadFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));

    // Real-time email validation
    if (field === 'email') {
      if (value.trim() && !isValidEmail(value.trim())) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    }
    if (field === 'alternateEmail') {
      if (value.trim() && !isValidEmail(value.trim())) {
        setAlternateEmailError('Please enter a valid alternate email address');
      } else {
        setAlternateEmailError('');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Edit Lead Details</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Personal Info */}
          <div className="col-span-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Personal Information</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">First Name *</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="First Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Last Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                emailError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-200 focus:ring-primary-500 focus:border-transparent'
              }`}
              placeholder="email@example.com"
            />
            {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Date of Birth</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Alternate Email</label>
            <input
              type="email"
              value={form.alternateEmail}
              onChange={(e) => handleChange('alternateEmail', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                alternateEmailError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-200 focus:ring-primary-500 focus:border-transparent'
              }`}
              placeholder="alternate@example.com"
            />
            {alternateEmailError && <p className="mt-1 text-xs text-red-500">{alternateEmailError}</p>}
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Alternate Phone</label>
            <input
              type="tel"
              value={form.alternatePhone}
              onChange={(e) => handleChange('alternatePhone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Work Info */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Work Information</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Company</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Company Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Designation</label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Job Title"
            />
          </div>

          {/* Address Info */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Address</p>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Street Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Street Address"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => handleChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="State"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Country"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Pincode</label>
            <input
              type="text"
              value={form.pincode}
              onChange={(e) => handleChange('pincode', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Pincode"
            />
          </div>

          {/* Family & Contact Details */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Family & Contact Details</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Father's Name</label>
            <input
              type="text"
              value={form.fatherName}
              onChange={(e) => handleChange('fatherName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Father's Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Father's Phone</label>
            <input
              type="tel"
              value={form.fatherPhone}
              onChange={(e) => handleChange('fatherPhone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Mother's Name</label>
            <input
              type="text"
              value={form.motherName}
              onChange={(e) => handleChange('motherName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Mother's Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Mother's Phone</label>
            <input
              type="tel"
              value={form.motherPhone}
              onChange={(e) => handleChange('motherPhone', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">WhatsApp Number</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Occupation</label>
            <input
              type="text"
              value={form.occupation}
              onChange={(e) => handleChange('occupation', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Occupation"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Budget</label>
            <input
              type="number"
              value={form.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Preferred Contact Method</label>
            <select
              value={form.preferredContactMethod}
              onChange={(e) => handleChange('preferredContactMethod', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Method</option>
              <option value="phone">Phone Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Preferred Contact Time</label>
            <select
              value={form.preferredContactTime}
              onChange={(e) => handleChange('preferredContactTime', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Time</option>
              <option value="morning">Morning (9 AM - 12 PM)</option>
              <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
              <option value="evening">Evening (5 PM - 9 PM)</option>
              <option value="anytime">Anytime</option>
            </select>
          </div>

          {/* Lead Info */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Lead Information</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Source</label>
            <select
              value={form.source}
              onChange={(e) => handleChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Source</option>
              <optgroup label="Direct Sources">
                <option value="MANUAL">Manual</option>
                <option value="WEBSITE">Website</option>
                <option value="WALK_IN">Walk In</option>
                <option value="PHONE">Phone Inquiry</option>
                <option value="EMAIL">Email Inquiry</option>
                <option value="REFERRAL">Referral</option>
              </optgroup>
              <optgroup label="Social Media">
                <option value="FACEBOOK">Facebook</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="GOOGLE">Google Ads</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="TWITTER">Twitter</option>
                <option value="TIKTOK">TikTok</option>
              </optgroup>
              <optgroup label="Indian Lead Sources">
                <option value="JUSTDIAL">JustDial</option>
                <option value="INDIAMART">IndiaMART</option>
                <option value="SULEKHA">Sulekha</option>
                <option value="TAWKTO">Tawk.to Chat</option>
              </optgroup>
              <optgroup label="Real Estate Portals">
                <option value="99ACRES">99Acres</option>
                <option value="MAGICBRICKS">MagicBricks</option>
                <option value="HOUSING">Housing.com</option>
              </optgroup>
              <optgroup label="Other">
                <option value="OTHER">Other</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Additional Information */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Additional Information</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Walkin Date</label>
            <input
              type="date"
              value={form.walkinDate}
              onChange={(e) => handleChange('walkinDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Lineup Date</label>
            <input
              type="date"
              value={form.lineupDate}
              onChange={(e) => handleChange('lineupDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Preferred Location</label>
            <input
              type="text"
              value={form.preferredLocation}
              onChange={(e) => handleChange('preferredLocation', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Preferred Location"
            />
          </div>

          {/* Course & Assignment */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Course & Assignment</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Center Name</label>
            <input
              type="text"
              value={form.centerName}
              onChange={(e) => handleChange('centerName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Center Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Agent Name</label>
            <input
              type="text"
              value={form.agentName}
              onChange={(e) => handleChange('agentName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Agent Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Faculty Name</label>
            <input
              type="text"
              value={form.facultyName}
              onChange={(e) => handleChange('facultyName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Faculty Name"
            />
          </div>

          {/* Fee Details */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Fee Details</p>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Total Fees</label>
            <input
              type="number"
              value={form.totalFees}
              onChange={(e) => handleChange('totalFees', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Paid Amount</label>
            <input
              type="number"
              value={form.paidAmount}
              onChange={(e) => handleChange('paidAmount', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Payment Status</label>
            <select
              value={form.paymentStatus}
              onChange={(e) => handleChange('paymentStatus', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Status</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Installment 1</label>
            <input
              type="number"
              value={form.installment1}
              onChange={(e) => handleChange('installment1', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Installment 2</label>
            <input
              type="number"
              value={form.installment2}
              onChange={(e) => handleChange('installment2', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Installment 3</label>
            <input
              type="number"
              value={form.installment3}
              onChange={(e) => handleChange('installment3', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Custom Fields (from Settings > Custom Contact Property) */}
          <div className="col-span-2 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Custom Fields</p>
          </div>
          <div className="col-span-2">
            <CustomFieldsRenderer
              values={form.customFields}
              onChange={handleCustomFieldChange}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.firstName.trim() || !form.phone.trim()}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== PAYMENT MODAL ====================

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payment: Omit<LeadPayment, 'id' | 'createdAt'>) => void;
}

export function PaymentModal({ isOpen, onClose, onSubmit }: PaymentModalProps) {
  const [form, setForm] = useState({
    amount: '',
    currency: 'INR',
    paymentType: 'TUITION' as LeadPayment['paymentType'],
    paymentMethod: 'UPI' as LeadPayment['paymentMethod'],
    status: 'PENDING' as LeadPayment['status'],
    transactionId: '',
    receiptNo: '',
    dueDate: '',
    notes: '',
  });

  const handleSubmit = () => {
    onSubmit({
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      paymentType: form.paymentType,
      paymentMethod: form.paymentMethod,
      status: form.status,
      transactionId: form.transactionId || undefined,
      receiptNo: form.receiptNo || undefined,
      dueDate: form.dueDate || undefined,
      paidAt: form.status === 'COMPLETED' ? new Date().toISOString() : undefined,
      notes: form.notes || undefined,
    });
    setForm({
      amount: '',
      currency: 'INR',
      paymentType: 'TUITION',
      paymentMethod: 'UPI',
      status: 'PENDING',
      transactionId: '',
      receiptNo: '',
      dueDate: '',
      notes: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Add Payment</h3>

        <div className="space-y-4">
          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Amount *</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Payment Type *</label>
            <select
              value={form.paymentType}
              onChange={(e) => setForm({ ...form, paymentType: e.target.value as LeadPayment['paymentType'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="REGISTRATION">Registration Fee</option>
              <option value="TUITION">Tuition Fee</option>
              <option value="EXAM">Exam Fee</option>
              <option value="HOSTEL">Hostel Fee</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Payment Method *</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as LeadPayment['paymentMethod'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as LeadPayment['status'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="PARTIAL">Partial</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Transaction ID</label>
            <input
              type="text"
              value={form.transactionId}
              onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="TXN123456789"
            />
          </div>

          {/* Receipt No */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Receipt Number</label>
            <input
              type="text"
              value={form.receiptNo}
              onChange={(e) => setForm({ ...form, receiptNo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="RCP-2024-001"
            />
          </div>

          {/* Due Date (only show for pending payments) */}
          {form.status === 'PENDING' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.amount || parseFloat(form.amount) <= 0}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== DOCUMENT MODAL ====================

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File, documentType: LeadDocument['documentType'], documentName: string) => void;
}

export function DocumentModal({ isOpen, onClose, onSubmit }: DocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    documentType: 'OTHER' as LeadDocument['documentType'],
    documentName: '',
    file: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({
        ...form,
        file,
        documentName: form.documentName || file.name.replace(/\.[^/.]+$/, ''), // Use filename without extension as default name
      });
    }
  };

  const handleSubmit = () => {
    if (form.file && form.documentName) {
      onSubmit(form.file, form.documentType, form.documentName);
      setForm({
        documentType: 'OTHER',
        documentName: '',
        file: null,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Upload Document</h3>

        <div className="space-y-4">
          {/* Document Type */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Document Type *</label>
            <select
              value={form.documentType}
              onChange={(e) => setForm({ ...form, documentType: e.target.value as LeadDocument['documentType'] })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="ID_PROOF">ID Proof (Aadhar, PAN, Passport)</option>
              <option value="ADDRESS_PROOF">Address Proof</option>
              <option value="PHOTO">Photo</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="MARKSHEET">Marksheet</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Document Name *</label>
            <input
              type="text"
              value={form.documentName}
              onChange={(e) => setForm({ ...form, documentName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="e.g., Aadhar Card, 10th Marksheet"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">File *</label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                form.file ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {form.file ? (
                <div>
                  <p className="text-sm font-medium text-green-700">{form.file.name}</p>
                  <p className="text-xs text-green-600 mt-1">{formatFileSize(form.file.size)}</p>
                  <p className="text-xs text-slate-500 mt-2">Click to change file</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-slate-600 mt-2">Click to upload</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOC (max 10MB)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={() => {
              setForm({ documentType: 'OTHER', documentName: '', file: null });
              if (fileInputRef.current) fileInputRef.current.value = '';
              onClose();
            }}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.file || !form.documentName.trim()}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload Document
          </button>
        </div>
      </div>
    </div>
  );
}
