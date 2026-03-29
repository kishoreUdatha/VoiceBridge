/**
 * Call Summary Constants & Utilities
 * Helper functions and configuration for call summary page
 */

import { SpeakingTimeBreakdown, SentimentType } from './call-summary.types';

/**
 * Get color for call quality score
 */
export function getQualityScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green
  if (score >= 60) return '#84cc16'; // lime
  if (score >= 40) return '#eab308'; // yellow
  if (score >= 20) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get label for call quality score
 */
export function getQualityScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';
  if (score >= 20) return 'Below Average';
  return 'Poor';
}

/**
 * Calculate speaking time breakdown percentages
 */
export function calculateSpeakingTimeBreakdown(
  agentTime: number,
  customerTime: number,
  nonSpeechTime: number
): SpeakingTimeBreakdown {
  const total = agentTime + customerTime + nonSpeechTime;
  if (total === 0) {
    return { agentPercent: 33, customerPercent: 33, silencePercent: 34 };
  }
  return {
    agentPercent: Math.round((agentTime / total) * 100),
    customerPercent: Math.round((customerTime / total) * 100),
    silencePercent: Math.round((nonSpeechTime / total) * 100),
  };
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date to readable string
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get sentiment color
 */
export function getSentimentColor(sentiment: SentimentType): string {
  switch (sentiment) {
    case 'positive': return '#22c55e';
    case 'negative': return '#ef4444';
    default: return '#6b7280';
  }
}

/**
 * Get sentiment emoji
 */
export function getSentimentEmoji(sentiment: string): string {
  const lower = sentiment.toLowerCase();
  if (lower === 'positive') return '+';
  if (lower === 'negative') return '-';
  return '~';
}

/**
 * Get outcome badge color
 */
export function getOutcomeColor(outcome: string): { bg: string; text: string } {
  switch (outcome) {
    case 'CONVERTED':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'INTERESTED':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'CALLBACK_REQUESTED':
      return { bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'NEEDS_FOLLOWUP':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'NOT_INTERESTED':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    case 'NO_ANSWER':
    case 'VOICEMAIL':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

/**
 * Format outcome for display
 */
export function formatOutcome(outcome: string): string {
  return outcome.split('_').map(word =>
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
}
