/**
 * Service Ticket Routes
 */

import { Router, Request, Response } from 'express';
import { serviceTicketService } from '../services/service-ticket.service';

const router = Router();

// Get all tickets
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { status, priority, assignedToId, accountId, type, search, sortBy, sortOrder, limit, offset } = req.query;

    const tickets = await serviceTicketService.getTickets(organizationId, {
      status,
      priority,
      assignedToId,
      accountId,
      type,
      search,
      sortBy,
      sortOrder,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single ticket
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await serviceTicketService.getTicket(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const ticket = await serviceTicketService.createTicket(organizationId, req.body, userId);
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update ticket
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const ticket = await serviceTicketService.updateTicket(req.params.id, req.body, userId);
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { content, isInternal, isFromCustomer } = req.body;
    const comment = await serviceTicketService.addComment(
      req.params.id,
      userId,
      content,
      isInternal,
      isFromCustomer
    );
    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add attachment
router.post('/:id/attachments', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { fileName, fileUrl, fileSize, mimeType, commentId } = req.body;
    const attachment = await serviceTicketService.addAttachment(
      req.params.id,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      userId,
      commentId
    );
    res.status(201).json(attachment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Escalate ticket
router.post('/:id/escalate', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { reason } = req.body;
    const ticket = await serviceTicketService.escalateTicket(req.params.id, userId, reason);
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get ticket statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { startDate, endDate } = req.query;
    const dateRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;
    const stats = await serviceTicketService.getTicketStats(organizationId, dateRange);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// SLA Management
router.get('/slas', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const slas = await serviceTicketService.getSLAs(organizationId);
    res.json(slas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/slas', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const sla = await serviceTicketService.createSLA(organizationId, req.body);
    res.status(201).json(sla);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check SLA breaches (typically called by cron)
router.post('/slas/check-breaches', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const result = await serviceTicketService.checkSLABreaches(organizationId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
