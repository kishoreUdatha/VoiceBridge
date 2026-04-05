/**
 * Conversion Funnel Page Constants
 */

import {
  UserGroupIcon,
  ChartBarIcon,
  SparklesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { StageConfig, FunnelData } from './conversion-funnel.types';

export const STAGE_CONFIGS: Record<string, StageConfig> = {
  // Standard funnel stages
  new: { color: '#3B82F6', gradient: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', icon: UserGroupIcon },
  lead: { color: '#3B82F6', gradient: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', icon: UserGroupIcon },
  contacted: { color: '#8B5CF6', gradient: 'from-violet-500 to-violet-600', bgLight: 'bg-violet-50', icon: ChartBarIcon },
  qualified: { color: '#F59E0B', gradient: 'from-amber-500 to-amber-600', bgLight: 'bg-amber-50', icon: SparklesIcon },
  negotiation: { color: '#10B981', gradient: 'from-emerald-500 to-emerald-600', bgLight: 'bg-emerald-50', icon: CalendarDaysIcon },
  appointment: { color: '#A855F7', gradient: 'from-purple-500 to-purple-600', bgLight: 'bg-purple-50', icon: CalendarDaysIcon },
  payment: { color: '#D946EF', gradient: 'from-fuchsia-500 to-fuchsia-600', bgLight: 'bg-fuchsia-50', icon: ChartBarIcon },
  won: { color: '#22C55E', gradient: 'from-green-500 to-green-600', bgLight: 'bg-green-50', icon: CheckCircleIcon },
  converted: { color: '#22C55E', gradient: 'from-green-500 to-green-600', bgLight: 'bg-green-50', icon: CheckCircleIcon },
  lost: { color: '#EF4444', gradient: 'from-red-500 to-red-600', bgLight: 'bg-red-50', icon: ChartBarIcon },
};

export const DEFAULT_STAGE: StageConfig = {
  color: '#6B7280',
  gradient: 'from-gray-500 to-gray-600',
  bgLight: 'bg-gray-50',
  icon: ChartBarIcon,
};

export const FUNNEL_OPTIONS = [
  { value: 'sales', label: 'Sales Funnel' },
  { value: 'support', label: 'Support Funnel' },
  { value: 'onboarding', label: 'Onboarding Funnel' },
];

export const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export const VIEW_MODES = ['visual', 'table'] as const;

export function formatStageName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
}

export function getStageConfig(name: string): StageConfig {
  return STAGE_CONFIGS[name.toLowerCase()] || DEFAULT_STAGE;
}

export function getMockFunnelData(): FunnelData {
  return {
    funnelName: 'sales',
    period: { startDate: null, endDate: null },
    stages: [
      { name: 'lead', order: 1, count: 1247, conversionRate: 100, dropoffRate: 0 },
      { name: 'contacted', order: 2, count: 892, conversionRate: 72, dropoffRate: 28 },
      { name: 'qualified', order: 3, count: 534, conversionRate: 60, dropoffRate: 40 },
      { name: 'appointment', order: 4, count: 267, conversionRate: 50, dropoffRate: 50 },
      { name: 'payment', order: 5, count: 156, conversionRate: 58, dropoffRate: 42 },
      { name: 'converted', order: 6, count: 134, conversionRate: 86, dropoffRate: 14 },
    ],
    totalLeads: 1247,
    totalConverted: 134,
    overallConversionRate: 10.7,
  };
}
