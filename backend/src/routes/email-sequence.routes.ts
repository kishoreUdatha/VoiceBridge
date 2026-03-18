import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { dripCampaignService } from '../services/drip-campaign.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get all email sequences
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const sequences = await prisma.emailSequence.findMany({
      where: { organizationId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: sequences });
  } catch (error: any) {
    console.error('[EmailSequences] Error fetching sequences:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single email sequence
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        enrollments: {
          include: {
            lead: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { enrolledAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    res.json({ success: true, data: sequence });
  } catch (error: any) {
    console.error('[EmailSequences] Error fetching sequence:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create email sequence
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name, description, triggerType, triggerConditions, steps } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const sequence = await dripCampaignService.createSequence({
      organizationId,
      name,
      description,
      triggerType: triggerType || 'MANUAL',
    });

    // Add steps if provided
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await dripCampaignService.addStep({ sequenceId: sequence.id, ...step });
      }
    }

    // Fetch the complete sequence with steps
    const completeSequence = await prisma.emailSequence.findUnique({
      where: { id: sequence.id },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    res.status(201).json({ success: true, data: completeSequence });
  } catch (error: any) {
    console.error('[EmailSequences] Error creating sequence:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update email sequence
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name, description, isActive, triggerType, triggerConditions } = req.body;

    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    const updated = await prisma.emailSequence.update({
      where: { id: req.params.id },
      data: {
        name: name || sequence.name,
        description: description !== undefined ? description : sequence.description,
        isActive: isActive !== undefined ? isActive : sequence.isActive,
        triggerType: triggerType || sequence.triggerType,
      },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[EmailSequences] Error updating sequence:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete email sequence
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    // Delete enrollments and steps first
    await prisma.leadSequenceEnrollment.deleteMany({
      where: { sequenceId: req.params.id },
    });
    await prisma.emailSequenceStep.deleteMany({
      where: { sequenceId: req.params.id },
    });
    await prisma.emailSequence.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Sequence deleted successfully' });
  } catch (error: any) {
    console.error('[EmailSequences] Error deleting sequence:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add step to sequence
router.post('/:id/steps', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { type, subject, content, delayMinutes } = req.body;

    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    // Get current step count to determine stepNumber
    const existingSteps = await prisma.emailSequenceStep.count({
      where: { sequenceId: req.params.id },
    });

    const step = await dripCampaignService.addStep({
      sequenceId: req.params.id,
      stepNumber: existingSteps + 1,
      subject: subject || '',
      body: content || '',
      delayDays: Math.floor((delayMinutes || 0) / (24 * 60)),
      delayHours: Math.floor(((delayMinutes || 0) % (24 * 60)) / 60),
    });

    res.status(201).json({ success: true, data: step });
  } catch (error: any) {
    console.error('[EmailSequences] Error adding step:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update step
router.put('/:id/steps/:stepId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { type, subject, content, delayMinutes, order } = req.body;

    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    const step = await prisma.emailSequenceStep.findFirst({
      where: { id: req.params.stepId, sequenceId: req.params.id },
    });

    if (!step) {
      return res.status(404).json({ success: false, message: 'Step not found' });
    }

    const updated = await prisma.emailSequenceStep.update({
      where: { id: req.params.stepId },
      data: {
        subject: subject !== undefined ? subject : step.subject,
        body: content !== undefined ? content : step.body,
        delayDays: delayMinutes !== undefined ? Math.floor(delayMinutes / (24 * 60)) : step.delayDays,
        delayHours: delayMinutes !== undefined ? Math.floor((delayMinutes % (24 * 60)) / 60) : step.delayHours,
        stepNumber: order !== undefined ? order : step.stepNumber,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[EmailSequences] Error updating step:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete step
router.delete('/:id/steps/:stepId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    const step = await prisma.emailSequenceStep.findFirst({
      where: { id: req.params.stepId, sequenceId: req.params.id },
    });

    if (!step) {
      return res.status(404).json({ success: false, message: 'Step not found' });
    }

    await prisma.emailSequenceStep.delete({
      where: { id: req.params.stepId },
    });

    res.json({ success: true, message: 'Step deleted successfully' });
  } catch (error: any) {
    console.error('[EmailSequences] Error deleting step:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enroll lead in sequence
router.post('/:id/enroll', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const enrollment = await dripCampaignService.enrollLead(leadId, req.params.id);
    res.status(201).json({ success: true, data: enrollment });
  } catch (error: any) {
    console.error('[EmailSequences] Error enrolling lead:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get sequence enrollments
router.get('/:id/enrollments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { status, page = 1, limit = 50 } = req.query;

    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    const where: any = { sequenceId: req.params.id };
    if (status) {
      where.status = status;
    }

    const [enrollments, total] = await Promise.all([
      prisma.leadSequenceEnrollment.findMany({
        where,
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.leadSequenceEnrollment.count({ where }),
    ]);

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('[EmailSequences] Error fetching enrollments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unenroll lead from sequence
router.delete('/:id/enrollments/:enrollmentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const sequence = await prisma.emailSequence.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Sequence not found' });
    }

    const enrollment = await prisma.leadSequenceEnrollment.findFirst({
      where: { id: req.params.enrollmentId, sequenceId: req.params.id },
    });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    await prisma.leadSequenceEnrollment.update({
      where: { id: req.params.enrollmentId },
      data: { status: 'COMPLETED' },
    });

    res.json({ success: true, message: 'Lead unenrolled successfully' });
  } catch (error: any) {
    console.error('[EmailSequences] Error unenrolling lead:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
