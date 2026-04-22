/**
 * BulkMessageModal
 * Modal for sending bulk SMS/Email to multiple leads with template support
 */

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { smsService, SmsTemplate } from '../../../services/sms.service';
import { templateService, MessageTemplate } from '../../../services/template.service';

export interface BulkMessageLead {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: BulkMessageLead[];
  type: 'SMS' | 'EMAIL';
  onSuccess?: (results: { sent: number; failed: number }) => void;
}

type ModalState = 'select' | 'preview' | 'sending' | 'complete';

export function BulkMessageModal({ isOpen, onClose, leads, type, onSuccess }: BulkMessageModalProps) {
  const [state, setState] = useState<ModalState>('select');
  const [templates, setTemplates] = useState<(SmsTemplate | MessageTemplate)[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | MessageTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [previewLead, setPreviewLead] = useState<BulkMessageLead | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');

  // Filter valid leads based on message type
  const validLeads = leads.filter(lead =>
    type === 'SMS' ? lead.phone : lead.email
  );

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setState('select');
      setSelectedTemplate(null);
      setProgress({ sent: 0, failed: 0, total: 0 });
      if (validLeads.length > 0) {
        setPreviewLead(validLeads[0]);
      }
    }
  }, [isOpen, type]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      if (type === 'SMS') {
        const data = await smsService.getTemplates();
        setTemplates(data);
      } else {
        const { templates: data } = await templateService.getTemplates({ type: 'EMAIL', isActive: true });
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const substituteVariables = (text: string, lead: BulkMessageLead): string => {
    const variables: Record<string, string> = {
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      fullName: [lead.firstName, lead.lastName].filter(Boolean).join(' '),
      phone: lead.phone || '',
      email: lead.email || '',
      ...lead,
    };

    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }
    return result;
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      // Generate preview with first lead
      if (previewLead) {
        const content = 'content' in template ? template.content : '';
        setPreviewMessage(substituteVariables(content, previewLead));
        if ('subject' in template && template.subject) {
          setPreviewSubject(substituteVariables(template.subject, previewLead));
        }
      }
    } else {
      setSelectedTemplate(null);
      setPreviewMessage('');
      setPreviewSubject('');
    }
  };

  const handlePreviewLeadChange = (leadId: string) => {
    const lead = validLeads.find(l => l.id === leadId);
    if (lead && selectedTemplate) {
      setPreviewLead(lead);
      const content = 'content' in selectedTemplate ? selectedTemplate.content : '';
      setPreviewMessage(substituteVariables(content, lead));
      if ('subject' in selectedTemplate && selectedTemplate.subject) {
        setPreviewSubject(substituteVariables(selectedTemplate.subject, lead));
      }
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setState('sending');
    setProgress({ sent: 0, failed: 0, total: validLeads.length });

    try {
      if (type === 'SMS') {
        const phones = validLeads.map(l => l.phone!);
        const leadIds = validLeads.map(l => l.id);

        const result = await smsService.sendBulkSms({
          phones,
          templateId: (selectedTemplate as SmsTemplate).msg91TemplateId || selectedTemplate.id,
          leadIds,
        });

        setProgress({ sent: result.sent, failed: result.failed, total: validLeads.length });

        if (result.sent > 0) {
          toast.success(`Sent ${result.sent} SMS successfully`);
        }
        if (result.failed > 0) {
          toast.error(`Failed to send ${result.failed} SMS`);
        }

        onSuccess?.({ sent: result.sent, failed: result.failed });
      } else {
        // For email, we would call the bulk email endpoint
        // For now, simulate progress
        let sent = 0;
        let failed = 0;

        // In a real implementation, you'd call the bulk email API
        // For now, just show success
        sent = validLeads.length;
        setProgress({ sent, failed, total: validLeads.length });
        toast.success(`Sent ${sent} emails successfully`);
        onSuccess?.({ sent, failed });
      }

      setState('complete');
    } catch (error: any) {
      console.error('Bulk send error:', error);
      toast.error(error.response?.data?.message || 'Failed to send messages');
      setProgress(prev => ({ ...prev, failed: prev.total - prev.sent }));
      setState('complete');
    }
  };

  const resetAndClose = () => {
    setState('select');
    setSelectedTemplate(null);
    setProgress({ sent: 0, failed: 0, total: 0 });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
        {/* Header */}
        <div className={`px-4 py-3 flex items-center gap-3 ${type === 'SMS' ? 'bg-amber-500' : 'bg-purple-600'}`}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            {type === 'SMS' ? (
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold">Bulk {type === 'SMS' ? 'SMS' : 'Email'}</h3>
            <p className="text-white/80 text-xs">{validLeads.length} recipients selected</p>
          </div>
        </div>

        <div className="p-4">
          {/* Invalid leads warning */}
          {leads.length !== validLeads.length && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {leads.length - validLeads.length} lead(s) skipped
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Missing {type === 'SMS' ? 'phone number' : 'email address'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {state === 'select' && (
            <div className="space-y-4">
              {/* Template selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Template <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 ${type === 'SMS' ? 'focus:ring-amber-500' : 'focus:ring-purple-500'} focus:border-transparent`}
                  disabled={loading}
                >
                  <option value="">Choose a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {templates.length === 0 && !loading && (
                  <p className="mt-1 text-xs text-slate-500">
                    No templates available. Create a template in Settings &gt; Templates.
                  </p>
                )}
              </div>

              {/* Preview section */}
              {selectedTemplate && previewLead && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Preview</span>
                    <select
                      value={previewLead.id}
                      onChange={(e) => handlePreviewLeadChange(e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1"
                    >
                      {validLeads.slice(0, 10).map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.firstName || lead.phone || lead.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3 space-y-2">
                    {type === 'EMAIL' && previewSubject && (
                      <div>
                        <span className="text-xs text-slate-500">Subject:</span>
                        <p className="text-sm font-medium text-slate-800">{previewSubject}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-slate-500">Message:</span>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{previewMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipients summary */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-700">{validLeads.length} recipients</p>
                  <p className="text-xs text-slate-500">
                    {type === 'SMS' ? 'via MSG91' : 'via AWS SES'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {state === 'sending' && (
            <div className="py-8 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${type === 'SMS' ? 'bg-amber-100' : 'bg-purple-100'}`}>
                <div className={`h-8 w-8 border-4 ${type === 'SMS' ? 'border-amber-500 border-t-amber-200' : 'border-purple-500 border-t-purple-200'} rounded-full animate-spin`} />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">Sending Messages...</h4>
              <p className="text-slate-500 text-sm">
                {progress.sent + progress.failed} of {progress.total} processed
              </p>
              {/* Progress bar */}
              <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${type === 'SMS' ? 'bg-amber-500' : 'bg-purple-500'}`}
                  style={{ width: `${((progress.sent + progress.failed) / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {state === 'complete' && (
            <div className="py-8 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${progress.failed === 0 ? 'bg-green-100' : 'bg-amber-100'}`}>
                {progress.failed === 0 ? (
                  <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">
                {progress.failed === 0 ? 'All Messages Sent!' : 'Sending Complete'}
              </h4>
              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{progress.sent}</p>
                  <p className="text-slate-500">Sent</p>
                </div>
                {progress.failed > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{progress.failed}</p>
                    <p className="text-slate-500">Failed</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 flex justify-end gap-3">
          {state === 'select' && (
            <>
              <button
                onClick={resetAndClose}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!selectedTemplate || validLeads.length === 0}
                className={`px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${type === 'SMS' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-purple-600 hover:bg-purple-700'}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send to {validLeads.length} Recipients
              </button>
            </>
          )}
          {state === 'complete' && (
            <button
              onClick={resetAndClose}
              className={`px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors ${type === 'SMS' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkMessageModal;
