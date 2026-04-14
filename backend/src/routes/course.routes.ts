import { Router, Request, Response } from 'express';
import { courseService } from '../services/course.service';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all courses
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const courses = await courseService.getAll(organizationId);
    res.json({ success: true, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get course statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const stats = await courseService.getStats(organizationId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get course by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const course = await courseService.getById(req.params.id, organizationId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new course
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const course = await courseService.create(organizationId, req.body);
    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Course code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a course
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const course = await courseService.update(req.params.id, organizationId, req.body);
    res.json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update enrollment count
router.patch('/:id/enrollment', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    const { increment } = req.body;
    const course = await courseService.updateEnrollment(req.params.id, organizationId, increment);
    res.json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a course
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).user.organizationId;
    await courseService.delete(req.params.id, organizationId);
    res.json({ success: true, message: 'Course deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
