/**
 * Gamification Service
 * Handles achievements, leaderboards, challenges, and rewards
 */

import { PrismaClient, AchievementType, AchievementTier, ChallengeStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface AchievementConfig {
  name: string;
  description: string;
  type: AchievementType;
  tier: AchievementTier;
  criteria: Record<string, any>;
  points: number;
  badgeIcon?: string;
  badgeColor?: string;
  isSecret?: boolean;
}

interface ChallengeConfig {
  name: string;
  description: string;
  type: string;
  startDate: Date;
  endDate: Date;
  goals: Record<string, number>;
  rewards?: Record<string, any>;
  isTeamChallenge?: boolean;
  maxParticipants?: number;
}

export const gamificationService = {
  // ==================== Achievements ====================

  // Get all achievements
  async getAchievements(organizationId: string, type?: AchievementType) {
    const where: any = { organizationId, isActive: true };
    if (type) where.type = type;

    return prisma.achievement.findMany({
      where,
      orderBy: [{ tier: 'asc' }, { points: 'desc' }],
    });
  },

  // Create achievement
  async createAchievement(organizationId: string, config: AchievementConfig) {
    return prisma.achievement.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        type: config.type,
        tier: config.tier,
        criteria: config.criteria as any,
        points: config.points,
        badgeIcon: config.badgeIcon,
        badgeColor: config.badgeColor,
        isSecret: config.isSecret || false,
      },
    });
  },

  // Update achievement
  async updateAchievement(id: string, updates: Partial<AchievementConfig>) {
    return prisma.achievement.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        type: updates.type,
        tier: updates.tier,
        criteria: updates.criteria as any,
        points: updates.points,
        badgeIcon: updates.badgeIcon,
        badgeColor: updates.badgeColor,
        isSecret: updates.isSecret,
      },
    });
  },

  // Get user achievements
  async getUserAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });
  },

  // Award achievement to user
  async awardAchievement(userId: string, achievementId: string) {
    // Check if already earned
    const existing = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
    });

    if (existing) return existing;

    const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!achievement) throw new Error('Achievement not found');

    // Award achievement
    const userAchievement = await prisma.userAchievement.create({
      data: { userId, achievementId },
    });

    // Update user score
    await this.updateUserScore(userId, achievement.organizationId, achievement.points, 'achievement');

    // Increment earned count
    await prisma.achievement.update({
      where: { id: achievementId },
      data: { earnedCount: { increment: 1 } },
    });

    return userAchievement;
  },

  // Check and award achievements based on activity
  async checkAchievements(userId: string, organizationId: string, activityType: string, value: number) {
    const achievements = await prisma.achievement.findMany({
      where: { organizationId, isActive: true },
    });

    const earned = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const earnedIds = earned.map((e) => e.achievementId);

    const newAchievements = [];

    for (const achievement of achievements) {
      if (earnedIds.includes(achievement.id)) continue;

      const criteria = achievement.criteria as Record<string, any>;
      let qualified = false;

      // Check criteria based on type
      switch (achievement.type) {
        case 'CALLS_MADE':
          if (activityType === 'call' && criteria.count) {
            const totalCalls = await prisma.callLog.count({ where: { organizationId, callerId: userId } });
            qualified = totalCalls >= criteria.count;
          }
          break;

        case 'LEADS_CONVERTED':
          if (activityType === 'conversion' && criteria.count) {
            const conversions = await prisma.lead.count({
              where: {
                organizationId,
                assignments: { some: { assignedToId: userId, isActive: true } },
                isConverted: true,
              },
            });
            qualified = conversions >= criteria.count;
          }
          break;

        case 'DEALS_CLOSED':
          if (activityType === 'deal' && criteria.count) {
            qualified = value >= criteria.count;
          }
          break;

        case 'REVENUE_GENERATED':
          if (activityType === 'revenue' && criteria.amount) {
            qualified = value >= criteria.amount;
          }
          break;

        case 'STREAK':
          if (criteria.days) {
            const score = await prisma.gamificationScore.findUnique({
              where: { organizationId_userId: { organizationId, userId } },
            });
            qualified = (score?.currentStreak || 0) >= criteria.days;
          }
          break;

        case 'FIRST_ACTION':
          if (activityType === criteria.action) {
            qualified = true;
          }
          break;

        case 'PERFECT_WEEK':
          if (activityType === 'week_complete') {
            qualified = value === criteria.perfectScore;
          }
          break;

        case 'CUSTOM':
          if (criteria.field && criteria.operator && criteria.value) {
            switch (criteria.operator) {
              case 'gte':
                qualified = value >= criteria.value;
                break;
              case 'gt':
                qualified = value > criteria.value;
                break;
              case 'eq':
                qualified = value === criteria.value;
                break;
            }
          }
          break;
      }

      if (qualified) {
        const awarded = await this.awardAchievement(userId, achievement.id);
        newAchievements.push(awarded);
      }
    }

    return newAchievements;
  },

  // ==================== Scores & Leaderboard ====================

  // Get or create user score
  async getUserScore(organizationId: string, userId: string) {
    let score = await prisma.gamificationScore.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });

    if (!score) {
      score = await prisma.gamificationScore.create({
        data: { organizationId, userId },
      });
    }

    return score;
  },

  // Update user score
  async updateUserScore(
    userId: string,
    organizationId: string,
    points: number,
    source: string
  ) {
    const score = await this.getUserScore(organizationId, userId);

    // Update points
    const updated = await prisma.gamificationScore.update({
      where: { id: score.id },
      data: {
        totalPoints: { increment: points },
        weeklyPoints: { increment: points },
        monthlyPoints: { increment: points },
        quarterlyPoints: { increment: points },
        yearlyPoints: { increment: points },
      },
    });

    // Check for level up
    await this.checkLevelUp(score.id);

    return updated;
  },

  // Check and update level
  async checkLevelUp(scoreId: string) {
    const score = await prisma.gamificationScore.findUnique({ where: { id: scoreId } });
    if (!score) return;

    // Level thresholds (can be configured)
    const levelThresholds = [
      0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000,
      13000, 17000, 22000, 28000, 35000, 43000, 52000, 62000, 75000,
    ];

    const currentLevel = score.level;
    let newLevel = 1;

    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (score.totalPoints >= levelThresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }

    if (newLevel > currentLevel) {
      await prisma.gamificationScore.update({
        where: { id: scoreId },
        data: { level: newLevel },
      });
    }
  },

  // Update streak
  async updateStreak(organizationId: string, userId: string, activityDate: Date) {
    const score = await this.getUserScore(organizationId, userId);

    const lastActivity = score.lastActivityDate;
    const today = new Date(activityDate);
    today.setHours(0, 0, 0, 0);

    let newStreak = score.currentStreak;

    if (!lastActivity) {
      newStreak = 1;
    } else {
      const lastDate = new Date(lastActivity);
      lastDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = score.currentStreak + 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    const longestStreak = Math.max(score.longestStreak, newStreak);

    return prisma.gamificationScore.update({
      where: { id: score.id },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastActivityDate: activityDate,
      },
    });
  },

  // Get leaderboard
  async getLeaderboard(
    organizationId: string,
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'allTime' = 'weekly',
    limit = 10
  ) {
    const orderBy: any = {};

    switch (period) {
      case 'weekly':
        orderBy.weeklyPoints = 'desc';
        break;
      case 'monthly':
        orderBy.monthlyPoints = 'desc';
        break;
      case 'quarterly':
        orderBy.quarterlyPoints = 'desc';
        break;
      case 'yearly':
        orderBy.yearlyPoints = 'desc';
        break;
      case 'allTime':
        orderBy.totalPoints = 'desc';
        break;
    }

    const scores = await prisma.gamificationScore.findMany({
      where: { organizationId },
      orderBy,
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    return scores.map((score, index) => ({
      rank: index + 1,
      userId: score.userId,
      userName: score.user.name,
      userAvatar: score.user.avatar,
      points:
        period === 'weekly'
          ? score.weeklyPoints
          : period === 'monthly'
          ? score.monthlyPoints
          : period === 'quarterly'
          ? score.quarterlyPoints
          : period === 'yearly'
          ? score.yearlyPoints
          : score.totalPoints,
      level: score.level,
      streak: score.currentStreak,
    }));
  },

  // Reset periodic scores (called by cron)
  async resetPeriodicScores(organizationId: string, period: 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
    const data: any = {};

    switch (period) {
      case 'weekly':
        data.weeklyPoints = 0;
        break;
      case 'monthly':
        data.monthlyPoints = 0;
        break;
      case 'quarterly':
        data.quarterlyPoints = 0;
        break;
      case 'yearly':
        data.yearlyPoints = 0;
        break;
    }

    return prisma.gamificationScore.updateMany({
      where: { organizationId },
      data,
    });
  },

  // ==================== Challenges ====================

  // Get challenges
  async getChallenges(organizationId: string, status?: ChallengeStatus) {
    const where: any = { organizationId };
    if (status) where.status = status;

    return prisma.challenge.findMany({
      where,
      include: {
        _count: { select: { participants: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  },

  // Get single challenge
  async getChallenge(id: string) {
    return prisma.challenge.findUnique({
      where: { id },
      include: {
        participants: {
          orderBy: { score: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });
  },

  // Create challenge
  async createChallenge(organizationId: string, createdById: string, config: ChallengeConfig) {
    return prisma.challenge.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        type: config.type,
        startDate: config.startDate,
        endDate: config.endDate,
        goals: config.goals as any,
        rewards: config.rewards as any,
        isTeamChallenge: config.isTeamChallenge || false,
        maxParticipants: config.maxParticipants,
        createdById,
      },
    });
  },

  // Join challenge
  async joinChallenge(challengeId: string, userId: string, teamId?: string) {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new Error('Challenge not found');

    if (challenge.status !== 'UPCOMING' && challenge.status !== 'ACTIVE') {
      throw new Error('Challenge is not open for joining');
    }

    if (challenge.maxParticipants) {
      const count = await prisma.challengeParticipant.count({ where: { challengeId } });
      if (count >= challenge.maxParticipants) {
        throw new Error('Challenge is full');
      }
    }

    return prisma.challengeParticipant.create({
      data: { challengeId, userId, teamId },
    });
  },

  // Leave challenge
  async leaveChallenge(challengeId: string, userId: string) {
    return prisma.challengeParticipant.delete({
      where: { challengeId_userId: { challengeId, userId } },
    });
  },

  // Update participant progress
  async updateChallengeProgress(
    challengeId: string,
    userId: string,
    progressKey: string,
    value: number
  ) {
    const participant = await prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });

    if (!participant) return null;

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return null;

    const progress = (participant.progress as Record<string, number>) || {};
    progress[progressKey] = (progress[progressKey] || 0) + value;

    // Calculate score based on goals
    const goals = challenge.goals as Record<string, number>;
    let score = 0;
    Object.entries(progress).forEach(([key, val]) => {
      if (goals[key]) {
        score += Math.min(val / goals[key], 1) * 100;
      }
    });

    // Check if completed
    const isCompleted = Object.entries(goals).every(([key, target]) => (progress[key] || 0) >= target);

    return prisma.challengeParticipant.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: {
        progress: progress as any,
        score,
        isCompleted,
        completedAt: isCompleted && !participant.completedAt ? new Date() : undefined,
      },
    });
  },

  // Start challenge (called by cron or manually)
  async startChallenge(challengeId: string) {
    return prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'ACTIVE' },
    });
  },

  // End challenge
  async endChallenge(challengeId: string) {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) throw new Error('Challenge not found');

    // Determine winners
    const topParticipants = challenge.participants
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Award rewards
    const rewards = challenge.rewards as Record<string, any>;
    if (rewards && topParticipants.length > 0) {
      for (let i = 0; i < topParticipants.length; i++) {
        const position = i + 1;
        const rewardKey = `position${position}`;
        if (rewards[rewardKey]?.points) {
          await this.updateUserScore(
            topParticipants[i].userId,
            challenge.organizationId,
            rewards[rewardKey].points,
            'challenge_reward'
          );
        }
      }
    }

    return prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'COMPLETED' },
    });
  },

  // Get user's active challenges
  async getUserChallenges(userId: string) {
    return prisma.challengeParticipant.findMany({
      where: { userId },
      include: {
        challenge: true,
      },
      orderBy: { challenge: { endDate: 'asc' } },
    });
  },
};
