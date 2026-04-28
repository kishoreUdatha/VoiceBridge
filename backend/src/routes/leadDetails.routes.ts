import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { prisma } from '../config/database';
import { uploadMiddleware } from '../middlewares/upload';
import { uploadToS3, deleteFromS3 } from '../services/s3.service';
import { canAccessLead, LeadAccessContext, hasElevatedAccess } from '../utils/leadAccess';

const router = Router();

// Async handler wrapper
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Role-aware lead access verification
 *
 * Access rules:
 * - Admin/Manager: Can access any lead in their organization
 * - Counselor/Telecaller: Can only access leads assigned to them
 */
const verifyLeadAccess = async (leadId: string, req: AuthenticatedRequest): Promise<boolean> => {
  const context: LeadAccessContext = {
    userId: req.user!.id,
    organizationId: req.user!.organizationId,
    role: req.user!.role,
  };
  return canAccessLead(leadId, context);
};

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== NOTES ====================

// Get notes for a lead
router.get(
  '/:leadId/notes',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const notes = await prisma.leadNote.findMany({
      where: { leadId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: notes });
  })
);

// Create note
router.post(
  '/:leadId/notes',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('content').trim().notEmpty().withMessage('Note content is required')
      .isLength({ max: 10000 }).withMessage('Note content too long'),
    body('isPinned').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { content, isPinned } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const note = await prisma.leadNote.create({
      data: {
        leadId,
        userId: req.user!.id,
        content,
        isPinned: isPinned || false,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user!.id,
        type: 'NOTE_ADDED',
        title: 'Note added',
        description: content.substring(0, 100),
      },
    });

    res.status(201).json({ success: true, data: note });
  })
);

// Update note
router.put(
  '/:leadId/notes/:noteId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('noteId').isUUID().withMessage('Invalid note ID'),
    body('content').optional().trim().notEmpty()
      .isLength({ max: 10000 }).withMessage('Note content too long'),
    body('isPinned').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, noteId } = req.params;
    const { content, isPinned } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify note belongs to this lead
    const existingNote = await prisma.leadNote.findFirst({
      where: { id: noteId, leadId },
    });
    if (!existingNote) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const note = await prisma.leadNote.update({
      where: { id: noteId },
      data: {
        ...(content && { content }),
        ...(isPinned !== undefined && { isPinned }),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    res.json({ success: true, data: note });
  })
);

// Delete note
router.delete(
  '/:leadId/notes/:noteId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('noteId').isUUID().withMessage('Invalid note ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, noteId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify note belongs to this lead
    const existingNote = await prisma.leadNote.findFirst({
      where: { id: noteId, leadId },
    });
    if (!existingNote) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    await prisma.leadNote.delete({ where: { id: noteId } });

    res.json({ success: true, message: 'Note deleted' });
  })
);

// ==================== TASKS ====================

// Get tasks for a lead
router.get(
  '/:leadId/tasks',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const tasks = await prisma.leadTask.findMany({
      where: { leadId },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    res.json({ success: true, data: tasks });
  })
);

// Create task
router.post(
  '/:leadId/tasks',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('title').trim().notEmpty().withMessage('Task title is required')
      .isLength({ max: 500 }).withMessage('Title too long'),
    body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
    body('dueDate').optional().isISO8601(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('assigneeId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { title, description, dueDate, priority, assigneeId } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const task = await prisma.leadTask.create({
      data: {
        leadId,
        createdById: req.user!.id,
        assigneeId: assigneeId || req.user!.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user!.id,
        type: 'TASK_CREATED',
        title: 'Task created',
        description: title,
      },
    });

    res.status(201).json({ success: true, data: task });
  })
);

// Update task
router.put(
  '/:leadId/tasks/:taskId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('taskId').isUUID().withMessage('Invalid task ID'),
    body('title').optional().trim().notEmpty()
      .isLength({ max: 500 }).withMessage('Title too long'),
    body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
    body('dueDate').optional().isISO8601(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    body('assigneeId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, taskId } = req.params;
    const { title, description, dueDate, priority, status, assigneeId } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify task belongs to this lead
    const existingTask = await prisma.leadTask.findFirst({
      where: { id: taskId, leadId },
    });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (priority) updateData.priority = priority;
    if (status) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }
    if (assigneeId) updateData.assigneeId = assigneeId;

    const task = await prisma.leadTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create activity for task completion
    if (status === 'COMPLETED') {
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: 'TASK_COMPLETED',
          title: 'Task completed',
          description: task.title,
        },
      });
    }

    res.json({ success: true, data: task });
  })
);

// Delete task
router.delete(
  '/:leadId/tasks/:taskId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('taskId').isUUID().withMessage('Invalid task ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, taskId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify task belongs to this lead
    const existingTask = await prisma.leadTask.findFirst({
      where: { id: taskId, leadId },
    });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await prisma.leadTask.delete({ where: { id: taskId } });

    res.json({ success: true, message: 'Task deleted' });
  })
);

// ==================== FOLLOW-UPS ====================

// Get follow-ups for a lead
router.get(
  '/:leadId/follow-ups',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const followUps = await prisma.followUp.findMany({
      where: { leadId },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ success: true, data: followUps });
  })
);

// Completed stages where follow-ups should not be allowed
const COMPLETED_STAGES = ['Won', 'WON', 'Lost', 'LOST', 'Closed', 'CLOSED', 'Admitted', 'ADMITTED', 'Enrolled', 'ENROLLED', 'Dropped', 'DROPPED'];

// Create follow-up
router.post(
  '/:leadId/follow-ups',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('scheduledAt').isISO8601().withMessage('Scheduled date is required'),
    body('message').optional().trim().isLength({ max: 2000 }).withMessage('Message too long'),
    body('notes').optional().trim().isLength({ max: 5000 }).withMessage('Notes too long'),
    body('assigneeId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { scheduledAt, message, notes, assigneeId } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Check if lead is in a completed stage
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { stage: { select: { name: true } } },
    });

    if (lead?.stage && COMPLETED_STAGES.includes(lead.stage.name)) {
      return res.status(400).json({
        success: false,
        message: `Cannot schedule follow-up for a lead in "${lead.stage.name}" stage. The lead has already been closed.`,
      });
    }

    // Check for existing upcoming follow-up (prevent duplicates)
    const existingFollowUp = await prisma.followUp.findFirst({
      where: {
        leadId,
        status: 'UPCOMING',
      },
    });

    if (existingFollowUp) {
      return res.status(400).json({
        success: false,
        message: `This lead already has a scheduled follow-up on ${new Date(existingFollowUp.scheduledAt).toLocaleDateString()}. Please reschedule the existing one instead.`,
      });
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        createdById: req.user!.id,
        assigneeId: assigneeId || req.user!.id,
        scheduledAt: new Date(scheduledAt),
        message,
        notes,
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user!.id,
        type: 'FOLLOWUP_SCHEDULED',
        title: 'Follow-up scheduled',
        description: `Scheduled for ${new Date(scheduledAt).toLocaleDateString()}`,
      },
    });

    res.status(201).json({ success: true, data: followUp });
  })
);

// Update follow-up
router.put(
  '/:leadId/follow-ups/:followUpId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('followUpId').isUUID().withMessage('Invalid follow-up ID'),
    body('scheduledAt').optional().isISO8601(),
    body('message').optional().trim().isLength({ max: 2000 }).withMessage('Message too long'),
    body('notes').optional().trim().isLength({ max: 5000 }).withMessage('Notes too long'),
    body('status').optional().isIn(['UPCOMING', 'COMPLETED', 'MISSED', 'RESCHEDULED']),
    body('assigneeId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, followUpId } = req.params;
    const { scheduledAt, message, notes, status, assigneeId } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify follow-up belongs to this lead
    const existingFollowUp = await prisma.followUp.findFirst({
      where: { id: followUpId, leadId },
    });
    if (!existingFollowUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    const updateData: any = {};
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (message !== undefined) updateData.message = message;
    if (notes !== undefined) updateData.notes = notes;
    if (status) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }
    if (assigneeId) updateData.assigneeId = assigneeId;

    const followUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create activity for completion
    if (status === 'COMPLETED') {
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: 'FOLLOWUP_COMPLETED',
          title: 'Follow-up completed',
          description: message || 'Follow-up marked as completed',
        },
      });
    }

    res.json({ success: true, data: followUp });
  })
);

// Delete follow-up
router.delete(
  '/:leadId/follow-ups/:followUpId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('followUpId').isUUID().withMessage('Invalid follow-up ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, followUpId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify follow-up belongs to this lead
    const existingFollowUp = await prisma.followUp.findFirst({
      where: { id: followUpId, leadId },
    });
    if (!existingFollowUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    await prisma.followUp.delete({ where: { id: followUpId } });

    res.json({ success: true, message: 'Follow-up deleted' });
  })
);

// ==================== ATTACHMENTS ====================

// Get attachments for a lead
router.get(
  '/:leadId/attachments',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const attachments = await prisma.leadAttachment.findMany({
      where: { leadId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({ success: true, data: attachments });
  })
);

// Upload attachment
router.post(
  '/:leadId/attachments',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  uploadMiddleware.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Upload to S3
    const fileUrl = await uploadToS3(
      req.file.buffer,
      `leads/${leadId}/${Date.now()}-${req.file.originalname}`,
      req.file.mimetype
    );

    const attachment = await prisma.leadAttachment.create({
      data: {
        leadId,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user!.id,
        type: 'DOCUMENT_UPLOADED',
        title: 'Document uploaded',
        description: req.file.originalname,
      },
    });

    res.status(201).json({ success: true, data: attachment });
  })
);

// Delete attachment
router.delete(
  '/:leadId/attachments/:attachmentId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('attachmentId').isUUID().withMessage('Invalid attachment ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, attachmentId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify attachment belongs to this lead
    const attachment = await prisma.leadAttachment.findFirst({
      where: { id: attachmentId, leadId },
    });

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    // Delete from S3
    try {
      await deleteFromS3(attachment.fileUrl);
    } catch (error) {
      console.error('Failed to delete from S3:', error);
    }

    await prisma.leadAttachment.delete({ where: { id: attachmentId } });

    res.json({ success: true, message: 'Attachment deleted' });
  })
);

// ==================== QUERIES ====================

// Get queries for a lead
router.get(
  '/:leadId/queries',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const queries = await prisma.leadQuery.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: queries });
  })
);

// Create query
router.post(
  '/:leadId/queries',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('query').trim().notEmpty().withMessage('Query content is required')
      .isLength({ max: 5000 }).withMessage('Query too long'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { query: queryText } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const leadQuery = await prisma.leadQuery.create({
      data: {
        leadId,
        query: queryText,
      },
    });

    res.status(201).json({ success: true, data: leadQuery });
  })
);

// Update query (respond to query)
router.put(
  '/:leadId/queries/:queryId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('queryId').isUUID().withMessage('Invalid query ID'),
    body('response').optional().trim().isLength({ max: 10000 }).withMessage('Response too long'),
    body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, queryId } = req.params;
    const { response, status } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify query belongs to this lead
    const existingQuery = await prisma.leadQuery.findFirst({
      where: { id: queryId, leadId },
    });
    if (!existingQuery) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    const updateData: any = {};
    if (response !== undefined) updateData.response = response;
    if (status) {
      updateData.status = status;
      if (response && !updateData.respondedAt) {
        updateData.respondedAt = new Date();
      }
    }

    const leadQuery = await prisma.leadQuery.update({
      where: { id: queryId },
      data: updateData,
    });

    res.json({ success: true, data: leadQuery });
  })
);

// Delete query
router.delete(
  '/:leadId/queries/:queryId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('queryId').isUUID().withMessage('Invalid query ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, queryId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify query belongs to this lead
    const existingQuery = await prisma.leadQuery.findFirst({
      where: { id: queryId, leadId },
    });
    if (!existingQuery) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    await prisma.leadQuery.delete({ where: { id: queryId } });

    res.json({ success: true, message: 'Query deleted' });
  })
);

// ==================== APPLICATIONS ====================

// Get applications for a lead
router.get(
  '/:leadId/applications',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const applications = await prisma.leadApplication.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: applications });
  })
);

// Create application
router.post(
  '/:leadId/applications',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('programName').optional().trim().isLength({ max: 500 }).withMessage('Program name too long'),
    body('documents').optional().isArray({ max: 50 }).withMessage('Too many documents'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { programName, documents } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Generate application number
    const count = await prisma.leadApplication.count();
    const applicationNo = `APP-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;

    const application = await prisma.leadApplication.create({
      data: {
        leadId,
        applicationNo,
        programName,
        documents: documents || [],
      },
    });

    res.status(201).json({ success: true, data: application });
  })
);

// Update application
router.put(
  '/:leadId/applications/:applicationId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('applicationId').isUUID().withMessage('Invalid application ID'),
    body('programName').optional().trim().isLength({ max: 500 }).withMessage('Program name too long'),
    body('status').optional().isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED']),
    body('documents').optional().isArray({ max: 50 }).withMessage('Too many documents'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, applicationId } = req.params;
    const { programName, status, documents } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify application belongs to this lead
    const existingApplication = await prisma.leadApplication.findFirst({
      where: { id: applicationId, leadId },
    });
    if (!existingApplication) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const updateData: any = {};
    if (programName !== undefined) updateData.programName = programName;
    if (status) {
      updateData.status = status;
      if (status === 'SUBMITTED' && !updateData.submittedAt) {
        updateData.submittedAt = new Date();
      }
    }
    if (documents) updateData.documents = documents;

    const application = await prisma.leadApplication.update({
      where: { id: applicationId },
      data: updateData,
    });

    // Create activity for submission
    if (status === 'SUBMITTED') {
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: 'APPLICATION_SUBMITTED',
          title: 'Application submitted',
          description: `Application ${application.applicationNo}`,
        },
      });
    }

    res.json({ success: true, data: application });
  })
);

// Delete application
router.delete(
  '/:leadId/applications/:applicationId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('applicationId').isUUID().withMessage('Invalid application ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, applicationId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify application belongs to this lead
    const existingApplication = await prisma.leadApplication.findFirst({
      where: { id: applicationId, leadId },
    });
    if (!existingApplication) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    await prisma.leadApplication.delete({ where: { id: applicationId } });

    res.json({ success: true, message: 'Application deleted' });
  })
);

// ==================== ACTIVITIES (Timeline) ====================

// Get activities for a lead
router.get(
  '/:leadId/activities',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    try {
      const activities = await prisma.leadActivity.findMany({
        where: { leadId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await prisma.leadActivity.count({ where: { leadId } });

      res.json({
        success: true,
        data: activities,
        pagination: { total, limit, offset },
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch activities' });
    }
  })
);

// Create custom activity
router.post(
  '/:leadId/activities',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('title').trim().notEmpty().withMessage('Activity title is required')
      .isLength({ max: 500 }).withMessage('Title too long'),
    body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
    body('type').optional().isIn([
      'LEAD_CREATED', 'STAGE_CHANGED', 'SUBSTAGE_CHANGED', 'ASSIGNMENT_CHANGED',
      'NOTE_ADDED', 'CALL_MADE', 'SMS_SENT', 'EMAIL_SENT', 'WHATSAPP_SENT',
      'TASK_CREATED', 'TASK_COMPLETED', 'FOLLOWUP_SCHEDULED', 'FOLLOWUP_COMPLETED',
      'DOCUMENT_UPLOADED', 'PAYMENT_RECEIVED', 'APPLICATION_SUBMITTED', 'CUSTOM'
    ]),
    body('metadata').optional().isObject(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { title, description, type, metadata } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    try {
      const activity = await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: type || 'CUSTOM',
          title,
          description,
          metadata,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      });

      res.status(201).json({ success: true, data: activity });
    } catch (error) {
      console.error('Error creating activity:', error);
      res.status(500).json({ success: false, message: 'Failed to create activity' });
    }
  })
);

// ==================== INTERESTS ====================

// Get interests for a lead
router.get(
  '/:leadId/interests',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    try {
      // SECURITY: Role-based access check
      if (!await verifyLeadAccess(leadId, req)) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        select: { interests: true },
      });

      if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      res.json({ success: true, data: lead.interests || [] });
    } catch (error) {
      console.error('Error fetching interests:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch interests' });
    }
  })
);

// Update interests for a lead
router.put(
  '/:leadId/interests',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('interests').isArray({ max: 100 }).withMessage('Interests must be an array'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { interests } = req.body;
    const organizationId = req.user!.organizationId;

    try {
      // SECURITY: Verify lead belongs to user's organization
      if (!await verifyLeadAccess(leadId, req)) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      const lead = await prisma.lead.update({
        where: { id: leadId },
        data: { interests },
        select: { interests: true },
      });

      res.json({ success: true, data: lead.interests });
    } catch (error) {
      console.error('Error updating interests:', error);
      res.status(500).json({ success: false, message: 'Failed to update interests' });
    }
  })
);

// ==================== CALL LOGS ====================

// Get call logs for a lead (includes both telecaller calls and AI outbound calls)
router.get(
  '/:leadId/calls',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Get lead's phone number to also search by phone (calls may not have leadId linked)
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { phone: true },
    });
    const leadPhone = lead?.phone;

    // Fetch both telecaller calls AND AI outbound calls (by leadId OR phone number)
    const [telecallerCalls, outboundCalls] = await Promise.all([
      // Manual telecaller calls
      prisma.telecallerCall.findMany({
        where: {
          organizationId,
          OR: [
            { leadId },
            ...(leadPhone ? [{ phoneNumber: leadPhone }] : []),
          ],
        },
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          telecaller: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // AI voice agent outbound calls
      prisma.outboundCall.findMany({
        where: {
          OR: [
            { existingLeadId: leadId },
            ...(leadPhone ? [{ phoneNumber: leadPhone }] : []),
          ],
        },
        include: {
          existingLead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          agent: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Combine and normalize both call types
    const allCalls = [
      ...telecallerCalls.map(call => ({
        ...call,
        callSource: 'telecaller' as const,
        callerName: call.telecaller ? `${call.telecaller.firstName} ${call.telecaller.lastName}` : null,
      })),
      ...outboundCalls.map(call => ({
        ...call,
        callSource: 'ai_agent' as const,
        callerName: call.agent?.name || 'AI Agent',
        lead: call.existingLead,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: allCalls });
  })
);

// ==================== WHATSAPP LOGS ====================

// Get WhatsApp logs for a lead
router.get(
  '/:leadId/whatsapp',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    try {
      const messages = await prisma.whatsappLog.findMany({
        where: { leadId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: messages });
    } catch (error) {
      console.error('Error fetching WhatsApp logs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch WhatsApp logs' });
    }
  })
);

// Send WhatsApp message
router.post(
  '/:leadId/whatsapp',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('message').trim().notEmpty().withMessage('Message is required')
      .isLength({ max: 4096 }).withMessage('Message too long'),
    body('mediaUrl').optional().isURL(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { message, mediaUrl } = req.body;
    const organizationId = req.user!.organizationId;

    try {
      // SECURITY: Role-based access check
      if (!await verifyLeadAccess(leadId, req)) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      // Get lead details for sending message
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        select: { phone: true, firstName: true, lastName: true },
      });

      if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      if (!lead.phone) {
        return res.status(400).json({ success: false, message: 'Lead phone number not found' });
      }

      // Create log entry first
      const logEntry = await prisma.whatsappLog.create({
        data: {
          leadId,
          userId: req.user!.id,
          phone: lead.phone,
          message,
          mediaUrl,
          direction: 'OUTBOUND',
          status: 'PENDING',
          provider: 'TWILIO',
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Try to send via Exotel (optional - will log even if Exotel fails)
      try {
        const { exotelService } = await import('../integrations/exotel.service');
        await exotelService.sendWhatsApp({ to: lead.phone, message });

        // Update status to sent
        await prisma.whatsappLog.update({
          where: { id: logEntry.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } catch (exotelError) {
        console.error('Exotel WhatsApp error (message logged but not sent):', exotelError);
        // Message is logged but not actually sent via Exotel
      }

      // Create activity
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: 'WHATSAPP_SENT',
          title: 'WhatsApp message logged',
          description: message.substring(0, 100),
        },
      });

      res.status(201).json({ success: true, data: logEntry });
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      res.status(500).json({ success: false, message: 'Failed to send WhatsApp message' });
    }
  })
);

// ==================== SMS LOGS ====================

// Get SMS logs for a lead
router.get(
  '/:leadId/sms',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    try {
      const messages = await prisma.smsLog.findMany({
        where: { leadId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: messages });
    } catch (error) {
      console.error('Error fetching SMS logs:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch SMS logs' });
    }
  })
);

// Send SMS
router.post(
  '/:leadId/sms',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('message').trim().notEmpty().withMessage('Message is required')
      .isLength({ max: 1600 }).withMessage('Message too long'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { message } = req.body;
    const organizationId = req.user!.organizationId;

    try {
      // SECURITY: Role-based access check
      if (!await verifyLeadAccess(leadId, req)) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      // Get lead details for sending message
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        select: { phone: true },
      });

      if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      if (!lead.phone) {
        return res.status(400).json({ success: false, message: 'Lead phone number not found' });
      }

      // Create log entry first
      const logEntry = await prisma.smsLog.create({
        data: {
          leadId,
          userId: req.user!.id,
          phone: lead.phone,
          message,
          direction: 'OUTBOUND',
          status: 'PENDING',
          provider: 'TWILIO',
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Try to send via Exotel (optional - will log even if Exotel fails)
      try {
        const { exotelService } = await import('../integrations/exotel.service');
        await exotelService.sendSMS({ to: lead.phone, body: message });

        // Update status to sent
        await prisma.smsLog.update({
          where: { id: logEntry.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } catch (exotelError) {
        console.error('Exotel SMS error (message logged but not sent):', exotelError);
        // Message is logged but not actually sent via Exotel
      }

      // Create activity
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: 'SMS_SENT',
          title: 'SMS logged',
          description: message.substring(0, 100),
        },
      });

      res.status(201).json({ success: true, data: logEntry });
    } catch (error) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ success: false, message: 'Failed to send SMS' });
    }
  })
);

// ==================== EMAIL ====================

// Send Email
router.post(
  '/:leadId/email',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('subject').trim().notEmpty().withMessage('Subject is required')
      .isLength({ max: 200 }).withMessage('Subject too long'),
    body('body').trim().notEmpty().withMessage('Email body is required')
      .isLength({ max: 10000 }).withMessage('Body too long'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { subject, body: emailBody } = req.body;
    const organizationId = req.user!.organizationId;

    try {
      // SECURITY: Role-based access check
      if (!await verifyLeadAccess(leadId, req)) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      // Get lead details for sending message
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!lead) {
        return res.status(404).json({ success: false, message: 'Lead not found' });
      }

      if (!lead.email) {
        return res.status(400).json({ success: false, message: 'Lead email not found' });
      }

      // Create log entry first
      const logEntry = await prisma.emailLog.create({
        data: {
          leadId,
          userId: req.user!.id,
          toEmail: lead.email,
          subject,
          body: emailBody,
          direction: 'OUTBOUND',
          status: 'PENDING',
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Update status to SENT (email logging - actual sending via integration service can be added)
      await prisma.emailLog.update({
        where: { id: logEntry.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      // Create activity
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: 'EMAIL_SENT',
          title: 'Email sent',
          description: `Subject: ${subject}`,
        },
      });

      res.status(201).json({ success: true, data: logEntry });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ success: false, message: 'Failed to send email' });
    }
  })
);

// Create call log
router.post(
  '/:leadId/calls',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required')
      .isLength({ max: 20 }).withMessage('Phone number too long'),
    body('direction').isIn(['INBOUND', 'OUTBOUND']),
    body('callType').optional().isIn(['MANUAL', 'AI', 'IVRS', 'PERSONAL']),
    body('status').optional().isIn(['INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'FAILED', 'BUSY', 'NO_ANSWER']),
    body('duration').optional().isInt({ min: 0, max: 86400 }),
    body('notes').optional().trim().isLength({ max: 5000 }).withMessage('Notes too long'),
    body('recordingUrl').optional().isURL(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { phoneNumber, direction, callType, status, duration, notes, recordingUrl } = req.body;
    const organizationId = req.user!.organizationId;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const call = await prisma.callLog.create({
      data: {
        organizationId: req.user!.organizationId,
        leadId,
        callerId: req.user!.id,
        phoneNumber,
        direction,
        callType: callType || 'MANUAL',
        status: status || 'COMPLETED',
        duration,
        notes,
        recordingUrl,
        startedAt: new Date(),
        endedAt: duration ? new Date(Date.now() + duration * 1000) : new Date(),
      },
      include: {
        caller: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user!.id,
        type: 'CALL_MADE',
        title: `${direction} call - ${status || 'COMPLETED'}`,
        description: notes || `Call duration: ${duration || 0} seconds`,
      },
    });

    res.status(201).json({ success: true, data: call });
  })
);

// ==================== PAYMENTS ====================

// Get payments for a lead
router.get(
  '/:leadId/payments',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const payments = await prisma.leadPayment.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: payments });
  })
);

// Create payment
router.post(
  '/:leadId/payments',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').optional().isLength({ max: 3 }).withMessage('Invalid currency'),
    body('paymentType').isIn(['REGISTRATION', 'TUITION', 'EXAM', 'HOSTEL', 'OTHER']),
    body('paymentMethod').isIn(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE']),
    body('status').optional().isIn(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIAL']),
    body('transactionId').optional().trim().isLength({ max: 100 }),
    body('receiptNo').optional().trim().isLength({ max: 50 }),
    body('dueDate').optional().isISO8601(),
    body('paidAt').optional().isISO8601(),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { amount, currency, paymentType, paymentMethod, status, transactionId, receiptNo, dueDate, paidAt, notes } = req.body;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const payment = await prisma.leadPayment.create({
      data: {
        leadId,
        amount,
        currency: currency || 'INR',
        paymentType,
        paymentMethod,
        status: status || 'PENDING',
        transactionId,
        receiptNo,
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: paidAt ? new Date(paidAt) : (status === 'COMPLETED' ? new Date() : null),
        notes,
      },
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user!.id,
        type: 'PAYMENT_RECEIVED',
        title: `Payment recorded - ${paymentType}`,
        description: `${currency || 'INR'} ${amount} via ${paymentMethod}`,
      },
    });

    res.status(201).json({ success: true, data: payment });
  })
);

// Update payment
router.put(
  '/:leadId/payments/:paymentId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('paymentId').isUUID().withMessage('Invalid payment ID'),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('status').optional().isIn(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIAL']),
    body('transactionId').optional().trim().isLength({ max: 100 }),
    body('receiptNo').optional().trim().isLength({ max: 50 }),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, paymentId } = req.params;
    const { amount, status, transactionId, receiptNo, notes } = req.body;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify payment belongs to this lead
    const existingPayment = await prisma.leadPayment.findFirst({
      where: { id: paymentId, leadId },
    });
    if (!existingPayment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = amount;
    if (status) {
      updateData.status = status;
      if (status === 'COMPLETED' && !existingPayment.paidAt) {
        updateData.paidAt = new Date();
      }
    }
    if (transactionId !== undefined) updateData.transactionId = transactionId;
    if (receiptNo !== undefined) updateData.receiptNo = receiptNo;
    if (notes !== undefined) updateData.notes = notes;

    const payment = await prisma.leadPayment.update({
      where: { id: paymentId },
      data: updateData,
    });

    res.json({ success: true, data: payment });
  })
);

// Delete payment
router.delete(
  '/:leadId/payments/:paymentId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('paymentId').isUUID().withMessage('Invalid payment ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, paymentId } = req.params;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify payment belongs to this lead
    const existingPayment = await prisma.leadPayment.findFirst({
      where: { id: paymentId, leadId },
    });
    if (!existingPayment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    await prisma.leadPayment.delete({ where: { id: paymentId } });

    res.json({ success: true, message: 'Payment deleted' });
  })
);

// ==================== DOCUMENTS ====================

// Get documents for a lead
router.get(
  '/:leadId/documents',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const documents = await prisma.leadDocument.findMany({
      where: { leadId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({ success: true, data: documents });
  })
);

// Upload document
router.post(
  '/:leadId/documents',
  validate([param('leadId').isUUID().withMessage('Invalid lead ID')]),
  uploadMiddleware.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { documentType, documentName } = req.body;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate document type
    const validTypes = ['ID_PROOF', 'ADDRESS_PROOF', 'PHOTO', 'CERTIFICATE', 'MARKSHEET', 'OTHER'];
    if (documentType && !validTypes.includes(documentType)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }

    // Upload to S3
    const fileUrl = await uploadToS3(
      req.file.buffer,
      `leads/${leadId}/documents/${Date.now()}-${req.file.originalname}`,
      req.file.mimetype
    );

    const document = await prisma.leadDocument.create({
      data: {
        leadId,
        documentType: documentType || 'OTHER',
        documentName: documentName || req.file.originalname,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        status: 'PENDING',
      },
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user!.id,
        type: 'DOCUMENT_UPLOADED',
        title: 'Document uploaded',
        description: `${documentType || 'Document'}: ${documentName || req.file.originalname}`,
      },
    });

    res.status(201).json({ success: true, data: document });
  })
);

// Update document (verify/reject)
router.put(
  '/:leadId/documents/:documentId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('documentId').isUUID().withMessage('Invalid document ID'),
    body('status').optional().isIn(['PENDING', 'VERIFIED', 'REJECTED']),
    body('rejectionReason').optional().trim().isLength({ max: 500 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, documentId } = req.params;
    const { status, rejectionReason } = req.body;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify document belongs to this lead
    const existingDocument = await prisma.leadDocument.findFirst({
      where: { id: documentId, leadId },
    });
    if (!existingDocument) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'VERIFIED') {
        updateData.verifiedAt = new Date();
        updateData.verifiedById = req.user!.id;
        updateData.rejectionReason = null;
      } else if (status === 'REJECTED') {
        updateData.rejectionReason = rejectionReason;
        updateData.verifiedAt = null;
        updateData.verifiedById = null;
      }
    }

    const document = await prisma.leadDocument.update({
      where: { id: documentId },
      data: updateData,
    });

    // Create activity for verification
    if (status === 'VERIFIED' || status === 'REJECTED') {
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user!.id,
          type: 'CUSTOM',
          title: `Document ${status.toLowerCase()}`,
          description: existingDocument.documentName,
        },
      });
    }

    res.json({ success: true, data: document });
  })
);

// Delete document
router.delete(
  '/:leadId/documents/:documentId',
  validate([
    param('leadId').isUUID().withMessage('Invalid lead ID'),
    param('documentId').isUUID().withMessage('Invalid document ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, documentId } = req.params;

    // SECURITY: Verify lead belongs to user's organization
    if (!await verifyLeadAccess(leadId, req)) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify document belongs to this lead
    const document = await prisma.leadDocument.findFirst({
      where: { id: documentId, leadId },
    });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Delete from S3
    try {
      await deleteFromS3(document.fileUrl);
    } catch (error) {
      console.error('Failed to delete from S3:', error);
    }

    await prisma.leadDocument.delete({ where: { id: documentId } });

    res.json({ success: true, message: 'Document deleted' });
  })
);

export default router;
