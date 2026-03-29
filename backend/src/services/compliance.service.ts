import { ConsentType } from '@prisma/client';
import { prisma } from '../config/database';


// ==================== TYPES ====================

export type ConsentMethod = 'VERBAL' | 'WRITTEN' | 'DIGITAL' | 'IVR_KEYPRESS';
export type ComplianceEventType =
  | 'CONSENT_OBTAINED'
  | 'CONSENT_REVOKED'
  | 'DNC_ADDED'
  | 'DNC_REMOVED'
  | 'RECORDING_DISCLOSURE'
  | 'DATA_ACCESS'
  | 'DATA_DELETION'
  | 'COMPLIANCE_CHECK';

export type ActorType = 'user' | 'system' | 'voice_agent';
export type TargetType = 'lead' | 'phone_number' | 'call' | 'consent';

interface RecordConsentParams {
  organizationId: string;
  phoneNumber: string;
  consentType: ConsentType;
  consentGiven: boolean;
  consentMethod: ConsentMethod;
  leadId?: string;
  callId?: string;
  recordingUrl?: string;
  consentPhrase?: string;
  validUntil?: Date;
}

interface RevokeConsentParams {
  consentId: string;
  revokedBy: string;
  revokeReason?: string;
}

interface ComplianceAuditParams {
  organizationId: string;
  eventType: ComplianceEventType;
  actorType: ActorType;
  actorId?: string;
  targetType: TargetType;
  targetId?: string;
  action: string;
  description?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

interface DisclosureConfigParams {
  organizationId: string;
  disclosureEnabled?: boolean;
  disclosureText?: string;
  disclosureMessages?: Record<string, string>;
  requireAcknowledgment?: boolean;
  acknowledgmentPhrase?: string;
  autoPlayDelay?: number;
  recordingConsent?: boolean;
  consentRequired?: boolean;
}

// ==================== COMPLIANCE SERVICE ====================

class ComplianceService {
  // ==================== CONSENT MANAGEMENT ====================

  /**
   * Record consent from a lead/contact
   */
  async recordConsent(params: RecordConsentParams) {
    const consent = await prisma.consentRecord.create({
      data: {
        organizationId: params.organizationId,
        phoneNumber: params.phoneNumber,
        consentType: params.consentType,
        consentGiven: params.consentGiven,
        consentMethod: params.consentMethod,
        leadId: params.leadId,
        callId: params.callId,
        recordingUrl: params.recordingUrl,
        consentPhrase: params.consentPhrase,
        validUntil: params.validUntil,
      },
    });

    // Log the compliance event
    await this.logComplianceEvent({
      organizationId: params.organizationId,
      eventType: 'CONSENT_OBTAINED',
      actorType: params.callId ? 'voice_agent' : 'system',
      actorId: params.callId,
      targetType: 'consent',
      targetId: consent.id,
      action: 'created',
      description: `${params.consentType} consent ${params.consentGiven ? 'given' : 'denied'} via ${params.consentMethod}`,
      metadata: {
        phoneNumber: params.phoneNumber,
        consentType: params.consentType,
        consentGiven: params.consentGiven,
      },
    });

    return consent;
  }

  /**
   * Revoke an existing consent
   */
  async revokeConsent(params: RevokeConsentParams) {
    const consent = await prisma.consentRecord.update({
      where: { id: params.consentId },
      data: {
        revokedAt: new Date(),
        revokedBy: params.revokedBy,
        revokeReason: params.revokeReason,
      },
    });

    // Log the compliance event
    await this.logComplianceEvent({
      organizationId: consent.organizationId,
      eventType: 'CONSENT_REVOKED',
      actorType: 'user',
      actorId: params.revokedBy,
      targetType: 'consent',
      targetId: consent.id,
      action: 'revoked',
      description: `${consent.consentType} consent revoked`,
      metadata: {
        phoneNumber: consent.phoneNumber,
        consentType: consent.consentType,
        revokeReason: params.revokeReason,
      },
    });

    return consent;
  }

  /**
   * Check consent status for a phone number
   */
  async checkConsent(organizationId: string, phoneNumber: string, consentType?: ConsentType) {
    const where: any = {
      organizationId,
      phoneNumber,
      consentGiven: true,
      revokedAt: null,
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } },
      ],
    };

    if (consentType) {
      where.consentType = consentType;
    }

    const consents = await prisma.consentRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Return consent status by type
    const status: Record<string, boolean> = {};
    const consentTypes: ConsentType[] = ['CALL_RECORDING', 'MARKETING_CALLS', 'DATA_PROCESSING', 'PAYMENT_COLLECTION'];

    for (const type of consentTypes) {
      status[type] = consents.some(c => c.consentType === type);
    }

    return {
      hasAnyConsent: consents.length > 0,
      status,
      consents,
    };
  }

  /**
   * Get consent records for organization
   */
  async getConsentRecords(organizationId: string, options: {
    phoneNumber?: string;
    leadId?: string;
    consentType?: ConsentType;
    includeRevoked?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { phoneNumber, leadId, consentType, includeRevoked = false, page = 1, limit = 50 } = options;

    const where: any = { organizationId };
    if (phoneNumber) where.phoneNumber = phoneNumber;
    if (leadId) where.leadId = leadId;
    if (consentType) where.consentType = consentType;
    if (!includeRevoked) where.revokedAt = null;

    const [records, total] = await Promise.all([
      prisma.consentRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
      }),
      prisma.consentRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== RECORDING DISCLOSURE ====================

  /**
   * Get recording disclosure config for organization
   */
  async getDisclosureConfig(organizationId: string) {
    let config = await prisma.recordingDisclosureConfig.findUnique({
      where: { organizationId },
    });

    // Return default config if none exists
    if (!config) {
      config = {
        id: '',
        organizationId,
        disclosureEnabled: true,
        disclosureText: 'This call may be recorded for quality and training purposes.',
        disclosureMessages: {},
        requireAcknowledgment: false,
        acknowledgmentPhrase: null,
        autoPlayDelay: 0,
        recordingConsent: true,
        consentRequired: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return config;
  }

  /**
   * Update recording disclosure config
   */
  async updateDisclosureConfig(params: DisclosureConfigParams) {
    const config = await prisma.recordingDisclosureConfig.upsert({
      where: { organizationId: params.organizationId },
      create: {
        organizationId: params.organizationId,
        disclosureEnabled: params.disclosureEnabled ?? true,
        disclosureText: params.disclosureText,
        disclosureMessages: params.disclosureMessages ?? {},
        requireAcknowledgment: params.requireAcknowledgment ?? false,
        acknowledgmentPhrase: params.acknowledgmentPhrase,
        autoPlayDelay: params.autoPlayDelay ?? 0,
        recordingConsent: params.recordingConsent ?? true,
        consentRequired: params.consentRequired ?? true,
      },
      update: {
        disclosureEnabled: params.disclosureEnabled,
        disclosureText: params.disclosureText,
        disclosureMessages: params.disclosureMessages,
        requireAcknowledgment: params.requireAcknowledgment,
        acknowledgmentPhrase: params.acknowledgmentPhrase,
        autoPlayDelay: params.autoPlayDelay,
        recordingConsent: params.recordingConsent,
        consentRequired: params.consentRequired,
      },
    });

    return config;
  }

  // ==================== COMPLIANCE AUDIT LOGGING ====================

  /**
   * Log a compliance event
   */
  async logComplianceEvent(params: ComplianceAuditParams) {
    return prisma.complianceAuditLog.create({
      data: {
        organizationId: params.organizationId,
        eventType: params.eventType,
        actorType: params.actorType,
        actorId: params.actorId,
        targetType: params.targetType,
        targetId: params.targetId,
        action: params.action,
        description: params.description,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  /**
   * Get compliance audit logs
   */
  async getAuditLogs(organizationId: string, options: {
    eventType?: ComplianceEventType;
    actorType?: ActorType;
    targetType?: TargetType;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}) {
    const {
      eventType,
      actorType,
      targetType,
      targetId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const where: any = { organizationId };
    if (eventType) where.eventType = eventType;
    if (actorType) where.actorType = actorType;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.complianceAuditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.complianceAuditLog.count({ where }),
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

  // ==================== COMPLIANCE REPORTING ====================

  /**
   * Generate compliance report for a period
   */
  async generateComplianceReport(organizationId: string, startDate: Date, endDate: Date) {
    const [
      consentStats,
      dncStats,
      auditEvents,
      consentByType,
    ] = await Promise.all([
      // Consent statistics
      prisma.consentRecord.groupBy({
        by: ['consentGiven'],
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { id: true },
      }),

      // DNC list statistics
      prisma.doNotCallList.count({
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Audit event breakdown
      prisma.complianceAuditLog.groupBy({
        by: ['eventType'],
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { id: true },
      }),

      // Consent by type
      prisma.consentRecord.groupBy({
        by: ['consentType', 'consentGiven'],
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { id: true },
      }),
    ]);

    // Calculate consent rate
    const totalConsents = consentStats.reduce((sum, s) => sum + s._count.id, 0);
    const givenConsents = consentStats.find(s => s.consentGiven)?._count.id || 0;
    const consentRate = totalConsents > 0 ? (givenConsents / totalConsents) * 100 : 0;

    return {
      period: { startDate, endDate },
      summary: {
        totalConsentRequests: totalConsents,
        consentsGiven: givenConsents,
        consentsDenied: totalConsents - givenConsents,
        consentRate: Math.round(consentRate * 100) / 100,
        dncAdditions: dncStats,
      },
      consentByType: consentByType.reduce((acc, item) => {
        if (!acc[item.consentType]) {
          acc[item.consentType] = { given: 0, denied: 0 };
        }
        if (item.consentGiven) {
          acc[item.consentType].given = item._count.id;
        } else {
          acc[item.consentType].denied = item._count.id;
        }
        return acc;
      }, {} as Record<string, { given: number; denied: number }>),
      auditEventBreakdown: auditEvents.reduce((acc, item) => {
        acc[item.eventType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get compliance dashboard metrics
   */
  async getDashboardMetrics(organizationId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      activeConsents,
      revokedConsents,
      dncCount,
      recentAuditLogs,
      disclosureConfig,
    ] = await Promise.all([
      prisma.consentRecord.count({
        where: {
          organizationId,
          consentGiven: true,
          revokedAt: null,
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
        },
      }),

      prisma.consentRecord.count({
        where: {
          organizationId,
          revokedAt: { not: null },
        },
      }),

      prisma.doNotCallList.count({
        where: {
          organizationId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
      }),

      prisma.complianceAuditLog.findMany({
        where: {
          organizationId,
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      this.getDisclosureConfig(organizationId),
    ]);

    return {
      activeConsents,
      revokedConsents,
      dncCount,
      disclosureEnabled: disclosureConfig.disclosureEnabled,
      recentActivity: recentAuditLogs,
    };
  }

  // ==================== PRE-CALL COMPLIANCE CHECK ====================

  /**
   * Check if a call can be made to a phone number (DNC + consent check)
   */
  async preCallComplianceCheck(organizationId: string, phoneNumber: string) {
    // Check DNC list
    const dncEntry = await prisma.doNotCallList.findUnique({
      where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
    });

    const isOnDNC = dncEntry && (!dncEntry.expiresAt || dncEntry.expiresAt > new Date());

    // Check consent
    const consentStatus = await this.checkConsent(organizationId, phoneNumber, 'MARKETING_CALLS');

    // Log the compliance check
    await this.logComplianceEvent({
      organizationId,
      eventType: 'COMPLIANCE_CHECK',
      actorType: 'system',
      targetType: 'phone_number',
      targetId: phoneNumber,
      action: 'checked',
      description: `Pre-call compliance check: DNC=${isOnDNC}, Consent=${consentStatus.status.MARKETING_CALLS}`,
      metadata: {
        phoneNumber,
        isOnDNC,
        hasConsent: consentStatus.status.MARKETING_CALLS,
      },
    });

    return {
      canCall: !isOnDNC && consentStatus.status.MARKETING_CALLS,
      isOnDNC,
      hasMarketingConsent: consentStatus.status.MARKETING_CALLS,
      dncDetails: isOnDNC ? {
        reason: dncEntry?.reason,
        addedAt: dncEntry?.createdAt,
        expiresAt: dncEntry?.expiresAt,
      } : null,
      consentDetails: consentStatus,
    };
  }

  // ==================== BATCH COMPLIANCE CHECK ====================

  /**
   * Batch check multiple phone numbers against DNC list
   * Useful for campaign contact validation before execution
   */
  async batchDNCCheck(organizationId: string, phoneNumbers: string[]): Promise<{
    results: Array<{
      phoneNumber: string;
      isOnDNC: boolean;
      reason?: string;
      addedAt?: Date;
    }>;
    summary: {
      total: number;
      blocked: number;
      allowed: number;
    };
  }> {
    // Get all DNC entries for these phone numbers in one query
    const dncEntries = await prisma.doNotCallList.findMany({
      where: {
        organizationId,
        phoneNumber: { in: phoneNumbers },
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
    });

    // Create a map for O(1) lookup
    const dncMap = new Map(dncEntries.map(e => [e.phoneNumber, e]));

    // Check each phone number
    const results = phoneNumbers.map(phoneNumber => {
      const dncEntry = dncMap.get(phoneNumber);
      return {
        phoneNumber,
        isOnDNC: !!dncEntry,
        reason: dncEntry?.reason,
        addedAt: dncEntry?.createdAt,
      };
    });

    const blocked = results.filter(r => r.isOnDNC).length;

    // Log the batch check
    await this.logComplianceEvent({
      organizationId,
      eventType: 'COMPLIANCE_CHECK',
      actorType: 'system',
      targetType: 'phone_number',
      action: 'batch_checked',
      description: `Batch DNC check: ${blocked}/${phoneNumbers.length} blocked`,
      metadata: {
        totalChecked: phoneNumbers.length,
        blocked,
        allowed: phoneNumbers.length - blocked,
      },
    });

    return {
      results,
      summary: {
        total: phoneNumbers.length,
        blocked,
        allowed: phoneNumbers.length - blocked,
      },
    };
  }

  /**
   * Filter out DNC numbers from a contact list
   * Returns only the phone numbers that are allowed to be called
   */
  async filterDNCFromContacts(
    organizationId: string,
    contacts: Array<{ phone: string; [key: string]: any }>
  ): Promise<{
    allowed: Array<{ phone: string; [key: string]: any }>;
    blocked: Array<{ phone: string; reason: string; [key: string]: any }>;
  }> {
    const phoneNumbers = contacts.map(c => c.phone);
    const { results } = await this.batchDNCCheck(organizationId, phoneNumbers);

    // Create a map of blocked numbers with reasons
    const blockedMap = new Map(
      results
        .filter(r => r.isOnDNC)
        .map(r => [r.phoneNumber, r.reason || 'DNC_LISTED'])
    );

    const allowed: Array<{ phone: string; [key: string]: any }> = [];
    const blocked: Array<{ phone: string; reason: string; [key: string]: any }> = [];

    for (const contact of contacts) {
      const blockReason = blockedMap.get(contact.phone);
      if (blockReason) {
        blocked.push({ ...contact, reason: blockReason });
      } else {
        allowed.push(contact);
      }
    }

    return { allowed, blocked };
  }

  /**
   * Add consent expiry check - consent records should have a validity period
   * P0 COMPLIANCE: Consent should not be eternal - check for expired consent
   */
  async hasValidConsent(
    organizationId: string,
    phoneNumber: string,
    consentType: ConsentType,
    maxAgeMonths: number = 12 // Default consent validity: 12 months
  ): Promise<{
    hasValidConsent: boolean;
    consent?: any;
    expiredAt?: Date;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - maxAgeMonths);

    const consent = await prisma.consentRecord.findFirst({
      where: {
        organizationId,
        phoneNumber,
        consentType,
        consentGiven: true,
        revokedAt: null,
        // Must be obtained within the validity period
        createdAt: { gte: cutoffDate },
        // And not expired if validUntil is set
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (consent) {
      return { hasValidConsent: true, consent };
    }

    // Check if there's an expired consent
    const expiredConsent = await prisma.consentRecord.findFirst({
      where: {
        organizationId,
        phoneNumber,
        consentType,
        consentGiven: true,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (expiredConsent) {
      // Consent exists but is expired (either by age or validUntil)
      const expiredAt = expiredConsent.validUntil ||
        new Date(expiredConsent.createdAt.getTime() + (maxAgeMonths * 30 * 24 * 60 * 60 * 1000));
      return { hasValidConsent: false, consent: expiredConsent, expiredAt };
    }

    return { hasValidConsent: false };
  }
}

export const complianceService = new ComplianceService();
