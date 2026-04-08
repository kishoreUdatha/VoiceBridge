/**
 * Performance Targets & Alerts Service
 * Manages daily targets for telecallers and sends performance alerts
 */

import { prisma } from '../config/database';
import { pushNotificationService } from './push-notification.service';

export interface DailyTarget {
  userId: string;
  organizationId: string;
  date: string; // YYYY-MM-DD
  callTarget: number;
  conversionTarget: number;
  talkTimeTarget: number; // in minutes
  callsCompleted: number;
  conversions: number;
  talkTimeMinutes: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'LOW_PERFORMANCE' | 'TARGET_ACHIEVED' | 'STREAK' | 'DAILY_SUMMARY';
  userId: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
}

interface SetTargetInput {
  callTarget?: number;
  conversionTarget?: number;
  talkTimeTarget?: number;
}

class PerformanceTargetsService {
  private readonly DEFAULT_TARGETS = {
    callTarget: 50,
    conversionTarget: 5,
    talkTimeTarget: 180, // 3 hours
  };

  /**
   * Set daily targets for a user
   */
  async setDailyTarget(
    organizationId: string,
    userId: string,
    input: SetTargetInput,
    setBy: string
  ) {
    const today = new Date().toISOString().split('T')[0];

    // Store in organization settings
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const targets = settings.dailyTargets || {};

    if (!targets[userId]) {
      targets[userId] = {};
    }

    targets[userId][today] = {
      ...this.DEFAULT_TARGETS,
      ...targets[userId][today],
      ...input,
      updatedAt: new Date(),
      updatedBy: setBy,
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          dailyTargets: targets,
        },
      },
    });

    return targets[userId][today];
  }

  /**
   * Set default targets for all telecallers
   */
  async setOrganizationDefaultTargets(
    organizationId: string,
    input: SetTargetInput,
    setBy: string
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};

    settings.defaultDailyTargets = {
      ...this.DEFAULT_TARGETS,
      ...input,
      updatedAt: new Date(),
      updatedBy: setBy,
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings },
    });

    return settings.defaultDailyTargets;
  }

  /**
   * Get targets for a user
   */
  async getUserTargets(organizationId: string, userId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const targets = settings.dailyTargets || {};
    const userTargets = targets[userId]?.[targetDate];

    // Fall back to organization defaults
    const defaultTargets = settings.defaultDailyTargets || this.DEFAULT_TARGETS;

    // Get actual performance for the day
    const performance = await this.getUserDailyPerformance(organizationId, userId, targetDate);

    return {
      targets: userTargets || defaultTargets,
      performance,
      progress: {
        calls: performance.callsCompleted / (userTargets?.callTarget || defaultTargets.callTarget) * 100,
        conversions: performance.conversions / (userTargets?.conversionTarget || defaultTargets.conversionTarget) * 100,
        talkTime: performance.talkTimeMinutes / (userTargets?.talkTimeTarget || defaultTargets.talkTimeTarget) * 100,
      },
    };
  }

  /**
   * Get actual daily performance for a user
   */
  async getUserDailyPerformance(organizationId: string, userId: string, date: string) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Get telecaller calls for the day
    const [callStats, rawImportStats] = await Promise.all([
      prisma.telecallerCall.aggregate({
        where: {
          organizationId,
          telecallerId: userId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        _count: { id: true },
        _sum: { duration: true },
      }),
      prisma.rawImportRecord.count({
        where: {
          organizationId,
          assignedToId: userId,
          status: 'CONVERTED',
          convertedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
    ]);

    return {
      callsCompleted: callStats._count.id || 0,
      conversions: rawImportStats || 0,
      talkTimeMinutes: Math.round((callStats._sum.duration || 0) / 60),
    };
  }

  /**
   * Get team performance overview (for managers/team leads)
   */
  async getTeamPerformance(organizationId: string, managerId?: string) {
    const today = new Date().toISOString().split('T')[0];

    // Get team members
    const whereClause: any = {
      organizationId,
      isActive: true,
      role: { slug: 'telecaller' },
    };

    if (managerId) {
      whereClause.managerId = managerId;
    }

    const teamMembers = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, firstName: true, lastName: true, avatar: true },
    });

    // Get performance and targets for each member
    const teamPerformance = await Promise.all(
      teamMembers.map(async (member) => {
        const data = await this.getUserTargets(organizationId, member.id, today);
        return {
          user: member,
          ...data,
        };
      })
    );

    // Sort by overall progress (average of all metrics)
    teamPerformance.sort((a, b) => {
      const avgA = (a.progress.calls + a.progress.conversions + a.progress.talkTime) / 3;
      const avgB = (b.progress.calls + b.progress.conversions + b.progress.talkTime) / 3;
      return avgB - avgA;
    });

    return teamPerformance;
  }

  /**
   * Check and send performance alerts
   * This should be called periodically (e.g., every hour)
   */
  async checkAndSendAlerts(organizationId: string) {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    // Get all telecallers
    const telecallers = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { slug: 'telecaller' },
      },
      select: { id: true, firstName: true, lastName: true, managerId: true },
    });

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const alerts = settings.performanceAlerts || [];
    const newAlerts: PerformanceAlert[] = [];

    for (const telecaller of telecallers) {
      const { targets, performance, progress } = await this.getUserTargets(
        organizationId,
        telecaller.id,
        today
      );

      // Check for low performance at mid-day (after 2 PM)
      if (currentHour >= 14) {
        const expectedProgress = ((currentHour - 9) / 8) * 100; // Assuming 9 AM - 5 PM workday

        if (progress.calls < expectedProgress * 0.5) {
          // Less than 50% of expected progress
          const alertId = `alert_${telecaller.id}_${today}_low`;

          // Check if alert already sent today
          const existingAlert = alerts.find((a: PerformanceAlert) =>
            a.id === alertId && a.createdAt.toString().startsWith(today)
          );

          if (!existingAlert) {
            const alert: PerformanceAlert = {
              id: alertId,
              type: 'LOW_PERFORMANCE',
              userId: telecaller.id,
              message: `${telecaller.firstName} is behind on call targets (${Math.round(progress.calls)}% of daily goal)`,
              createdAt: new Date(),
            };

            newAlerts.push(alert);

            // Notify manager
            if (telecaller.managerId) {
              try {
                await pushNotificationService.sendPushNotification(telecaller.managerId, {
                  title: 'Performance Alert',
                  body: alert.message,
                  data: { type: 'PERFORMANCE_ALERT', userId: telecaller.id },
                });
              } catch (err) {
                console.error('[PerformanceTargets] Failed to send alert to manager:', err);
              }
            }
          }
        }
      }

      // Check for target achieved
      if (progress.calls >= 100 && progress.conversions >= 100) {
        const alertId = `alert_${telecaller.id}_${today}_achieved`;

        const existingAlert = alerts.find((a: PerformanceAlert) =>
          a.id === alertId && a.createdAt.toString().startsWith(today)
        );

        if (!existingAlert) {
          const alert: PerformanceAlert = {
            id: alertId,
            type: 'TARGET_ACHIEVED',
            userId: telecaller.id,
            message: `${telecaller.firstName} has achieved their daily targets!`,
            createdAt: new Date(),
          };

          newAlerts.push(alert);

          // Notify the user
          try {
            await pushNotificationService.sendPushNotification(telecaller.id, {
              title: 'Target Achieved! 🎉',
              body: 'Congratulations! You have achieved your daily targets.',
              data: { type: 'TARGET_ACHIEVED' },
            });
          } catch (err) {
            console.error('[PerformanceTargets] Failed to send achievement notification:', err);
          }
        }
      }
    }

    // Save new alerts
    if (newAlerts.length > 0) {
      alerts.push(...newAlerts);

      // Keep only last 500 alerts
      if (alerts.length > 500) {
        alerts.splice(0, alerts.length - 500);
      }

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            performanceAlerts: alerts,
          },
        },
      });
    }

    return newAlerts;
  }

  /**
   * Get alerts for a user (manager sees team alerts, telecaller sees own)
   */
  async getAlerts(organizationId: string, userId: string, userRole?: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const alerts: PerformanceAlert[] = settings.performanceAlerts || [];

    // Filter alerts based on role
    if (userRole === 'admin' || userRole === 'manager') {
      // Admins/managers see all alerts
      return alerts.slice(-50).reverse();
    } else if (userRole === 'team_lead' || userRole === 'teamlead') {
      // Team leads see their team's alerts
      const teamMembers = await prisma.user.findMany({
        where: { organizationId, managerId: userId },
        select: { id: true },
      });
      const teamIds = teamMembers.map(m => m.id);
      teamIds.push(userId);

      return alerts
        .filter(a => teamIds.includes(a.userId))
        .slice(-50)
        .reverse();
    } else {
      // Telecallers see only their own alerts
      return alerts
        .filter(a => a.userId === userId)
        .slice(-20)
        .reverse();
    }
  }

  /**
   * Send end-of-day summary to all users
   */
  async sendDailySummary(organizationId: string) {
    const today = new Date().toISOString().split('T')[0];

    const telecallers = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { slug: 'telecaller' },
      },
      select: { id: true, firstName: true },
    });

    for (const telecaller of telecallers) {
      const { performance, progress } = await this.getUserTargets(
        organizationId,
        telecaller.id,
        today
      );

      const avgProgress = Math.round((progress.calls + progress.conversions + progress.talkTime) / 3);

      try {
        await pushNotificationService.sendPushNotification(telecaller.id, {
          title: 'Daily Performance Summary',
          body: `Today: ${performance.callsCompleted} calls, ${performance.conversions} conversions. Overall: ${avgProgress}% of targets.`,
          data: { type: 'DAILY_SUMMARY', date: today },
        });
      } catch (err) {
        console.error(`[PerformanceTargets] Failed to send daily summary to ${telecaller.id}:`, err);
      }
    }
  }

  /**
   * Get leaderboard for the day/week/month
   */
  async getLeaderboard(
    organizationId: string,
    period: 'day' | 'week' | 'month' = 'day',
    managerId?: string
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate = new Date(now.toISOString().split('T')[0]);
    }

    // Get telecallers (optionally filtered by manager)
    const whereClause: any = {
      organizationId,
      isActive: true,
      role: { slug: 'telecaller' },
    };

    if (managerId) {
      whereClause.managerId = managerId;
    }

    const telecallers = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, firstName: true, lastName: true, avatar: true },
    });

    // Get performance for each telecaller
    const leaderboard = await Promise.all(
      telecallers.map(async (user) => {
        const [callStats, conversionCount] = await Promise.all([
          prisma.telecallerCall.aggregate({
            where: {
              organizationId,
              telecallerId: user.id,
              createdAt: { gte: startDate },
            },
            _count: { id: true },
            _sum: { duration: true },
          }),
          prisma.rawImportRecord.count({
            where: {
              organizationId,
              assignedToId: user.id,
              status: 'CONVERTED',
              convertedAt: { gte: startDate },
            },
          }),
        ]);

        return {
          user,
          calls: callStats._count.id || 0,
          conversions: conversionCount,
          talkTimeMinutes: Math.round((callStats._sum.duration || 0) / 60),
          score: (callStats._count.id || 0) * 1 + conversionCount * 10, // Weighted score
        };
      })
    );

    // Sort by score
    leaderboard.sort((a, b) => b.score - a.score);

    // Add rank
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }
}

export const performanceTargetsService = new PerformanceTargetsService();
export default performanceTargetsService;
