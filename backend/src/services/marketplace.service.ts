import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import {
  AgentTemplate,
  AgentTemplateStatus,
  AgentPriceType,
  VoiceAgentIndustry,
  LicenseType,
  LicenseStatus,
  Prisma,
} from '@prisma/client';

interface CreateAgentTemplateDto {
  creatorId: string;
  creatorType?: string;
  name: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  industry: VoiceAgentIndustry;
  category?: string;
  tags?: string[];
  systemPrompt: string;
  voiceId?: string;
  language?: string;
  temperature?: number;
  greeting?: string;
  fallbackMessage?: string;
  questions?: any[];
  knowledgeBase?: string;
  faqs?: any[];
  priceType?: AgentPriceType;
  oneTimePrice?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  iconUrl?: string;
  bannerUrl?: string;
  documentation?: string;
  setupGuide?: string;
}

interface UpdateAgentTemplateDto {
  name?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  tags?: string[];
  systemPrompt?: string;
  voiceId?: string;
  language?: string;
  temperature?: number;
  greeting?: string;
  fallbackMessage?: string;
  questions?: any[];
  knowledgeBase?: string;
  faqs?: any[];
  priceType?: AgentPriceType;
  oneTimePrice?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  iconUrl?: string;
  bannerUrl?: string;
  screenshots?: string[];
  demoVideoUrl?: string;
  documentation?: string;
  setupGuide?: string;
}

class MarketplaceService {
  // Create a new agent template
  async createTemplate(data: CreateAgentTemplateDto): Promise<AgentTemplate> {
    // Generate slug
    const baseSlug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await prisma.agentTemplate.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const template = await prisma.agentTemplate.create({
      data: {
        creatorId: data.creatorId,
        creatorType: data.creatorType || 'ORGANIZATION',
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        industry: data.industry,
        category: data.category,
        tags: data.tags || [],
        systemPrompt: data.systemPrompt,
        voiceId: data.voiceId || 'alloy',
        language: data.language || 'en',
        temperature: data.temperature || 0.7,
        greeting: data.greeting,
        fallbackMessage: data.fallbackMessage,
        questions: data.questions || [],
        knowledgeBase: data.knowledgeBase,
        faqs: data.faqs || [],
        priceType: data.priceType || 'FREE',
        oneTimePrice: data.oneTimePrice,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        iconUrl: data.iconUrl,
        bannerUrl: data.bannerUrl,
        documentation: data.documentation,
        setupGuide: data.setupGuide,
        status: 'DRAFT',
      },
    });

    return template;
  }

  // Update agent template
  async updateTemplate(
    templateId: string,
    creatorId: string,
    data: UpdateAgentTemplateDto
  ): Promise<AgentTemplate> {
    const template = await prisma.agentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    if (template.creatorId !== creatorId && template.creatorType !== 'PLATFORM') {
      throw new AppError('Not authorized to update this template', 403);
    }

    return prisma.agentTemplate.update({
      where: { id: templateId },
      data: {
        ...data,
        lastUpdatedAt: new Date(),
      },
    });
  }

  // Submit template for review
  async submitForReview(templateId: string, creatorId: string): Promise<AgentTemplate> {
    const template = await prisma.agentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    if (template.creatorId !== creatorId) {
      throw new AppError('Not authorized', 403);
    }

    if (template.status !== 'DRAFT') {
      throw new AppError('Template is not in draft status', 400);
    }

    // Validate required fields
    if (!template.name || !template.description || !template.systemPrompt) {
      throw new AppError('Template is missing required fields', 400);
    }

    return prisma.agentTemplate.update({
      where: { id: templateId },
      data: {
        status: 'PENDING_REVIEW',
      },
    });
  }

  // Approve template (super admin)
  async approveTemplate(templateId: string): Promise<AgentTemplate> {
    const template = await prisma.agentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    if (template.status !== 'PENDING_REVIEW') {
      throw new AppError('Template is not pending review', 400);
    }

    return prisma.agentTemplate.update({
      where: { id: templateId },
      data: {
        status: 'APPROVED',
        isVerified: true,
      },
    });
  }

  // Publish template
  async publishTemplate(templateId: string, creatorId: string): Promise<AgentTemplate> {
    const template = await prisma.agentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    if (template.creatorId !== creatorId && template.creatorType !== 'PLATFORM') {
      throw new AppError('Not authorized', 403);
    }

    if (template.status !== 'APPROVED' && template.status !== 'DRAFT') {
      throw new AppError('Template cannot be published', 400);
    }

    return prisma.agentTemplate.update({
      where: { id: templateId },
      data: {
        status: 'PUBLISHED',
        isPublic: true,
        publishedAt: new Date(),
      },
    });
  }

  // List marketplace templates (public)
  async listTemplates(params: {
    industry?: VoiceAgentIndustry;
    category?: string;
    priceType?: AgentPriceType;
    search?: string;
    featured?: boolean;
    sortBy?: 'popular' | 'newest' | 'rating' | 'price_low' | 'price_high';
    page?: number;
    limit?: number;
  }) {
    const {
      industry,
      category,
      priceType,
      search,
      featured,
      sortBy = 'popular',
      page = 1,
      limit = 12,
    } = params;

    const where: Prisma.AgentTemplateWhereInput = {
      isPublic: true,
      status: 'PUBLISHED',
    };

    if (industry) where.industry = industry;
    if (category) where.category = category;
    if (priceType) where.priceType = priceType;
    if (featured) where.isFeatured = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.AgentTemplateOrderByWithRelationInput;
    switch (sortBy) {
      case 'newest':
        orderBy = { publishedAt: 'desc' };
        break;
      case 'rating':
        orderBy = { averageRating: 'desc' };
        break;
      case 'price_low':
        orderBy = { monthlyPrice: 'asc' };
        break;
      case 'price_high':
        orderBy = { monthlyPrice: 'desc' };
        break;
      default:
        orderBy = { installCount: 'desc' };
    }

    const [templates, total] = await Promise.all([
      prisma.agentTemplate.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          industry: true,
          category: true,
          tags: true,
          priceType: true,
          oneTimePrice: true,
          monthlyPrice: true,
          iconUrl: true,
          bannerUrl: true,
          isFeatured: true,
          isVerified: true,
          viewCount: true,
          installCount: true,
          averageRating: true,
          ratingCount: true,
          creatorType: true,
          publishedAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      prisma.agentTemplate.count({ where }),
    ]);

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get template details
  async getTemplateBySlug(slug: string): Promise<any> {
    const template = await prisma.agentTemplate.findUnique({
      where: { slug },
      include: {
        reviews: {
          where: { isPublished: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            reviews: true,
            licenses: true,
          },
        },
      },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Increment view count
    await prisma.agentTemplate.update({
      where: { id: template.id },
      data: { viewCount: { increment: 1 } },
    });

    return template;
  }

  // Get template by ID
  async getTemplateById(id: string): Promise<AgentTemplate | null> {
    return prisma.agentTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reviews: true,
            licenses: true,
          },
        },
      },
    });
  }

  // Purchase/Subscribe to agent
  async purchaseAgent(params: {
    templateId: string;
    organizationId: string;
    partnerId?: string;
    paymentId?: string;
    invoiceId?: string;
  }): Promise<any> {
    const template = await prisma.agentTemplate.findUnique({
      where: { id: params.templateId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    if (!template.isPublic || template.status !== 'PUBLISHED') {
      throw new AppError('Template is not available', 400);
    }

    // Check if already licensed
    const existingLicense = await prisma.agentLicense.findFirst({
      where: {
        templateId: params.templateId,
        organizationId: params.organizationId,
        status: 'ACTIVE',
      },
    });

    if (existingLicense) {
      throw new AppError('You already have an active license for this agent', 400);
    }

    // Determine price
    let pricePaid = 0;
    let expiresAt: Date | null = null;

    if (template.priceType === 'ONE_TIME') {
      pricePaid = template.oneTimePrice || 0;
    } else if (template.priceType === 'MONTHLY') {
      pricePaid = template.monthlyPrice || 0;
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (template.priceType === 'YEARLY') {
      pricePaid = template.yearlyPrice || 0;
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Create license
    const license = await prisma.agentLicense.create({
      data: {
        templateId: params.templateId,
        organizationId: params.organizationId,
        partnerId: params.partnerId,
        licenseType: 'STANDARD',
        priceType: template.priceType,
        pricePaid,
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiresAt,
        expiresAt,
        paymentId: params.paymentId,
        invoiceId: params.invoiceId,
        status: 'ACTIVE',
      },
    });

    // Update template stats
    await prisma.agentTemplate.update({
      where: { id: params.templateId },
      data: {
        installCount: { increment: 1 },
        activeInstalls: { increment: 1 },
        totalRevenue: { increment: pricePaid },
      },
    });

    return license;
  }

  // Get user's licensed agents
  async getUserLicenses(organizationId: string, params: {
    status?: LicenseStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 10 } = params;

    const where: Prisma.AgentLicenseWhereInput = { organizationId };
    if (status) where.status = status;

    const [licenses, total] = await Promise.all([
      prisma.agentLicense.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              name: true,
              slug: true,
              shortDescription: true,
              industry: true,
              iconUrl: true,
              priceType: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { purchasedAt: 'desc' },
      }),
      prisma.agentLicense.count({ where }),
    ]);

    return {
      licenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Install agent from template
  async installAgent(
    licenseId: string,
    organizationId: string,
    customization?: {
      name?: string;
      greeting?: string;
      knowledgeBase?: string;
    }
  ): Promise<any> {
    const license = await prisma.agentLicense.findUnique({
      where: { id: licenseId },
      include: { template: true },
    });

    if (!license) {
      throw new AppError('License not found', 404);
    }

    if (license.organizationId !== organizationId) {
      throw new AppError('Not authorized', 403);
    }

    if (license.status !== 'ACTIVE') {
      throw new AppError('License is not active', 400);
    }

    if (license.currentInstances >= license.maxInstances) {
      throw new AppError('Maximum instances reached', 400);
    }

    const template = license.template;

    // Create voice agent from template
    const agent = await prisma.voiceAgent.create({
      data: {
        organizationId,
        name: customization?.name || template.name,
        description: template.description,
        industry: template.industry,
        systemPrompt: template.systemPrompt,
        voiceId: template.voiceId,
        language: template.language,
        temperature: template.temperature,
        greeting: customization?.greeting || template.greeting,
        fallbackMessage: template.fallbackMessage,
        questions: template.questions as any,
        knowledgeBase: customization?.knowledgeBase || template.knowledgeBase,
        faqs: template.faqs as any,
        isActive: true,
      },
    });

    // Update license instance count
    await prisma.agentLicense.update({
      where: { id: licenseId },
      data: {
        currentInstances: { increment: 1 },
      },
    });

    return agent;
  }

  // Add review
  async addReview(params: {
    templateId: string;
    organizationId: string;
    userId: string;
    rating: number;
    title?: string;
    content?: string;
  }): Promise<any> {
    const { templateId, organizationId, userId, rating, title, content } = params;

    // Check if user has a license
    const license = await prisma.agentLicense.findFirst({
      where: {
        templateId,
        organizationId,
      },
    });

    const review = await prisma.agentReview.upsert({
      where: {
        templateId_organizationId: {
          templateId,
          organizationId,
        },
      },
      create: {
        templateId,
        organizationId,
        userId,
        rating,
        title,
        content,
        isVerified: !!license,
      },
      update: {
        rating,
        title,
        content,
        updatedAt: new Date(),
      },
    });

    // Update template average rating
    const stats = await prisma.agentReview.aggregate({
      where: { templateId, isPublished: true },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.agentTemplate.update({
      where: { id: templateId },
      data: {
        averageRating: stats._avg.rating || 0,
        ratingCount: stats._count,
      },
    });

    return review;
  }

  // Get reviews for a template
  async getTemplateReviews(templateId: string, params: {
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 10 } = params;

    const [reviews, total, stats] = await Promise.all([
      prisma.agentReview.findMany({
        where: { templateId, isPublished: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.agentReview.count({ where: { templateId, isPublished: true } }),
      prisma.agentReview.groupBy({
        by: ['rating'],
        where: { templateId, isPublished: true },
        _count: true,
      }),
    ]);

    // Calculate rating distribution
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    stats.forEach((s) => {
      ratingDistribution[s.rating as keyof typeof ratingDistribution] = s._count;
    });

    return {
      reviews,
      ratingDistribution,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get creator's templates
  async getCreatorTemplates(creatorId: string, params: {
    status?: AgentTemplateStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 10 } = params;

    const where: Prisma.AgentTemplateWhereInput = { creatorId };
    if (status) where.status = status;

    const [templates, total] = await Promise.all([
      prisma.agentTemplate.findMany({
        where,
        include: {
          _count: {
            select: {
              licenses: true,
              reviews: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.agentTemplate.count({ where }),
    ]);

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get marketplace stats (for dashboard)
  async getMarketplaceStats() {
    const [
      totalTemplates,
      totalInstalls,
      totalRevenue,
      topTemplates,
      industryStats,
    ] = await Promise.all([
      prisma.agentTemplate.count({ where: { isPublic: true, status: 'PUBLISHED' } }),
      prisma.agentLicense.count({ where: { status: 'ACTIVE' } }),
      prisma.agentTemplate.aggregate({
        where: { isPublic: true },
        _sum: { totalRevenue: true },
      }),
      prisma.agentTemplate.findMany({
        where: { isPublic: true, status: 'PUBLISHED' },
        select: {
          id: true,
          name: true,
          slug: true,
          iconUrl: true,
          installCount: true,
          averageRating: true,
        },
        take: 5,
        orderBy: { installCount: 'desc' },
      }),
      prisma.agentTemplate.groupBy({
        by: ['industry'],
        where: { isPublic: true, status: 'PUBLISHED' },
        _count: true,
      }),
    ]);

    return {
      totalTemplates,
      totalInstalls,
      totalRevenue: totalRevenue._sum.totalRevenue || 0,
      topTemplates,
      industryStats: industryStats.map((s) => ({
        industry: s.industry,
        count: s._count,
      })),
    };
  }

  // Get featured templates
  async getFeaturedTemplates(limit = 6) {
    return prisma.agentTemplate.findMany({
      where: {
        isPublic: true,
        status: 'PUBLISHED',
        isFeatured: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        industry: true,
        priceType: true,
        monthlyPrice: true,
        iconUrl: true,
        bannerUrl: true,
        averageRating: true,
        installCount: true,
      },
      take: limit,
      orderBy: { installCount: 'desc' },
    });
  }

  // Get categories
  async getCategories() {
    const categories = await prisma.agentTemplate.groupBy({
      by: ['category'],
      where: {
        isPublic: true,
        status: 'PUBLISHED',
        category: { not: null },
      },
      _count: true,
    });

    return categories
      .filter((c) => c.category)
      .map((c) => ({
        name: c.category,
        count: c._count,
      }));
  }
}

export const marketplaceService = new MarketplaceService();
