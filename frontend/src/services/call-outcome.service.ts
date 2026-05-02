/**
 * Call Outcome Service
 * Handles API calls for custom call outcomes management
 */

import api from './api';

export interface CallOutcome {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  notePrompt: string | null;
  requiresFollowUp: boolean;
  requiresSubOption: boolean;
  subOptions: string[];
  mapsToStatus: string | null;
  isSystem: boolean;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallOutcomeInput {
  name: string;
  slug?: string;
  icon?: string;
  color?: string;
  notePrompt?: string;
  requiresFollowUp?: boolean;
  requiresSubOption?: boolean;
  subOptions?: string[];
  mapsToStatus?: string;
  order?: number;
}

export interface UpdateCallOutcomeInput {
  name?: string;
  icon?: string;
  color?: string;
  notePrompt?: string;
  requiresFollowUp?: boolean;
  requiresSubOption?: boolean;
  subOptions?: string[];
  mapsToStatus?: string;
  isActive?: boolean;
  order?: number;
}

class CallOutcomeService {
  /**
   * Get all call outcomes for the organization
   */
  async getAll(includeInactive = false): Promise<CallOutcome[]> {
    const response = await api.get('/call-outcomes', {
      params: { includeInactive },
    });
    return response.data.data.outcomes;
  }

  /**
   * Get a single call outcome by ID
   */
  async getById(id: string): Promise<CallOutcome> {
    const response = await api.get(`/call-outcomes/${id}`);
    return response.data.data.outcome;
  }

  /**
   * Create a new call outcome
   */
  async create(data: CreateCallOutcomeInput): Promise<CallOutcome> {
    const response = await api.post('/call-outcomes', data);
    return response.data.data.outcome;
  }

  /**
   * Update an existing call outcome
   */
  async update(id: string, data: UpdateCallOutcomeInput): Promise<CallOutcome> {
    const response = await api.put(`/call-outcomes/${id}`, data);
    return response.data.data.outcome;
  }

  /**
   * Delete a call outcome
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/call-outcomes/${id}`);
  }

  /**
   * Reorder call outcomes
   */
  async reorder(orderedIds: string[]): Promise<CallOutcome[]> {
    const response = await api.post('/call-outcomes/reorder', { orderedIds });
    return response.data.data.outcomes;
  }

  /**
   * Initialize default outcomes
   */
  async initializeDefaults(): Promise<CallOutcome[]> {
    const response = await api.post('/call-outcomes/initialize');
    return response.data.data.outcomes;
  }
}

export const callOutcomeService = new CallOutcomeService();
