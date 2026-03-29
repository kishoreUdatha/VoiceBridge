/**
 * Call Summary Page
 * Runo AI-style comprehensive call summary with three-column layout
 */

import React from 'react';
import { useCallSummary } from './hooks';
import {
  CallSummaryLoading,
  CallSummaryError,
  BreadcrumbHeader,
  CallQualityGauge,
  SentimentAnalysis,
  SpeakingTime,
  SpeakerLoudness,
  ContactCard,
  CallSummaryText,
  KeyQuestions,
  KeyIssues,
  AICoaching,
  ExtractedDataCard,
  LeadJourneyCard,
  AudioPlayer,
  TranscriptHeader,
  TranscriptMessages,
} from './components';

export const CallSummaryPage: React.FC = () => {
  const {
    call,
    loading,
    error,
    audioRef,
    isPlaying,
    currentTime,
    audioDuration,
    togglePlayback,
    seekTo,
    transcriptFilter,
    filteredTranscript,
    setSearchQuery,
    setSpeakerFilter,
    highlightedMessageIndex,
    showEvidencesOnly,
    toggleEvidences,
    expandedSections,
    toggleSection,
    goBack,
  } = useCallSummary();

  if (loading) {
    return <CallSummaryLoading />;
  }

  if (error || !call) {
    return <CallSummaryError error={error} onBack={goBack} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="p-0">
        {/* Breadcrumb */}
        <BreadcrumbHeader
          contactName={call.contact?.name || 'Unknown'}
          onBack={goBack}
        />

        {/* Three Column Layout */}
        <div className="flex flex-col lg:flex-row">

          {/* Left Panel - Analytics */}
          <div className="w-full lg:w-[20%] space-y-1 p-2 border-r border-gray-200">
            <CallQualityGauge score={call.callQualityScore} />

            <SentimentAnalysis
              agentSentiment={call.sentiment}
              customerSentiment={call.sentiment}
            />

            <SpeakingTime
              agentTime={call.agentSpeakingTime}
              customerTime={call.customerSpeakingTime}
              nonSpeechTime={call.nonSpeechTime}
            />

            <SpeakerLoudness />
          </div>

          {/* Center Panel - Main Content */}
          <div className="w-full lg:w-[50%] space-y-2 p-2 border-r border-gray-200">
            <ContactCard
              contact={call.contact}
              phoneNumber={call.phoneNumber}
              direction={call.direction}
              duration={call.duration}
              agentName={call.agent?.name || 'Agent'}
              createdAt={call.createdAt}
            />

            {/* Lead Journey - Previous calls timeline */}
            <LeadJourneyCard
              leadJourney={call.leadJourney}
              currentCallNumber={call.currentCallNumber}
              isExpanded={expandedSections.leadJourney}
              onToggle={() => toggleSection('leadJourney')}
              onViewCall={(callId) => window.open(`/outbound-calls/calls/${callId}/summary`, '_blank')}
            />

            {/* Captured Information from Call */}
            <ExtractedDataCard
              extractedData={call.extractedData}
              isExpanded={expandedSections.extractedData}
              onToggle={() => toggleSection('extractedData')}
            />

            <CallSummaryText
              summary={call.summary}
              isExpanded={expandedSections.summary}
              onToggle={() => toggleSection('summary')}
            />

            <KeyQuestions
              questions={call.keyQuestionsAsked}
              isExpanded={expandedSections.questions}
              onToggle={() => toggleSection('questions')}
            />

            <KeyIssues
              issues={call.keyIssuesDiscussed}
              isExpanded={expandedSections.issues}
              onToggle={() => toggleSection('issues')}
            />

            {/* AI Coaching Suggestions */}
            <AICoaching
              coaching={call.coaching}
              isExpanded={expandedSections.coaching}
              onToggle={() => toggleSection('coaching')}
            />

            {/* Audio Player at bottom */}
            <AudioPlayer
              recordingUrl={call.recordingUrl}
              audioRef={audioRef}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={audioDuration || call.duration}
              onTogglePlayback={togglePlayback}
              onSeek={seekTo}
            />
          </div>

          {/* Right Panel - Transcript */}
          <div className="w-full lg:w-[30%] p-2">
            <div className="sticky top-4">
              <TranscriptHeader
                filter={transcriptFilter}
                onSearchChange={setSearchQuery}
                onFilterChange={setSpeakerFilter}
                showEvidences={showEvidencesOnly}
                onEvidencesClick={toggleEvidences}
              />
              <TranscriptMessages
                messages={filteredTranscript}
                highlightedIndex={highlightedMessageIndex}
                searchQuery={transcriptFilter.searchQuery}
                agentName={call.agent?.name || 'Agent'}
                customerName={call.contact?.name || 'Customer'}
                onTimestampClick={seekTo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallSummaryPage;
