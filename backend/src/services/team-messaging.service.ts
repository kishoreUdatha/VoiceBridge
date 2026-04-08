/**
 * Team Messaging & Announcements Service
 * Enables managers/team leads to send announcements and messages to their teams
 */

import { prisma } from '../config/database';
import { pushNotificationService } from './push-notification.service';

export interface TeamAnnouncement {
  id: string;
  organizationId: string;
  title: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetType: 'ALL' | 'TEAM' | 'ROLE' | 'INDIVIDUAL';
  targetIds?: string[]; // User IDs, team IDs, or role slugs
  createdById: string;
  createdAt: Date;
  expiresAt?: Date;
  readBy: string[];
  isPinned: boolean;
}

interface CreateAnnouncementInput {
  title: string;
  message: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetType: 'ALL' | 'TEAM' | 'ROLE' | 'INDIVIDUAL';
  targetIds?: string[];
  expiresAt?: Date;
  isPinned?: boolean;
  sendPushNotification?: boolean;
}

interface TeamMessageInput {
  recipientId: string;
  message: string;
  attachmentUrl?: string;
}

class TeamMessagingService {
  /**
   * Create a team announcement
   */
  async createAnnouncement(
    organizationId: string,
    createdById: string,
    input: CreateAnnouncementInput
  ) {
    // Validate that creator has permission (admin, manager, or team_lead)
    const creator = await prisma.user.findUnique({
      where: { id: createdById },
      include: { role: true },
    });

    if (!creator) {
      throw new Error('User not found');
    }

    const allowedRoles = ['admin', 'manager', 'team_lead', 'teamlead'];
    if (!allowedRoles.includes(creator.role?.slug || '')) {
      throw new Error('Only admins, managers, and team leads can create announcements');
    }

    // For team leads, they can only target their own team members
    if ((creator.role?.slug === 'team_lead' || creator.role?.slug === 'teamlead') &&
        input.targetType !== 'TEAM') {
      throw new Error('Team leads can only send announcements to their team');
    }

    // Create announcement in organization settings (stored as JSON)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const announcements = settings.teamAnnouncements || [];

    const newAnnouncement: TeamAnnouncement = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      title: input.title,
      message: input.message,
      priority: input.priority || 'NORMAL',
      targetType: input.targetType,
      targetIds: input.targetIds,
      createdById,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
      readBy: [],
      isPinned: input.isPinned || false,
    };

    announcements.unshift(newAnnouncement);

    // Keep only last 100 announcements
    if (announcements.length > 100) {
      announcements.splice(100);
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          teamAnnouncements: announcements,
        },
      },
    });

    // Send push notifications if requested
    if (input.sendPushNotification) {
      await this.sendAnnouncementNotifications(organizationId, newAnnouncement, createdById);
    }

    return newAnnouncement;
  }

  /**
   * Send push notifications for announcement
   */
  private async sendAnnouncementNotifications(
    organizationId: string,
    announcement: TeamAnnouncement,
    senderId: string
  ) {
    try {
      let targetUserIds: string[] = [];

      switch (announcement.targetType) {
        case 'ALL':
          // Get all active users in organization
          const allUsers = await prisma.user.findMany({
            where: { organizationId, isActive: true },
            select: { id: true },
          });
          targetUserIds = allUsers.map(u => u.id).filter(id => id !== senderId);
          break;

        case 'TEAM':
          // Get team members (users where managerId = senderId)
          const teamMembers = await prisma.user.findMany({
            where: { organizationId, managerId: senderId, isActive: true },
            select: { id: true },
          });
          targetUserIds = teamMembers.map(u => u.id);
          break;

        case 'ROLE':
          // Get users by role slugs
          if (announcement.targetIds && announcement.targetIds.length > 0) {
            const roleUsers = await prisma.user.findMany({
              where: {
                organizationId,
                isActive: true,
                role: { slug: { in: announcement.targetIds } },
              },
              select: { id: true },
            });
            targetUserIds = roleUsers.map(u => u.id).filter(id => id !== senderId);
          }
          break;

        case 'INDIVIDUAL':
          targetUserIds = announcement.targetIds || [];
          break;
      }

      // Send notifications to all target users
      for (const userId of targetUserIds) {
        try {
          await pushNotificationService.sendPushNotification(userId, {
            title: `${announcement.priority === 'URGENT' ? '🚨 ' : ''}${announcement.title}`,
            body: announcement.message.substring(0, 200),
            data: {
              type: 'TEAM_ANNOUNCEMENT',
              announcementId: announcement.id,
              priority: announcement.priority,
            },
          });
        } catch (err) {
          console.error(`[TeamMessaging] Failed to send notification to user ${userId}:`, err);
        }
      }

      console.log(`[TeamMessaging] Sent notifications to ${targetUserIds.length} users`);
    } catch (error) {
      console.error('[TeamMessaging] Error sending announcement notifications:', error);
    }
  }

  /**
   * Get announcements for a user
   */
  async getAnnouncementsForUser(organizationId: string, userId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const allAnnouncements: TeamAnnouncement[] = settings.teamAnnouncements || [];

    // Get user info to determine which announcements they should see
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      return [];
    }

    const now = new Date();

    // Filter announcements based on target type and expiration
    const visibleAnnouncements = allAnnouncements.filter(announcement => {
      // Check if expired
      if (announcement.expiresAt && new Date(announcement.expiresAt) < now) {
        return false;
      }

      // Check target type
      switch (announcement.targetType) {
        case 'ALL':
          return true;
        case 'TEAM':
          // User should see if announcement was created by their manager
          return user.managerId === announcement.createdById;
        case 'ROLE':
          return announcement.targetIds?.includes(user.role?.slug || '');
        case 'INDIVIDUAL':
          return announcement.targetIds?.includes(userId);
        default:
          return false;
      }
    });

    // Add creator info
    const creatorIds = [...new Set(visibleAnnouncements.map(a => a.createdById))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, firstName: true, lastName: true, avatar: true },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    return visibleAnnouncements.map(announcement => ({
      ...announcement,
      creator: creatorMap.get(announcement.createdById),
      isRead: announcement.readBy.includes(userId),
    }));
  }

  /**
   * Mark announcement as read
   */
  async markAnnouncementAsRead(organizationId: string, announcementId: string, userId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const announcements: TeamAnnouncement[] = settings.teamAnnouncements || [];

    const announcementIndex = announcements.findIndex(a => a.id === announcementId);
    if (announcementIndex === -1) {
      throw new Error('Announcement not found');
    }

    if (!announcements[announcementIndex].readBy.includes(userId)) {
      announcements[announcementIndex].readBy.push(userId);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            teamAnnouncements: announcements,
          },
        },
      });
    }

    return { success: true };
  }

  /**
   * Delete announcement (admin/creator only)
   */
  async deleteAnnouncement(organizationId: string, announcementId: string, userId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const announcements: TeamAnnouncement[] = settings.teamAnnouncements || [];

    const announcementIndex = announcements.findIndex(a => a.id === announcementId);
    if (announcementIndex === -1) {
      throw new Error('Announcement not found');
    }

    // Check if user is creator or admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (announcements[announcementIndex].createdById !== userId && user?.role?.slug !== 'admin') {
      throw new Error('Only the creator or admin can delete this announcement');
    }

    announcements.splice(announcementIndex, 1);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          teamAnnouncements: announcements,
        },
      },
    });

    return { success: true };
  }

  /**
   * Send direct message to team member
   */
  async sendDirectMessage(
    organizationId: string,
    senderId: string,
    input: TeamMessageInput
  ) {
    // Verify sender and recipient are in the same organization
    const [sender, recipient] = await Promise.all([
      prisma.user.findFirst({ where: { id: senderId, organizationId } }),
      prisma.user.findFirst({ where: { id: input.recipientId, organizationId } }),
    ]);

    if (!sender || !recipient) {
      throw new Error('Sender or recipient not found');
    }

    // Store message in organization settings
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const messages = settings.teamMessages || [];

    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      recipientId: input.recipientId,
      message: input.message,
      attachmentUrl: input.attachmentUrl,
      createdAt: new Date(),
      readAt: null,
    };

    messages.push(newMessage);

    // Keep only last 1000 messages
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          teamMessages: messages,
        },
      },
    });

    // Send push notification
    try {
      await pushNotificationService.sendPushNotification(input.recipientId, {
        title: `Message from ${sender.firstName} ${sender.lastName}`,
        body: input.message.substring(0, 200),
        data: {
          type: 'DIRECT_MESSAGE',
          messageId: newMessage.id,
          senderId,
        },
      });
    } catch (err) {
      console.error('[TeamMessaging] Failed to send message notification:', err);
    }

    return newMessage;
  }

  /**
   * Get direct messages between two users
   */
  async getDirectMessages(organizationId: string, userId: string, otherUserId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const messages = settings.teamMessages || [];

    // Filter messages between the two users
    const conversation = messages.filter(
      (msg: any) =>
        (msg.senderId === userId && msg.recipientId === otherUserId) ||
        (msg.senderId === otherUserId && msg.recipientId === userId)
    );

    // Mark messages as read
    const unreadMessages = conversation.filter(
      (msg: any) => msg.recipientId === userId && !msg.readAt
    );

    if (unreadMessages.length > 0) {
      const updatedMessages = messages.map((msg: any) => {
        if (msg.recipientId === userId && msg.senderId === otherUserId && !msg.readAt) {
          return { ...msg, readAt: new Date() };
        }
        return msg;
      });

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            teamMessages: updatedMessages,
          },
        },
      });
    }

    return conversation;
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(organizationId: string, userId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};

    // Count unread announcements
    const announcements: TeamAnnouncement[] = settings.teamAnnouncements || [];
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    let unreadAnnouncements = 0;
    if (user) {
      const now = new Date();
      unreadAnnouncements = announcements.filter(a => {
        if (a.expiresAt && new Date(a.expiresAt) < now) return false;
        if (a.readBy.includes(userId)) return false;

        switch (a.targetType) {
          case 'ALL': return true;
          case 'TEAM': return user.managerId === a.createdById;
          case 'ROLE': return a.targetIds?.includes(user.role?.slug || '');
          case 'INDIVIDUAL': return a.targetIds?.includes(userId);
          default: return false;
        }
      }).length;
    }

    // Count unread direct messages
    const messages = settings.teamMessages || [];
    const unreadMessages = messages.filter(
      (msg: any) => msg.recipientId === userId && !msg.readAt
    ).length;

    return {
      announcements: unreadAnnouncements,
      messages: unreadMessages,
      total: unreadAnnouncements + unreadMessages,
    };
  }
}

export const teamMessagingService = new TeamMessagingService();
export default teamMessagingService;
