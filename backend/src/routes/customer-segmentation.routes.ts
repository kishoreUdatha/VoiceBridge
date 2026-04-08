/**
 * Customer Segmentation Routes
 */

import { Router, Request, Response } from 'express';
import { customerSegmentationService } from '../services/customer-segmentation.service';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate as any);

// Get RFM dashboard
router.get('/rfm/dashboard', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const data = await customerSegmentationService.getRFMDashboard(organizationId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all segments
router.get('/segments', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const segments = await customerSegmentationService.getSegments(organizationId);
    res.json({ success: true, data: segments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a segment
router.post('/segments', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const segment = await customerSegmentationService.createSegment({
      organizationId,
      ...req.body,
    });
    res.json({ success: true, data: segment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a segment
router.put('/segments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const segment = await customerSegmentationService.updateSegment(id, req.body);
    res.json({ success: true, data: segment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a segment
router.delete('/segments/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { id } = req.params;
    await customerSegmentationService.deleteSegment(id, organizationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get segment members
router.get('/segments/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    const data = await customerSegmentationService.getSegmentMembers(id, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: data.members, total: data.total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Refresh segment membership
router.post('/segments/:id/refresh', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { id } = req.params;
    const result = await customerSegmentationService.refreshSegmentMembership(id, organizationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate RFM for a lead
router.post('/rfm/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { leadId } = req.params;
    const result = await customerSegmentationService.calculateRFMScore(leadId, organizationId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch calculate RFM
router.post('/rfm/batch-calculate', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { limit } = req.body;
    const result = await customerSegmentationService.batchCalculateRFM(organizationId, limit);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
