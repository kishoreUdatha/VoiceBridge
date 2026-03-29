import { prisma } from '../config/database';


export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'viewed'
  | 'exported'
  | 'imported'
  | 'login'
  | 'logout'
  | 'password_changed'
  | 'password_reset'
  | 'api_key_created'
  | 'api_key_deleted'
  | 'api_key_regenerated'
  | 'webhook_created'
  | 'webhook_deleted'
  | 'webhook_triggered'
  | 'bulk_action'
  | 'permission_changed'
  | 'settings_changed';

export type ActorType = 'user' | 'superadmin' | 'system' | 'api_key';

export type TargetType =
  | 'lead'
  | 'user'
  | 'organization'
  | 'campaign'
  | 'form'
  | 'landing_page'
  | 'api_key'
  | 'webhook'
  | 'template'
  | 'contact_list'
  | 'conversation'
  | 'settings';

interface CreateAuditLogParams {
  actorType: ActorType;
  actorId?: string;
  actorEmail?: string;
  organizationId?: string;
  targetType?: TargetType;
  targetId?: string;
  action: AuditAction;
  description?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogFilters {
  organizationId?: string;
  actorId?: string;
  actorType?: ActorType;
  targetType?: TargetType;
  targetId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

class AuditLogService {
  /**
   * Create an audit log entry
   */
  async log(params: CreateAuditLogParams) {
    const {
      actorType,
      actorId,
      actorEmail,
      organizationId,
      targetType,
      targetId,
      action,
      description,
      changes,
      ipAddress,
      userAgent,
    } = params;

    const auditLog = await prisma.auditLog.create({
      data: {
        actorType,
        actorId,
        actorEmail,
        organizationId,
        targetType,
        targetId,
        action,
        description,
        changes: changes || undefined,
        ipAddress,
        userAgent,
      },
    });

    return auditLog;
  }

  /**
   * Log user action (convenience method)
   */
  async logUserAction(
    userId: string,
    userEmail: string,
    organizationId: string,
    action: AuditAction,
    options: {
      targetType?: TargetType;
      targetId?: string;
      description?: string;
      changes?: { before?: any; after?: any };
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ) {
    return this.log({
      actorType: 'user',
      actorId: userId,
      actorEmail: userEmail,
      organizationId,
      action,
      ...options,
    });
  }

  /**
   * Log API key action (convenience method)
   */
  async logApiKeyAction(
    apiKeyId: string,
    organizationId: string,
    action: AuditAction,
    options: {
      targetType?: TargetType;
      targetId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ) {
    return this.log({
      actorType: 'api_key',
      actorId: apiKeyId,
      organizationId,
      action,
      ...options,
    });
  }

  /**
   * Log system action (convenience method)
   */
  async logSystemAction(
    organizationId: string | undefined,
    action: AuditAction,
    options: {
      targetType?: TargetType;
      targetId?: string;
      description?: string;
    } = {}
  ) {
    return this.log({
      actorType: 'system',
      organizationId,
      action,
      ...options,
    });
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: AuditLogFilters = {}) {
    const {
      organizationId,
      actorId,
      actorType,
      targetType,
      targetId,
      action,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (organizationId) where.organizationId = organizationId;
    if (actorId) where.actorId = actorId;
    if (actorType) where.actorType = actorType;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (action) where.action = action;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { actorEmail: { contains: search, mode: 'insensitive' } },
        { targetId: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit log by ID
   */
  async getLogById(id: string, organizationId?: string) {
    const where: any = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const log = await prisma.auditLog.findFirst({ where });
    return log;
  }

  /**
   * Get activity summary for organization
   */
  async getActivitySummary(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalActions,
      byAction,
      byActor,
      byTarget,
      recentActivity,
    ] = await Promise.all([
      prisma.auditLog.count({
        where: { organizationId, createdAt: { gte: startDate } },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ['actorType'],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: { id: true },
      }),
      prisma.auditLog.groupBy({
        by: ['targetType'],
        where: { organizationId, createdAt: { gte: startDate }, targetType: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          actorType: true,
          actorEmail: true,
          action: true,
          targetType: true,
          description: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalActions,
      byAction: byAction.reduce((acc, item) => {
        acc[item.action] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byActor: byActor.reduce((acc, item) => {
        acc[item.actorType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byTarget: byTarget.reduce((acc, item) => {
        if (item.targetType) acc[item.targetType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      recentActivity,
    };
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = options;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { actorId: userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: { actorId: userId } }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get target history (all actions on a specific entity)
   */
  async getTargetHistory(
    targetType: TargetType,
    targetId: string,
    options: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 50 } = options;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { targetType, targetId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: { targetType, targetId } }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Export audit logs (for compliance)
   */
  async exportLogs(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return logs;
  }

  /**
   * Cleanup old audit logs (for data retention)
   */
  async cleanupOldLogs(daysToKeep: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return { deleted: result.count };
  }
}

export const auditLogService = new AuditLogService();
