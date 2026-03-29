import { Router, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { prisma } from '../config/database';
import { AgentType } from '@prisma/client';
import {
  agentOrchestrator,
  salesAgentService,
  appointmentAgentService,
  paymentAgentService,
  supportAgentService,
  followUpAgentService,
  surveyAgentService,
} from '../services/specialized-agents.service';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== AGENT MANAGEMENT ====================

/**
 * Get all agents by type
 */
router.get('/type/:type', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const agentType = req.params.type.toUpperCase() as AgentType;

    const agents = await prisma.voiceAgent.findMany({
      where: {
        organizationId,
        agentType,
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(res, 'Agents retrieved', agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return ApiResponse.error(res, 'Failed to fetch agents', 500);
  }
});

/**
 * Create a specialized agent
 */
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organizationId;
    const userId = req.user?.id;
    const {
      name,
      description,
      agentType,
      industry,
      systemPrompt,
      // Common settings
      voiceId,
      language,
      temperature,
      greeting,
      endMessage,
      // Type-specific settings
      ...typeSpecificSettings
    } = req.body;

    const agent = await prisma.voiceAgent.create({
      data: {
        organizationId,
        createdById: userId,
        name,
        description,
        agentType: agentType || 'VOICE',
        industry: industry || 'CUSTOM',
        systemPrompt: systemPrompt || getDefaultPrompt(agentType),
        voiceId: voiceId || 'alloy',
        language: language || 'en',
        temperature: temperature || 0.7,
        greeting,
        endMessage,
        // Type-specific settings
        ...getTypeSpecificDefaults(agentType, typeSpecificSettings),
      },
    });

    return ApiResponse.created(res, 'Agent created successfully', agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    return ApiResponse.error(res, 'Failed to create agent', 500);
  }
});

/**
 * Update agent settings
 */
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    const updateData = req.body;

    // Verify ownership
    const existing = await prisma.voiceAgent.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return ApiResponse.notFound(res, 'Agent not found');
    }

    const agent = await prisma.voiceAgent.update({
      where: { id },
      data: updateData,
    });

    return ApiResponse.success(res, 'Agent updated successfully', agent);
  } catch (error) {
    console.error('Error updating agent:', error);
    return ApiResponse.error(res, 'Failed to update agent', 500);
  }
});

// ==================== CONVERSATION HANDLING ====================

/**
 * Handle agent conversation
 */
router.post('/:id/conversation', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    const { message, leadId, phone, conversationHistory = [] } = req.body;

    // Get agent
    const agent = await prisma.voiceAgent.findFirst({
      where: { id, organizationId },
    });

    if (!agent) {
      return ApiResponse.notFound(res, 'Agent not found');
    }

    // Get lead info if available
    let lead = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    }

    // Build context
    const context = {
      agentId: id,
      organizationId: organizationId!,
      leadId,
      phone: phone || lead?.phone || '',
      email: lead?.email || undefined,
      firstName: lead?.firstName,
      lastName: lead?.lastName || undefined,
      conversationHistory,
    };

    // Route to appropriate agent service
    const response = await agentOrchestrator.handleConversation(
      agent.agentType,
      context,
      message
    );

    // Log the conversation
    console.log(`[${agent.agentType}] Response:`, response);

    return ApiResponse.success(res, 'Response generated', response);
  } catch (error) {
    console.error('Error in conversation:', error);
    return ApiResponse.error(res, 'Failed to process conversation', 500);
  }
});

/**
 * Hand off conversation to another agent type
 */
router.post('/:id/handoff', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    const { toAgentType, leadId, conversationHistory } = req.body;

    // Get current agent
    const fromAgent = await prisma.voiceAgent.findFirst({
      where: { id, organizationId },
    });

    if (!fromAgent) {
      return ApiResponse.notFound(res, 'Agent not found');
    }

    // Find or create target agent
    let toAgent = await prisma.voiceAgent.findFirst({
      where: { organizationId, agentType: toAgentType, isActive: true },
    });

    if (!toAgent) {
      // Create default agent of target type
      toAgent = await prisma.voiceAgent.create({
        data: {
          organizationId: organizationId!,
          name: `${toAgentType} Agent`,
          agentType: toAgentType,
          industry: 'CUSTOM',
          systemPrompt: getDefaultPrompt(toAgentType),
        },
      });
    }

    const context = {
      agentId: toAgent.id,
      organizationId: organizationId!,
      leadId,
      phone: '',
      conversationHistory,
    };

    const response = await agentOrchestrator.handoffConversation(
      fromAgent.agentType,
      toAgentType,
      context
    );

    return ApiResponse.success(res, 'Handoff initiated', {
      ...response,
      newAgentId: toAgent.id,
    });
  } catch (error) {
    console.error('Error in handoff:', error);
    return ApiResponse.error(res, 'Failed to handoff conversation', 500);
  }
});

// ==================== SALES AGENT ENDPOINTS ====================

/**
 * Generate quote
 */
router.post('/sales/:id/quote', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { products, discount, leadId, phone } = req.body;

    const context = {
      agentId: id,
      organizationId: req.organizationId!,
      leadId,
      phone,
      conversationHistory: [],
    };

    const quote = await salesAgentService.generateQuote(context, products, discount);
    return ApiResponse.success(res, 'Quote generated', quote);
  } catch (error) {
    console.error('Error generating quote:', error);
    return ApiResponse.error(res, 'Failed to generate quote', 500);
  }
});

// ==================== APPOINTMENT AGENT ENDPOINTS ====================

/**
 * Get available slots
 */
router.get('/appointment/:id/slots', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const slots = await appointmentAgentService.getAvailableSlots(id, days);
    return ApiResponse.success(res, 'Slots retrieved', slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    return ApiResponse.error(res, 'Failed to fetch slots', 500);
  }
});

/**
 * Book appointment
 */
router.post('/appointment/:id/book', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { date, time, duration, leadId, phone, email, firstName } = req.body;

    const context = {
      agentId: id,
      organizationId: req.organizationId!,
      leadId,
      phone,
      email,
      firstName,
      conversationHistory: [],
    };

    const appointment = await appointmentAgentService.bookAppointment(
      context,
      date,
      time,
      duration || 30
    );

    return ApiResponse.created(res, 'Appointment booked', appointment);
  } catch (error) {
    console.error('Error booking appointment:', error);
    return ApiResponse.error(res, 'Failed to book appointment', 500);
  }
});

/**
 * Send appointment reminders
 */
router.post('/appointment/remind/:appointmentId', async (req: TenantRequest, res: Response) => {
  try {
    const { appointmentId } = req.params;
    await appointmentAgentService.sendReminders(appointmentId);
    return ApiResponse.success(res, 'Reminders sent');
  } catch (error) {
    console.error('Error sending reminders:', error);
    return ApiResponse.error(res, 'Failed to send reminders', 500);
  }
});

// ==================== PAYMENT AGENT ENDPOINTS ====================

/**
 * Generate payment link
 */
router.post('/payment/:id/link', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, type, leadId, phone } = req.body;

    const context = {
      agentId: id,
      organizationId: req.organizationId!,
      leadId,
      phone,
      conversationHistory: [],
    };

    const paymentLink = await paymentAgentService.generatePaymentLink(context, amount, type);
    return ApiResponse.success(res, 'Payment link generated', { paymentLink, amount, type });
  } catch (error) {
    console.error('Error generating payment link:', error);
    return ApiResponse.error(res, 'Failed to generate payment link', 500);
  }
});

/**
 * Send payment reminder
 */
router.post('/payment/remind', async (req: TenantRequest, res: Response) => {
  try {
    const { leadId, invoiceId, daysOverdue } = req.body;
    await paymentAgentService.sendPaymentReminder(leadId, invoiceId, daysOverdue);
    return ApiResponse.success(res, 'Payment reminder sent');
  } catch (error) {
    console.error('Error sending reminder:', error);
    return ApiResponse.error(res, 'Failed to send reminder', 500);
  }
});

// ==================== FOLLOW-UP AGENT ENDPOINTS ====================

/**
 * Execute follow-up sequence
 */
router.post('/followup/:id/execute', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { leadId } = req.body;

    await followUpAgentService.executeFollowUpSequence(leadId, id);
    return ApiResponse.success(res, 'Follow-up sequence started');
  } catch (error) {
    console.error('Error executing follow-up:', error);
    return ApiResponse.error(res, 'Failed to execute follow-up', 500);
  }
});

// ==================== SURVEY AGENT ENDPOINTS ====================

/**
 * Send survey request
 */
router.post('/survey/:id/send', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { leadId, channel } = req.body;

    await surveyAgentService.sendSurveyRequest(leadId, id, channel);
    return ApiResponse.success(res, 'Survey request sent');
  } catch (error) {
    console.error('Error sending survey:', error);
    return ApiResponse.error(res, 'Failed to send survey', 500);
  }
});

// ==================== ANALYTICS ====================

/**
 * Get agent performance metrics
 */
router.get('/:id/analytics', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    const agent = await prisma.voiceAgent.findFirst({
      where: { id, organizationId },
    });

    if (!agent) {
      return ApiResponse.notFound(res, 'Agent not found');
    }

    // Get metrics based on agent type
    const metrics = await getAgentMetrics(id, agent.agentType);

    return ApiResponse.success(res, 'Analytics retrieved', metrics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return ApiResponse.error(res, 'Failed to fetch analytics', 500);
  }
});

// ==================== HELPER FUNCTIONS ====================

function getDefaultPrompt(agentType: AgentType): string {
  const prompts: Record<AgentType, string> = {
    VOICE: 'You are a professional voice assistant helping customers with their inquiries.',
    SALES: 'You are a professional sales agent. Qualify leads, handle objections, and close deals.',
    APPOINTMENT: 'You are an appointment booking assistant. Help customers schedule meetings and demos.',
    PAYMENT: 'You are a payment collection assistant. Help customers complete their payments.',
    SUPPORT: 'You are a customer support agent. Help resolve customer issues and queries.',
    FOLLOWUP: 'You are a follow-up agent. Re-engage cold leads and nurture relationships.',
    SURVEY: 'You are a feedback collection agent. Gather customer feedback and NPS scores.',
  };

  return prompts[agentType] || prompts.VOICE;
}

function getTypeSpecificDefaults(agentType: AgentType, provided: any): any {
  const defaults: Record<AgentType, any> = {
    VOICE: {},
    SALES: {
      salesPitch: provided.salesPitch || '',
      objectionHandling: provided.objectionHandling || [],
      discountAuthority: provided.discountAuthority || 10,
      pricingInfo: provided.pricingInfo || {},
      closingTechniques: provided.closingTechniques || [
        'Assumptive close',
        'Urgency close',
        'Value summary close',
      ],
    },
    APPOINTMENT: {
      slotDuration: provided.slotDuration || 30,
      bufferTime: provided.bufferTime || 10,
      maxAdvanceBooking: provided.maxAdvanceBooking || 30,
      reminderSchedule: provided.reminderSchedule || [24, 1],
    },
    PAYMENT: {
      paymentTypes: provided.paymentTypes || ['full', 'emi', 'partial'],
      emiOptions: provided.emiOptions || [],
      paymentReminders: provided.paymentReminders || [7, 3, 1, 0],
      overdueEscalation: provided.overdueEscalation || 7,
    },
    SUPPORT: {
      ticketCategories: provided.ticketCategories || ['General', 'Technical', 'Billing', 'Other'],
      escalationRules: provided.escalationRules || [],
      slaConfig: provided.slaConfig || {},
    },
    FOLLOWUP: {
      followupSequence: provided.followupSequence || [
        { dayOffset: 1, channel: 'sms', template: 'follow_up_1' },
        { dayOffset: 3, channel: 'whatsapp', template: 'follow_up_2' },
        { dayOffset: 7, channel: 'call', template: 'follow_up_3' },
      ],
      reengagementTrigger: provided.reengagementTrigger || 7,
      maxFollowups: provided.maxFollowups || 5,
    },
    SURVEY: {
      surveyType: provided.surveyType || 'NPS',
      surveyQuestions: provided.surveyQuestions || [],
      surveyTrigger: provided.surveyTrigger || 'post_purchase',
      surveyDelay: provided.surveyDelay || 7,
      reviewPlatforms: provided.reviewPlatforms || ['Google', 'G2'],
    },
  };

  return defaults[agentType] || {};
}

async function getAgentMetrics(agentId: string, agentType: AgentType): Promise<any> {
  // This would query actual metrics from the database
  // For now, return mock structure
  const baseMetrics = {
    totalConversations: 0,
    successfulConversations: 0,
    averageConversationLength: 0,
    lastActive: null,
  };

  const typeSpecificMetrics: Record<AgentType, any> = {
    VOICE: {
      totalCalls: 0,
      averageCallDuration: 0,
      leadsGenerated: 0,
    },
    SALES: {
      dealsCreated: 0,
      dealsClosed: 0,
      conversionRate: 0,
      averageDealSize: 0,
      objectionsHandled: 0,
    },
    APPOINTMENT: {
      appointmentsBooked: 0,
      appointmentsCompleted: 0,
      noShowRate: 0,
      rescheduledCount: 0,
    },
    PAYMENT: {
      paymentsCollected: 0,
      totalAmountCollected: 0,
      averagePaymentTime: 0,
      failedPayments: 0,
    },
    SUPPORT: {
      ticketsCreated: 0,
      ticketsResolved: 0,
      averageResolutionTime: 0,
      escalationRate: 0,
      csat: 0,
    },
    FOLLOWUP: {
      leadsReengaged: 0,
      reengagementRate: 0,
      sequencesCompleted: 0,
      conversions: 0,
    },
    SURVEY: {
      surveysCompleted: 0,
      averageNPS: 0,
      promoters: 0,
      detractors: 0,
      reviewsRequested: 0,
    },
  };

  return {
    ...baseMetrics,
    ...typeSpecificMetrics[agentType],
  };
}

export default router;
