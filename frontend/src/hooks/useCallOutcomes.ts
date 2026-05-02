/**
 * Hook for managing custom call outcomes
 * Fetches outcomes from API and provides helper functions for display
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { callOutcomeService, CallOutcome } from '../services/call-outcome.service';

// Default fallback outcomes (used when API fails or while loading)
const DEFAULT_OUTCOMES: CallOutcome[] = [
  { id: '1', organizationId: '', name: 'Interested', slug: 'interested', icon: 'thumb-up', color: '#10B981', notePrompt: null, requiresFollowUp: true, requiresSubOption: false, subOptions: [], mapsToStatus: null, isSystem: true, isActive: true, order: 1, createdAt: '', updatedAt: '' },
  { id: '2', organizationId: '', name: 'Not Interested', slug: 'not_interested', icon: 'thumb-down', color: '#EF4444', notePrompt: null, requiresFollowUp: false, requiresSubOption: false, subOptions: [], mapsToStatus: null, isSystem: true, isActive: true, order: 2, createdAt: '', updatedAt: '' },
  { id: '3', organizationId: '', name: 'Callback', slug: 'callback', icon: 'phone-return', color: '#F59E0B', notePrompt: null, requiresFollowUp: true, requiresSubOption: false, subOptions: [], mapsToStatus: null, isSystem: true, isActive: true, order: 3, createdAt: '', updatedAt: '' },
  { id: '4', organizationId: '', name: 'Converted', slug: 'converted', icon: 'check-circle', color: '#22C55E', notePrompt: null, requiresFollowUp: false, requiresSubOption: false, subOptions: [], mapsToStatus: null, isSystem: true, isActive: true, order: 4, createdAt: '', updatedAt: '' },
  { id: '5', organizationId: '', name: 'No Answer', slug: 'no_answer', icon: 'phone-missed', color: '#6B7280', notePrompt: null, requiresFollowUp: true, requiresSubOption: false, subOptions: [], mapsToStatus: null, isSystem: true, isActive: true, order: 5, createdAt: '', updatedAt: '' },
  { id: '6', organizationId: '', name: 'Busy', slug: 'busy', icon: 'phone-lock', color: '#F97316', notePrompt: null, requiresFollowUp: true, requiresSubOption: false, subOptions: [], mapsToStatus: null, isSystem: true, isActive: true, order: 6, createdAt: '', updatedAt: '' },
  { id: '7', organizationId: '', name: 'Wrong Number', slug: 'wrong_number', icon: 'phone-cancel', color: '#DC2626', notePrompt: null, requiresFollowUp: false, requiresSubOption: false, subOptions: [], mapsToStatus: null, isSystem: true, isActive: true, order: 7, createdAt: '', updatedAt: '' },
  { id: '8', organizationId: '', name: 'Voicemail', slug: 'voicemail', icon: 'voicemail', color: '#8B5CF6', notePrompt: null, requiresFollowUp: true, requiresSubOption: false, subOptions: [], mapsToStatus: null, isSystem: true, isActive: true, order: 8, createdAt: '', updatedAt: '' },
];

// Cache for outcomes (singleton pattern)
let outcomesCache: CallOutcome[] | null = null;
let fetchPromise: Promise<CallOutcome[]> | null = null;

export function useCallOutcomes() {
  const [outcomes, setOutcomes] = useState<CallOutcome[]>(outcomesCache || DEFAULT_OUTCOMES);
  const [loading, setLoading] = useState(!outcomesCache);
  const [error, setError] = useState<string | null>(null);

  const fetchOutcomes = useCallback(async (forceRefresh = false) => {
    // Return cached if available and not forcing refresh
    if (outcomesCache && !forceRefresh) {
      setOutcomes(outcomesCache);
      setLoading(false);
      return outcomesCache;
    }

    // If already fetching, wait for that promise
    if (fetchPromise && !forceRefresh) {
      try {
        const result = await fetchPromise;
        setOutcomes(result);
        setLoading(false);
        return result;
      } catch (err) {
        // Will be handled below
      }
    }

    setLoading(true);
    setError(null);

    fetchPromise = callOutcomeService.getAll().then((data) => {
      outcomesCache = data;
      return data;
    });

    try {
      const data = await fetchPromise;
      setOutcomes(data);
      return data;
    } catch (err: any) {
      console.error('Failed to fetch outcomes:', err);
      setError(err.message || 'Failed to load outcomes');
      // Keep using default outcomes on error
      return DEFAULT_OUTCOMES;
    } finally {
      setLoading(false);
      fetchPromise = null;
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchOutcomes();
  }, [fetchOutcomes]);

  // Get outcome by slug (handles both UPPERCASE and lowercase)
  const getOutcomeBySlug = useCallback((slug: string): CallOutcome | undefined => {
    const normalizedSlug = slug.toLowerCase().replace(/-/g, '_');
    return outcomes.find(o => o.slug.toLowerCase() === normalizedSlug);
  }, [outcomes]);

  // Get display label for an outcome
  const getOutcomeLabel = useCallback((outcomeSlug: string): string => {
    const outcome = getOutcomeBySlug(outcomeSlug);
    if (outcome) return outcome.name;

    // Fallback: format the slug as a label
    return outcomeSlug
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, [getOutcomeBySlug]);

  // Get color for an outcome (returns hex color)
  const getOutcomeColor = useCallback((outcomeSlug: string): string => {
    const outcome = getOutcomeBySlug(outcomeSlug);
    if (outcome) return outcome.color;

    // Fallback colors for unknown outcomes
    return '#6B7280';
  }, [getOutcomeBySlug]);

  // Get Tailwind classes for an outcome badge
  const getOutcomeBadgeClasses = useCallback((outcomeSlug: string): { bg: string; text: string } => {
    const color = getOutcomeColor(outcomeSlug);

    // Map hex colors to Tailwind classes
    const colorMap: Record<string, { bg: string; text: string }> = {
      '#10B981': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      '#22C55E': { bg: 'bg-green-100', text: 'text-green-700' },
      '#EF4444': { bg: 'bg-red-100', text: 'text-red-700' },
      '#DC2626': { bg: 'bg-red-100', text: 'text-red-700' },
      '#F59E0B': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      '#F97316': { bg: 'bg-orange-100', text: 'text-orange-700' },
      '#6B7280': { bg: 'bg-gray-100', text: 'text-gray-700' },
      '#8B5CF6': { bg: 'bg-purple-100', text: 'text-purple-700' },
      '#3B82F6': { bg: 'bg-blue-100', text: 'text-blue-700' },
      '#6366F1': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
      '#14B8A6': { bg: 'bg-teal-100', text: 'text-teal-700' },
      '#EC4899': { bg: 'bg-pink-100', text: 'text-pink-700' },
    };

    return colorMap[color] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  }, [getOutcomeColor]);

  // Get filter options for dropdowns
  const filterOptions = useMemo(() => {
    return [
      { value: '', label: 'All Outcomes' },
      ...outcomes.map(o => ({
        value: o.slug.toUpperCase(),
        label: o.name,
      })),
    ];
  }, [outcomes]);

  // Get outcomes for stats display (with colors)
  const statsOutcomes = useMemo(() => {
    // Key outcomes for stats cards
    const keyOutcomes = ['interested', 'callback', 'converted', 'not_interested', 'no_answer'];
    return outcomes
      .filter(o => keyOutcomes.includes(o.slug))
      .map(o => ({
        slug: o.slug.toUpperCase(),
        name: o.name,
        color: o.color,
      }));
  }, [outcomes]);

  return {
    outcomes,
    loading,
    error,
    fetchOutcomes,
    getOutcomeBySlug,
    getOutcomeLabel,
    getOutcomeColor,
    getOutcomeBadgeClasses,
    filterOptions,
    statsOutcomes,
  };
}

// Standalone functions for use outside React components
export function formatOutcomeLabel(outcomeSlug: string): string {
  if (!outcomeSlug) return 'Pending';

  // Check cache first
  if (outcomesCache) {
    const outcome = outcomesCache.find(o =>
      o.slug.toLowerCase() === outcomeSlug.toLowerCase().replace(/-/g, '_')
    );
    if (outcome) return outcome.name;
  }

  // Fallback: format the slug
  return outcomeSlug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getOutcomeColorHex(outcomeSlug: string): string {
  if (!outcomeSlug) return '#6B7280';

  // Check cache first
  if (outcomesCache) {
    const outcome = outcomesCache.find(o =>
      o.slug.toLowerCase() === outcomeSlug.toLowerCase().replace(/-/g, '_')
    );
    if (outcome) return outcome.color;
  }

  // Fallback colors
  const fallbackColors: Record<string, string> = {
    'INTERESTED': '#10B981',
    'NOT_INTERESTED': '#EF4444',
    'CALLBACK': '#F59E0B',
    'CONVERTED': '#22C55E',
    'NO_ANSWER': '#6B7280',
    'BUSY': '#F97316',
    'WRONG_NUMBER': '#DC2626',
    'VOICEMAIL': '#8B5CF6',
  };

  return fallbackColors[outcomeSlug.toUpperCase()] || '#6B7280';
}
