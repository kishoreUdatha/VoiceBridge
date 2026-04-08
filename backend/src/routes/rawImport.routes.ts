import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { rawImportController } from '../controllers/rawImport.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { externalLeadImportService } from '../services/external-lead-import.service';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const assignToTelecallersValidation = [
  body('recordIds').isArray({ min: 1 }).withMessage('At least one record ID is required'),
  body('recordIds.*').isUUID().withMessage('Invalid record ID'),
  body('telecallerIds').isArray({ min: 1 }).withMessage('At least one telecaller ID is required'),
  body('telecallerIds.*').isUUID().withMessage('Invalid telecaller ID'),
];

const assignToAIAgentValidation = [
  body('recordIds').isArray({ min: 1 }).withMessage('At least one record ID is required'),
  body('recordIds.*').isUUID().withMessage('Invalid record ID'),
  body('agentId').isUUID().withMessage('Valid AI agent ID is required'),
];

const updateStatusValidation = [
  param('id').isUUID().withMessage('Invalid record ID'),
  body('status').isIn([
    'PENDING', 'ASSIGNED', 'CALLING', 'INTERESTED', 'NOT_INTERESTED',
    'NO_ANSWER', 'CALLBACK_REQUESTED', 'CONVERTED', 'REJECTED'
  ]).withMessage('Invalid status'),
];

const convertToLeadValidation = [
  param('id').isUUID().withMessage('Invalid record ID'),
  body('source').optional().isIn([
    'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
    'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'REFERRAL', 'WEBSITE', 'OTHER'
  ]),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
];

const bulkConvertValidation = [
  body('recordIds').isArray({ min: 1 }).withMessage('At least one record ID is required'),
  body('recordIds.*').isUUID().withMessage('Invalid record ID'),
];

const bulkStatusUpdateValidation = [
  body('recordIds').isArray({ min: 1 }).withMessage('At least one record ID is required'),
  body('recordIds.*').isUUID().withMessage('Invalid record ID'),
  body('status').isIn([
    'PENDING', 'ASSIGNED', 'CALLING', 'INTERESTED', 'NOT_INTERESTED',
    'NO_ANSWER', 'CALLBACK_REQUESTED', 'CONVERTED', 'REJECTED'
  ]).withMessage('Invalid status'),
];

const listRecordsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn([
    'PENDING', 'ASSIGNED', 'CALLING', 'INTERESTED', 'NOT_INTERESTED',
    'NO_ANSWER', 'CALLBACK_REQUESTED', 'CONVERTED', 'REJECTED'
  ]),
  query('bulkImportId').optional().isUUID(),
  query('assignedToId').optional().isUUID(),
  query('assignedAgentId').optional().isUUID(),
];

// Routes

// Stats
router.get(
  '/stats',
  rawImportController.getStats.bind(rawImportController)
);

// Telecaller Assignment Stats (for admin/manager dashboard)
router.get(
  '/stats/telecaller-assignments',
  authorize('admin', 'manager', 'team_lead'),
  rawImportController.getTelecallerAssignmentStats.bind(rawImportController)
);

// Bulk Imports List
router.get(
  '/',
  rawImportController.listBulkImports.bind(rawImportController)
);

// Records List (can filter by bulkImportId)
router.get(
  '/records',
  validate(listRecordsValidation),
  rawImportController.listRecords.bind(rawImportController)
);

// Get single bulk import
router.get(
  '/:id',
  param('id').isUUID().withMessage('Invalid bulk import ID'),
  validate([]),
  rawImportController.getBulkImport.bind(rawImportController)
);

// Get single record
router.get(
  '/records/:id',
  param('id').isUUID().withMessage('Invalid record ID'),
  validate([]),
  rawImportController.getRecord.bind(rawImportController)
);

// Assignment - Allow admin, manager, and team_lead to assign leads
router.post(
  '/assign/telecallers',
  authorize('admin', 'manager', 'team_lead'),
  validate(assignToTelecallersValidation),
  rawImportController.assignToTelecallers.bind(rawImportController)
);

router.post(
  '/assign/ai-agent',
  authorize('admin', 'manager'),
  validate(assignToAIAgentValidation),
  rawImportController.assignToAIAgent.bind(rawImportController)
);

// Status Update
router.put(
  '/records/:id/status',
  validate(updateStatusValidation),
  rawImportController.updateRecordStatus.bind(rawImportController)
);

// Conversion
router.post(
  '/records/:id/convert',
  validate(convertToLeadValidation),
  rawImportController.convertToLead.bind(rawImportController)
);

router.post(
  '/records/bulk-convert',
  validate(bulkConvertValidation),
  rawImportController.bulkConvertToLeads.bind(rawImportController)
);

// Bulk Status Update
router.post(
  '/records/bulk-status',
  validate(bulkStatusUpdateValidation),
  rawImportController.bulkUpdateStatus.bind(rawImportController)
);

// Delete single record
router.delete(
  '/records/:id',
  param('id').isUUID().withMessage('Invalid record ID'),
  validate([]),
  rawImportController.deleteRecord.bind(rawImportController)
);

// Delete bulk import and all its records
router.delete(
  '/:id',
  param('id').isUUID().withMessage('Invalid bulk import ID'),
  validate([]),
  rawImportController.deleteBulkImport.bind(rawImportController)
);

// Bulk delete records
router.post(
  '/records/bulk-delete',
  body('recordIds').isArray({ min: 1 }).withMessage('At least one record ID is required'),
  body('recordIds.*').isUUID().withMessage('Invalid record ID'),
  validate([]),
  rawImportController.bulkDeleteRecords.bind(rawImportController)
);

// Add manual record to a bulk import
const addManualRecordValidation = [
  body('bulkImportId').isUUID().withMessage('Valid bulk import ID is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('lastName').optional().isString(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('alternatePhone').optional().isString(),
  body('customFields').optional().isObject(),
];

router.post(
  '/records/add-manual',
  authorize('admin'),
  validate(addManualRecordValidation),
  rawImportController.addManualRecord.bind(rawImportController)
);

// Add multiple manual records to a bulk import
const addBulkManualRecordsValidation = [
  body('bulkImportId').isUUID().withMessage('Valid bulk import ID is required'),
  body('records').isArray({ min: 1 }).withMessage('At least one record is required'),
  body('records.*.firstName').notEmpty().withMessage('First name is required for each record'),
  body('records.*.phone').notEmpty().withMessage('Phone number is required for each record'),
];

router.post(
  '/records/add-manual-bulk',
  authorize('admin'),
  validate(addBulkManualRecordsValidation),
  rawImportController.addBulkManualRecords.bind(rawImportController)
);

// Test endpoint to simulate external leads (for testing purposes)
const simulateLeadValidation = [
  body('source').isIn([
    'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_GOOGLE', 'AD_LINKEDIN',
    'FORM', 'LANDING_PAGE', 'WEBSITE', 'WHATSAPP', 'API'
  ]).withMessage('Invalid source'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('lastName').optional().isString(),
  body('email').optional().isEmail(),
  body('sourceDetails').optional().isString(),
  body('campaignName').optional().isString(),
];

router.post(
  '/simulate-lead',
  authorize('admin'),
  validate(simulateLeadValidation),
  async (req, res) => {
    try {
      const organizationId = req.user!.organizationId;
      const { source, firstName, lastName, email, phone, sourceDetails, campaignName, customFields } = req.body;

      const result = await externalLeadImportService.importExternalLead(organizationId, {
        source,
        firstName,
        lastName,
        email,
        phone,
        sourceDetails,
        campaignName,
        customFields,
      });

      res.json({
        success: true,
        data: result,
        message: result.isDuplicate ? 'Lead already exists (duplicate)' : 'Lead imported successfully',
      });
    } catch (error: any) {
      console.error('[SimulateLead] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
