/**
 * Collaboration Service
 * Handles activity feed, mentions, and comments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class CollaborationService {
  /**
   * Log an activity
   */
  async logActivity(data: {
    organizationId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    details?: any;
    mentionedUserIds?: string[];
  }) {
    const activity = await prisma.activityFeed.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        details: data.details,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Create mentions if any
    if (data.mentionedUserIds && data.mentionedUserIds.length > 0) {
      await prisma.mention.createMany({
        data: data.mentionedUserIds.map(userId => ({
          organizationId: data.organizationId,
          activityId: activity.id,
          mentionedUserId: userId,
        })),
      });
    }

    return activity;
  }

  /**
   * Get activity feed
   */
  async getActivityFeed(organizationId: string, options: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { entityType, entityId, userId, limit = 50, offset = 0 } = options;

    const where: any = { organizationId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    const [activities, total] = await Promise.all([
      prisma.activityFeed.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          mentions: {
            include: {
              mentionedUser: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.activityFeed.count({ where }),
    ]);

    return { activities, total };
  }

  /**
   * Get mentions for a user
   */
  async getMentions(userId: string, organizationId: string, unreadOnly: boolean = false) {
    const where: any = { organizationId, mentionedUserId: userId };
    if (unreadOnly) where.isRead = false;

    const mentions = await prisma.mention.findMany({
      where,
      include: {
        activity: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return mentions;
  }

  /**
   * Mark mentions as read
   */
  async markMentionsRead(mentionIds: string[], userId: string) {
    await prisma.mention.updateMany({
      where: { id: { in: mentionIds }, mentionedUserId: userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Add comment to a lead
   */
  async addComment(data: {
    organizationId: string;
    leadId: string;
    userId: string;
    content: string;
    mentions?: string[];
    parentId?: string;
  }) {
    const comment = await prisma.leadComment.create({
      data: {
        organizationId: data.organizationId,
        leadId: data.leadId,
        userId: data.userId,
        content: data.content,
        mentions: data.mentions || [],
        parentId: data.parentId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    // Log activity and create mentions
    await this.logActivity({
      organizationId: data.organizationId,
      userId: data.userId,
      action: 'COMMENT',
      entityType: 'Lead',
      entityId: data.leadId,
      details: { commentId: comment.id, preview: data.content.slice(0, 100) },
      mentionedUserIds: data.mentions,
    });

    return comment;
  }

  /**
   * Get comments for a lead
   */
  async getComments(leadId: string, organizationId: string) {
    const comments = await prisma.leadComment.findMany({
      where: { leadId, organizationId, parentId: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        replies: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string, organizationId: string) {
    const comment = await prisma.leadComment.findFirst({
      where: { id: commentId, userId, organizationId },
    });

    if (!comment) throw new Error('Comment not found or unauthorized');

    await prisma.leadComment.delete({ where: { id: commentId } });
    return { success: true };
  }
}

export const collaborationService = new CollaborationService();
