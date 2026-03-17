/**
 * Manual Call Queue Page
 * Interface for manually dialing contacts from a campaign queue
 */

import React from 'react';
import { useManualCallQueue } from './hooks';
import {
  LoadingState,
  ErrorBanner,
  Header,
  ContactList,
  ContactDetailsPanel,
  ScheduleModal,
} from './components';

export const ManualCallQueuePage: React.FC = () => {
  const {
    campaign,
    contacts,
    stats,
    loading,
    error,
    selectedContact,
    setSelectedContact,
    callingContact,
    showScheduleModal,
    scheduleData,
    setScheduleData,
    openScheduleModal,
    closeScheduleModal,
    filter,
    setFilter,
    fetchQueue,
    handleCall,
    handleSkip,
    handleSchedule,
    handleDNC,
    handleStartCampaign,
    navigateBack,
    navigateToLead,
    clearError,
  } = useManualCallQueue();

  if (loading && !campaign) {
    return <LoadingState />;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <Header
        campaign={campaign}
        stats={stats}
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={fetchQueue}
        onStartCampaign={handleStartCampaign}
        onBack={navigateBack}
      />

      {/* Error */}
      {error && <ErrorBanner error={error} onClear={clearError} />}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List */}
        <ContactList
          contacts={contacts}
          selectedContact={selectedContact}
          callingContact={callingContact}
          onSelectContact={setSelectedContact}
          onCall={handleCall}
        />

        {/* Contact Details Panel */}
        <ContactDetailsPanel
          contact={selectedContact}
          callingContact={callingContact}
          onCall={handleCall}
          onSchedule={openScheduleModal}
          onSkip={handleSkip}
          onDNC={handleDNC}
          onNavigateToLead={navigateToLead}
        />
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          scheduleData={scheduleData}
          onUpdate={setScheduleData}
          onSubmit={handleSchedule}
          onClose={closeScheduleModal}
        />
      )}
    </div>
  );
};

export default ManualCallQueuePage;
