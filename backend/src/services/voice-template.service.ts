import { PrismaClient, VoiceAgentIndustry, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { industryTemplates } from '../integrations/voice-ai.service';

const prisma = new PrismaClient();

// Default industry templates (used when creating new organization templates)
const DEFAULT_INDUSTRY_CONFIG = {
  EDUCATION: {
    icon: '🎓',
    color: '#3B82F6',
    category: 'Admissions',
  },
  IT_RECRUITMENT: {
    icon: '💼',
    color: '#8B5CF6',
    category: 'Recruitment',
  },
  REAL_ESTATE: {
    icon: '🏠',
    color: '#10B981',
    category: 'Sales',
  },
  CUSTOMER_CARE: {
    icon: '📞',
    color: '#F59E0B',
    category: 'Support',
  },
  TECHNICAL_INTERVIEW: {
    icon: '💻',
    color: '#6366F1',
    category: 'Recruitment',
  },
  HEALTHCARE: {
    icon: '🏥',
    color: '#EF4444',
    category: 'Appointments',
  },
  FINANCE: {
    icon: '💰',
    color: '#059669',
    category: 'Sales',
  },
  ECOMMERCE: {
    icon: '🛒',
    color: '#EC4899',
    category: 'Support',
  },
  CUSTOM: {
    icon: '⚙️',
    color: '#6B7280',
    category: 'Custom',
  },
};

interface CreateTemplateParams {
  organizationId: string;
  name: string;
  industry: VoiceAgentIndustry;
  description?: string;
  category?: string;

  // AI Config
  systemPrompt?: string;
  knowledgeBase?: string;
  questions?: any[];
  faqs?: any[];
  documents?: any[];

  // Messages
  greeting?: string;
  greetings?: Record<string, string>;
  fallbackMessage?: string;
  transferMessage?: string;
  endMessage?: string;
  afterHoursMessage?: string;

  // Settings
  language?: string;
  voiceId?: string;
  temperature?: number;
  personality?: string;
  responseSpeed?: string;
  maxDuration?: number;

  // Working Hours
  workingHoursEnabled?: boolean;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string[];

  // Lead Settings
  autoCreateLeads?: boolean;
  deduplicateByPhone?: boolean;

  // Appointment Settings
  appointmentEnabled?: boolean;
  appointmentType?: string;
  appointmentDuration?: number;

  createdById?: string;
}

interface UpdateTemplateParams extends Partial<Omit<CreateTemplateParams, 'organizationId' | 'industry'>> {
  isActive?: boolean;
  isDefault?: boolean;
}

class VoiceTemplateService {
  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get all templates for organization
   */
  async getTemplates(organizationId: string, options: {
    industry?: VoiceAgentIndustry;
    category?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { industry, category, isActive, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (industry) where.industry = industry;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.organizationVoiceTemplate.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.organizationVoiceTemplate.count({ where }),
    ]);

    return {
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string, organizationId: string) {
    const template = await prisma.organizationVoiceTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    return template;
  }

  /**
   * Get template by slug
   */
  async getTemplateBySlug(slug: string, organizationId: string) {
    const template = await prisma.organizationVoiceTemplate.findFirst({
      where: { slug, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    return template;
  }

  /**
   * Create template from scratch or from industry default
   */
  async createTemplate(params: CreateTemplateParams) {
    const {
      organizationId,
      name,
      industry,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
      createdById,
    } = params;

    // Get industry default template
    const industryDefault = industryTemplates[industry];
    const industryConfig = DEFAULT_INDUSTRY_CONFIG[industry];

    // Generate unique slug
    let slug = this.generateSlug(name);
    const existingSlug = await prisma.organizationVoiceTemplate.findFirst({
      where: { organizationId, slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const template = await prisma.organizationVoiceTemplate.create({
      data: {
        organizationId,
        name,
        slug,
        description,
        industry,
        category: category || industryConfig.category,
        icon: industryConfig.icon,
        color: industryConfig.color,

        // Use provided values or fall back to industry defaults
        systemPrompt: systemPrompt || industryDefault.systemPrompt,
        knowledgeBase: knowledgeBase || '',
        questions: questions || industryDefault.questions,
        faqs: faqs || industryDefault.faqs,
        documents: documents || [],

        greeting: greeting || industryDefault.greeting,
        greetings: greetings || {},
        fallbackMessage: fallbackMessage || "I'm sorry, I didn't understand that. Could you please repeat?",
        transferMessage: transferMessage || "Let me connect you with a human agent. Please hold.",
        endMessage: endMessage || "Thank you for your time. Have a great day!",
        afterHoursMessage,

        language: language || 'en',
        voiceId: voiceId || 'alloy',
        temperature: temperature ?? 0.7,
        personality: personality || 'professional',
        responseSpeed: responseSpeed || 'normal',
        maxDuration: maxDuration ?? 300,

        workingHoursEnabled: workingHoursEnabled ?? false,
        workingHoursStart: workingHoursStart || '09:00',
        workingHoursEnd: workingHoursEnd || '18:00',
        workingDays: workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],

        autoCreateLeads: autoCreateLeads ?? true,
        deduplicateByPhone: deduplicateByPhone ?? true,

        appointmentEnabled: appointmentEnabled ?? false,
        appointmentType,
        appointmentDuration: appointmentDuration ?? 30,

        createdById,
      },
    });

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, organizationId: string, data: UpdateTemplateParams) {
    const template = await prisma.organizationVoiceTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // If setting as default, unset other defaults for same industry
    if (data.isDefault) {
      await prisma.organizationVoiceTemplate.updateMany({
        where: {
          organizationId,
          industry: template.industry,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    // Update version if content changed
    let newVersion = template.version;
    const contentFields = ['systemPrompt', 'knowledgeBase', 'questions', 'faqs', 'greeting', 'greetings'];
    const hasContentChange = contentFields.some(field => data[field as keyof UpdateTemplateParams] !== undefined);

    if (hasContentChange) {
      const [major, minor, patch] = template.version.split('.').map(Number);
      newVersion = `${major}.${minor}.${patch + 1}`;

      // Add changelog entry
      const changelog = (template.changelog as any[]) || [];
      changelog.push({
        version: newVersion,
        date: new Date().toISOString(),
        changes: Object.keys(data).filter(k => contentFields.includes(k)),
      });
      data = { ...data, changelog } as any;
    }

    // Update slug if name changed
    let slug = template.slug;
    if (data.name && data.name !== template.name) {
      slug = this.generateSlug(data.name);
      const existingSlug = await prisma.organizationVoiceTemplate.findFirst({
        where: { organizationId, slug, id: { not: id } },
      });
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    return prisma.organizationVoiceTemplate.update({
      where: { id },
      data: {
        ...data,
        slug,
        version: newVersion,
        questions: data.questions as any,
        faqs: data.faqs as any,
        documents: data.documents as any,
        greetings: data.greetings as any,
        workingDays: data.workingDays as any,
      },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string, organizationId: string) {
    const template = await prisma.organizationVoiceTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    await prisma.organizationVoiceTemplate.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Clone template
   */
  async cloneTemplate(id: string, organizationId: string, newName?: string) {
    const template = await prisma.organizationVoiceTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    const cloneName = newName || `${template.name} (Copy)`;
    const slug = this.generateSlug(cloneName) + '-' + Date.now();

    const clone = await prisma.organizationVoiceTemplate.create({
      data: {
        organizationId,
        name: cloneName,
        slug,
        description: template.description,
        industry: template.industry,
        category: template.category,
        icon: template.icon,
        color: template.color,

        systemPrompt: template.systemPrompt,
        knowledgeBase: template.knowledgeBase,
        questions: template.questions as Prisma.InputJsonValue,
        faqs: template.faqs as Prisma.InputJsonValue,
        documents: template.documents as Prisma.InputJsonValue,

        greeting: template.greeting,
        greetings: template.greetings as Prisma.InputJsonValue,
        fallbackMessage: template.fallbackMessage,
        transferMessage: template.transferMessage,
        endMessage: template.endMessage,
        afterHoursMessage: template.afterHoursMessage,

        language: template.language,
        voiceId: template.voiceId,
        temperature: template.temperature,
        personality: template.personality,
        responseSpeed: template.responseSpeed,
        maxDuration: template.maxDuration,

        workingHoursEnabled: template.workingHoursEnabled,
        workingHoursStart: template.workingHoursStart,
        workingHoursEnd: template.workingHoursEnd,
        workingDays: template.workingDays as Prisma.InputJsonValue,

        autoCreateLeads: template.autoCreateLeads,
        deduplicateByPhone: template.deduplicateByPhone,

        appointmentEnabled: template.appointmentEnabled,
        appointmentType: template.appointmentType,
        appointmentDuration: template.appointmentDuration,

        crmIntegration: template.crmIntegration,
        triggerWebhookOnLead: template.triggerWebhookOnLead,

        widgetTitle: template.widgetTitle,
        widgetSubtitle: template.widgetSubtitle,
        widgetColor: template.widgetColor,
        widgetPosition: template.widgetPosition,

        version: '1.0.0',
        isActive: true,
        isDefault: false,
      },
    });

    return clone;
  }

  /**
   * Deploy template as a new voice agent
   */
  async deployAsAgent(
    templateId: string,
    organizationId: string,
    agentConfig: {
      name: string;
      description?: string;
      createdById?: string;
      systemPrompt?: string;
      customizations?: {
        greeting?: string;
        knowledgeBase?: string;
        language?: string;
        voiceId?: string;
      };
    }
  ) {
    const template = await prisma.organizationVoiceTemplate.findFirst({
      where: { id: templateId, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Create agent from template
    const agent = await prisma.voiceAgent.create({
      data: {
        organizationId,
        name: agentConfig.name,
        description: agentConfig.description || template.description,
        industry: template.industry,

        systemPrompt: agentConfig.systemPrompt || template.systemPrompt,
        knowledgeBase: agentConfig.customizations?.knowledgeBase || template.knowledgeBase,
        questions: template.questions as Prisma.InputJsonValue,
        faqs: template.faqs as Prisma.InputJsonValue,
        documents: template.documents as Prisma.InputJsonValue,

        greeting: agentConfig.customizations?.greeting || template.greeting,
        fallbackMessage: template.fallbackMessage,
        transferMessage: template.transferMessage,
        endMessage: template.endMessage,
        afterHoursMessage: template.afterHoursMessage,

        language: agentConfig.customizations?.language || template.language,
        voiceId: agentConfig.customizations?.voiceId || template.voiceId,
        temperature: template.temperature,
        personality: template.personality,
        responseSpeed: template.responseSpeed,
        maxDuration: template.maxDuration,
        silenceTimeout: template.silenceTimeout,

        workingHoursEnabled: template.workingHoursEnabled,
        workingHoursStart: template.workingHoursStart,
        workingHoursEnd: template.workingHoursEnd,
        workingDays: template.workingDays as Prisma.InputJsonValue,

        autoCreateLeads: template.autoCreateLeads,
        deduplicateByPhone: template.deduplicateByPhone,
        autoAdvanceStage: template.autoAdvanceStage,

        appointmentEnabled: template.appointmentEnabled,
        appointmentType: template.appointmentType,
        appointmentDuration: template.appointmentDuration,

        crmIntegration: template.crmIntegration,
        triggerWebhookOnLead: template.triggerWebhookOnLead,

        widgetTitle: template.widgetTitle,
        widgetSubtitle: template.widgetSubtitle,
        widgetColor: template.widgetColor,
        widgetPosition: template.widgetPosition,

        createdById: agentConfig.createdById,
        isActive: true,
      },
    });

    // Update template usage stats
    await prisma.organizationVoiceTemplate.update({
      where: { id: templateId },
      data: {
        agentsCreated: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return agent;
  }

  /**
   * Get industry templates (default system templates)
   */
  getIndustryTemplates() {
    return Object.entries(industryTemplates).map(([industry, template]) => ({
      industry,
      name: template.name,
      systemPrompt: template.systemPrompt,
      questions: template.questions,
      greeting: template.greeting,
      faqs: template.faqs,
      ...DEFAULT_INDUSTRY_CONFIG[industry as VoiceAgentIndustry],
    }));
  }

  /**
   * Initialize default templates for organization
   */
  async initializeDefaultTemplates(organizationId: string, industries?: VoiceAgentIndustry[]) {
    const industriesToCreate = industries || Object.keys(industryTemplates) as VoiceAgentIndustry[];
    const createdTemplates = [];

    for (const industry of industriesToCreate) {
      const template = industryTemplates[industry];
      const config = DEFAULT_INDUSTRY_CONFIG[industry];

      try {
        const created = await this.createTemplate({
          organizationId,
          name: template.name,
          industry,
          description: `Default ${template.name} template`,
          category: config.category,
          systemPrompt: template.systemPrompt,
          questions: template.questions,
          faqs: template.faqs,
          greeting: template.greeting,
        });
        createdTemplates.push(created);
      } catch (error) {
        // Skip if already exists
        console.log(`Template ${industry} already exists for organization`);
      }
    }

    return createdTemplates;
  }

  /**
   * Preview template (render with sample data)
   */
  async previewTemplate(id: string, organizationId: string) {
    const template = await this.getTemplateById(id, organizationId);

    const sampleData = {
      firstName: 'Rahul',
      lastName: 'Kumar',
      phone: '+91-9876543210',
      email: 'rahul@example.com',
      course: 'Computer Science',
    };

    // Replace variables in greeting
    let previewGreeting = template.greeting || '';
    Object.entries(sampleData).forEach(([key, value]) => {
      previewGreeting = previewGreeting.replace(new RegExp(`{{${key}}}`, 'gi'), value);
    });

    return {
      template,
      preview: {
        greeting: previewGreeting,
        questionsCount: (template.questions as any[]).length,
        faqsCount: (template.faqs as any[]).length,
        hasKnowledgeBase: !!template.knowledgeBase,
        documentsCount: (template.documents as any[]).length,
      },
    };
  }
}

export const voiceTemplateService = new VoiceTemplateService();
