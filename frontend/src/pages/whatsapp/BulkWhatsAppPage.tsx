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
  } = useBulkWhatsApp();

  if (whatsappConfigured === null) {
    return <LoadingState />;
  }

  if (whatsappConfigured === false) {
    return <NotConfiguredState />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader />

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Recipients */}
        <div className="col-span-4">
          <RecipientsPanel
            recipients={recipients}
            phoneInput={phoneInput}
            setPhoneInput={setPhoneInput}
            handleAddPhones={handleAddPhones}
            handleFileUpload={handleFileUpload}
            removeRecipient={removeRecipient}
            clearAllRecipients={clearAllRecipients}
            fileInputRef={fileInputRef}
          />
        </div>

        {/* Right: Message Composer */}
        <div className="col-span-8 space-y-4">
          <CampaignNameInput
            campaignName={campaignName}
            setCampaignName={setCampaignName}
          />

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

          <ProgressPanel sending={sending} stats={stats} />

          {/* Send Button */}
          <button
            onClick={handleSendBulk}
            disabled={sending || (!message.trim() && mediaFiles.length === 0) || recipients.length === 0}
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
                Send to {recipients.length} Recipients
                {mediaFiles.length > 0 && (
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
