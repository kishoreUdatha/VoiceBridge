import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { prisma } from '../config/database';
import { uploadMiddleware } from '../middlewares/upload';
import { uploadToS3, deleteFromS3 } from '../services/s3.service';

const router = Router();

// Async handler wrapper
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Apply authentication to all routes
router.use(authenticate);

// ==================== NOTES ====================

// Get notes for a lead
router.get(
  '/:leadId/notes',
  param('leadId').isUUID(),
  validate([]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

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
  param('leadId').isUUID(),
  validate([
    body('content').trim().notEmpty().withMessage('Note content is required'),
    body('isPinned').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { content, isPinned } = req.body;

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
    param('leadId').isUUID(),
    param('noteId').isUUID(),
    body('content').optional().trim().notEmpty(),
    body('isPinned').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { noteId } = req.params;
    const { content, isPinned } = req.body;

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
  validate([param('leadId').isUUID(), param('noteId').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { noteId } = req.params;

    await prisma.leadNote.delete({ where: { id: noteId } });

    res.json({ success: true, message: 'Note deleted' });
  })
);

// ==================== TASKS ====================

// Get tasks for a lead
router.get(
  '/:leadId/tasks',
  param('leadId').isUUID(),
  validate([]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

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
  param('leadId').isUUID(),
  validate([
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('description').optional().trim(),
    body('dueDate').optional().isISO8601(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('assigneeId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { title, description, dueDate, priority, assigneeId } = req.body;

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
    param('leadId').isUUID(),
    param('taskId').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('dueDate').optional().isISO8601(),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    body('assigneeId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, taskId } = req.params;
    const { title, description, dueDate, priority, status, assigneeId } = req.body;

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
  validate([param('leadId').isUUID(), param('taskId').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { taskId } = req.params;

    await prisma.leadTask.delete({ where: { id: taskId } });

    res.json({ success: true, message: 'Task deleted' });
  })
);

// ==================== FOLLOW-UPS ====================

// Get follow-ups for a lead
router.get(
  '/:leadId/follow-ups',
  param('leadId').isUUID(),
  validate([]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

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

// Create follow-up
router.post(
  '/:leadId/follow-ups',
  param('leadId').isUUID(),
  validate([
    body('scheduledAt').isISO8601().withMessage('Scheduled date is required'),
    body('message').optional().trim(),
    body('notes').optional().trim(),
    body('assigneeId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { scheduledAt, message, notes, assigneeId } = req.body;

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
    param('leadId').isUUID(),
    param('followUpId').isUUID(),
    body('scheduledAt').optional().isISO8601(),
    body('message').optional().trim(),
    body('notes').optional().trim(),
    body('status').optional().isIn(['UPCOMING', 'COMPLETED', 'MISSED', 'RESCHEDULED']),
    body('assigneeId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, followUpId } = req.params;
    const { scheduledAt, message, notes, status, assigneeId } = req.body;

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
  validate([param('leadId').isUUID(), param('followUpId').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { followUpId } = req.params;

    await prisma.followUp.delete({ where: { id: followUpId } });

    res.json({ success: true, message: 'Follow-up deleted' });
  })
);

// ==================== ATTACHMENTS ====================

// Get attachments for a lead
router.get(
  '/:leadId/attachments',
  param('leadId').isUUID(),
  validate([]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

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
  param('leadId').isUUID(),
  uploadMiddleware.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

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
  validate([param('leadId').isUUID(), param('attachmentId').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { attachmentId } = req.params;

    const attachment = await prisma.leadAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (attachment) {
      // Delete from S3
      try {
        await deleteFromS3(attachment.fileUrl);
      } catch (error) {
        console.error('Failed to delete from S3:', error);
      }

      await prisma.leadAttachment.delete({ where: { id: attachmentId } });
    }

    res.json({ success: true, message: 'Attachment deleted' });
  })
);

// ==================== QUERIES ====================

// Get queries for a lead
router.get(
  '/:leadId/queries',
  param('leadId').isUUID(),
  validate([]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

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
  param('leadId').isUUID(),
  validate([
    body('query').trim().notEmpty().withMessage('Query content is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { query: queryText } = req.body;

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
    param('leadId').isUUID(),
    param('queryId').isUUID(),
    body('response').optional().trim(),
    body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { queryId } = req.params;
    const { response, status } = req.body;

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
  validate([param('leadId').isUUID(), param('queryId').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { queryId } = req.params;

    await prisma.leadQuery.delete({ where: { id: queryId } });

    res.json({ success: true, message: 'Query deleted' });
  })
);

// ==================== APPLICATIONS ====================

// Get applications for a lead
router.get(
  '/:leadId/applications',
  param('leadId').isUUID(),
  validate([]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

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
  param('leadId').isUUID(),
  validate([
    body('programName').optional().trim(),
    body('documents').optional().isArray(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { programName, documents } = req.body;

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
    param('leadId').isUUID(),
    param('applicationId').isUUID(),
    body('programName').optional().trim(),
    body('status').optional().isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED']),
    body('documents').optional().isArray(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId, applicationId } = req.params;
    const { programName, status, documents } = req.body;

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
  validate([param('leadId').isUUID(), param('applicationId').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { applicationId } = req.params;

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
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

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
    body('title').trim().notEmpty().withMessage('Activity title is required'),
    body('description').optional().trim(),
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

    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { interests: true },
      });

      res.json({ success: true, data: lead?.interests || [] });
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
    body('interests').isArray().withMessage('Interests must be an array'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { interests } = req.body;

    try {
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

// Get call logs for a lead
router.get(
  '/:leadId/calls',
  param('leadId').isUUID(),
  validate([]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;

    const calls = await prisma.callLog.findMany({
      where: { leadId },
      include: {
        caller: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: calls });
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
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('mediaUrl').optional().isURL(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { message, mediaUrl } = req.body;

    try {
      // Get lead phone number
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true, firstName: true, lastName: true },
      });

      if (!lead || !lead.phone) {
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
    body('message').trim().notEmpty().withMessage('Message is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { message } = req.body;

    try {
      // Get lead phone number
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true },
      });

      if (!lead || !lead.phone) {
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

// Create call log
router.post(
  '/:leadId/calls',
  param('leadId').isUUID(),
  validate([
    body('phoneNumber').trim().notEmpty(),
    body('direction').isIn(['INBOUND', 'OUTBOUND']),
    body('callType').optional().isIn(['MANUAL', 'AI', 'IVRS', 'PERSONAL']),
    body('status').optional().isIn(['INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'FAILED', 'BUSY', 'NO_ANSWER']),
    body('duration').optional().isInt({ min: 0 }),
    body('notes').optional().trim(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leadId } = req.params;
    const { phoneNumber, direction, callType, status, duration, notes, recordingUrl } = req.body;

    const call = await prisma.callLog.create({
      data: {
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

export default router;
