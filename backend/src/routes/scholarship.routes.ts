import { Router, Request, Response } from 'express';
import { scholarshipService } from '../services/scholarship.service';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all scholarships
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const scholarships = await scholarshipService.getAll(organizationId);
    res.json({ success: true, data: scholarships });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get scholarship statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const stats = await scholarshipService.getStats(organizationId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all recipients
router.get('/recipients', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const recipients = await scholarshipService.getAllRecipients(organizationId);
    res.json({ success: true, data: recipients });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get scholarship by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const scholarship = await scholarshipService.getById(req.params.id, organizationId);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }
    res.json({ success: true, data: scholarship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new scholarship
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const scholarship = await scholarshipService.create(organizationId, req.body);
    res.status(201).json({ success: true, data: scholarship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a scholarship
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const scholarship = await scholarshipService.update(req.params.id, organizationId, req.body);
    res.json({ success: true, data: scholarship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a scholarship
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    await scholarshipService.delete(req.params.id, organizationId);
    res.json({ success: true, message: 'Scholarship deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a recipient
router.post('/recipients', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const recipient = await scholarshipService.addRecipient(organizationId, req.body);
    res.status(201).json({ success: true, data: recipient });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update recipient status
router.patch('/recipients/:id/status', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { status, disbursedDate } = req.body;
    const recipient = await scholarshipService.updateRecipientStatus(
      req.params.id,
      organizationId,
      status,
      disbursedDate ? new Date(disbursedDate) : undefined
    );
    res.json({ success: true, data: recipient });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a recipient
router.delete('/recipients/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    await scholarshipService.deleteRecipient(req.params.id, organizationId);
    res.json({ success: true, message: 'Recipient deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
