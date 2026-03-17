/**
 * Lead Sources Constants
 */

import {
  GlobeAltIcon,
  SparklesIcon,
  PhoneArrowDownLeftIcon,
  PhoneArrowUpRightIcon,
} from '@heroicons/react/24/outline';
import { LeadSourceData } from './lead-sources.types';

export const SOCIAL_MEDIA_SOURCES = ['AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'AD_GOOGLE'];
export const AI_VOICE_SOURCES = ['AI_VOICE_AGENT', 'AI_VOICE_INBOUND', 'AI_VOICE_OUTBOUND'];

export const CATEGORY_COLORS = {
  socialMedia: { primary: '#EC4899', gradient: 'from-pink-500 to-rose-500', light: 'bg-pink-50', text: 'text-pink-600' },
  aiVoice: { primary: '#8B5CF6', gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-600' },
  other: { primary: '#6B7280', gradient: 'from-gray-500 to-gray-600', light: 'bg-gray-50', text: 'text-gray-600' },
};

export const PLATFORM_COLORS: Record<string, string> = {
  AD_FACEBOOK: '#1877F2',
  AD_INSTAGRAM: '#E4405F',
  AD_LINKEDIN: '#0A66C2',
  AD_GOOGLE: '#4285F4',
  AI_VOICE_AGENT: '#8B5CF6',
  AI_VOICE_INBOUND: '#06B6D4',
  AI_VOICE_OUTBOUND: '#10B981',
};

export const PLATFORM_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  AD_FACEBOOK: GlobeAltIcon,
  AD_INSTAGRAM: GlobeAltIcon,
  AD_LINKEDIN: GlobeAltIcon,
  AD_GOOGLE: GlobeAltIcon,
  AI_VOICE_AGENT: SparklesIcon,
  AI_VOICE_INBOUND: PhoneArrowDownLeftIcon,
  AI_VOICE_OUTBOUND: PhoneArrowUpRightIcon,
};

export const CATEGORY_FILTER_OPTIONS = [
  { id: 'all', label: 'All Sources' },
  { id: 'socialMedia', label: 'Social Media' },
  { id: 'aiVoice', label: 'AI Voice Agent' },
] as const;

export const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

export function formatSourceName(source: string): string {
  return source
    .replace('AD_', '')
    .replace('AI_VOICE_', 'AI Voice ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}

export function getMockData(): LeadSourceData {
  const generateTrend = (base: number) => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(base + Math.sin(i * 0.3) * (base * 0.3) + Math.random() * (base * 0.2)),
      };
    });
  };

  return {
    period: '30 days',
    socialMedia: {
      total: 847,
      converted: 127,
      byPlatform: {
        AD_FACEBOOK: 312,
        AD_INSTAGRAM: 245,
        AD_LINKEDIN: 178,
        AD_GOOGLE: 112,
      },
      trend: generateTrend(28),
    },
    aiVoiceAgent: {
      total: 523,
      converted: 156,
      inbound: 234,
      outbound: 289,
      trend: generateTrend(17),
    },
    other: {
      total: 412,
      converted: 82,
      bySource: {
        MANUAL: 156,
        FORM: 89,
        WEBSITE: 78,
        REFERRAL: 56,
        OTHER: 33,
      },
    },
    comparison: [
      { source: 'AD_FACEBOOK', count: 312, converted: 47, conversionRate: 15.1, avgResponseTime: 24, revenue: 94000 },
      { source: 'AD_INSTAGRAM', count: 245, converted: 39, conversionRate: 15.9, avgResponseTime: 18, revenue: 78000 },
      { source: 'AI_VOICE_OUTBOUND', count: 289, converted: 98, conversionRate: 33.9, avgResponseTime: 2, revenue: 156000 },
      { source: 'AI_VOICE_INBOUND', count: 234, converted: 58, conversionRate: 24.8, avgResponseTime: 1, revenue: 89000 },
      { source: 'AD_LINKEDIN', count: 178, converted: 28, conversionRate: 15.7, avgResponseTime: 36, revenue: 56000 },
      { source: 'AD_GOOGLE', count: 112, converted: 13, conversionRate: 11.6, avgResponseTime: 28, revenue: 34000 },
      { source: 'FORM', count: 89, converted: 22, conversionRate: 24.7, avgResponseTime: 12, revenue: 45000 },
      { source: 'WEBSITE', count: 78, converted: 15, conversionRate: 19.2, avgResponseTime: 8, revenue: 32000 },
    ],
  };
}
