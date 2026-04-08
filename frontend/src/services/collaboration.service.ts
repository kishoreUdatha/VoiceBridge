/**
 * Collaboration Service
 * Handles activity feed, mentions, and comments
 */

import api from './api';

export interface Activity {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  details?: any;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  mentions?: Mention[];
}

export interface Mention {
  id: string;
  activityId: string;
  mentionedUserId: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  activity?: Activity;
  mentionedUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Comment {
  id: string;
  leadId: string;
  userId: string;
  content: string;
  mentions: string[];
  parentId?: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  replies?: Comment[];
}

class CollaborationService {
  /**
   * Get activity feed
   */
  async getActivityFeed(params?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ activities: Activity[]; total: number }> {
    const response = await api.get('/collaboration/activity', { params });
    return { activities: response.data.data, total: response.data.total };
  }

  /**
   * Get mentions for current user
   */
  async getMentions(unreadOnly: boolean = false): Promise<Mention[]> {
    const response = await api.get('/collaboration/mentions', {
      params: { unreadOnly },
    });
    return response.data.data;
  }

  /**
   * Mark mentions as read
   */
  async markMentionsRead(mentionIds: string[]): Promise<void> {
    await api.post('/collaboration/mentions/read', { mentionIds });
  }

  /**
   * Get comments for a lead
   */
  async getLeadComments(leadId: string): Promise<Comment[]> {
    const response = await api.get(`/collaboration/leads/${leadId}/comments`);
    return response.data.data;
  }

  /**
   * Add comment to a lead
   */
  async addComment(data: {
    leadId: string;
    content: string;
    mentions?: string[];
    parentId?: string;
  }): Promise<Comment> {
    const response = await api.post(`/collaboration/leads/${data.leadId}/comments`, {
      content: data.content,
      mentions: data.mentions,
      parentId: data.parentId,
    });
    return response.data.data;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/collaboration/comments/${commentId}`);
  }
}

export const collaborationService = new CollaborationService();
