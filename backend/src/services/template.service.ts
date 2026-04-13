import { TemplateType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { DEFAULT_TEMPLATES } from '../config/default-templates.config';


// Common template variables
export const TEMPLATE_VARIABLES = {
  // Lead/Contact variables
  FIRST_NAME: '{{firstName}}',
  LAST_NAME: '{{lastName}}',
  FULL_NAME: '{{fullName}}',
  EMAIL: '{{email}}',
  PHONE: '{{phone}}',
  COMPANY: '{{company}}',

  // Organization variables
  ORG_NAME: '{{orgName}}',
  ORG_PHONE: '{{orgPhone}}',
  ORG_EMAIL: '{{orgEmail}}',
  ORG_WEBSITE: '{{orgWebsite}}',

  // Dynamic variables
  DATE: '{{date}}',
  TIME: '{{time}}',
  DATETIME: '{{datetime}}',
  DAY: '{{day}}',
  MONTH: '{{month}}',
  YEAR: '{{year}}',

  // Custom
  CUSTOM_1: '{{custom1}}',
  CUSTOM_2: '{{custom2}}',
  CUSTOM_3: '{{custom3}}',
  LINK: '{{link}}',
  AMOUNT: '{{amount}}',
  COURSE: '{{course}}',
  APPOINTMENT_DATE: '{{appointmentDate}}',
  APPOINTMENT_TIME: '{{appointmentTime}}',
};

interface CreateTemplateParams {
  organizationId: string;
  name: string;
  type: TemplateType;
  category?: string;
  subject?: string;
  content: string;
  htmlContent?: string;
  variables?: string[];
  sampleValues?: Record<string, string>;
  headerType?: string;
  headerContent?: string;
  footerContent?: string;
  buttons?: any[];
  whatsappLanguage?: string;
  createdById?: string;
}

interface UpdateTemplateParams {
  name?: string;
  category?: string;
  subject?: string;
  content?: string;
  htmlContent?: string;
  variables?: string[];
  sampleValues?: Record<string, string>;
  headerType?: string;
  headerContent?: string;
  footerContent?: string;
  buttons?: any[];
  isActive?: boolean;
  isDefault?: boolean;
  whatsappLanguage?: string;
}

class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(params: CreateTemplateParams) {
    const {
      organizationId,
      name,
      type,
      category,
      subject,
      content,
      htmlContent,
      variables = [],
      sampleValues = {},
      headerType,
      headerContent,
      footerContent,
      buttons = [],
      whatsappLanguage,
      createdById,
    } = params;

    // Validate required fields based on type
    if (type === 'EMAIL' && !subject) {
      throw new AppError('Subject is required for email templates', 400);
    }

    // Extract variables from content if not provided
    const extractedVariables = variables.length > 0 ? variables : this.extractVariables(content);

    // Check for duplicate name
    const existing = await prisma.messageTemplate.findFirst({
      where: { organizationId, name, type },
    });

    if (existing) {
      throw new AppError(`Template with name "${name}" already exists for ${type}`, 400);
    }

    const template = await prisma.messageTemplate.create({
      data: {
        organizationId,
        name,
        type,
        category,
        subject,
        content,
        htmlContent,
        variables: extractedVariables as any,
        sampleValues: sampleValues as any,
        headerType,
        headerContent,
        footerContent,
        buttons: buttons as any,
        whatsappLanguage,
        createdById,
        whatsappStatus: type === 'WHATSAPP' ? 'PENDING' : undefined,
      },
    });

    return template;
  }

  /**
   * Get templates for organization
   */
  async getTemplates(organizationId: string, options: {
    type?: TemplateType;
    category?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { type, category, isActive, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (type) where.type = type;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.messageTemplate.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.messageTemplate.count({ where }),
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
    const template = await prisma.messageTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, organizationId: string, data: UpdateTemplateParams) {
    const template = await prisma.messageTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // If setting as default, unset other defaults of same type
    if (data.isDefault) {
      await prisma.messageTemplate.updateMany({
        where: { organizationId, type: template.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Extract variables if content changed
    if (data.content && !data.variables) {
      data.variables = this.extractVariables(data.content);
    }

    return prisma.messageTemplate.update({
      where: { id },
      data: {
        ...data,
        variables: data.variables as any,
        sampleValues: data.sampleValues as any,
        buttons: data.buttons as any,
        // Reset WhatsApp status if content changed
        whatsappStatus: template.type === 'WHATSAPP' && data.content ? 'PENDING' : undefined,
      },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string, organizationId: string) {
    const template = await prisma.messageTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    await prisma.messageTemplate.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(id: string, organizationId: string, newName?: string) {
    const template = await prisma.messageTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    const duplicate = await prisma.messageTemplate.create({
      data: {
        organizationId,
        name: newName || `${template.name} (Copy)`,
        type: template.type,
        category: template.category,
        subject: template.subject,
        content: template.content,
        htmlContent: template.htmlContent,
        variables: template.variables as Prisma.InputJsonValue,
        sampleValues: template.sampleValues as Prisma.InputJsonValue,
        headerType: template.headerType,
        headerContent: template.headerContent,
        footerContent: template.footerContent,
        buttons: template.buttons as Prisma.InputJsonValue,
        whatsappLanguage: template.whatsappLanguage,
        isDefault: false,
      },
    });

    return duplicate;
  }

  /**
   * Render template with variables
   */
  async renderTemplate(id: string, organizationId: string, variables: Record<string, string>) {
    const template = await this.getTemplateById(id, organizationId);

    // Add automatic date/time variables
    const now = new Date();
    const autoVariables: Record<string, string> = {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      datetime: now.toLocaleString(),
      day: now.toLocaleDateString('en-US', { weekday: 'long' }),
      month: now.toLocaleDateString('en-US', { month: 'long' }),
      year: now.getFullYear().toString(),
    };

    const allVariables = { ...autoVariables, ...variables };

    const renderedContent = this.substituteVariables(template.content, allVariables);
    const renderedSubject = template.subject
      ? this.substituteVariables(template.subject, allVariables)
      : undefined;
    const renderedHtml = template.htmlContent
      ? this.substituteVariables(template.htmlContent, allVariables)
      : undefined;

    // Increment usage count
    await prisma.messageTemplate.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return {
      content: renderedContent,
      subject: renderedSubject,
      htmlContent: renderedHtml,
      type: template.type,
      templateId: template.id,
      templateName: template.name,
    };
  }

  /**
   * Preview template with sample values
   */
  async previewTemplate(id: string, organizationId: string) {
    const template = await this.getTemplateById(id, organizationId);

    const sampleValues = template.sampleValues as Record<string, string> || {};
    const renderedContent = this.substituteVariables(template.content, sampleValues);
    const renderedSubject = template.subject
      ? this.substituteVariables(template.subject, sampleValues)
      : undefined;
    const renderedHtml = template.htmlContent
      ? this.substituteVariables(template.htmlContent, sampleValues)
      : undefined;

    return {
      original: {
        content: template.content,
        subject: template.subject,
        htmlContent: template.htmlContent,
      },
      rendered: {
        content: renderedContent,
        subject: renderedSubject,
        htmlContent: renderedHtml,
      },
      variables: template.variables,
      sampleValues,
    };
  }

  /**
   * Get template categories
   */
  async getCategories(organizationId: string) {
    const templates = await prisma.messageTemplate.findMany({
      where: { organizationId },
      select: { category: true },
      distinct: ['category'],
    });

    const categories = templates
      .map(t => t.category)
      .filter(Boolean)
      .sort();

    // Add default categories
    const defaultCategories = ['marketing', 'transactional', 'reminder', 'welcome', 'follow-up', 'notification'];
    const allCategories = [...new Set([...defaultCategories, ...categories])].sort();

    return allCategories;
  }

  /**
   * Get available variables
   */
  getAvailableVariables() {
    return Object.entries(TEMPLATE_VARIABLES).map(([key, value]) => ({
      key,
      variable: value,
      description: this.getVariableDescription(key),
    }));
  }

  /**
   * Validate template content
   */
  validateTemplate(content: string, type: TemplateType): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Template content cannot be empty');
    }

    // SMS specific validation
    if (type === 'SMS') {
      if (content.length > 1600) {
        errors.push('SMS template exceeds maximum length (1600 characters)');
      }
      // Check for segments
      const segments = Math.ceil(content.length / 160);
      if (segments > 10) {
        errors.push(`SMS will be split into ${segments} segments (max 10 recommended)`);
      }
    }

    // WhatsApp specific validation
    if (type === 'WHATSAPP') {
      if (content.length > 1024) {
        errors.push('WhatsApp template body exceeds maximum length (1024 characters)');
      }
    }

    // Check for unbalanced variables
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced variable brackets {{ }}');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get SMS character count and segment info
   */
  getSmsInfo(content: string) {
    const length = content.length;
    const isGsm7 = this.isGsm7Encoded(content);
    const charsPerSegment = isGsm7 ? 160 : 70;
    const segments = Math.ceil(length / charsPerSegment);

    return {
      length,
      segments,
      encoding: isGsm7 ? 'GSM-7' : 'Unicode',
      charsPerSegment,
      remainingInSegment: (charsPerSegment - (length % charsPerSegment)) % charsPerSegment,
    };
  }

  /**
   * Extract variables from content
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Substitute variables in content
   */
  private substituteVariables(content: string, variables: Record<string, string>): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      result = result.replace(regex, value || '');
    }

    return result;
  }

  /**
   * Check if content can be GSM-7 encoded
   */
  private isGsm7Encoded(content: string): boolean {
    const gsm7Chars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑܧ¿a-zäöñüà\x00-\x1f]*$/;
    return gsm7Chars.test(content);
  }

  /**
   * Get variable description
   */
  private getVariableDescription(key: string): string {
    const descriptions: Record<string, string> = {
      FIRST_NAME: 'Contact first name',
      LAST_NAME: 'Contact last name',
      FULL_NAME: 'Contact full name',
      EMAIL: 'Contact email address',
      PHONE: 'Contact phone number',
      COMPANY: 'Contact company name',
      ORG_NAME: 'Your organization name',
      ORG_PHONE: 'Your organization phone',
      ORG_EMAIL: 'Your organization email',
      ORG_WEBSITE: 'Your organization website',
      DATE: 'Current date',
      TIME: 'Current time',
      DATETIME: 'Current date and time',
      DAY: 'Current day name',
      MONTH: 'Current month name',
      YEAR: 'Current year',
      CUSTOM_1: 'Custom field 1',
      CUSTOM_2: 'Custom field 2',
      CUSTOM_3: 'Custom field 3',
      LINK: 'Custom link URL',
      AMOUNT: 'Amount value',
      COURSE: 'Course name',
      APPOINTMENT_DATE: 'Appointment date',
      APPOINTMENT_TIME: 'Appointment time',
    };
    return descriptions[key] || key;
  }

  /**
   * Seed default templates for organization
   */
  async seedDefaultTemplates(organizationId: string, options: { force?: boolean } = {}) {
    const { force = false } = options;

    // Check if templates already exist
    const existingCount = await prisma.messageTemplate.count({
      where: { organizationId },
    });

    if (existingCount > 0 && !force) {
      return {
        success: true,
        message: 'Templates already exist',
        created: 0,
        skipped: DEFAULT_TEMPLATES.length,
      };
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const template of DEFAULT_TEMPLATES) {
      try {
        // Check if template with same name and type exists
        const existing = await prisma.messageTemplate.findFirst({
          where: {
            organizationId,
            name: template.name,
            type: template.type as TemplateType,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Extract variables from content
        const variables = this.extractVariables(template.content);

        await prisma.messageTemplate.create({
          data: {
            organizationId,
            name: template.name,
            type: template.type as TemplateType,
            category: template.category,
            subject: template.subject,
            content: template.content,
            variables: variables as any,
            sampleValues: template.sampleValues as any,
            isDefault: template.isDefault || false,
            isActive: true,
            whatsappStatus: template.type === 'WHATSAPP' ? 'PENDING' : undefined,
          },
        });

        created++;
      } catch (err: any) {
        errors.push(`Failed to create ${template.name}: ${err.message}`);
        skipped++;
      }
    }

    return {
      success: true,
      message: `Seeded ${created} templates`,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get default templates (without saving to DB)
   */
  getDefaultTemplates() {
    return DEFAULT_TEMPLATES;
  }
}

export const templateService = new TemplateService();
