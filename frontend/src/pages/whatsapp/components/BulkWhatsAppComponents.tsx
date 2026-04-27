/**
 * Bulk WhatsApp Components
 * RecipientsPanel, MessageComposer, MediaAttachments, ProgressPanel
 */

import React from 'react';
import {
  PlusIcon,
  DocumentArrowUpIcon,
  UserGroupIcon,
  TrashIcon,
  XMarkIcon,
  ArrowPathIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import {
  Recipient,
  MediaFile,
  RecipientStats,
  MediaType,
  MessageMode,
  WhatsAppTemplate,
} from '../bulk-whatsapp.types';
import {
  STATUS_CONFIG,
  MEDIA_TYPE_CONFIG,
  formatFileSize,
  WHATSAPP_ICON_PATH,
} from '../bulk-whatsapp.constants';

// Loading State
export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center h-96">
    <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
  </div>
);

// Not Configured State
export const NotConfiguredState: React.FC = () => (
  <div className="max-w-lg mx-auto mt-20 p-6">
    <div className="text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
          <path d={WHATSAPP_ICON_PATH} />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp Not Configured</h2>
      <p className="text-gray-500 mb-6">Configure WhatsApp in settings to send bulk messages</p>
      <a
        href="/settings/whatsapp"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        Go to Settings
      </a>
    </div>
  </div>
);

// Page Header
export const PageHeader: React.FC = () => (
  <div className="flex items-center gap-4 mb-6">
    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d={WHATSAPP_ICON_PATH} />
      </svg>
    </div>
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Bulk WhatsApp</h1>
      <p className="text-sm text-gray-500">Send messages to multiple contacts</p>
    </div>
  </div>
);

// Recipients Panel
interface RecipientsPanelProps {
  recipients: Recipient[];
  phoneInput: string;
  setPhoneInput: (input: string) => void;
  handleAddPhones: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeRecipient: (id: string) => void;
  clearAllRecipients: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  loadLeadsFromCRM?: () => void;
  loadingLeads?: boolean;
}

export const RecipientsPanel: React.FC<RecipientsPanelProps> = ({
  recipients,
  phoneInput,
  setPhoneInput,
  handleAddPhones,
  handleFileUpload,
  removeRecipient,
  clearAllRecipients,
  fileInputRef,
  loadLeadsFromCRM,
  loadingLeads,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-gray-900">Recipients</h2>
      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
        {recipients.length}
      </span>
    </div>

    <div className="p-4 space-y-4">
      {/* Manual Input */}
      <div>
        <textarea
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="Enter phone numbers&#10;One per line or comma separated"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          rows={3}
        />
        <button
          onClick={handleAddPhones}
          disabled={!phoneInput.trim()}
          className="w-full mt-2 h-9 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Numbers
        </button>
      </div>

      {/* File Upload & Load from CRM */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-16 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer"
        >
          <DocumentArrowUpIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">Upload Excel or CSV</span>
        </button>

        {/* Load from CRM Button */}
        {loadLeadsFromCRM && (
          <button
            onClick={loadLeadsFromCRM}
            disabled={loadingLeads}
            className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all"
          >
            {loadingLeads ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Loading Leads...
              </>
            ) : (
              <>
                <UserGroupIcon className="w-4 h-4" />
                Load from CRM
              </>
            )}
          </button>
        )}
      </div>

      {/* Recipients List */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-medium">CONTACTS</span>
          {recipients.length > 0 && (
            <button
              onClick={clearAllRecipients}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1.5">
          {recipients.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <UserGroupIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No contacts added yet</p>
            </div>
          ) : (
            recipients.map((recipient) => {
              const statusConfig = STATUS_CONFIG[recipient.status];
              return (
                <div
                  key={recipient.id}
                  className={`flex flex-col gap-1 p-2.5 rounded-lg group ${
                    recipient.status === 'failed' ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {recipient.phone}
                      </p>
                      {recipient.name && (
                        <p className="text-xs text-gray-500 truncate">{recipient.name}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                    {recipient.status === 'pending' && (
                      <button
                        onClick={() => removeRecipient(recipient.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {recipient.status === 'failed' && recipient.error && (
                    <p className="text-xs text-red-600 pl-1">{recipient.error}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  </div>
);

// Campaign Name Input
interface CampaignNameInputProps {
  campaignName: string;
  setCampaignName: (name: string) => void;
}

export const CampaignNameInput: React.FC<CampaignNameInputProps> = ({
  campaignName,
  setCampaignName,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Campaign Name <span className="text-gray-400 font-normal">(optional)</span>
    </label>
    <input
      type="text"
      value={campaignName}
      onChange={(e) => setCampaignName(e.target.value)}
      placeholder="e.g., March Admission Campaign"
      className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
    />
  </div>
);

// Message Mode Selector
interface MessageModeSelectorProps {
  messageMode: MessageMode;
  setMessageMode: (mode: MessageMode) => void;
  onLoadTemplates: () => void;
  loadingTemplates: boolean;
}

export const MessageModeSelector: React.FC<MessageModeSelectorProps> = ({
  messageMode,
  setMessageMode,
  onLoadTemplates,
  loadingTemplates,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <label className="block text-sm font-medium text-gray-700 mb-3">Message Type</label>
    <div className="flex gap-3">
      <button
        onClick={() => setMessageMode('freeform')}
        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
          messageMode === 'freeform'
            ? 'border-green-500 bg-green-50 text-green-700'
            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
        }`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="text-sm font-medium">Free-form Message</span>
        <span className="text-xs opacity-75">Only within 24hr window</span>
      </button>
      <button
        onClick={() => {
          setMessageMode('template');
          onLoadTemplates();
        }}
        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
          messageMode === 'template'
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
        }`}
      >
        {loadingTemplates ? (
          <ArrowPathIcon className="w-6 h-6 animate-spin" />
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        <span className="text-sm font-medium">Template Message</span>
        <span className="text-xs opacity-75">Anytime (Recommended)</span>
      </button>
    </div>
    {messageMode === 'freeform' && (
      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-700">
          <strong>Note:</strong> Free-form messages can only be sent within 24 hours of customer's last reply.
          Use templates for contacts who haven't messaged recently.
        </p>
      </div>
    )}
  </div>
);

// Template Selector
interface TemplateSelectorProps {
  templates: WhatsAppTemplate[];
  selectedTemplate: WhatsAppTemplate | null;
  setSelectedTemplate: (template: WhatsAppTemplate | null) => void;
  templateParams: string[];
  setTemplateParams: (params: string[]) => void;
  loadingTemplates: boolean;
  templateError: string | null;
}

// Helper to extract template parameters from component text
const extractTemplateVariables = (template: WhatsAppTemplate): number => {
  let count = 0;
  template.components.forEach((component) => {
    if (component.text) {
      const matches = component.text.match(/\{\{\d+\}\}/g);
      if (matches) {
        count = Math.max(count, ...matches.map(m => parseInt(m.replace(/[{}]/g, ''))));
      }
    }
  });
  return count;
};

// Helper to get template preview text
const getTemplatePreview = (template: WhatsAppTemplate): string => {
  const bodyComponent = template.components.find(c => c.type === 'BODY');
  return bodyComponent?.text || 'No preview available';
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  templateParams,
  setTemplateParams,
  loadingTemplates,
  templateError,
}) => {
  const paramCount = selectedTemplate ? extractTemplateVariables(selectedTemplate) : 0;

  // Initialize params array when template changes
  React.useEffect(() => {
    if (selectedTemplate) {
      const count = extractTemplateVariables(selectedTemplate);
      if (templateParams.length !== count) {
        setTemplateParams(Array(count).fill(''));
      }
    }
  }, [selectedTemplate]);

  if (loadingTemplates) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-500">Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>

      {templateError ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 font-medium">Failed to load templates</p>
              <p className="text-xs text-red-600 mt-1">{templateError}</p>
              {templateError.includes('Settings') && (
                <a
                  href="/settings/whatsapp"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-red-700 hover:text-red-800 font-medium underline"
                >
                  Go to WhatsApp Settings
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <DocumentIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No approved templates found</p>
          <p className="text-xs mt-1">Create templates in Meta Business Suite</p>
        </div>
      ) : (
        <>
          <select
            value={selectedTemplate?.name || ''}
            onChange={(e) => {
              const template = templates.find(t => t.name === e.target.value) || null;
              setSelectedTemplate(template);
            }}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.name}>
                {template.name} ({template.language})
              </option>
            ))}
          </select>

          {selectedTemplate && (
            <div className="mt-4 space-y-4">
              {/* Template Preview */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 font-medium mb-2">PREVIEW</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {getTemplatePreview(selectedTemplate)}
                </p>
              </div>

              {/* Template Parameters */}
              {paramCount > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">
                    TEMPLATE VARIABLES ({paramCount})
                  </p>
                  <div className="space-y-2">
                    {Array.from({ length: paramCount }, (_, i) => (
                      <div key={i}>
                        <label className="block text-xs text-gray-500 mb-1">
                          Variable {`{{${i + 1}}}`}
                          <span className="text-gray-400 ml-2">(use {'{name}'} for recipient name)</span>
                        </label>
                        <input
                          type="text"
                          value={templateParams[i] || ''}
                          onChange={(e) => {
                            const newParams = [...templateParams];
                            newParams[i] = e.target.value;
                            setTemplateParams(newParams);
                          }}
                          placeholder={`Value for {{${i + 1}}}`}
                          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Message Composer
interface MessageComposerProps {
  message: string;
  setMessage: (message: string) => void;
  addNamePlaceholder: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  message,
  setMessage,
  addNamePlaceholder,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
    <textarea
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      placeholder="Type your message here...&#10;&#10;Use {name} for personalization"
      className="w-full px-3 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
      rows={6}
    />
    <div className="flex items-center justify-between mt-2">
      <span className="text-xs text-gray-400">{message.length} characters</span>
      <button
        onClick={addNamePlaceholder}
        className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium"
      >
        + Add Name
      </button>
    </div>
  </div>
);

// Media Attachments
interface MediaAttachmentsProps {
  mediaFiles: MediaFile[];
  imageInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  audioInputRef: React.RefObject<HTMLInputElement>;
  docInputRef: React.RefObject<HTMLInputElement>;
  handleMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeMedia: (index: number) => void;
}

const getMediaIcon = (type: MediaType) => {
  switch (type) {
    case 'image':
      return <PhotoIcon className="w-5 h-5" />;
    case 'video':
      return <VideoCameraIcon className="w-5 h-5" />;
    case 'audio':
      return <MusicalNoteIcon className="w-5 h-5" />;
    default:
      return <DocumentIcon className="w-5 h-5" />;
  }
};

export const MediaAttachments: React.FC<MediaAttachmentsProps> = ({
  mediaFiles,
  imageInputRef,
  videoInputRef,
  audioInputRef,
  docInputRef,
  handleMediaUpload,
  removeMedia,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <label className="block text-sm font-medium text-gray-700 mb-3">
      Media Attachments <span className="text-gray-400 font-normal">(optional)</span>
    </label>

    {/* Hidden file inputs */}
    <input
      ref={imageInputRef}
      type="file"
      accept="image/*"
      multiple
      onChange={handleMediaUpload}
      className="hidden"
    />
    <input
      ref={videoInputRef}
      type="file"
      accept="video/*"
      multiple
      onChange={handleMediaUpload}
      className="hidden"
    />
    <input
      ref={audioInputRef}
      type="file"
      accept="audio/*"
      multiple
      onChange={handleMediaUpload}
      className="hidden"
    />
    <input
      ref={docInputRef}
      type="file"
      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
      multiple
      onChange={handleMediaUpload}
      className="hidden"
    />

    {/* Media Upload Buttons */}
    <div className="flex flex-wrap gap-2 mb-4">
      {(['image', 'video', 'audio', 'document'] as MediaType[]).map((type) => {
        const config = MEDIA_TYPE_CONFIG[type];
        const ref =
          type === 'image'
            ? imageInputRef
            : type === 'video'
            ? videoInputRef
            : type === 'audio'
            ? audioInputRef
            : docInputRef;
        return (
          <button
            key={type}
            type="button"
            onClick={() => ref.current?.click()}
            className={`flex items-center gap-2 px-3 py-2 ${config.bgColor} ${config.textColor} rounded-lg text-sm font-medium hover:opacity-80 transition-colors`}
          >
            <config.icon className="w-4 h-4" />
            {config.label}
          </button>
        );
      })}
    </div>

    {/* Uploaded Media Preview */}
    {mediaFiles.length > 0 ? (
      <div className="space-y-2">
        <div className="text-xs text-gray-500 font-medium">
          ATTACHED FILES ({mediaFiles.length})
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mediaFiles.map((media, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group"
            >
              {media.type === 'image' && media.preview ? (
                <img
                  src={media.preview}
                  alt={media.name}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              ) : media.type === 'video' && media.preview ? (
                <video src={media.preview} className="w-12 h-12 object-cover rounded-lg" />
              ) : (
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    media.type === 'audio'
                      ? 'bg-amber-100 text-amber-600'
                      : media.type === 'video'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {getMediaIcon(media.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{media.name}</p>
                <p className="text-xs text-gray-500">
                  {media.type.charAt(0).toUpperCase() + media.type.slice(1)} •{' '}
                  {formatFileSize(media.file.size)}
                </p>
              </div>
              <button
                onClick={() => removeMedia(index)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-sm">No media attached</p>
        <p className="text-xs mt-1">Click buttons above to add images, videos, audio, or documents</p>
      </div>
    )}
  </div>
);

// Progress Panel
interface ProgressPanelProps {
  sending: boolean;
  stats: RecipientStats;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({ sending, stats }) => {
  if (!sending && stats.sent === 0 && stats.failed === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Sending Progress</h3>
        {sending && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
            Processing...
          </span>
        )}
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${stats.total > 0 ? ((stats.sent + stats.failed) / stats.total) * 100 : 0}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-xl font-bold text-slate-700">{stats.total}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xl font-bold text-blue-600">{stats.sent}</p>
          <p className="text-xs text-blue-500">Sent</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <p className="text-xl font-bold text-emerald-600">{stats.delivered}</p>
          <p className="text-xs text-emerald-500">Delivered</p>
        </div>
        <div className="text-center p-3 bg-violet-50 rounded-lg">
          <p className="text-xl font-bold text-violet-600">{stats.read}</p>
          <p className="text-xs text-violet-500">Read</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-xl font-bold text-red-600">{stats.failed}</p>
          <p className="text-xs text-red-500">Failed</p>
        </div>
      </div>
    </div>
  );
};

// Help Section
export const HelpSection: React.FC = () => (
  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
    <DocumentIcon className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
    <div className="text-xs text-slate-600">
      <p className="font-medium text-slate-700 mb-1">Tips</p>
      <p>
        • Upload Excel (.xlsx) or CSV with columns:{' '}
        <span className="font-mono bg-white px-1 rounded">Phone, Name</span>
      </p>
      <p className="mt-1">• Phone numbers are automatically formatted with +91 country code</p>
      <p className="mt-1">• You can attach multiple images, videos, audio files, or documents</p>
      <p className="mt-1">• All media will be sent along with your message to each recipient</p>
    </div>
  </div>
);
