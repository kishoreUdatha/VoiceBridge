/**
 * useCallSummary Hook
 * Data fetching and state management for call summary page
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../../services/api';
import { EnhancedCallDetails, TranscriptFilter, EnhancedTranscriptMessage } from '../call-summary.types';

interface UseCallSummaryReturn {
  // Data
  call: EnhancedCallDetails | null;
  loading: boolean;
  error: string | null;

  // Audio player
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  audioDuration: number;
  togglePlayback: () => void;
  seekTo: (time: number) => void;

  // Transcript
  transcriptFilter: TranscriptFilter;
  filteredTranscript: EnhancedTranscriptMessage[];
  setSearchQuery: (query: string) => void;
  setSpeakerFilter: (filter: 'all' | 'agent' | 'customer') => void;
  highlightedMessageIndex: number | null;
  showEvidencesOnly: boolean;
  toggleEvidences: () => void;

  // Sections
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;

  // Navigation
  goBack: () => void;
  viewLead: () => void;
  viewCampaign: () => void;
}

export function useCallSummary(): UseCallSummaryReturn {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect if this is a telecaller call based on URL path
  const isTelecallerCall = location.pathname.includes('telecaller-calls');

  // Data state
  const [call, setCall] = useState<EnhancedCallDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Transcript state
  const [transcriptFilter, setTranscriptFilter] = useState<TranscriptFilter>({
    searchQuery: '',
    speakerFilter: 'all',
  });
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null);
  const [showEvidencesOnly, setShowEvidencesOnly] = useState(false);

  // Section state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    questions: true,
    issues: true,
    coaching: true,
    extractedData: true,
    leadJourney: true,
  });

  // Fetch call data
  useEffect(() => {
    const fetchCallSummary = async () => {
      if (!id) {
        setError('Call ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Use appropriate endpoint based on call type
        const endpoint = isTelecallerCall
          ? `/telecaller/calls/${id}/summary`
          : `/outbound-calls/calls/${id}/summary`;
        const response = await api.get(endpoint);
        if (response.data.success) {
          const data = response.data.data;

          // For telecaller calls, map the data to match the expected format
          if (isTelecallerCall) {
            // Use enhanced transcript from AI analysis if available, otherwise parse string
            let enhancedTranscript: EnhancedTranscriptMessage[] = [];
            if (Array.isArray(data.enhancedTranscript) && data.enhancedTranscript.length > 0) {
              // Use AI-analyzed enhanced transcript with per-message sentiment
              enhancedTranscript = data.enhancedTranscript;
            } else if (data.transcript && typeof data.transcript === 'string' && data.transcript.trim()) {
              // Fallback: parse string transcript
              enhancedTranscript = [{
                role: 'user',
                content: data.transcript,
                startTimeSeconds: 0,
                sentiment: data.sentiment || 'neutral',
              }];
            }

            // Determine if call was actually answered and had a conversation
            const unansweredOutcomes = ['NO_ANSWER', 'BUSY', 'FAILED', 'CANCELLED', 'VOICEMAIL'];
            const wasAnswered = !unansweredOutcomes.includes(data.outcome);
            const hasConversation = data.duration > 0 && (data.transcript || data.summary);

            // Use AI-calculated call quality score from API if available
            let callQualityScore = data.callQualityScore ?? 0;
            if (!wasAnswered || !hasConversation) {
              callQualityScore = 0;
            }

            // Backend returns recording paths like "/uploads/recordings/foo.m4a".
            // The browser would resolve those against the frontend origin (5173)
            // and 404. Prefix with the API host so playback works.
            const apiBase = (import.meta as any).env?.VITE_API_URL || '';
            const staticHost = apiBase.replace(/\/api\/?$/, '');
            const absolutize = (u: string | null | undefined) => {
              if (!u) return u;
              if (/^https?:\/\//i.test(u)) return u;
              return staticHost + (u.startsWith('/') ? u : '/' + u);
            };

            setCall({
              ...data,
              recordingUrl: absolutize(data.recordingUrl),
              callQualityScore,
              sentiment: wasAnswered ? (data.sentiment || 'neutral') : 'neutral',
              sentimentIntensity: data.sentimentIntensity || 'medium',
              // Use actual AI-analyzed speaking times if available
              agentSpeakingTime: data.agentSpeakingTime ?? Math.floor((data.duration || 0) * 0.5),
              customerSpeakingTime: data.customerSpeakingTime ?? Math.floor((data.duration || 0) * 0.5),
              nonSpeechTime: data.nonSpeechTime ?? 0,
              // Use actual AI-extracted questions and issues
              keyQuestionsAsked: Array.isArray(data.keyQuestionsAsked) ? data.keyQuestionsAsked : [],
              keyIssuesDiscussed: Array.isArray(data.keyIssuesDiscussed) ? data.keyIssuesDiscussed : [],
              enhancedTranscript,
              contact: {
                name: data.contactName || (data.lead ? `${data.lead.firstName} ${data.lead.lastName || ''}`.trim() : 'Unknown'),
                phone: data.phoneNumber || '',
                email: data.lead?.email,
              },
              agent: {
                name: data.telecaller ? `${data.telecaller.firstName} ${data.telecaller.lastName}` : 'Telecaller',
              },
              direction: 'OUTBOUND',
              // Use actual AI coaching data if available
              coaching: data.coachingSummary ? {
                positiveHighlights: Array.isArray(data.coachingPositiveHighlights) ? data.coachingPositiveHighlights : [],
                areasToImprove: Array.isArray(data.coachingAreasToImprove) ? data.coachingAreasToImprove : [],
                nextCallTips: Array.isArray(data.coachingNextCallTips) ? data.coachingNextCallTips : [],
                coachingSummary: data.coachingSummary || '',
                talkListenFeedback: data.coachingTalkListenFeedback || '',
                empathyScore: data.coachingEmpathyScore ?? 50,
                objectionHandlingScore: data.coachingObjectionScore ?? 50,
                closingScore: data.coachingClosingScore ?? 50,
              } : undefined,
              // Use extracted data or fallback to qualification
              extractedData: data.extractedData || data.qualification || undefined,
              leadJourney: [],
              currentCallNumber: 1,
              totalCallsToLead: 1,
              isFollowUpCall: false,
              // Flag for telecaller call
              isTelecallerCall: true,
              telecaller: data.telecaller,
              // Additional flags for UI
              wasAnswered,
              hasConversation,
            });
          } else {
            // AI call - existing logic
            setCall({
              ...data,
              callQualityScore: data.callQualityScore ?? 75,
              sentiment: data.sentiment || 'neutral',
              sentimentIntensity: data.sentimentIntensity || 'medium',
              agentSpeakingTime: data.agentSpeakingTime ?? Math.floor((data.duration || 0) * 0.5),
              customerSpeakingTime: data.customerSpeakingTime ?? Math.floor((data.duration || 0) * 0.4),
              nonSpeechTime: data.nonSpeechTime ?? Math.floor((data.duration || 0) * 0.1),
              keyQuestionsAsked: Array.isArray(data.keyQuestionsAsked) ? data.keyQuestionsAsked : [],
              keyIssuesDiscussed: Array.isArray(data.keyIssuesDiscussed) ? data.keyIssuesDiscussed : [],
              enhancedTranscript: Array.isArray(data.enhancedTranscript) ? data.enhancedTranscript : [],
              contact: data.contact || { name: 'Unknown Contact', phone: data.phoneNumber || '' },
              agent: data.agent || { name: 'Voice Agent' },
              direction: data.direction || 'OUTBOUND',
              // Map coaching data from API response
              coaching: data.coachingSummary ? {
                positiveHighlights: Array.isArray(data.coachingPositiveHighlights) ? data.coachingPositiveHighlights : [],
                areasToImprove: Array.isArray(data.coachingAreasToImprove) ? data.coachingAreasToImprove : [],
                nextCallTips: Array.isArray(data.coachingNextCallTips) ? data.coachingNextCallTips : [],
                coachingSummary: data.coachingSummary || '',
                talkListenFeedback: data.coachingTalkListenFeedback || '',
                empathyScore: data.coachingEmpathyScore ?? 50,
                objectionHandlingScore: data.coachingObjectionScore ?? 50,
                closingScore: data.coachingClosingScore ?? 50,
              } : undefined,
              // Extracted data from conversation
              extractedData: data.extractedData || undefined,
              // Lead journey - previous calls to this contact
              leadJourney: data.leadJourney || [],
              currentCallNumber: data.currentCallNumber || 1,
              totalCallsToLead: data.totalCallsToLead || 1,
              isFollowUpCall: data.isFollowUpCall || false,
            });
          }
        } else {
          setError(response.data.message || 'Failed to load call summary');
        }
      } catch (err: any) {
        console.error('Error fetching call summary:', err);
        setError(err.response?.data?.message || 'Failed to load call summary');
      } finally {
        setLoading(false);
      }
    };

    fetchCallSummary();
  }, [id, isTelecallerCall]);

  // Audio time update handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Find the message at current time and highlight it
      if (call?.enhancedTranscript) {
        const currentMessage = call.enhancedTranscript.findIndex((msg, idx, arr) => {
          const nextMsg = arr[idx + 1];
          const msgStart = msg.startTimeSeconds;
          const msgEnd = nextMsg ? nextMsg.startTimeSeconds : audio.duration;
          return audio.currentTime >= msgStart && audio.currentTime < msgEnd;
        });
        setHighlightedMessageIndex(currentMessage);
      }
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHighlightedMessageIndex(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [call]);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.src || audio.src === window.location.href) {
      console.warn('[useCallSummary] No audio source available for this call');
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('[useCallSummary] Audio play failed:', err?.message || err);
          setIsPlaying(false);
        });
    }
  }, [isPlaying]);

  // Seek to time
  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  // Filter transcript
  const filteredTranscript = useMemo(() => {
    if (!call?.enhancedTranscript) return [];

    return call.enhancedTranscript.filter(msg => {
      // Speaker filter
      if (transcriptFilter.speakerFilter === 'agent' && msg.role !== 'assistant') {
        return false;
      }
      if (transcriptFilter.speakerFilter === 'customer' && msg.role !== 'user') {
        return false;
      }

      // Evidences filter - show only non-neutral sentiment messages
      if (showEvidencesOnly && msg.sentiment === 'neutral') {
        return false;
      }

      // Search filter
      if (transcriptFilter.searchQuery) {
        return msg.content.toLowerCase().includes(transcriptFilter.searchQuery.toLowerCase());
      }

      return true;
    });
  }, [call?.enhancedTranscript, transcriptFilter, showEvidencesOnly]);

  // Set search query
  const setSearchQuery = useCallback((query: string) => {
    setTranscriptFilter(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // Set speaker filter
  const setSpeakerFilter = useCallback((filter: 'all' | 'agent' | 'customer') => {
    setTranscriptFilter(prev => ({ ...prev, speakerFilter: filter }));
  }, []);

  // Toggle evidences filter
  const toggleEvidences = useCallback(() => {
    setShowEvidencesOnly(prev => !prev);
  }, []);

  // Toggle section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Navigation
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const viewLead = useCallback(() => {
    if (call?.leadId) {
      navigate(`/leads/${call.leadId}`);
    }
  }, [navigate, call?.leadId]);

  const viewCampaign = useCallback(() => {
    if (call?.campaign?.id) {
      navigate(`/outbound-calls/campaigns/${call.campaign.id}`);
    }
  }, [navigate, call?.campaign?.id]);

  return {
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
    viewLead,
    viewCampaign,
  };
}

export default useCallSummary;
