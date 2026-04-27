/**
 * Bulk WhatsApp Page
 * Send messages to multiple contacts via WhatsApp
 */

import {
  PaperAirplaneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useBulkWhatsApp } from './hooks';
import {
  LoadingState,
  NotConfiguredState,
  PageHeader,
  RecipientsPanel,
  CampaignNameInput,
  MessageModeSelector,
  TemplateSelector,
  MessageComposer,
  MediaAttachments,
  ProgressPanel,
  HelpSection,
} from './components';

export default function BulkWhatsAppPage() {
  const {
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
  } = useBulkWhatsApp();

  if (whatsappConfigured === null) {
    return <LoadingState />;
  }

  if (whatsappConfigured === false) {
    return <NotConfiguredState />;
  }

  return (
    <div className="p-4">
      <PageHeader />

      <div className="grid grid-cols-12 gap-4">
        {/* Left: Recipients */}
        <div className="col-span-5">
          <RecipientsPanel
            recipients={recipients}
            phoneInput={phoneInput}
            setPhoneInput={setPhoneInput}
            handleAddPhones={handleAddPhones}
            handleFileUpload={handleFileUpload}
            removeRecipient={removeRecipient}
            clearAllRecipients={clearAllRecipients}
            fileInputRef={fileInputRef}
            loadLeadsFromCRM={() => loadLeadsFromCRM()}
            loadingLeads={loadingLeads}
          />
        </div>

        {/* Right: Message Composer */}
        <div className="col-span-7 space-y-4">
          <CampaignNameInput
            campaignName={campaignName}
            setCampaignName={setCampaignName}
          />

          {/* Message Mode Selector */}
          <MessageModeSelector
            messageMode={messageMode}
            setMessageMode={setMessageMode}
            onLoadTemplates={fetchTemplates}
            loadingTemplates={loadingTemplates}
          />

          {/* Template Selector (for template mode) */}
          {messageMode === 'template' && (
            <TemplateSelector
              templates={templates}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              templateParams={templateParams}
              setTemplateParams={setTemplateParams}
              loadingTemplates={loadingTemplates}
              templateError={templateError}
            />
          )}

          {/* Message Composer (for freeform mode) */}
          {messageMode === 'freeform' && (
            <>
              <MessageComposer
                message={message}
                setMessage={setMessage}
                addNamePlaceholder={addNamePlaceholder}
              />

              <MediaAttachments
                mediaFiles={mediaFiles}
                imageInputRef={imageInputRef}
                videoInputRef={videoInputRef}
                audioInputRef={audioInputRef}
                docInputRef={docInputRef}
                handleMediaUpload={handleMediaUpload}
                removeMedia={removeMedia}
              />
            </>
          )}

          <ProgressPanel sending={sending} stats={stats} />

          {/* Send Button */}
          <button
            onClick={handleSendBulk}
            disabled={
              sending ||
              recipients.length === 0 ||
              (messageMode === 'freeform' && !message.trim() && mediaFiles.length === 0) ||
              (messageMode === 'template' && !selectedTemplate)
            }
            className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {sending ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Sending {progress.sent} of {progress.total}...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-5 h-5" />
                Send {messageMode === 'template' ? 'Template' : ''} to {recipients.length} Recipients
                {messageMode === 'freeform' && mediaFiles.length > 0 && (
                  <span className="ml-1 text-green-200">
                    ({mediaFiles.length} {mediaFiles.length === 1 ? 'file' : 'files'})
                  </span>
                )}
              </>
            )}
          </button>

          <HelpSection />
        </div>
      </div>
    </div>
  );
}
