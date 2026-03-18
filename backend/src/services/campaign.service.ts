import { prisma } from '../config/database';
import { CampaignType, CampaignStatus, CampaignRecipientStatus, Prisma } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { exotelService } from '../integrations/exotel.service';
import { emailService } from '../integrations/email.service';

interface CreateCampaignInput {
  organizationId: string;
  createdById: string;
  name: string;
  type: CampaignType;
  subject?: string;
  content: string;
  templateId?: string;
  scheduledAt?: Date;
  recipientFilter?: {
    status?: string[];
    source?: string[];
    assignedToId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  };
}

interface AddRecipientsInput {
  campaignId: string;
  recipients: Array<{
    phone?: string;
    email?: string;
    name?: string;
    leadId?: string;
  }>;
}

export class CampaignService {
  async create(input: CreateCampaignInput) {
    const campaign = await prisma.campaign.create({
      data: {
        organizationId: input.organizationId,
        createdById: input.createdById,
        name: input.name,
        type: input.type,
        subject: input.subject,
        content: input.content,
        templateId: input.templateId,
        scheduledAt: input.scheduledAt,
        status: input.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
        stats: {
          total: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
        },
      },
    });

    // Auto-add recipients if filter provided
    if (input.recipientFilter) {
      await this.addRecipientsFromFilter(campaign.id, input.organizationId, input.recipientFilter);
    }

    return campaign;
  }

  async findById(id: string, organizationId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        recipients: {
          take: 100,
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    return campaign;
  }

  async findAll(organizationId: string, page = 1, limit = 20) {
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { organizationId },
        include: {
          _count: { select: { recipients: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.count({ where: { organizationId } }),
    ]);

    return { campaigns, total };
  }

  async addRecipients(input: AddRecipientsInput) {
    const recipients = input.recipients.map((r) => ({
      campaignId: input.campaignId,
      phone: r.phone,
      email: r.email,
      name: r.name,
      status: CampaignRecipientStatus.PENDING,
    }));

    await prisma.campaignRecipient.createMany({ data: recipients });

    // Update campaign stats
    await this.updateCampaignStats(input.campaignId);

    return { added: recipients.length };
  }

  async addRecipientsFromFilter(
    campaignId: string,
    organizationId: string,
    filter: CreateCampaignInput['recipientFilter']
  ) {
    const where: Prisma.LeadWhereInput = { organizationId };

    // Note: Lead model uses stageId instead of status
    if (filter?.status && filter.status.length > 0) {
      // Skip status filter as Lead model uses stageId relation
    }
    if (filter?.source && filter.source.length > 0) {
      where.source = { in: filter.source as any };
    }
    if (filter?.assignedToId) {
      where.assignments = {
        some: { assignedToId: filter.assignedToId, isActive: true },
      };
    }
    if (filter?.dateFrom || filter?.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    const leads = await prisma.lead.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    });

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });

    const recipients = leads
      .filter((lead) => {
        if (campaign?.type === CampaignType.EMAIL) return lead.email;
        return lead.phone;
      })
      .map((lead) => ({
        campaignId,
        phone: lead.phone,
        email: lead.email || undefined,
        name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        status: CampaignRecipientStatus.PENDING,
      }));

    if (recipients.length > 0) {
      await prisma.campaignRecipient.createMany({ data: recipients });
      await this.updateCampaignStats(campaignId);
    }

    return { added: recipients.length };
  }

  async execute(campaignId: string, organizationId: string, userId: string) {
    const campaign = await this.findById(campaignId, organizationId);

    if (campaign.status === CampaignStatus.RUNNING || campaign.status === CampaignStatus.COMPLETED) {
      throw new Error('Campaign is already running or completed');
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    // Get pending recipients
    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId, status: CampaignRecipientStatus.PENDING },
    });

    let sent = 0;
    let delivered = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        if (campaign.type === CampaignType.SMS && recipient.phone) {
          const personalizedContent = this.personalizeContent(campaign.content, recipient.name);
          await exotelService.sendSMS({ to: recipient.phone, body: personalizedContent });
        } else if (campaign.type === CampaignType.EMAIL && recipient.email) {
          const personalizedContent = this.personalizeContent(campaign.content, recipient.name);
          await emailService.sendEmail({
            to: recipient.email,
            subject: campaign.subject || 'Message from CRM',
            body: personalizedContent,
            userId,
          });
        } else if (campaign.type === CampaignType.WHATSAPP && recipient.phone) {
          const personalizedContent = this.personalizeContent(campaign.content, recipient.name);
          await exotelService.sendWhatsApp({ to: recipient.phone, message: personalizedContent });
        }

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: CampaignRecipientStatus.SENT,
            sentAt: new Date(),
          },
        });

        sent++;
        delivered++;
      } catch (error) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: CampaignRecipientStatus.FAILED,
            failedReason: (error as Error).message,
          },
        });
        failed++;
      }
    }

    // Update campaign stats and status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.COMPLETED,
        completedAt: new Date(),
        stats: {
          total: recipients.length,
          sent,
          delivered,
          failed,
        },
      },
    });

    return { sent, delivered, failed, total: recipients.length };
  }

  private personalizeContent(content: string, name?: string | null): string {
    return content.replace(/{name}/g, name || 'Student');
  }

  private async updateCampaignStats(campaignId: string) {
    const stats = await prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    const statsMap: Record<string, number> = {
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
    };

    stats.forEach((s) => {
      statsMap[s.status.toLowerCase()] = s._count;
      statsMap.total += s._count;
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { stats: statsMap },
    });
  }

  async getStats(campaignId: string, organizationId: string) {
    const campaign = await this.findById(campaignId, organizationId);

    const recipientStats = await prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    return {
      campaign,
      recipientStats: recipientStats.reduce((acc, s) => {
        acc[s.status] = s._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const campaignService = new CampaignService();
