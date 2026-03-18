import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get all CRM integrations
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integrations = await prisma.crmIntegration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    console.error('[CRMIntegration] Error fetching integrations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single CRM integration
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const integration = await prisma.crmIntegration.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    res.json({ success: true, data: integration });
  } catch (error: any) {
    console.error('[CRMIntegration] Error fetching integration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create CRM integration
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name, type, webhookUrl, apiKey, fieldMappings } = req.body;

    if (!name || !type || !webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and webhookUrl are required',
      });
    }

    const validTypes = ['SALESFORCE', 'HUBSPOT', 'ZOHO', 'CUSTOM'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${validTypes.join(', ')}`,
      });
    }

    const integration = await prisma.crmIntegration.create({
      data: {
        organizationId,
        name,
        type,
        webhookUrl,
        apiKey: apiKey || null,
        fieldMappings: fieldMappings || [],
        isActive: true,
      },
    });

    res.status(201).json({ success: true, data: integration });
  } catch (error: any) {
    console.error('[CRMIntegration] Error creating integration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update CRM integration
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { name, webhookUrl, apiKey, fieldMappings, isActive } = req.body;

    const integration = await prisma.crmIntegration.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    const updated = await prisma.crmIntegration.update({
      where: { id: req.params.id },
      data: {
        name: name || integration.name,
        webhookUrl: webhookUrl || integration.webhookUrl,
        apiKey: apiKey !== undefined ? apiKey : integration.apiKey,
        fieldMappings: fieldMappings || integration.fieldMappings,
        isActive: isActive !== undefined ? isActive : integration.isActive,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[CRMIntegration] Error updating integration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete CRM integration
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const integration = await prisma.crmIntegration.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    await prisma.crmIntegration.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: 'Integration deleted successfully' });
  } catch (error: any) {
    console.error('[CRMIntegration] Error deleting integration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test CRM integration webhook
router.post('/:id/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    const integration = await prisma.crmIntegration.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    // Send test payload to webhook
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '+1234567890',
        company: 'Test Company',
        source: 'Voice AI Test',
        notes: 'This is a test webhook from CRM Integration',
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (integration.apiKey) {
      headers['Authorization'] = `Bearer ${integration.apiKey}`;
    }

    try {
      await axios.post(integration.webhookUrl, testPayload, {
        headers,
        timeout: 10000,
      });

      // Update last sync time
      await prisma.crmIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncError: null,
        },
      });

      res.json({ success: true, message: 'Test webhook sent successfully' });
    } catch (webhookError: any) {
      // Update with error
      await prisma.crmIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncError: webhookError.message || 'Webhook request failed',
        },
      });

      res.status(400).json({
        success: false,
        message: `Webhook test failed: ${webhookError.message}`,
      });
    }
  } catch (error: any) {
    console.error('[CRMIntegration] Error testing webhook:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync lead to external CRM
router.post('/:id/sync-lead', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    const integration = await prisma.crmIntegration.findFirst({
      where: { id: req.params.id, organizationId, isActive: true },
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found or inactive' });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
      include: {
        stage: true,
        assignments: {
          where: { isActive: true },
          include: { assignedTo: { select: { firstName: true, lastName: true, email: true } } },
          take: 1,
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Map fields based on integration settings
    const fieldMappings = integration.fieldMappings as Array<{ sourceField: string; targetField: string }> || [];
    const mappedData: Record<string, any> = {};

    for (const mapping of fieldMappings) {
      const sourceValue = (lead as any)[mapping.sourceField];
      if (sourceValue !== undefined) {
        mappedData[mapping.targetField] = sourceValue;
      }
    }

    // Add metadata
    const assignedUser = lead.assignments[0]?.assignedTo;
    const leadName = `${lead.firstName} ${lead.lastName || ''}`.trim();
    const payload = {
      event: 'lead.created',
      timestamp: new Date().toISOString(),
      data: {
        ...mappedData,
        // Include common fields if not mapped
        id: lead.id,
        name: mappedData.Name || leadName,
        email: mappedData.Email || lead.email,
        phone: mappedData.Phone || lead.phone,
        stage: lead.stage?.name,
        assignedTo: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName || ''}`.trim() : undefined,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (integration.apiKey) {
      headers['Authorization'] = `Bearer ${integration.apiKey}`;
    }

    await axios.post(integration.webhookUrl, payload, {
      headers,
      timeout: 10000,
    });

    // Update sync time
    await prisma.crmIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    res.json({ success: true, message: 'Lead synced to external CRM' });
  } catch (error: any) {
    console.error('[CRMIntegration] Error syncing lead:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
