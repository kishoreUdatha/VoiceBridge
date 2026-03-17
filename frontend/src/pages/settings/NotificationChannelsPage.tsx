/**
 * Notification Channels Page
 * Configure webhook notifications for Slack, Teams, Discord, and custom endpoints
 */

import { useNotificationChannels } from './hooks';
import {
  Toast,
  PageHeader,
  StatsOverview,
  LoadingState,
  EmptyState,
  ChannelList,
  AddChannelModal,
  AnimationStyles,
} from './components';

const NotificationChannelsPage: React.FC = () => {
  const {
    channels,
    loading,
    toast,
    testingChannel,
    showModal,
    modalStep,
    formData,
    handleCreate,
    handleDelete,
    handleToggle,
    handleTest,
    openModal,
    closeModal,
    selectPlatform,
    openModalWithPlatform,
    toggleEvent,
    updateFormField,
    clearToast,
    goBackToSelectStep,
  } = useNotificationChannels();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Toast toast={toast} onClose={clearToast} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader onAddChannel={openModal} />

        {channels.length > 0 && <StatsOverview channels={channels} />}

        {loading && channels.length === 0 ? (
          <LoadingState />
        ) : channels.length === 0 ? (
          <EmptyState
            onOpenModal={openModal}
            onSelectPlatform={openModalWithPlatform}
          />
        ) : (
          <ChannelList
            channels={channels}
            testingChannel={testingChannel}
            onTest={handleTest}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
      </div>

      <AddChannelModal
        showModal={showModal}
        modalStep={modalStep}
        formData={formData}
        loading={loading}
        onClose={closeModal}
        onSelectPlatform={selectPlatform}
        onGoBack={goBackToSelectStep}
        onToggleEvent={toggleEvent}
        onUpdateField={updateFormField}
        onCreate={handleCreate}
      />

      <AnimationStyles />
    </div>
  );
};

export default NotificationChannelsPage;
