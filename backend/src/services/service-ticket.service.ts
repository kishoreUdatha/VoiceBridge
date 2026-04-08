/**
 * Service Ticket System
 * Handles support tickets with SLAs, escalation, and multi-channel creation
 */

import { PrismaClient, TicketType, TicketPriority, TicketStatus, TicketChannel, TicketSeverity } from '@prisma/client';

const prisma = new PrismaClient();

interface TicketConfig {
  subject: string;
  description: string;
  type: TicketType;
  priority?: TicketPriority;
  severity?: TicketSeverity;
  category?: string;
  subcategory?: string;
  accountId?: string;
  leadId?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  assignedToId?: string;
  teamId?: string;
  channel: TicketChannel;
  sourceId?: string;
  slaId?: string;
}

export const serviceTicketService = {
  // Generate ticket number
  async generateTicketNumber(organizationId: string): Promise<string> {
    const count = await prisma.serviceTicket.count({ where: { organizationId } });
    const prefix = 'TKT';
    const paddedNumber = String(count + 1).padStart(6, '0');
    return `${prefix}-${paddedNumber}`;
  },

  // Get all tickets
  async getTickets(organizationId: string, filters?: any) {
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.type) where.type = filters.type;
    if (filters?.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.serviceTicket.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: filters?.sortBy
        ? { [filters.sortBy]: filters.sortOrder || 'desc' }
        : { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  },

  // Get single ticket
  async getTicket(id: string) {
    return prisma.serviceTicket.findUnique({
      where: { id },
      include: {
        account: true,
        comments: {
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  },

  // Create ticket
  async createTicket(organizationId: string, config: TicketConfig, createdById?: string) {
    const ticketNumber = await this.generateTicketNumber(organizationId);

    // Get SLA if not specified
    let sla = null;
    if (config.slaId) {
      sla = await prisma.ticketSLA.findUnique({ where: { id: config.slaId } });
    } else {
      sla = await prisma.ticketSLA.findFirst({
        where: { organizationId, isDefault: true, isActive: true },
      });
    }

    // Calculate SLA due dates
    let firstResponseDue = null;
    let resolutionDue = null;

    if (sla) {
      const priority = config.priority || 'MEDIUM';
      const firstResponseTime = (sla.firstResponseTime as any)[priority];
      const resolutionTime = (sla.resolutionTime as any)[priority];

      if (firstResponseTime) {
        firstResponseDue = new Date(Date.now() + firstResponseTime * 60 * 1000);
      }
      if (resolutionTime) {
        resolutionDue = new Date(Date.now() + resolutionTime * 60 * 1000);
      }
    }

    const ticket = await prisma.serviceTicket.create({
      data: {
        organizationId,
        ticketNumber,
        subject: config.subject,
        description: config.description,
        type: config.type,
        priority: config.priority || 'MEDIUM',
        severity: config.severity,
        category: config.category,
        subcategory: config.subcategory,
        accountId: config.accountId,
        leadId: config.leadId,
        contactEmail: config.contactEmail,
        contactPhone: config.contactPhone,
        contactName: config.contactName,
        assignedToId: config.assignedToId,
        teamId: config.teamId,
        channel: config.channel,
        sourceId: config.sourceId,
        slaId: config.slaId || sla?.id,
        firstResponseDue,
        resolutionDue,
        createdById,
      },
    });

    // Log creation
    await this.logHistory(ticket.id, createdById, 'status', null, 'NEW', 'created');

    return ticket;
  },

  // Update ticket
  async updateTicket(id: string, updates: Partial<TicketConfig & { status?: TicketStatus; resolution?: string }>, userId?: string) {
    const ticket = await prisma.serviceTicket.findUnique({ where: { id } });
    if (!ticket) throw new Error('Ticket not found');

    // Log changes
    if (updates.status && updates.status !== ticket.status) {
      await this.logHistory(id, userId, 'status', ticket.status, updates.status, 'updated');
    }
    if (updates.assignedToId && updates.assignedToId !== ticket.assignedToId) {
      await this.logHistory(id, userId, 'assignedToId', ticket.assignedToId, updates.assignedToId, 'assigned');
    }
    if (updates.priority && updates.priority !== ticket.priority) {
      await this.logHistory(id, userId, 'priority', ticket.priority, updates.priority, 'updated');
    }

    // Calculate times for resolved/closed
    const data: any = { ...updates };
    if (updates.status === 'RESOLVED' && !ticket.resolvedAt) {
      data.resolvedAt = new Date();
    }
    if (updates.status === 'CLOSED' && !ticket.closedAt) {
      data.closedAt = new Date();
    }

    // Check SLA breach
    if (updates.status === 'RESOLVED' && ticket.resolutionDue) {
      if (new Date() > ticket.resolutionDue) {
        data.slaBreached = true;
      }
    }

    return prisma.serviceTicket.update({
      where: { id },
      data,
    });
  },

  // Add comment
  async addComment(ticketId: string, userId: string | null, content: string, isInternal = false, isFromCustomer = false) {
    const comment = await prisma.ticketComment.create({
      data: { ticketId, userId, content, isInternal, isFromCustomer },
    });

    // Update first response time if this is first agent response
    const ticket = await prisma.serviceTicket.findUnique({ where: { id: ticketId } });
    if (ticket && !ticket.firstResponseAt && !isFromCustomer) {
      await prisma.serviceTicket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date() },
      });
    }

    await this.logHistory(ticketId, userId, 'comment', null, 'added', isInternal ? 'internal_note' : 'replied');

    return comment;
  },

  // Add attachment
  async addAttachment(ticketId: string, fileName: string, fileUrl: string, fileSize: number, mimeType: string, uploadedById?: string, commentId?: string) {
    return prisma.ticketAttachment.create({
      data: { ticketId, commentId, fileName, fileUrl, fileSize, mimeType, uploadedById },
    });
  },

  // Log history
  async logHistory(ticketId: string, userId: string | null | undefined, field: string, oldValue: string | null, newValue: string | null, action: string) {
    return prisma.ticketHistory.create({
      data: { ticketId, userId, field, oldValue, newValue, action },
    });
  },

  // Escalate ticket
  async escalateTicket(ticketId: string, userId: string, reason?: string) {
    const ticket = await prisma.serviceTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');

    const newLevel = ticket.escalationLevel + 1;

    await this.logHistory(ticketId, userId, 'escalationLevel', String(ticket.escalationLevel), String(newLevel), 'escalated');

    return prisma.serviceTicket.update({
      where: { id: ticketId },
      data: { escalationLevel: newLevel },
    });
  },

  // Get ticket statistics
  async getTicketStats(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = { organizationId };
    if (dateRange) {
      where.createdAt = { gte: dateRange.start, lte: dateRange.end };
    }

    const [byStatus, byPriority, byType, byChannel, total, breached] = await Promise.all([
      prisma.serviceTicket.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.serviceTicket.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      prisma.serviceTicket.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      prisma.serviceTicket.groupBy({
        by: ['channel'],
        where,
        _count: true,
      }),
      prisma.serviceTicket.count({ where }),
      prisma.serviceTicket.count({ where: { ...where, slaBreached: true } }),
    ]);

    // Calculate average resolution time
    const resolvedTickets = await prisma.serviceTicket.findMany({
      where: { ...where, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });

    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, t) => {
        return sum + (t.resolvedAt!.getTime() - t.createdAt.getTime());
      }, 0);
      avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // In hours
    }

    return {
      byStatus,
      byPriority,
      byType,
      byChannel,
      total,
      breached,
      slaComplianceRate: total > 0 ? ((total - breached) / total) * 100 : 100,
      avgResolutionTimeHours: avgResolutionTime,
    };
  },

  // SLA Management
  async createSLA(organizationId: string, config: {
    name: string;
    description?: string;
    firstResponseTime: Record<string, number>;
    resolutionTime: Record<string, number>;
    businessHours?: Record<string, any>;
    timezone?: string;
    isDefault?: boolean;
  }) {
    // If setting as default, unset other defaults
    if (config.isDefault) {
      await prisma.ticketSLA.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.ticketSLA.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        firstResponseTime: config.firstResponseTime as any,
        resolutionTime: config.resolutionTime as any,
        businessHours: config.businessHours as any,
        timezone: config.timezone || 'Asia/Kolkata',
        isDefault: config.isDefault || false,
      },
    });
  },

  async getSLAs(organizationId: string) {
    return prisma.ticketSLA.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Check and update SLA breaches (called by cron job)
  async checkSLABreaches(organizationId: string) {
    const now = new Date();

    // Find tickets that have breached first response SLA
    const firstResponseBreaches = await prisma.serviceTicket.findMany({
      where: {
        organizationId,
        firstResponseAt: null,
        firstResponseDue: { lt: now },
        slaBreached: false,
        status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
      },
    });

    // Find tickets that have breached resolution SLA
    const resolutionBreaches = await prisma.serviceTicket.findMany({
      where: {
        organizationId,
        resolvedAt: null,
        resolutionDue: { lt: now },
        slaBreached: false,
        status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
      },
    });

    const breachedIds = [
      ...firstResponseBreaches.map(t => t.id),
      ...resolutionBreaches.map(t => t.id),
    ];

    if (breachedIds.length > 0) {
      await prisma.serviceTicket.updateMany({
        where: { id: { in: breachedIds } },
        data: { slaBreached: true },
      });
    }

    return { breachedCount: breachedIds.length };
  },
};
