import { PrismaClient, EnrollmentStatus, SequenceTriggerType } from '@prisma/client';
import { emailService } from '../integrations/email.service';

const prisma = new PrismaClient();

interface CreateSequenceData {
  organizationId: string;
  name: string;
  description?: string;
  triggerType: SequenceTriggerType;
  triggerStageId?: string;
  triggerSource?: string;
  triggerTags?: string[];
  sendOnWeekends?: boolean;
  sendTimeStart?: string;
  sendTimeEnd?: string;
  timezone?: string;
}

interface AddStepData {
  sequenceId: string;
  stepNumber: number;
  delayDays?: number;
  delayHours?: number;
  subject: string;
  body: string;
  fromName?: string;
  skipIfOpened?: boolean;
  skipIfClicked?: boolean;
  skipIfReplied?: boolean;
}

class DripCampaignService {
  /**
   * Create a new email sequence
   */
  async createSequence(data: CreateSequenceData) {
    return prisma.emailSequence.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerStageId: data.triggerStageId,
        triggerSource: data.triggerSource,
        triggerTags: data.triggerTags || [],
        sendOnWeekends: data.sendOnWeekends ?? false,
        sendTimeStart: data.sendTimeStart || '09:00',
        sendTimeEnd: data.sendTimeEnd || '18:00',
        timezone: data.timezone || 'Asia/Kolkata',
      },
    });
  }

  /**
   * Get all sequences for organization
   */
  async getSequences(organizationId: string) {
    return prisma.emailSequence.findMany({
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
  }

  /**
   * Get sequence by ID with steps
   */
  async getSequence(id: string) {
    return prisma.emailSequence.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        enrollments: {
          take: 10,
          orderBy: { enrolledAt: 'desc' },
          include: {
            lead: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
  }

  /**
   * Update sequence
   */
  async updateSequence(id: string, data: Partial<CreateSequenceData>) {
    return prisma.emailSequence.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete sequence
   */
  async deleteSequence(id: string) {
    // Delete enrollments first
    await prisma.leadSequenceEnrollment.deleteMany({
      where: { sequenceId: id },
    });

    // Delete steps
    await prisma.emailSequenceStep.deleteMany({
      where: { sequenceId: id },
    });

    // Delete sequence
    return prisma.emailSequence.delete({
      where: { id },
    });
  }

  /**
   * Add step to sequence
   */
  async addStep(data: AddStepData) {
    return prisma.emailSequenceStep.create({
      data: {
        sequenceId: data.sequenceId,
        stepNumber: data.stepNumber,
        delayDays: data.delayDays || 0,
        delayHours: data.delayHours || 0,
        subject: data.subject,
        body: data.body,
        fromName: data.fromName,
        skipIfOpened: data.skipIfOpened || false,
        skipIfClicked: data.skipIfClicked || false,
        skipIfReplied: data.skipIfReplied || false,
      },
    });
  }

  /**
   * Update step
   */
  async updateStep(id: string, data: Partial<AddStepData>) {
    return prisma.emailSequenceStep.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete step
   */
  async deleteStep(id: string) {
    return prisma.emailSequenceStep.delete({
      where: { id },
    });
  }

  /**
   * Enroll lead in sequence
   */
  async enrollLead(leadId: string, sequenceId: string) {
    // Check if already enrolled
    const existing = await prisma.leadSequenceEnrollment.findUnique({
      where: {
        leadId_sequenceId: { leadId, sequenceId },
      },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        console.log(`[DripCampaign] Lead ${leadId} already enrolled in sequence ${sequenceId}`);
        return existing;
      }
      // Re-enroll if previously completed or unsubscribed
      return prisma.leadSequenceEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          currentStep: 1,
          enrolledAt: new Date(),
          completedAt: null,
          pausedAt: null,
          unsubscribedAt: null,
          nextEmailAt: new Date(), // Start immediately
          emailsSent: 0,
          emailsOpened: 0,
          emailsClicked: 0,
        },
      });
    }

    // Update sequence stats
    await prisma.emailSequence.update({
      where: { id: sequenceId },
      data: { totalEnrolled: { increment: 1 } },
    });

    return prisma.leadSequenceEnrollment.create({
      data: {
        leadId,
        sequenceId,
        status: 'ACTIVE',
        currentStep: 1,
        nextEmailAt: new Date(), // Start immediately
      },
    });
  }

  /**
   * Unenroll lead from sequence
   */
  async unenrollLead(leadId: string, sequenceId: string) {
    const enrollment = await prisma.leadSequenceEnrollment.findUnique({
      where: {
        leadId_sequenceId: { leadId, sequenceId },
      },
    });

    if (!enrollment) return null;

    await prisma.emailSequence.update({
      where: { id: sequenceId },
      data: { totalUnsubscribed: { increment: 1 } },
    });

    return prisma.leadSequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date(),
        nextEmailAt: null,
      },
    });
  }

  /**
   * Pause enrollment
   */
  async pauseEnrollment(enrollmentId: string) {
    return prisma.leadSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        nextEmailAt: null,
      },
    });
  }

  /**
   * Resume enrollment
   */
  async resumeEnrollment(enrollmentId: string) {
    const enrollment = await prisma.leadSequenceEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) return null;

    return prisma.leadSequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
        nextEmailAt: new Date(),
      },
    });
  }

  /**
   * Process due emails (call this from a job scheduler)
   */
  async processDueEmails() {
    const now = new Date();

    // Get enrollments with due emails
    const dueEnrollments = await prisma.leadSequenceEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        nextEmailAt: { lte: now },
      },
      include: {
        lead: true,
        sequence: {
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
      },
      take: 100,
    });

    let sent = 0;
    let failed = 0;

    for (const enrollment of dueEnrollments) {
      try {
        // Check send time restrictions
        if (!this.isWithinSendTime(enrollment.sequence)) {
          continue;
        }

        // Check weekend restrictions
        if (!enrollment.sequence.sendOnWeekends && this.isWeekend()) {
          continue;
        }

        // Get current step
        const step = enrollment.sequence.steps.find(
          s => s.stepNumber === enrollment.currentStep
        );

        if (!step || !step.isActive) {
          // No more steps, mark as completed
          await this.completeEnrollment(enrollment.id, enrollment.sequenceId);
          continue;
        }

        // Check if lead has email
        if (!enrollment.lead.email) {
          console.log(`[DripCampaign] Lead ${enrollment.leadId} has no email, skipping`);
          await this.advanceToNextStep(enrollment, enrollment.sequence.steps);
          continue;
        }

        // Check skip conditions
        if (step.skipIfOpened && enrollment.emailsOpened > 0) {
          await this.advanceToNextStep(enrollment, enrollment.sequence.steps);
          continue;
        }

        if (step.skipIfClicked && enrollment.emailsClicked > 0) {
          await this.advanceToNextStep(enrollment, enrollment.sequence.steps);
          continue;
        }

        // Personalize content
        const personalizedSubject = this.personalizeContent(step.subject, enrollment.lead);
        const personalizedBody = this.personalizeContent(step.body, enrollment.lead);

        // Send email
        await emailService.sendEmail({
          to: enrollment.lead.email,
          subject: personalizedSubject,
          html: personalizedBody,
          body: personalizedBody,
          userId: enrollment.sequence.organizationId,
          leadId: enrollment.leadId,
        });

        // Update stats
        await prisma.$transaction([
          prisma.leadSequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              emailsSent: { increment: 1 },
            },
          }),
          prisma.emailSequenceStep.update({
            where: { id: step.id },
            data: {
              sentCount: { increment: 1 },
            },
          }),
        ]);

        // Advance to next step
        await this.advanceToNextStep(enrollment, enrollment.sequence.steps);

        sent++;
        console.log(`[DripCampaign] Sent email to ${enrollment.lead.email} (step ${step.stepNumber})`);
      } catch (error: any) {
        console.error(`[DripCampaign] Failed to send email:`, error.message);
        failed++;

        // Mark as bounced if email delivery failed
        if (error.message?.includes('bounce') || error.message?.includes('invalid')) {
          await prisma.leadSequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              status: 'BOUNCED',
              nextEmailAt: null,
            },
          });
        }
      }
    }

    return { sent, failed, processed: dueEnrollments.length };
  }

  /**
   * Advance enrollment to next step
   */
  private async advanceToNextStep(enrollment: any, steps: any[]) {
    const nextStep = steps.find(s => s.stepNumber === enrollment.currentStep + 1);

    if (!nextStep) {
      // No more steps, complete the sequence
      await this.completeEnrollment(enrollment.id, enrollment.sequenceId);
      return;
    }

    // Calculate next email time
    const nextEmailAt = new Date();
    nextEmailAt.setDate(nextEmailAt.getDate() + (nextStep.delayDays || 0));
    nextEmailAt.setHours(nextEmailAt.getHours() + (nextStep.delayHours || 0));

    await prisma.leadSequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: enrollment.currentStep + 1,
        nextEmailAt,
      },
    });
  }

  /**
   * Mark enrollment as completed
   */
  private async completeEnrollment(enrollmentId: string, sequenceId: string) {
    await prisma.$transaction([
      prisma.leadSequenceEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          nextEmailAt: null,
        },
      }),
      prisma.emailSequence.update({
        where: { id: sequenceId },
        data: { totalCompleted: { increment: 1 } },
      }),
    ]);
  }

  /**
   * Check if current time is within send time window
   */
  private isWithinSendTime(sequence: any): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return currentTime >= sequence.sendTimeStart && currentTime <= sequence.sendTimeEnd;
  }

  /**
   * Check if today is weekend
   */
  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  /**
   * Personalize content with lead data
   */
  private personalizeContent(content: string, lead: any): string {
    const placeholders: Record<string, string> = {
      '{{firstName}}': lead.firstName || '',
      '{{lastName}}': lead.lastName || '',
      '{{fullName}}': `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      '{{email}}': lead.email || '',
      '{{phone}}': lead.phone || '',
      '{{city}}': lead.city || '',
      '{{state}}': lead.state || '',
    };

    let result = content;
    for (const [placeholder, value] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    return result;
  }

  /**
   * Track email open
   */
  async trackOpen(enrollmentId: string, stepId: string) {
    await prisma.$transaction([
      prisma.leadSequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { emailsOpened: { increment: 1 } },
      }),
      prisma.emailSequenceStep.update({
        where: { id: stepId },
        data: { openedCount: { increment: 1 } },
      }),
    ]);
  }

  /**
   * Track email click
   */
  async trackClick(enrollmentId: string, stepId: string) {
    await prisma.$transaction([
      prisma.leadSequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { emailsClicked: { increment: 1 } },
      }),
      prisma.emailSequenceStep.update({
        where: { id: stepId },
        data: { clickedCount: { increment: 1 } },
      }),
    ]);
  }

  /**
   * Get sequence analytics
   */
  async getSequenceAnalytics(sequenceId: string) {
    const sequence = await prisma.emailSequence.findUnique({
      where: { id: sequenceId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!sequence) return null;

    const enrollmentStats = await prisma.leadSequenceEnrollment.groupBy({
      by: ['status'],
      where: { sequenceId },
      _count: true,
    });

    return {
      sequence: {
        id: sequence.id,
        name: sequence.name,
        totalEnrolled: sequence.totalEnrolled,
        totalCompleted: sequence.totalCompleted,
        totalUnsubscribed: sequence.totalUnsubscribed,
        completionRate: sequence.totalEnrolled > 0
          ? ((sequence.totalCompleted / sequence.totalEnrolled) * 100).toFixed(1)
          : 0,
      },
      enrollmentsByStatus: enrollmentStats.reduce((acc: any, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {}),
      steps: sequence.steps.map(step => ({
        stepNumber: step.stepNumber,
        subject: step.subject,
        sentCount: step.sentCount,
        openedCount: step.openedCount,
        clickedCount: step.clickedCount,
        openRate: step.sentCount > 0
          ? ((step.openedCount / step.sentCount) * 100).toFixed(1)
          : 0,
        clickRate: step.sentCount > 0
          ? ((step.clickedCount / step.sentCount) * 100).toFixed(1)
          : 0,
      })),
    };
  }

  // ==================== AUTO-ENROLLMENT TRIGGERS ====================

  /**
   * Auto-enroll lead based on trigger conditions (call this when leads are created/updated)
   */
  async checkAndEnrollLead(leadId: string, event: {
    type: 'created' | 'stage_change' | 'tag_added' | 'voice_session';
    stageId?: string;
    source?: string;
    tags?: string[];
  }) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { organization: true },
    });

    if (!lead || !lead.email) return [];

    // Find matching active sequences
    const sequences = await prisma.emailSequence.findMany({
      where: {
        organizationId: lead.organizationId,
        isActive: true,
      },
    });

    const enrolledIn: string[] = [];

    for (const sequence of sequences) {
      let shouldEnroll = false;

      switch (sequence.triggerType) {
        case 'LEAD_CREATED':
          if (event.type === 'created') {
            shouldEnroll = this.matchesSourceOrTags(sequence, lead);
          }
          break;

        case 'STAGE_CHANGE':
          if (event.type === 'stage_change' && sequence.triggerStageId === event.stageId) {
            shouldEnroll = true;
          }
          break;

        case 'TAG_ADDED':
          if (event.type === 'tag_added') {
            const triggerTags = sequence.triggerTags as string[];
            const leadTags = event.tags || [];
            shouldEnroll = triggerTags.some(t => leadTags.includes(t));
          }
          break;

        case 'VOICE_SESSION':
          if (event.type === 'voice_session') {
            shouldEnroll = this.matchesSourceOrTags(sequence, lead);
          }
          break;
      }

      if (shouldEnroll) {
        try {
          await this.enrollLead(leadId, sequence.id);
          enrolledIn.push(sequence.name);
          console.log(`[DripCampaign] Auto-enrolled lead ${leadId} in sequence: ${sequence.name}`);
        } catch (error) {
          console.error(`[DripCampaign] Failed to auto-enroll:`, error);
        }
      }
    }

    return enrolledIn;
  }

  /**
   * Check if lead matches source or tags criteria
   */
  private matchesSourceOrTags(sequence: any, lead: any): boolean {
    // Check source match
    if (sequence.triggerSource) {
      if (lead.source !== sequence.triggerSource && lead.sourceDetails !== sequence.triggerSource) {
        return false;
      }
    }

    // Check tags match (if specified)
    const triggerTags = sequence.triggerTags as string[];
    if (triggerTags.length > 0) {
      const leadInterests = (lead.interests as string[]) || [];
      if (!triggerTags.some(t => leadInterests.includes(t))) {
        return false;
      }
    }

    return true;
  }
}

export const dripCampaignService = new DripCampaignService();
