import { Router } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { complianceService, ConsentMethod, ComplianceEventType, ActorType, TargetType } from '../services/compliance.service';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ConsentType } from '@prisma/client';
import { prisma } from '../config/database';

const router = Router();

// Rate limiter for compliance endpoints
const complianceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { success: false, message: 'Too many compliance requests' },
});

// Validation rules
const consentValidation = [
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('consentType').isIn(Object.values(ConsentType)).withMessage('Invalid consent type'),
  body('consentGiven').isBoolean().withMessage('consentGiven must be a boolean'),
  body('consentMethod').isIn(['VERBAL', 'WRITTEN', 'ELECTRONIC', 'RECORDED']).withMessage('Invalid consent method'),
  body('leadId').optional().isUUID().withMessage('Invalid lead ID'),
  body('callId').optional().isUUID().withMessage('Invalid call ID'),
  body('validUntil').optional().isISO8601().withMessage('Invalid date format'),
];

const disclosureValidation = [
  body('disclosureEnabled').optional().isBoolean().withMessage('disclosureEnabled must be a boolean'),
  body('disclosureText').optional().trim().isLength({ max: 2000 }).withMessage('Disclosure text must be at most 2000 characters'),
  body('requireAcknowledgment').optional().isBoolean().withMessage('requireAcknowledgment must be a boolean'),
  body('autoPlayDelay').optional().isInt({ min: 0, max: 30 }).withMessage('autoPlayDelay must be between 0 and 30 seconds'),
];

const settingsValidation = [
  body('dncEnabled').optional().isBoolean().withMessage('dncEnabled must be a boolean'),
  body('tcpaEnabled').optional().isBoolean().withMessage('tcpaEnabled must be a boolean'),
  body('gdprEnabled').optional().isBoolean().withMessage('gdprEnabled must be a boolean'),
  body('callRecordingDisclosure').optional().isBoolean().withMessage('callRecordingDisclosure must be a boolean'),
  body('disclosureMessage').optional().trim().isLength({ max: 2000 }).withMessage('Disclosure message too long'),
  body('consentTracking').optional().isBoolean().withMessage('consentTracking must be a boolean'),
  body('autoOptOutKeywords').optional().isArray({ max: 20 }).withMessage('autoOptOutKeywords must be an array with max 20 items'),
  body('autoOptOutKeywords.*').optional().trim().isLength({ max: 50 }).withMessage('Keyword too long'),
  body('quietHours').optional().isObject().withMessage('quietHours must be an object'),
  body('quietHours.enabled').optional().isBoolean().withMessage('quietHours.enabled must be a boolean'),
  body('quietHours.start').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
  body('quietHours.end').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format'),
  body('quietHours.timezone').optional().trim().isLength({ max: 50 }).withMessage('Invalid timezone'),
  body('callFrequencyLimits').optional().isObject().withMessage('callFrequencyLimits must be an object'),
  body('callFrequencyLimits.maxCallsPerDay').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid maxCallsPerDay'),
  body('callFrequencyLimits.maxCallsPerWeek').optional().isInt({ min: 1, max: 500 }).withMessage('Invalid maxCallsPerWeek'),
  body('callFrequencyLimits.cooldownHours').optional().isInt({ min: 0, max: 168 }).withMessage('Invalid cooldownHours'),
  body('retentionPolicy').optional().isObject().withMessage('retentionPolicy must be an object'),
  body('retentionPolicy.callRecordings').optional().isInt({ min: 1, max: 3650 }).withMessage('Invalid callRecordings retention days'),
  body('retentionPolicy.transcripts').optional().isInt({ min: 1, max: 3650 }).withMessage('Invalid transcripts retention days'),
  body('retentionPolicy.consentRecords').optional().isInt({ min: 1, max: 3650 }).withMessage('Invalid consentRecords retention days'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const dateRangeValidation = [
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required'),
];

// Helper function to log compliance audit events
async function logComplianceAudit(
  organizationId: string,
  eventType: string,
  actorId: string,
  description: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.complianceAuditLog.create({
      data: {
        organizationId,
        eventType: eventType as any,
        actorType: 'USER',
        actorId,
        targetType: metadata?.targetType || 'system',
        action: metadata?.action || 'accessed',
        description,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error('[Compliance] Audit log failed:', error);
  }
}

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);
router.use(complianceLimiter);

// ==================== COMPLIANCE SETTINGS ====================

/**
 * @api {get} /compliance/settings Get Compliance Settings
 */
router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    // Get or return default compliance settings
    const settings = {
      organizationId,
      dncEnabled: true,
      tcpaEnabled: true,
      gdprEnabled: false,
      callRecordingDisclosure: true,
      disclosureMessage: 'This call may be recorded for quality assurance purposes.',
      consentTracking: true,
      autoOptOutKeywords: ['STOP', 'UNSUBSCRIBE', 'REMOVE'],
      quietHours: {
        enabled: true,
        start: '21:00',
        end: '08:00',
        timezone: 'America/New_York',
      },
      callFrequencyLimits: {
        maxCallsPerDay: 3,
        maxCallsPerWeek: 10,
        cooldownHours: 24,
      },
      retentionPolicy: {
        callRecordings: 90,
        transcripts: 365,
        consentRecords: 730,
      },
      isConfigured: true,
    };

    res.json({ success: true, data: settings });
  })
);

/**
 * @api {put} /compliance/settings Update Compliance Settings
 */
router.put(
  '/settings',
  authorize('admin'),
  validate(settingsValidation),
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;

    // Extract only allowed fields
    const {
      dncEnabled,
      tcpaEnabled,
      gdprEnabled,
      callRecordingDisclosure,
      disclosureMessage,
      consentTracking,
      autoOptOutKeywords,
      quietHours,
      callFrequencyLimits,
      retentionPolicy,
    } = req.body;

    const settings = {
      dncEnabled,
      tcpaEnabled,
      gdprEnabled,
      callRecordingDisclosure,
      disclosureMessage,
      consentTracking,
      autoOptOutKeywords,
      quietHours,
      callFrequencyLimits,
      retentionPolicy,
    };

    // Remove undefined fields
    const cleanedSettings = Object.fromEntries(
      Object.entries(settings).filter(([_, v]) => v !== undefined)
    );

    // Log audit
    await logComplianceAudit(
      organizationId,
      'SETTINGS_UPDATED',
      userId,
      'Compliance settings updated',
      { updatedFields: Object.keys(cleanedSettings) }
    );

    // In a full implementation, save to database
    res.json({
      success: true,
      message: 'Compliance settings updated',
      data: { ...cleanedSettings, organizationId },
    });
  })
);

// ==================== CONSENT MANAGEMENT ====================

/**
 * @api {post} /compliance/consent Record Consent
 */
router.post(
  '/consent',
  validate(consentValidation),
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const {
      phoneNumber,
      consentType,
      consentGiven,
      consentMethod,
      leadId,
      callId,
      recordingUrl,
      consentPhrase,
      validUntil,
    } = req.body;

    const consent = await complianceService.recordConsent({
      organizationId,
      phoneNumber,
      consentType: consentType as ConsentType,
      consentGiven,
      consentMethod: consentMethod as ConsentMethod,
      leadId,
      callId,
      recordingUrl,
      consentPhrase,
      validUntil: validUntil ? new Date(validUntil) : undefined,
    });

    // Log audit event
    await logComplianceAudit(
      organizationId,
      consentGiven ? 'CONSENT_GRANTED' : 'CONSENT_DENIED',
      userId,
      `Consent ${consentGiven ? 'granted' : 'denied'} for ${phoneNumber}`,
      { consentType, consentMethod, leadId }
    );

    res.json({ success: true, data: consent });
  })
);

/**
 * @api {delete} /compliance/consent/:id Revoke Consent
 */
router.delete(
  '/consent/:id',
  validate([
    param('id').isUUID().withMessage('Invalid consent ID'),
    body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be at most 500 characters'),
  ]),
  asyncHandler(async (req, res) => {
    const { id: userId, organizationId } = req.user!;
    const { reason } = req.body;

    const consent = await complianceService.revokeConsent({
      consentId: req.params.id,
      revokedBy: userId,
      revokeReason: reason,
    });

    // Log audit event
    await logComplianceAudit(
      organizationId,
      'CONSENT_REVOKED',
      userId,
      `Consent revoked: ${req.params.id}`,
      { reason }
    );

    res.json({ success: true, data: consent });
  })
);

/**
 * @api {get} /compliance/consent/check/:phone Check Consent Status
 */
router.get(
  '/consent/check/:phone',
  validate([
    param('phone').trim().notEmpty().withMessage('Phone number is required')
      .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
    query('type').optional().isIn(Object.values(ConsentType)).withMessage('Invalid consent type'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { type } = req.query;

    const status = await complianceService.checkConsent(
      organizationId,
      req.params.phone,
      type as ConsentType | undefined
    );

    res.json({ success: true, data: status });
  })
);

/**
 * @api {get} /compliance/consent List Consent Records
 */
router.get(
  '/consent',
  validate([
    ...paginationValidation,
    query('phoneNumber').optional().trim().matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
    query('leadId').optional().isUUID().withMessage('Invalid lead ID'),
    query('consentType').optional().isIn(Object.values(ConsentType)).withMessage('Invalid consent type'),
    query('includeRevoked').optional().isIn(['true', 'false']).withMessage('includeRevoked must be true or false'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      phoneNumber,
      leadId,
      consentType,
      includeRevoked,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await complianceService.getConsentRecords(organizationId, {
      phoneNumber: phoneNumber as string,
      leadId: leadId as string,
      consentType: consentType as ConsentType,
      includeRevoked: includeRevoked === 'true',
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

// ==================== RECORDING DISCLOSURE ====================

/**
 * @api {get} /compliance/disclosure Get Disclosure Config
 */
router.get(
  '/disclosure',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const config = await complianceService.getDisclosureConfig(organizationId);
    res.json({ success: true, data: config });
  })
);

/**
 * @api {put} /compliance/disclosure Update Disclosure Config
 */
router.put(
  '/disclosure',
  authorize('admin'),
  validate(disclosureValidation),
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const {
      disclosureEnabled,
      disclosureText,
      disclosureMessages,
      requireAcknowledgment,
      acknowledgmentPhrase,
      autoPlayDelay,
      recordingConsent,
      consentRequired,
    } = req.body;

    const config = await complianceService.updateDisclosureConfig({
      organizationId,
      disclosureEnabled,
      disclosureText,
      disclosureMessages,
      requireAcknowledgment,
      acknowledgmentPhrase,
      autoPlayDelay,
      recordingConsent,
      consentRequired,
    });

    // Log audit event
    await logComplianceAudit(
      organizationId,
      'DISCLOSURE_UPDATED',
      userId,
      'Disclosure configuration updated',
      { disclosureEnabled, requireAcknowledgment }
    );

    res.json({ success: true, data: config });
  })
);

// ==================== AUDIT LOGS ====================

/**
 * @api {get} /compliance/audit-logs List Compliance Audit Logs
 */
router.get(
  '/audit-logs',
  authorize('admin'),
  validate([
    ...paginationValidation,
    query('eventType').optional().trim().isLength({ max: 50 }).withMessage('Invalid event type'),
    query('actorType').optional().isIn(['USER', 'SYSTEM', 'API']).withMessage('Invalid actor type'),
    query('targetType').optional().trim().isLength({ max: 50 }).withMessage('Invalid target type'),
    query('targetId').optional().isUUID().withMessage('Invalid target ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      eventType,
      actorType,
      targetType,
      targetId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await complianceService.getAuditLogs(organizationId, {
      eventType: eventType as ComplianceEventType,
      actorType: actorType as ActorType,
      targetType: targetType as TargetType,
      targetId: targetId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

// ==================== REPORTING ====================

/**
 * @api {get} /compliance/report Generate Compliance Report
 */
router.get(
  '/report',
  authorize('admin'),
  validate(dateRangeValidation),
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const { startDate, endDate } = req.query;

    // Log audit event for report generation
    await logComplianceAudit(
      organizationId,
      'REPORT_GENERATED',
      userId,
      `Compliance report generated for ${startDate} to ${endDate}`,
      { startDate, endDate }
    );

    const report = await complianceService.generateComplianceReport(
      organizationId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({ success: true, data: report });
  })
);

/**
 * @api {get} /compliance/dashboard Get Compliance Dashboard Metrics
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const metrics = await complianceService.getDashboardMetrics(organizationId);
    res.json({ success: true, data: metrics });
  })
);

// ==================== PRE-CALL CHECK ====================

/**
 * @api {get} /compliance/pre-call-check/:phone Pre-Call Compliance Check
 */
router.get(
  '/pre-call-check/:phone',
  validate([
    param('phone').trim().notEmpty().withMessage('Phone number is required')
      .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const result = await complianceService.preCallComplianceCheck(
      organizationId,
      req.params.phone
    );
    res.json({ success: true, data: result });
  })
);

export default router;
