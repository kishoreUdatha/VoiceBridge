/**
 * Call Summary UI Components
 * Runo AI-style call summary page components
 */

import React, { RefObject, useState } from 'react';
import {
  EnhancedCallDetails,
  EnhancedTranscriptMessage,
  TranscriptFilter,
  CoachingSuggestions,
  ExtractedCallData,
  LeadJourneyCall,
} from '../call-summary.types';
import {
  getQualityScoreColor,
  getQualityScoreLabel,
  formatDuration,
  formatDateTime,
} from '../call-summary.constants';

// =====================
// Loading & Error States
// =====================

export const CallSummaryLoading: React.FC = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

interface CallSummaryErrorProps {
  error: string | null;
  onBack: () => void;
}

export const CallSummaryError: React.FC<CallSummaryErrorProps> = ({ error, onBack }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
    <div className="text-red-600 text-sm font-medium mb-1">Error Loading Call Summary</div>
    <p className="text-red-500 text-xs mb-3">{error || 'Something went wrong'}</p>
    <button
      onClick={onBack}
      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
    >
      Go Back
    </button>
  </div>
);

// =====================
// Breadcrumb Header
// =====================

interface BreadcrumbHeaderProps {
  contactName: string;
  onBack: () => void;
}

export const BreadcrumbHeader: React.FC<BreadcrumbHeaderProps> = ({ contactName, onBack }) => (
  <div className="mb-4">
    <button onClick={onBack} className="flex items-center text-xs text-blue-600 hover:text-blue-800">
      <span>Call Logs</span>
      <svg className="w-3 h-3 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="text-gray-700">{contactName}</span>
    </button>
  </div>
);

// =====================
// Call Quality Score (Semi-circle gauge)
// =====================

interface CallQualityGaugeProps {
  score: number;
}

export const CallQualityGauge: React.FC<CallQualityGaugeProps> = ({ score }) => {
  const color = getQualityScoreColor(score);
  const label = getQualityScoreLabel(score);

  // Semi-circle arc parameters
  const radius = 50;
  const circumference = Math.PI * radius; // Half circle
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="bg-white rounded-lg p-3 ">
      <div className="flex items-center gap-1 mb-3">
        <h3 className="text-xs font-medium text-gray-600">Call Quality Score</h3>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex flex-col items-center">
        <svg width="140" height="80" viewBox="0 0 140 80">
          {/* Background arc */}
          <path
            d="M 20 70 A 50 50 0 0 1 120 70"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 20 70 A 50 50 0 0 1 120 70"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          {/* Small dot at end of progress */}
          <circle
            cx="120"
            cy="70"
            r="4"
            fill={color}
          />
        </svg>
        <div className="text-center -mt-2">
          <span className="text-3xl font-bold text-gray-800">{score.toFixed(2)}</span>
          <div className="text-sm font-medium text-gray-500 mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
};

// =====================
// Sentiment Analysis (Agent & Customer emojis)
// =====================

interface SentimentAnalysisProps {
  agentSentiment: string;
  customerSentiment: string;
}

export const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ agentSentiment, customerSentiment }) => {
  const getEmoji = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  return (
    <div className="bg-white rounded-lg p-3 ">
      <h3 className="text-xs font-medium text-gray-600 mb-3">Sentiment Analysis</h3>
      <div className="flex justify-around">
        <div className="text-center">
          <div className="text-2xl mb-1">{getEmoji(agentSentiment)}</div>
          <div className="text-[10px] text-gray-500">Agent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-1">{getEmoji(customerSentiment)}</div>
          <div className="text-[10px] text-gray-500">Customer</div>
        </div>
      </div>
    </div>
  );
};

// =====================
// Speaking Time (Side by side)
// =====================

interface SpeakingTimeProps {
  agentTime: number;
  customerTime: number;
  nonSpeechTime: number;
}

export const SpeakingTime: React.FC<SpeakingTimeProps> = ({ agentTime, customerTime, nonSpeechTime }) => {
  const total = agentTime + customerTime;
  const agentPercent = total > 0 ? ((agentTime / total) * 100).toFixed(1) : '0';
  const customerPercent = total > 0 ? ((customerTime / total) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-lg p-3 ">
      <div className="flex items-center gap-1 mb-3">
        <h3 className="text-xs font-medium text-gray-600">Speaking Time</h3>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <div className="flex justify-between mb-3">
        <div>
          <div className="text-xl font-bold text-blue-500">{agentPercent} %</div>
          <div className="text-[10px] text-gray-500">Agent</div>
          <div className="text-[10px] text-gray-400">{formatDuration(agentTime)}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-500">{customerPercent} %</div>
          <div className="text-[10px] text-gray-500">Customer</div>
          <div className="text-[10px] text-gray-400">{formatDuration(customerTime)}</div>
        </div>
      </div>

      {/* Combined progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full flex overflow-hidden">
        <div className="bg-blue-500 h-full" style={{ width: `${agentPercent}%` }} />
        <div className="bg-green-500 h-full" style={{ width: `${customerPercent}%` }} />
      </div>

      {/* Non Speech Time */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-600">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Non Speech Time ({formatDuration(nonSpeechTime)})
        </div>
      </div>
    </div>
  );
};

// =====================
// Speaker Loudness
// =====================

interface SpeakerLoudnessProps {
  agentLoudness?: number;
  customerLoudness?: number;
}

export const SpeakerLoudness: React.FC<SpeakerLoudnessProps> = ({
  agentLoudness = -26.02,
  customerLoudness = -28.48
}) => {
  const getLoudnessLabel = (db: number) => {
    if (db > -20) return 'Loud Speech';
    if (db > -30) return 'Normal Speech';
    return 'Quiet Speech';
  };

  const getLoudnessBars = (db: number) => {
    const normalized = Math.min(100, Math.max(0, (db + 50) * 2));
    const bars = Math.ceil(normalized / 25);
    return Array(4).fill(0).map((_, i) => i < bars);
  };

  return (
    <div className="bg-white rounded-lg p-3 ">
      <div className="flex items-center gap-1 mb-3">
        <h3 className="text-xs font-medium text-gray-600">Avg. Speaker Loudness</h3>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Agent */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-500 mb-1">Agent:</div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{getLoudnessLabel(agentLoudness)}</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">{agentLoudness.toFixed(2)} dB</span>
            <div className="flex gap-0.5">
              {getLoudnessBars(agentLoudness).map((active, i) => (
                <div key={i} className={`w-1 h-2 rounded-sm ${active ? 'bg-green-500' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer */}
      <div>
        <div className="text-[10px] text-gray-500 mb-1">Customer:</div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{getLoudnessLabel(customerLoudness)}</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">{customerLoudness.toFixed(2)} dB</span>
            <div className="flex gap-0.5">
              {getLoudnessBars(customerLoudness).map((active, i) => (
                <div key={i} className={`w-1 h-2 rounded-sm ${active ? 'bg-green-500' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================
// Contact Card (with call button)
// =====================

interface ContactCardProps {
  contact: EnhancedCallDetails['contact'];
  phoneNumber: string;
  direction: string;
  duration: number;
  agentName: string;
  createdAt: string;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  phoneNumber,
  direction,
  duration,
  agentName,
  createdAt
}) => {
  const initials = contact?.name?.charAt(0)?.toUpperCase() || 'U';

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH': return 'bg-red-100 text-red-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getSourceColor = (source: string | null | undefined) => {
    switch (source?.toUpperCase()) {
      case 'WEBSITE': return 'bg-purple-100 text-purple-700';
      case 'REFERRAL': return 'bg-blue-100 text-blue-700';
      case 'SOCIAL_MEDIA': return 'bg-pink-100 text-pink-700';
      case 'ADVERTISEMENT': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg p-3 ">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
            {initials}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{contact?.name || 'Unknown'}</h3>
              {contact?.leadId && (
                <a href={`/leads/${contact.leadId}`} className="text-[10px] text-blue-500 hover:underline">
                  View Lead
                </a>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {phoneNumber}
              {contact?.alternatePhone && (
                <span className="text-gray-400 ml-1">| Alt: {contact.alternatePhone}</span>
              )}
            </div>
            {contact?.email && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {contact.email}
              </div>
            )}
            {/* Location */}
            {(contact?.city || contact?.state || contact?.country) && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Call button */}
        <button className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
      </div>

      {/* Metadata tags */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 ${
          direction === 'OUTBOUND' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
        }`}>
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
              direction === 'OUTBOUND'
                ? "M5 10l7-7m0 0l7 7m-7-7v18"
                : "M19 14l-7 7m0 0l-7-7m7 7V3"
            } />
          </svg>
          {direction === 'OUTBOUND' ? 'Outgoing' : 'Incoming'}
        </span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDuration(duration)}
        </span>
        <span className="text-[10px] text-gray-500 flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px] font-medium">
            {agentName?.charAt(0) || 'A'}
          </div>
          {agentName || 'Agent'}
        </span>
        <span className="text-[10px] text-gray-400">{formatDateTime(createdAt)}</span>
      </div>

      {/* Lead Details Row */}
      {(contact?.source || contact?.priority || contact?.stage) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {contact?.priority && (
            <span className={`text-[10px] px-2 py-0.5 rounded ${getPriorityColor(contact.priority)}`}>
              {contact.priority} Priority
            </span>
          )}
          {contact?.source && (
            <span className={`text-[10px] px-2 py-0.5 rounded ${getSourceColor(contact.source)}`}>
              {contact.source.replace(/_/g, ' ')}
            </span>
          )}
          {contact?.stage && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
              {contact.stage}{contact.subStage ? ` - ${contact.subStage}` : ''}
            </span>
          )}
        </div>
      )}

    </div>
  );
};

// =====================
// Call Summary Text
// =====================

interface CallSummaryTextProps {
  summary: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export const CallSummaryText: React.FC<CallSummaryTextProps> = ({ summary, isExpanded, onToggle }) => (
  <div className="bg-white rounded-lg p-3 ">
    <div className="flex items-center gap-2 mb-2">
      <h3 className="text-sm font-medium text-gray-800">Call Summary</h3>
      <svg className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </div>
    <p className={`text-xs text-gray-600 leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
      {summary || 'No summary available for this call.'}
    </p>
    {summary && summary.length > 150 && (
      <button onClick={onToggle} className="text-xs text-blue-500 hover:text-blue-700 mt-1">
        {isExpanded ? 'Show Less' : 'Show More'}
      </button>
    )}
  </div>
);

// =====================
// Key Questions
// =====================

interface KeyQuestionsProps {
  questions: string[];
  isExpanded: boolean;
  onToggle: () => void;
}

export const KeyQuestions: React.FC<KeyQuestionsProps> = ({ questions, isExpanded, onToggle }) => (
  <div className="bg-white rounded-lg  overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
    >
      <span className="text-sm font-medium text-gray-800">Key questions</span>
      <svg
        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isExpanded && (
      <div className="px-4 pb-3">
        {questions?.length > 0 ? (
          <ol className="space-y-1.5">
            {questions.map((q, idx) => (
              <li key={idx} className="text-xs text-gray-600 flex">
                <span className="text-gray-400 mr-2">{idx + 1}.</span>
                {q}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-gray-400">No key questions identified</p>
        )}
      </div>
    )}
  </div>
);

// =====================
// Key Issues
// =====================

interface KeyIssuesProps {
  issues: string[];
  isExpanded: boolean;
  onToggle: () => void;
}

export const KeyIssues: React.FC<KeyIssuesProps> = ({ issues, isExpanded, onToggle }) => (
  <div className="bg-white rounded-lg  overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
    >
      <span className="text-sm font-medium text-gray-800">Key issues discussed</span>
      <svg
        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isExpanded && (
      <div className="px-4 pb-3">
        {issues?.length > 0 ? (
          <ol className="space-y-1.5">
            {issues.map((issue, idx) => (
              <li key={idx} className="text-xs text-gray-600 flex">
                <span className="text-gray-400 mr-2">{idx + 1}.</span>
                {issue}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-gray-400">No key issues identified</p>
        )}
      </div>
    )}
  </div>
);

// =====================
// Audio Player (Bottom bar style)
// =====================

interface AudioPlayerProps {
  recordingUrl: string | null;
  audioRef: RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlayback: () => void;
  onSeek: (time: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  recordingUrl,
  audioRef,
  isPlaying,
  currentTime,
  duration,
  onTogglePlayback,
  onSeek,
}) => {
  if (!recordingUrl) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 text-center">
        <span className="text-xs text-gray-400">No recording available</span>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <audio ref={audioRef} src={recordingUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        {/* Play button */}
        <button
          onClick={onTogglePlayback}
          className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 flex-shrink-0"
        >
          {isPlaying ? (
            <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1">
          <div
            className="h-1 bg-gray-600 rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              onSeek(percent * duration);
            }}
          >
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Time */}
        <span className="text-xs text-gray-400 min-w-[70px] text-center">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button className="p-1 text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <button className="p-1 text-gray-400 hover:text-white text-xs">1x</button>
          <a
            href={recordingUrl}
            download
            className="p-1 text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

// =====================
// Transcript Header
// =====================

interface TranscriptHeaderProps {
  filter: TranscriptFilter;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: 'all' | 'agent' | 'customer') => void;
  showEvidences?: boolean;
  onEvidencesClick?: () => void;
}

export const TranscriptHeader: React.FC<TranscriptHeaderProps> = ({
  filter,
  onSearchChange,
  onFilterChange,
  showEvidences = false,
  onEvidencesClick,
}) => (
  <div className="bg-white rounded-t-lg p-3">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-gray-800">Transcript</h3>
        <svg className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <button
        onClick={onEvidencesClick}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
          showEvidences
            ? 'bg-blue-500 text-white'
            : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
        }`}
      >
        Evidences
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    </div>

    <div className="flex gap-2">
      <select
        value={filter.speakerFilter}
        onChange={(e) => onFilterChange(e.target.value as any)}
        className="px-2 py-1.5 text-xs border border-gray-200 rounded bg-white"
      >
        <option value="all">All</option>
        <option value="agent">Agent</option>
        <option value="customer">Customer</option>
      </select>
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Type to Search..."
          value={filter.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded"
        />
        <svg className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  </div>
);

// =====================
// Transcript Messages
// =====================

interface TranscriptMessagesProps {
  messages: EnhancedTranscriptMessage[];
  highlightedIndex: number | null;
  searchQuery: string;
  agentName?: string;
  customerName?: string;
  onTimestampClick: (time: number) => void;
}

export const TranscriptMessages: React.FC<TranscriptMessagesProps> = ({
  messages,
  highlightedIndex,
  searchQuery,
  agentName = 'Agent',
  customerName = 'Customer',
  onTimestampClick,
}) => {
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, idx) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={idx} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
      ) : part
    );
  };

  const getSentimentBars = (sentiment: string) => {
    const isPositive = sentiment === 'positive';
    const isNegative = sentiment === 'negative';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-2 rounded-sm ${
              isPositive ? 'bg-green-400' : isNegative ? 'bg-red-400' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-b-lg max-h-[400px] overflow-y-auto">
      {messages.length > 0 ? (
        <div className="divide-y divide-gray-50">
          {messages.map((msg, idx) => {
            const isAgent = msg.role === 'assistant';
            const name = isAgent ? agentName : customerName;
            const isHighlighted = highlightedIndex === idx;

            return (
              <div
                key={idx}
                className={`px-3 py-2.5 ${isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start gap-2">
                  {/* Avatar with ring */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ring-2 ${
                    isAgent
                      ? 'bg-green-100 text-green-700 ring-green-400'
                      : 'bg-blue-100 text-blue-700 ring-blue-400'
                  }`}>
                    {isAgent ? 'A' : name.charAt(0)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800">{name}</span>
                        <button
                          onClick={() => onTimestampClick(msg.startTimeSeconds)}
                          className="text-[10px] text-blue-500 hover:text-blue-700"
                        >
                          {formatDuration(msg.startTimeSeconds)}
                        </button>
                      </div>
                      {getSentimentBars(msg.sentiment)}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {highlightText(msg.content, searchQuery)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-3 py-8 text-center text-xs text-gray-400">
          No transcript messages found
        </div>
      )}
    </div>
  );
};

// =====================
// AI Coaching Suggestions
// =====================

interface AICoachingProps {
  coaching?: CoachingSuggestions;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const AICoaching: React.FC<AICoachingProps> = ({ coaching, isExpanded = true, onToggle }) => {
  const [activeTab, setActiveTab] = useState<'feedback' | 'scores'>('feedback');

  if (!coaching) {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-xs text-gray-500 text-center">
          Coaching suggestions not available
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <span className="text-xs font-semibold text-gray-800">AI Coaching</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="px-2 pb-2">
          {/* Summary */}
          <div className="bg-blue-50 rounded p-2 mb-2">
            <p className="text-[11px] text-blue-800">{coaching.coachingSummary}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-2 py-1 text-[10px] rounded ${
                activeTab === 'feedback'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Feedback
            </button>
            <button
              onClick={() => setActiveTab('scores')}
              className={`px-2 py-1 text-[10px] rounded ${
                activeTab === 'scores'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Scores
            </button>
          </div>

          {activeTab === 'feedback' ? (
            <>
              {/* Positive Highlights */}
              {coaching.positiveHighlights.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-green-500 text-xs">✓</span>
                    <span className="text-[10px] font-semibold text-gray-700">What You Did Well</span>
                  </div>
                  <div className="space-y-1">
                    {coaching.positiveHighlights.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 pl-3">
                        <span className="text-green-500 text-[10px] mt-0.5">•</span>
                        <span className="text-[11px] text-gray-600">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas to Improve */}
              {coaching.areasToImprove.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-amber-500 text-xs">⚠</span>
                    <span className="text-[10px] font-semibold text-gray-700">Areas to Improve</span>
                  </div>
                  <div className="space-y-1.5">
                    {coaching.areasToImprove.map((item, idx) => (
                      <div key={idx} className="bg-amber-50 rounded p-1.5 ml-3">
                        <div className="text-[11px] text-amber-800 font-medium">{item.issue}</div>
                        <div className="text-[10px] text-amber-700 mt-0.5">
                          💡 {item.suggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Call Tips */}
              {coaching.nextCallTips.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-blue-500 text-xs">📞</span>
                    <span className="text-[10px] font-semibold text-gray-700">For Next Call</span>
                  </div>
                  <div className="space-y-1">
                    {coaching.nextCallTips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 pl-3">
                        <span className="text-blue-500 text-[10px] mt-0.5">→</span>
                        <span className="text-[11px] text-gray-600">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Talk-Listen Feedback */}
              {coaching.talkListenFeedback && (
                <div className="bg-gray-50 rounded p-1.5 mt-2">
                  <span className="text-[10px] text-gray-600">📊 {coaching.talkListenFeedback}</span>
                </div>
              )}
            </>
          ) : (
            /* Scores Tab */
            <div className="space-y-2">
              {/* Empathy Score */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-gray-600">Empathy</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getScoreColor(coaching.empathyScore)}`}>
                    {coaching.empathyScore}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreBarColor(coaching.empathyScore)} rounded-full transition-all`}
                    style={{ width: `${coaching.empathyScore}%` }}
                  />
                </div>
              </div>

              {/* Objection Handling Score */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-gray-600">Objection Handling</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getScoreColor(coaching.objectionHandlingScore)}`}>
                    {coaching.objectionHandlingScore}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreBarColor(coaching.objectionHandlingScore)} rounded-full transition-all`}
                    style={{ width: `${coaching.objectionHandlingScore}%` }}
                  />
                </div>
              </div>

              {/* Closing Score */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-gray-600">Closing Technique</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getScoreColor(coaching.closingScore)}`}>
                    {coaching.closingScore}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreBarColor(coaching.closingScore)} rounded-full transition-all`}
                    style={{ width: `${coaching.closingScore}%` }}
                  />
                </div>
              </div>

              {/* Average Score */}
              <div className="bg-gray-50 rounded p-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-gray-700">Overall Performance</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    getScoreColor(Math.round((coaching.empathyScore + coaching.objectionHandlingScore + coaching.closingScore) / 3))
                  }`}>
                    {Math.round((coaching.empathyScore + coaching.objectionHandlingScore + coaching.closingScore) / 3)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =====================
// Extracted Call Data (Captured Information)
// =====================

interface ExtractedDataCardProps {
  extractedData?: ExtractedCallData;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const ExtractedDataCard: React.FC<ExtractedDataCardProps> = ({
  extractedData,
  isExpanded = true,
  onToggle,
}) => {
  if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
    return null;
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'contact': return 'bg-blue-50 border-blue-200';
      case 'interest': return 'bg-green-50 border-green-200';
      case 'timeline': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'contact': return '👤';
      case 'interest': return '🎯';
      case 'timeline': return '📅';
      default: return '📝';
    }
  };

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <span className="text-xs font-semibold text-gray-800">Captured Information</span>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            {extractedData.items.length} items
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="px-2 pb-2">
          {/* Data Items Grid */}
          <div className="grid grid-cols-2 gap-2">
            {extractedData.items.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border ${getCategoryColor(item.category)}`}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs">{getCategoryIcon(item.category)}</span>
                  <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
                </div>
                <div className="text-xs text-gray-800 font-semibold">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Callback Info */}
          {extractedData.callbackRequested && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">📞</span>
                <span className="text-xs font-semibold text-amber-800">Callback Requested</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {extractedData.callbackDate && (
                  <div>
                    <span className="text-amber-600">Date: </span>
                    <span className="text-amber-800 font-medium">{extractedData.callbackDate}</span>
                  </div>
                )}
                {extractedData.callbackTime && (
                  <div>
                    <span className="text-amber-600">Time: </span>
                    <span className="text-amber-800 font-medium">{extractedData.callbackTime}</span>
                  </div>
                )}
              </div>
              {extractedData.callbackNotes && (
                <div className="mt-1 text-[11px] text-amber-700">
                  {extractedData.callbackNotes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =====================
// Lead Journey Card (Multi-stage call history)
// =====================

interface LeadJourneyCardProps {
  leadJourney?: LeadJourneyCall[];
  currentCallNumber?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  onViewCall?: (callId: string) => void;
}

export const LeadJourneyCard: React.FC<LeadJourneyCardProps> = ({
  leadJourney,
  currentCallNumber = 1,
  isExpanded = true,
  onToggle,
  onViewCall,
}) => {
  if (!leadJourney || leadJourney.length === 0) {
    return null;
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome?.toUpperCase()) {
      case 'CONVERTED': return 'bg-green-100 text-green-700 border-green-300';
      case 'INTERESTED': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'CALLBACK_REQUESTED': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'NOT_INTERESTED': return 'bg-red-100 text-red-700 border-red-300';
      case 'NO_ANSWER': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="bg-white rounded-lg">
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📈</span>
          <span className="text-xs font-semibold text-gray-800">Lead Journey</span>
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
            {leadJourney.length + 1} calls
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="px-2 pb-3">
          {/* Timeline */}
          <div className="relative pl-4">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200"></div>

            {/* Previous calls */}
            {leadJourney.map((call, idx) => (
              <div key={call.id} className="relative mb-3 last:mb-0">
                {/* Timeline dot */}
                <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 ${
                  call.outcome === 'CONVERTED' ? 'bg-green-500 border-green-500' :
                  call.outcome === 'INTERESTED' ? 'bg-blue-500 border-blue-500' :
                  'bg-gray-300 border-gray-300'
                }`}></div>

                {/* Call card */}
                <div
                  className="ml-2 p-2 bg-gray-50 rounded border border-gray-100 hover:border-blue-200 cursor-pointer transition-colors"
                  onClick={() => onViewCall?.(call.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-gray-500">
                        Call {call.callNumber}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(call.date)}
                      </span>
                      <span className="text-xs">{getSentimentIcon(call.sentiment)}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getOutcomeColor(call.outcome)}`}>
                      {call.outcome?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Summary */}
                  {call.summary && (
                    <p className="text-[11px] text-gray-600 line-clamp-2 mb-1">
                      {call.summary}
                    </p>
                  )}

                  {/* Data captured badges */}
                  {call.extractedData?.items && call.extractedData.items.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {call.extractedData.items.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">
                          {item.label}: {item.value.length > 15 ? item.value.slice(0, 15) + '...' : item.value}
                        </span>
                      ))}
                      {call.extractedData.items.length > 3 && (
                        <span className="text-[9px] text-gray-400">
                          +{call.extractedData.items.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Agent & Duration */}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                    <span>{call.agentName}</span>
                    <span>•</span>
                    <span>{formatDuration(call.duration)}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Current call marker */}
            <div className="relative">
              <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-purple-500 border-2 border-purple-500 ring-2 ring-purple-200"></div>
              <div className="ml-2 p-2 bg-purple-50 rounded border border-purple-200">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-purple-700">
                    Call {currentCallNumber} (Current)
                  </span>
                  <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">
                    You are here
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-bold text-gray-700">{leadJourney.length + 1}</div>
                <div className="text-[10px] text-gray-500">Total Calls</div>
              </div>
              <div>
                <div className="text-sm font-bold text-blue-600">
                  {leadJourney.filter(c => c.outcome === 'INTERESTED' || c.outcome === 'CALLBACK_REQUESTED').length}
                </div>
                <div className="text-[10px] text-gray-500">Engaged</div>
              </div>
              <div>
                <div className="text-sm font-bold text-green-600">
                  {leadJourney.reduce((acc, c) => acc + (c.extractedData?.items?.length || 0), 0)}
                </div>
                <div className="text-[10px] text-gray-500">Data Points</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================
// Legacy exports for compatibility
// =====================

export const CallSummaryHeader = BreadcrumbHeader;
export const CallQualityGaugeOld = CallQualityGauge;
export const SentimentIndicator = SentimentAnalysis;
export const SpeakingTimeBreakdownCard = SpeakingTime;
export const ContactInfoCard = ContactCard;
export const CallMetadataBar: React.FC<{ call: EnhancedCallDetails }> = () => null;
export const AISummaryCard = CallSummaryText;
export const KeyQuestionsSection = KeyQuestions;
export const KeyIssuesSection = KeyIssues;
export const AudioPlayerCard = AudioPlayer;
export const TranscriptSearch = TranscriptHeader;
export const TranscriptTimeline = TranscriptMessages;
