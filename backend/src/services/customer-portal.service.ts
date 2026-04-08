/**
 * Customer Self-Service Portal Service
 * Handles portal users, authentication, and knowledge base
 */

import { PrismaClient, ArticleStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.PORTAL_JWT_SECRET || 'portal-secret-key';

interface PortalUserConfig {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  accountId?: string;
  leadId?: string;
}

interface ArticleConfig {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  categoryId?: string;
  tags?: string[];
  isPublic?: boolean;
  isInternal?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export const customerPortalService = {
  // ==================== Portal Users ====================

  // Register portal user
  async registerUser(organizationId: string, config: PortalUserConfig) {
    const existingUser = await prisma.portalUser.findUnique({
      where: { organizationId_email: { organizationId, email: config.email } },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(config.password, 10);

    return prisma.portalUser.create({
      data: {
        organizationId,
        email: config.email,
        passwordHash,
        firstName: config.firstName,
        lastName: config.lastName,
        phone: config.phone,
        accountId: config.accountId,
        leadId: config.leadId,
      },
    });
  },

  // Login
  async login(organizationId: string, email: string, password: string) {
    const user = await prisma.portalUser.findUnique({
      where: { organizationId_email: { organizationId, email } },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Create session
    const token = jwt.sign(
      { userId: user.id, organizationId, type: 'portal' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.portalSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Update last login
    await prisma.portalUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  },

  // Validate token
  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const session = await prisma.portalSession.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      return session.user;
    } catch {
      return null;
    }
  },

  // Logout
  async logout(token: string) {
    await prisma.portalSession.delete({ where: { token } });
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<PortalUserConfig>) {
    const data: any = {};
    if (updates.firstName) data.firstName = updates.firstName;
    if (updates.lastName) data.lastName = updates.lastName;
    if (updates.phone) data.phone = updates.phone;
    if (updates.password) {
      data.passwordHash = await bcrypt.hash(updates.password, 10);
    }

    return prisma.portalUser.update({
      where: { id: userId },
      data,
    });
  },

  // Get user's tickets
  async getUserTickets(userId: string) {
    const user = await prisma.portalUser.findUnique({
      where: { id: userId },
    });

    if (!user) return [];

    const where: any = {};
    if (user.accountId) {
      where.accountId = user.accountId;
    } else if (user.leadId) {
      where.leadId = user.leadId;
    } else {
      where.contactEmail = user.email;
    }

    return prisma.serviceTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  // Create ticket from portal
  async createTicket(userId: string, subject: string, description: string, type: string) {
    const user = await prisma.portalUser.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    const ticketNumber = await this.generateTicketNumber(user.organizationId);

    return prisma.serviceTicket.create({
      data: {
        organizationId: user.organizationId,
        ticketNumber,
        subject,
        description,
        type: type as any,
        channel: 'WEB_FORM',
        accountId: user.accountId,
        leadId: user.leadId,
        contactEmail: user.email,
        contactName: `${user.firstName} ${user.lastName || ''}`.trim(),
      },
    });
  },

  async generateTicketNumber(organizationId: string): Promise<string> {
    const count = await prisma.serviceTicket.count({ where: { organizationId } });
    return `TKT-${String(count + 1).padStart(6, '0')}`;
  },

  // Add comment to ticket from portal
  async addTicketComment(userId: string, ticketId: string, content: string) {
    return prisma.ticketComment.create({
      data: {
        ticketId,
        content,
        isFromCustomer: true,
      },
    });
  },

  // ==================== Knowledge Base ====================

  // Get public articles
  async getPublicArticles(organizationId: string, categoryId?: string, search?: string) {
    const where: any = {
      organizationId,
      isPublic: true,
      status: 'PUBLISHED',
    };

    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.knowledgeArticle.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    });
  },

  // Get article by slug
  async getArticleBySlug(organizationId: string, slug: string) {
    const article = await prisma.knowledgeArticle.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
      include: {
        category: true,
        feedback: {
          select: { isHelpful: true },
        },
      },
    });

    if (article) {
      // Increment view count
      await prisma.knowledgeArticle.update({
        where: { id: article.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return article;
  },

  // Get categories
  async getCategories(organizationId: string) {
    return prisma.knowledgeCategory.findMany({
      where: { organizationId, isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  },

  // Create category
  async createCategory(
    organizationId: string,
    name: string,
    slug: string,
    description?: string,
    parentId?: string,
    icon?: string
  ) {
    const maxOrder = await prisma.knowledgeCategory.findFirst({
      where: { organizationId, parentId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return prisma.knowledgeCategory.create({
      data: {
        organizationId,
        name,
        slug,
        description,
        parentId,
        icon,
        sortOrder: (maxOrder?.sortOrder || 0) + 1,
      },
    });
  },

  // Create article
  async createArticle(organizationId: string, authorId: string, config: ArticleConfig) {
    return prisma.knowledgeArticle.create({
      data: {
        organizationId,
        title: config.title,
        slug: config.slug,
        content: config.content,
        excerpt: config.excerpt,
        categoryId: config.categoryId,
        tags: config.tags as any,
        isPublic: config.isPublic ?? true,
        isInternal: config.isInternal ?? false,
        metaTitle: config.metaTitle,
        metaDescription: config.metaDescription,
        authorId,
      },
    });
  },

  // Update article
  async updateArticle(id: string, config: Partial<ArticleConfig & { status?: ArticleStatus }>) {
    return prisma.knowledgeArticle.update({
      where: { id },
      data: {
        title: config.title,
        slug: config.slug,
        content: config.content,
        excerpt: config.excerpt,
        categoryId: config.categoryId,
        tags: config.tags as any,
        isPublic: config.isPublic,
        isInternal: config.isInternal,
        status: config.status,
        publishedAt: config.status === 'PUBLISHED' ? new Date() : undefined,
        metaTitle: config.metaTitle,
        metaDescription: config.metaDescription,
      },
    });
  },

  // Delete article
  async deleteArticle(id: string) {
    return prisma.knowledgeArticle.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  },

  // Submit article feedback
  async submitFeedback(articleId: string, portalUserId: string | null, isHelpful: boolean, comment?: string) {
    const feedback = await prisma.articleFeedback.create({
      data: {
        articleId,
        portalUserId,
        isHelpful,
        comment,
      },
    });

    // Update article counts
    const updateField = isHelpful ? 'helpfulCount' : 'notHelpfulCount';
    await prisma.knowledgeArticle.update({
      where: { id: articleId },
      data: { [updateField]: { increment: 1 } },
    });

    return feedback;
  },

  // Search knowledge base
  async searchKnowledgeBase(organizationId: string, query: string, limit = 10) {
    return prisma.knowledgeArticle.findMany({
      where: {
        organizationId,
        isPublic: true,
        status: 'PUBLISHED',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: { select: { name: true, slug: true } },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });
  },

  // Get popular articles
  async getPopularArticles(organizationId: string, limit = 5) {
    return prisma.knowledgeArticle.findMany({
      where: {
        organizationId,
        isPublic: true,
        status: 'PUBLISHED',
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        category: { select: { name: true } },
      },
    });
  },
};
