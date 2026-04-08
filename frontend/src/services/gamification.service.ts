/**
 * Gamification Service
 */

import api from './api';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: 'CALLS_MADE' | 'LEADS_CONVERTED' | 'DEALS_CLOSED' | 'REVENUE_GENERATED' | 'STREAK' | 'FIRST_ACTION' | 'PERFECT_WEEK' | 'CUSTOM';
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  criteria: Record<string, any>;
  points: number;
  badgeIcon?: string;
  badgeColor?: string;
  isSecret: boolean;
  isActive: boolean;
  earnedCount: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  earnedAt: string;
  achievement: Achievement;
}

export interface GamificationScore {
  id: string;
  userId: string;
  totalPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  quarterlyPoints: number;
  yearlyPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  points: number;
  level: number;
  streak: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  goals: Record<string, number>;
  rewards?: Record<string, any>;
  isTeamChallenge: boolean;
  maxParticipants?: number;
  createdAt: string;
  participants?: ChallengeParticipant[];
  _count?: { participants: number };
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  teamId?: string;
  progress: Record<string, number>;
  score: number;
  isCompleted: boolean;
  completedAt?: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export const gamificationService = {
  // Achievements
  async getAchievements(type?: string): Promise<Achievement[]> {
    const params = type ? `?type=${type}` : '';
    const response = await api.get(`/gamification/achievements${params}`);
    return response.data;
  },

  async createAchievement(data: Partial<Achievement>): Promise<Achievement> {
    const response = await api.post('/gamification/achievements', data);
    return response.data;
  },

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const response = await api.get(`/gamification/users/${userId}/achievements`);
    return response.data;
  },

  async awardAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    const response = await api.post(`/gamification/users/${userId}/achievements/${achievementId}`, {});
    return response.data;
  },

  // Scores
  async getUserScore(userId: string): Promise<GamificationScore> {
    const response = await api.get(`/gamification/users/${userId}/score`);
    return response.data;
  },

  async addPoints(userId: string, points: number, source: string): Promise<GamificationScore> {
    const response = await api.post(`/gamification/users/${userId}/score`, { points, source });
    return response.data;
  },

  async updateStreak(userId: string): Promise<GamificationScore> {
    const response = await api.post(`/gamification/users/${userId}/streak`, {});
    return response.data;
  },

  // Leaderboard
  async getLeaderboard(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'allTime' = 'weekly', limit = 10): Promise<LeaderboardEntry[]> {
    const response = await api.get(`/gamification/leaderboard?period=${period}&limit=${limit}`);
    return response.data;
  },

  // Challenges
  async getChallenges(status?: string): Promise<Challenge[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/gamification/challenges${params}`);
    return response.data;
  },

  async getChallenge(id: string): Promise<Challenge> {
    const response = await api.get(`/gamification/challenges/${id}`);
    return response.data;
  },

  async createChallenge(data: Partial<Challenge>): Promise<Challenge> {
    const response = await api.post('/gamification/challenges', data);
    return response.data;
  },

  async joinChallenge(challengeId: string, teamId?: string): Promise<ChallengeParticipant> {
    const response = await api.post(`/gamification/challenges/${challengeId}/join`, { teamId });
    return response.data;
  },

  async leaveChallenge(challengeId: string): Promise<void> {
    await api.post(`/gamification/challenges/${challengeId}/leave`, {});
  },

  async updateChallengeProgress(challengeId: string, progressKey: string, value: number): Promise<ChallengeParticipant> {
    const response = await api.post(`/gamification/challenges/${challengeId}/progress`, { progressKey, value });
    return response.data;
  },

  async getUserChallenges(userId: string): Promise<ChallengeParticipant[]> {
    const response = await api.get(`/gamification/users/${userId}/challenges`);
    return response.data;
  },
};
