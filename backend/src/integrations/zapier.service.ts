/**
 * Zapier Integration Service
 * Provides webhooks for Zapier to connect with VoiceBridge
 *
 * Supported Triggers:
 * - New Lead Created
 * - Lead Stage Changed
 * - Call Completed
 * - Appointment Scheduled
 *
 * Supported Actions:
 * - Create Lead
 * - Update Lead
 * - Add Note to Lead
 * - Schedule Call
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface ZapierWebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
  organizationId: string;
}

export interface ZapierTriggerSubscription {
  id: string;
  organizationId: string;
  event: string;
  targetUrl: string;
  isActive: boolean;
  createdAt: Date;
}

class ZapierService {
  /**
   * Generate a unique webhook token for an organization
   */
  generateWebhookToken(organizationId: string): string {
    const payload = `${organizationId}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 32);
  }

  /**
   * Verify webhook signature from Zapier
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Register a Zapier trigger subscription
   */
  async registerTrigger(
    organizationId: string,
    event: string,
    targetUrl: string
  ): Promise<ZapierTriggerSubscription> {
    // Store subscription in database
    const subscription = await prisma.zapierSubscription.create({
      data: {
        organizationId,
        event,
        targetUrl,
        isActive: true,
      },
    });

    return {
      id: subscription.id,
      organizationId: subscription.organizationId,
      event: subscription.event,
      targetUrl: subscription.targetUrl,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt,
    };
  }

  /**
   * Unregister a Zapier trigger subscription
   */
  async unregisterTrigger(subscriptionId: string): Promise<void> {
    await prisma.zapierSubscription.delete({
      where: { id: subscriptionId },
    });
  }

  /**
   * Send event to all registered Zapier webhooks
   */
  async sendEvent(
    organizationId: string,
    event: string,
    data: Record<string, any>
  ): Promise<void> {
    const subscriptions = await prisma.zapierSubscription.findMany({
      where: {
        organizationId,
        event,
        isActive: true,
      },
    });

    const payload: ZapierWebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      organizationId,
    };

    // Send to all registered webhooks
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const response = await fetch(sub.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-VoiceBridge-Event': event,
            'X-VoiceBridge-Timestamp': payload.timestamp,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error(`Zapier webhook failed for ${sub.id}: ${response.status}`);
          // Mark subscription as inactive after multiple failures
          await this.handleWebhookFailure(sub.id);
        }
      } catch (error) {
        console.error(`Zapier webhook error for ${sub.id}:`, error);
        await this.handleWebhookFailure(sub.id);
      }
    });

    await Promise.allSettled(sendPromises);
  }

  /**
   * Handle webhook delivery failure
   */
  private async handleWebhookFailure(subscriptionId: string): Promise<void> {
    const subscription = await prisma.zapierSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (subscription) {
      const failureCount = (subscription.failureCount || 0) + 1;

      await prisma.zapierSubscription.update({
        where: { id: subscriptionId },
        data: {
          failureCount,
          lastFailureAt: new Date(),
          // Deactivate after 5 consecutive failures
          isActive: failureCount < 5,
        },
      });
    }
  }

  /**
   * Create a lead from Zapier action
   */
  async createLead(
    organizationId: string,
    data: {
      firstName: string;
      lastName?: string;
      email?: string;
      phone: string;
      source?: string;
      notes?: string;
      customFields?: Record<string, any>;
    }
  ) {
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        source: data.source || 'ZAPIER',
        notes: data.notes,
        customFields: data.customFields || {},
        stage: 'NEW',
      },
    });

    // Trigger the new lead event for other integrations
    await this.sendEvent(organizationId, 'lead.created', {
      leadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
    });

    return lead;
  }

  /**
   * Update a lead from Zapier action
   */
  async updateLead(
    organizationId: string,
    leadId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      stage?: string;
      notes?: string;
      customFields?: Record<string, any>;
    }
  ) {
    const lead = await prisma.lead.update({
      where: {
        id: leadId,
        organizationId,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Trigger lead updated event
    await this.sendEvent(organizationId, 'lead.updated', {
      leadId: lead.id,
      changes: Object.keys(data),
    });

    return lead;
  }

  /**
   * Add a note to a lead from Zapier action
   */
  async addNote(
    organizationId: string,
    leadId: string,
    content: string
  ) {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Add note to activities
    const activity = await prisma.activity.create({
      data: {
        leadId,
        type: 'NOTE',
        content,
        metadata: { source: 'zapier' },
      },
    });

    return activity;
  }

  /**
   * Schedule a call from Zapier action
   */
  async scheduleCall(
    organizationId: string,
    data: {
      leadId: string;
      scheduledAt: Date;
      assignedToId?: string;
      notes?: string;
    }
  ) {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: data.leadId, organizationId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    const scheduledCall = await prisma.scheduledCall.create({
      data: {
        leadId: data.leadId,
        scheduledAt: data.scheduledAt,
        assignedToId: data.assignedToId,
        notes: data.notes,
        status: 'PENDING',
        createdBy: 'zapier',
      },
    });

    return scheduledCall;
  }

  /**
   * Get all subscriptions for an organization
   */
  async getSubscriptions(organizationId: string): Promise<ZapierTriggerSubscription[]> {
    const subscriptions = await prisma.zapierSubscription.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      organizationId: sub.organizationId,
      event: sub.event,
      targetUrl: sub.targetUrl,
      isActive: sub.isActive,
      createdAt: sub.createdAt,
    }));
  }

  /**
   * Get sample data for Zapier trigger testing
   */
  getSampleData(event: string): Record<string, any> {
    const samples: Record<string, any> = {
      'lead.created': {
        leadId: 'sample-lead-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+919876543210',
        source: 'WEBSITE',
        stage: 'NEW',
        createdAt: new Date().toISOString(),
      },
      'lead.stage_changed': {
        leadId: 'sample-lead-123',
        previousStage: 'NEW',
        newStage: 'QUALIFIED',
        changedAt: new Date().toISOString(),
      },
      'call.completed': {
        callId: 'sample-call-123',
        leadId: 'sample-lead-123',
        duration: 180,
        outcome: 'INTERESTED',
        recordingUrl: 'https://example.com/recording.mp3',
        completedAt: new Date().toISOString(),
      },
      'appointment.scheduled': {
        appointmentId: 'sample-apt-123',
        leadId: 'sample-lead-123',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        type: 'DEMO',
        notes: 'Product demonstration scheduled',
      },
    };

    return samples[event] || {};
  }

  /**
   * List available triggers for Zapier
   */
  getAvailableTriggers() {
    return [
      {
        key: 'lead.created',
        label: 'New Lead Created',
        description: 'Triggers when a new lead is created in VoiceBridge',
      },
      {
        key: 'lead.stage_changed',
        label: 'Lead Stage Changed',
        description: 'Triggers when a lead moves to a different stage',
      },
      {
        key: 'call.completed',
        label: 'Call Completed',
        description: 'Triggers when an AI or telecaller call is completed',
      },
      {
        key: 'appointment.scheduled',
        label: 'Appointment Scheduled',
        description: 'Triggers when an appointment is scheduled for a lead',
      },
    ];
  }

  /**
   * List available actions for Zapier
   */
  getAvailableActions() {
    return [
      {
        key: 'create_lead',
        label: 'Create Lead',
        description: 'Create a new lead in VoiceBridge',
        fields: [
          { key: 'firstName', label: 'First Name', required: true },
          { key: 'lastName', label: 'Last Name', required: false },
          { key: 'email', label: 'Email', required: false },
          { key: 'phone', label: 'Phone', required: true },
          { key: 'source', label: 'Source', required: false },
          { key: 'notes', label: 'Notes', required: false },
        ],
      },
      {
        key: 'update_lead',
        label: 'Update Lead',
        description: 'Update an existing lead in VoiceBridge',
        fields: [
          { key: 'leadId', label: 'Lead ID', required: true },
          { key: 'firstName', label: 'First Name', required: false },
          { key: 'lastName', label: 'Last Name', required: false },
          { key: 'email', label: 'Email', required: false },
          { key: 'phone', label: 'Phone', required: false },
          { key: 'stage', label: 'Stage', required: false },
        ],
      },
      {
        key: 'add_note',
        label: 'Add Note to Lead',
        description: 'Add a note to an existing lead',
        fields: [
          { key: 'leadId', label: 'Lead ID', required: true },
          { key: 'content', label: 'Note Content', required: true },
        ],
      },
      {
        key: 'schedule_call',
        label: 'Schedule Call',
        description: 'Schedule a call for a lead',
        fields: [
          { key: 'leadId', label: 'Lead ID', required: true },
          { key: 'scheduledAt', label: 'Scheduled Time', required: true },
          { key: 'notes', label: 'Notes', required: false },
        ],
      },
    ];
  }
}

export const zapierService = new ZapierService();
