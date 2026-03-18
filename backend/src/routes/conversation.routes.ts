import { Router } from 'express';
import { conversationService } from '../services/conversation.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @api {get} /conversations List Conversations
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { channel, status, assignedToId, leadId, search, page = '1', limit = '20' } = req.query;

    const result = await conversationService.getConversations(organizationId, {
      channel: channel as any,
      status: status as any,
      assignedToId: assignedToId as string,
      leadId: leadId as string,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({ success: true, ...result });
  })
);

/**
 * @api {post} /conversations Create/Find Conversation
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { leadId, contactPhone, contactEmail, channel, subject, customFields } = req.body;

    if (!channel) {
      throw new AppError('Channel is required', 400);
    }

    if (!leadId && !contactPhone && !contactEmail) {
      throw new AppError('leadId, contactPhone, or contactEmail is required', 400);
    }

    const conversation = await conversationService.getOrCreateConversation({
      organizationId,
      leadId,
      contactPhone,
      contactEmail,
      channel,
      subject,
      customFields,
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created/found',
      data: conversation,
    });
  })
);

/**
 * @api {get} /conversations/stats Get Conversation Stats
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const dateRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;

    const stats = await conversationService.getConversationStats(organizationId, dateRange);

    res.json({ success: true, data: stats });
  })
);

/**
 * @api {get} /conversations/:id Get Conversation
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const conversation = await conversationService.getConversationById(req.params.id, organizationId);

    res.json({ success: true, data: conversation });
  })
);

/**
 * @api {put} /conversations/:id Update Conversation
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, priority, assignedToId, subject, tags } = req.body;

    const conversation = await conversationService.updateConversation(req.params.id, organizationId, {
      status,
      priority,
      assignedToId,
      subject,
      tags,
    });

    res.json({
      success: true,
      message: 'Conversation updated',
      data: conversation,
    });
  })
);

/**
 * @api {post} /conversations/:id/assign Assign Conversation
 */
router.post(
  '/:id/assign',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { assignedToId } = req.body;

    if (!assignedToId) {
      throw new AppError('assignedToId is required', 400);
    }

    const conversation = await conversationService.assignConversation(
      req.params.id,
      organizationId,
      assignedToId
    );

    res.json({
      success: true,
      message: 'Conversation assigned',
      data: conversation,
    });
  })
);

/**
 * @api {post} /conversations/:id/close Close Conversation
 */
router.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { resolution } = req.body;

    const conversation = await conversationService.closeConversation(
      req.params.id,
      organizationId,
      resolution
    );

    res.json({
      success: true,
      message: 'Conversation closed',
      data: conversation,
    });
  })
);

/**
 * @api {get} /conversations/:id/messages Get Messages
 */
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { page = '1', limit = '50', before, after } = req.query;

    const result = await conversationService.getMessages(req.params.id, organizationId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      before: before as string,
      after: after as string,
    });

    res.json({ success: true, ...result });
  })
);

/**
 * @api {post} /conversations/:id/messages Send Message
 */
router.post(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const { content, contentType, externalId, metadata } = req.body;

    if (!content) {
      throw new AppError('Content is required', 400);
    }

    const message = await conversationService.addMessage({
      conversationId: req.params.id,
      direction: 'OUTBOUND',
      content,
      contentType,
      externalId,
    });

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: message,
    });
  })
);

/**
 * @api {post} /conversations/:id/messages/inbound Record Inbound Message
 */
router.post(
  '/:id/messages/inbound',
  asyncHandler(async (req, res) => {
    const { content, contentType, externalId, metadata } = req.body;

    if (!content) {
      throw new AppError('Content is required', 400);
    }

    const message = await conversationService.addMessage({
      conversationId: req.params.id,
      direction: 'INBOUND',
      content,
      contentType,
      externalId,
    });

    res.status(201).json({
      success: true,
      message: 'Inbound message recorded',
      data: message,
    });
  })
);

/**
 * @api {put} /conversations/:id/messages/:messageId/status Update Message Status
 */
router.put(
  '/:id/messages/:messageId/status',
  asyncHandler(async (req, res) => {
    const { status, externalId, errorCode, errorMessage } = req.body;

    if (!status) {
      throw new AppError('Status is required', 400);
    }

    const result = await conversationService.updateMessageStatus({
      messageId: req.params.messageId,
      status,
      externalId,
      errorCode,
      errorMessage,
    });

    res.json({
      success: true,
      message: 'Message status updated',
      data: result,
    });
  })
);

export default router;
