/**
 * Team Management Service
 * API client for team analytics, workload, and capacity planning
 */

import api from './api';

export interface TeamMemberStats {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  activeLeads: number;
  completedLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  callsMade: number;
  callsAnswered: number;
  lastActivityAt: string | null;
  workloadScore: number;
  capacityUsed: number;
}

export interface TeamOverview {
  totalMembers: number;
  activeMembers: number;
  totalLeads: number;
  activeLeads: number;
  completedLeads: number;
  avgConversionRate: number;
  avgResponseTime: number;
  totalCalls: number;
  workloadDistribution: {
    underloaded: number;
    optimal: number;
    overloaded: number;
  };
}

export interface TeamHierarchy {
  id: string;
  name: string;
  email: string;
  role: string;
  teamMembers: TeamHierarchy[];
  stats?: {
    totalLeads: number;
    conversionRate: number;
  };
}

export interface TeamGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  lowerIsBetter?: boolean;
}

export interface CapacityData {
  managerId: string;
  managerName: string;
  teamSize: number;
  activeLeads: number;
  maxCapacity: number;
  optimalCapacity: number;
  capacityUsed: number;
  status: 'underutilized' | 'optimal' | 'high' | 'overloaded';
}

export const teamManagementService = {
  async getOverview(): Promise<TeamOverview> {
    const response = await api.get('/team-management/overview');
    return response.data.data;
  },

  async getTeamMembers(): Promise<TeamMemberStats[]> {
    const response = await api.get('/team-management/members');
    return response.data.data;
  },

  async getHierarchy(): Promise<TeamHierarchy[]> {
    const response = await api.get('/team-management/hierarchy');
    return response.data.data;
  },

  async getGoals(): Promise<{ goals: TeamGoal[] }> {
    const response = await api.get('/team-management/goals');
    return response.data.data;
  },

  async getCapacity(): Promise<CapacityData[]> {
    const response = await api.get('/team-management/capacity');
    return response.data.data;
  },

  async reassignLeads(toUserId: string, leadIds: string[], fromUserId?: string): Promise<{ count: number }> {
    const response = await api.post('/team-management/reassign', {
      toUserId,
      leadIds,
      fromUserId,
    });
    return response.data.data;
  },
};
