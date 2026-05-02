/**
 * CRM Automation Service
 * Handles all high-priority CRM automations:
 * 1. Birthday/Anniversary Greetings
 * 2. Lead Re-engagement Campaign
 * 3. SLA Breach Alerts
 * 4. Payment/Invoice Reminders
 * 5. Quote/Proposal Follow-up
 * 6. Lead Aging Alerts
 * 7. Welcome Series
 * 8. Review/Feedback Request
 */

import { prisma } from '../config/database';
import { createWhatsAppService } from '../integrations/whatsapp.service';
import { msg91Service } from './msg91.service';
import { emailSettingsService } from './emailSettings.service';
import { pushNotificationService } from './push-notification.service';
import { config } from '../config';

// Default templates
const DEFAULT_TEMPLATES = {
  birthday: `Hi {{firstName}}! 🎂

Wishing you a very Happy Birthday! May this special day bring you joy, happiness, and all the success you deserve.

Best wishes,
{{organizationName}}`,

  anniversary: `Dear {{firstName}},

Happy Anniversary! 🎉 We're grateful to have you with us. Thank you for your continued trust.

Warm regards,
{{organizationName}}`,

  reengagement: `Hi {{firstName}},

We noticed it's been a while since we connected. We'd love to hear from you and see how we can help.

Is there anything we can assist you with?

Best,
{{organizationName}}`,

  paymentReminder: `Hi {{firstName}},

This is a friendly reminder that your payment of {{amount}} is due on {{dueDate}}.

Please make the payment to avoid any inconvenience.

Thank you,
{{organizationName}}`,

  paymentOverdue: `Hi {{firstName}},

Your payment of {{amount}} was due on {{dueDate}} and is now overdue.

Please make the payment at your earliest convenience.

If you've already paid, please ignore this message.

{{organizationName}}`,

  quoteFollowup: `Hi {{firstName}},

Following up on the quotation we sent you for {{quotationTitle}}.

Have you had a chance to review it? We'd be happy to answer any questions.

Best regards,
{{organizationName}}`,

  quoteExpiry: `Hi {{firstName}},

Your quotation for {{quotationTitle}} expires on {{expiryDate}}.

If you'd like to proceed, please let us know before the offer expires.

{{organizationName}}`,

  welcome: `Hi {{firstName}}! 👋

Welcome to {{organizationName}}! We're excited to have you with us.

If you have any questions, feel free to reach out. We're here to help!

Best,
The {{organizationName}} Team`,

  reviewRequest: `Hi {{firstName}},

Thank you for choosing {{organizationName}}! We hope you had a great experience.

Would you mind taking a moment to share your feedback? Your review helps us improve and helps others make informed decisions.

{{reviewLink}}

Thank you!
{{organizationName}}`,
};

interface AutomationResult {
  success: boolean;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface AutomationSettings {
  birthdayEnabled: boolean;
  birthdayChannels: string[];
  birthdayTemplate: string | null;
  birthdayDaysBefore: number;
  birthdayTime: string;
  anniversaryEnabled: boolean;
  anniversaryTemplate: string | null;
  reengagementEnabled: boolean;
  reengagementDaysInactive: number;
  reengagementChannels: string[];
  reengagementTemplate: string | null;
  reengagementMaxAttempts: number;
  reengagementInterval: number;
  reengagementExcludeConverted: boolean;
  slaEnabled: boolean;
  slaFirstResponseMins: number;
  slaFollowUpHours: number;
  slaAlertChannels: string[];
  slaAlertToManager: boolean;
  slaAlertToAssignee: boolean;
  slaEscalateAfterBreaches: number;
  paymentReminderEnabled: boolean;
  paymentReminder1DaysBefore: number;
  paymentReminder2DaysBefore: number;
  paymentReminder3DaysAfter: number;
  paymentReminderChannels: string[];
  paymentReminderTemplate: string | null;
  paymentOverdueTemplate: string | null;
  quoteFollowupEnabled: boolean;
  quoteFollowupDays: number[];
  quoteFollowupChannels: string[];
  quoteFollowupTemplate: string | null;
  quoteExpiryReminderDays: number;
  leadAgingEnabled: boolean;
  leadAgingDays: number;
  leadAgingAlertTo: string[];
  leadAgingChannels: string[];
  leadAgingAutoReassign: boolean;
  leadAgingReassignDays: number;
  welcomeEnabled: boolean;
  welcomeChannels: string[];
  welcomeDelayMinutes: number;
  welcomeTemplate: string | null;
  welcomeIncludeIntro: boolean;
  welcomeIncludeCatalog: boolean;
  reviewRequestEnabled: boolean;
  reviewRequestDelay: number;
  reviewRequestChannels: string[];
  reviewRequestTemplate: string | null;
  reviewPlatforms: string[];
  reviewMinDealValue: number | null;
}

class CrmAutomationService {
  private defaultSettings: AutomationSettings = {
    birthdayEnabled: true,
    birthdayChannels: ['whatsapp', 'email'],
    birthdayTemplate: null,
    birthdayDaysBefore: 0,
    birthdayTime: '09:00',
    anniversaryEnabled: false,
    anniversaryTemplate: null,
    reengagementEnabled: true,
    reengagementDaysInactive: 30,
    reengagementChannels: ['whatsapp', 'email'],
    reengagementTemplate: null,
    reengagementMaxAttempts: 3,
    reengagementInterval: 7,
    reengagementExcludeConverted: true,
    slaEnabled: true,
    slaFirstResponseMins: 60,
    slaFollowUpHours: 24,
    slaAlertChannels: ['push', 'email'],
    slaAlertToManager: true,
    slaAlertToAssignee: true,
    slaEscalateAfterBreaches: 2,
    paymentReminderEnabled: true,
    paymentReminder1DaysBefore: 3,
    paymentReminder2DaysBefore: 1,
    paymentReminder3DaysAfter: 1,
    paymentReminderChannels: ['whatsapp', 'sms'],
    paymentReminderTemplate: null,
    paymentOverdueTemplate: null,
    quoteFollowupEnabled: true,
    quoteFollowupDays: [1, 3, 7],
    quoteFollowupChannels: ['email', 'whatsapp'],
    quoteFollowupTemplate: null,
    quoteExpiryReminderDays: 2,
    leadAgingEnabled: true,
    leadAgingDays: 7,
    leadAgingAlertTo: ['manager'],
    leadAgingChannels: ['push', 'email'],
    leadAgingAutoReassign: false,
    leadAgingReassignDays: 14,
    welcomeEnabled: true,
    welcomeChannels: ['whatsapp', 'email'],
    welcomeDelayMinutes: 5,
    welcomeTemplate: null,
    welcomeIncludeIntro: true,
    welcomeIncludeCatalog: false,
    reviewRequestEnabled: true,
    reviewRequestDelay: 7,
    reviewRequestChannels: ['whatsapp', 'email'],
    reviewRequestTemplate: null,
    reviewPlatforms: ['google'],
    reviewMinDealValue: null,
  };

  // ==================== MAIN SCHEDULER ====================

  /**
   * Run all automations - called by job initializer
   */
  async runAllAutomations(): Promise<void> {
    console.log('[CrmAutomation] Starting automation run...');

    try {
      // Get all organizations with automation settings
      const organizations = await prisma.organization.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      for (const org of organizations) {
        await this.runOrganizationAutomations(org.id);
      }

      console.log('[CrmAutomation] Completed automation run');
    } catch (error) {
      console.error('[CrmAutomation] Error in runAllAutomations:', error);
    }
  }

  /**
   * Run automations for a single organization
   */
  private async runOrganizationAutomations(organizationId: string): Promise<void> {
    const settings = await this.getSettings(organizationId);

    // Run each automation type
    if (settings.birthdayEnabled) {
      await this.processBirthdayGreetings(organizationId, settings);
    }

    if (settings.anniversaryEnabled) {
      await this.processAnniversaryGreetings(organizationId, settings);
    }

    if (settings.reengagementEnabled) {
      await this.processReengagement(organizationId, settings);
    }

    if (settings.slaEnabled) {
      await this.processSlaAlerts(organizationId, settings);
    }

    if (settings.paymentReminderEnabled) {
      await this.processPaymentReminders(organizationId, settings);
    }

    if (settings.quoteFollowupEnabled) {
      await this.processQuoteFollowups(organizationId, settings);
    }

    if (settings.leadAgingEnabled) {
      await this.processLeadAgingAlerts(organizationId, settings);
    }

    if (settings.reviewRequestEnabled) {
      await this.processReviewRequests(organizationId, settings);
    }
  }

  // ==================== 1. BIRTHDAY/ANNIVERSARY GREETINGS ====================

  async processBirthdayGreetings(organizationId: string, settings: AutomationSettings): Promise<AutomationResult> {
    const result: AutomationResult = { success: true, sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + settings.birthdayDaysBefore);

      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();

      // Find leads with birthday today (checking month and day only)
      const leads = await prisma.$queryRaw<any[]>`
        SELECT l.*, o.name as organizationName
        FROM leads l
        JOIN organizations o ON l."organizationId" = o.id
        WHERE l."organizationId" = ${organizationId}
          AND l."dateOfBirth" IS NOT NULL
          AND EXTRACT(MONTH FROM l."dateOfBirth") = ${month}
          AND EXTRACT(DAY FROM l."dateOfBirth") = ${day}
          AND NOT EXISTS (
            SELECT 1 FROM crm_automation_logs cal
            WHERE cal."targetId" = l.id
              AND cal."automationType" = 'birthday'
              AND cal."executedAt" > NOW() - INTERVAL '1 day'
          )
      `;

      for (const lead of leads) {
        try {
          const template = settings.birthdayTemplate || DEFAULT_TEMPLATES.birthday;
          const message = this.buildMessage(template, lead);

          await this.sendMultiChannel(
            organizationId,
            lead,
            message,
            settings.birthdayChannels,
            'birthday'
          );
          result.sent++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Lead ${lead.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  async processAnniversaryGreetings(organizationId: string, settings: AutomationSettings): Promise<AutomationResult> {
    const result: AutomationResult = { success: true, sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      const leads = await prisma.$queryRaw<any[]>`
        SELECT l.*, o.name as organizationName
        FROM leads l
        JOIN organizations o ON l."organizationId" = o.id
        WHERE l."organizationId" = ${organizationId}
          AND l."anniversaryDate" IS NOT NULL
          AND EXTRACT(MONTH FROM l."anniversaryDate") = ${month}
          AND EXTRACT(DAY FROM l."anniversaryDate") = ${day}
          AND NOT EXISTS (
            SELECT 1 FROM crm_automation_logs cal
            WHERE cal."targetId" = l.id
              AND cal."automationType" = 'anniversary'
              AND cal."executedAt" > NOW() - INTERVAL '1 day'
          )
      `;

      for (const lead of leads) {
        try {
          const template = settings.anniversaryTemplate || DEFAULT_TEMPLATES.anniversary;
          const message = this.buildMessage(template, lead);

          await this.sendMultiChannel(organizationId, lead, message, settings.birthdayChannels, 'anniversary');
          result.sent++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Lead ${lead.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  // ==================== 2. LEAD RE-ENGAGEMENT ====================

  async processReengagement(organizationId: string, settings: AutomationSettings): Promise<AutomationResult> {
    const result: AutomationResult = { success: true, sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.reengagementDaysInactive);

      // Find inactive leads
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: settings.reengagementExcludeConverted ? false : undefined,
          lastContactedAt: { lt: cutoffDate },
          isDoNotCall: false,
        },
        include: {
          organization: { select: { name: true } },
        },
        take: 100, // Process in batches
      });

      for (const lead of leads) {
        // Check if already sent within interval
        const recentLog = await prisma.crmAutomationLog.findFirst({
          where: {
            targetId: lead.id,
            automationType: 'reengagement',
            executedAt: {
              gt: new Date(Date.now() - settings.reengagementInterval * 24 * 60 * 60 * 1000),
            },
          },
        });

        if (recentLog) {
          result.skipped++;
          continue;
        }

        // Check attempt count
        const attemptCount = await prisma.crmAutomationLog.count({
          where: {
            targetId: lead.id,
            automationType: 'reengagement',
          },
        });

        if (attemptCount >= settings.reengagementMaxAttempts) {
          result.skipped++;
          continue;
        }

        try {
          const template = settings.reengagementTemplate || DEFAULT_TEMPLATES.reengagement;
          const message = this.buildMessage(template, {
            ...lead,
            organizationName: lead.organization.name,
          });

          await this.sendMultiChannel(
            organizationId,
            lead,
            message,
            settings.reengagementChannels,
            'reengagement'
          );
          result.sent++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Lead ${lead.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  // ==================== 3. SLA BREACH ALERTS ====================

  async processSlaAlerts(organizationId: string, settings: AutomationSettings): Promise<AutomationResult> {
    const result: AutomationResult = { success: true, sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      const firstResponseCutoff = new Date(Date.now() - settings.slaFirstResponseMins * 60 * 1000);
      const followUpCutoff = new Date(Date.now() - settings.slaFollowUpHours * 60 * 60 * 1000);

      // Find leads that haven't been contacted within SLA
      const slaBreachLeads = await prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: false,
          OR: [
            // Never contacted and created before first response SLA
            {
              lastContactedAt: null,
              createdAt: { lt: firstResponseCutoff },
            },
            // Last contact was before follow-up SLA
            {
              lastContactedAt: { lt: followUpCutoff },
            },
          ],
        },
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            include: {
              assignedTo: {
                include: {
                  manager: true,
                },
              },
            },
            take: 1,
          },
          organization: { select: { name: true } },
        },
        take: 50,
      });

      for (const lead of slaBreachLeads) {
        // Check if already alerted today
        const recentAlert = await prisma.crmAutomationLog.findFirst({
          where: {
            targetId: lead.id,
            automationType: 'sla',
            executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentAlert) {
          result.skipped++;
          continue;
        }

        try {
          const assignment = lead.assignments[0];
          const assignee = assignment?.assignedTo;
          const manager = assignee?.manager;

          const isFirstContact = !lead.lastContactedAt;
          const hoursOverdue = lead.lastContactedAt
            ? Math.round((Date.now() - lead.lastContactedAt.getTime()) / (60 * 60 * 1000))
            : Math.round((Date.now() - lead.createdAt.getTime()) / (60 * 1000));

          const alertMessage = `🚨 SLA Breach Alert

Lead: ${lead.firstName} ${lead.lastName || ''}
Phone: ${lead.phone}
${isFirstContact ? 'No first contact made' : `Last contact: ${hoursOverdue} hours ago`}

Please contact this lead immediately.`;

          // Alert assignee
          if (settings.slaAlertToAssignee && assignee) {
            await this.sendInternalAlert(
              organizationId,
              assignee.id,
              'SLA Breach',
              alertMessage,
              settings.slaAlertChannels
            );
          }

          // Alert manager
          if (settings.slaAlertToManager && manager) {
            await this.sendInternalAlert(
              organizationId,
              manager.id,
              'SLA Breach - Team Member',
              alertMessage,
              settings.slaAlertChannels
            );
          }

          // Log the alert
          await this.logAutomation(organizationId, 'sla', 'lead', lead.id, 'push', 'sent');
          result.sent++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Lead ${lead.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  // ==================== 4. PAYMENT REMINDERS ====================

  async processPaymentReminders(organizationId: string, settings: AutomationSettings): Promise<AutomationResult> {
    const result: AutomationResult = { success: true, sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Reminder dates
      const reminder1Date = new Date(today);
      reminder1Date.setDate(reminder1Date.getDate() + settings.paymentReminder1DaysBefore);

      const reminder2Date = new Date(today);
      reminder2Date.setDate(reminder2Date.getDate() + settings.paymentReminder2DaysBefore);

      const overdueDate = new Date(today);
      overdueDate.setDate(overdueDate.getDate() - settings.paymentReminder3DaysAfter);

      // Find pending payment splits
      const paymentSplits = await prisma.paymentSplit.findMany({
        where: {
          status: 'PENDING',
          payment: { organizationId },
          OR: [
            // Due in X days (first reminder)
            {
              dueDate: {
                gte: reminder1Date,
                lt: new Date(reminder1Date.getTime() + 24 * 60 * 60 * 1000),
              },
            },
            // Due in Y days (second reminder)
            {
              dueDate: {
                gte: reminder2Date,
                lt: new Date(reminder2Date.getTime() + 24 * 60 * 60 * 1000),
              },
            },
            // Overdue
            {
              dueDate: {
                lt: overdueDate,
              },
              reminderSent: false,
            },
          ],
        },
        include: {
          payment: {
            include: {
              lead: true,
              organization: { select: { name: true } },
            },
          },
        },
      });

      for (const split of paymentSplits) {
        // Check if already reminded today
        const recentLog = await prisma.crmAutomationLog.findFirst({
          where: {
            targetId: split.id,
            automationType: 'payment',
            executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentLog) {
          result.skipped++;
          continue;
        }

        try {
          const lead = split.payment.lead;
          const isOverdue = split.dueDate < today;

          const template = isOverdue
            ? (settings.paymentOverdueTemplate || DEFAULT_TEMPLATES.paymentOverdue)
            : (settings.paymentReminderTemplate || DEFAULT_TEMPLATES.paymentReminder);

          const message = this.buildMessage(template, {
            ...lead,
            organizationName: split.payment.organization.name,
            amount: `${split.payment.currency} ${split.amount}`,
            dueDate: split.dueDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          });

          await this.sendMultiChannel(
            organizationId,
            lead,
            message,
            settings.paymentReminderChannels,
            'payment'
          );

          // Mark as reminded
          await prisma.paymentSplit.update({
            where: { id: split.id },
            data: { reminderSent: true },
          });

          await this.logAutomation(organizationId, 'payment', 'payment', split.id, 'multi', 'sent');
          result.sent++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Payment ${split.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  // ==================== 5. QUOTE FOLLOW-UP ====================

  async processQuoteFollowups(organizationId: string, settings: AutomationSettings): Promise<AutomationResult> {
    const result: AutomationResult = { success: true, sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find quotes that need follow-up
      for (const daysAfter of settings.quoteFollowupDays) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - daysAfter);

        const quotations = await prisma.quotation.findMany({
          where: {
            organizationId,
            status: 'SENT',
            issueDate: {
              gte: targetDate,
              lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          include: {
            lead: true,
            organization: { select: { name: true } },
          },
        });

        for (const quote of quotations) {
          if (!quote.lead) continue;

          // Check if already followed up for this interval
          const recentLog = await prisma.crmAutomationLog.findFirst({
            where: {
              targetId: quote.id,
              automationType: 'quote',
              metadata: { path: ['daysAfter'], equals: daysAfter },
            },
          });

          if (recentLog) {
            result.skipped++;
            continue;
          }

          try {
            const template = settings.quoteFollowupTemplate || DEFAULT_TEMPLATES.quoteFollowup;
            const message = this.buildMessage(template, {
              ...quote.lead,
              organizationName: quote.organization.name,
              quotationTitle: quote.title,
              quotationNumber: quote.quotationNumber,
              totalAmount: `${quote.currency} ${quote.totalAmount}`,
            });

            await this.sendMultiChannel(
              organizationId,
              quote.lead,
              message,
              settings.quoteFollowupChannels,
              'quote'
            );

            await this.logAutomation(
              organizationId,
              'quote',
              'quotation',
              quote.id,
              'multi',
              'sent',
              { daysAfter }
            );
            result.sent++;
          } catch (error: any) {
            result.failed++;
            result.errors.push(`Quote ${quote.id}: ${error.message}`);
          }
        }
      }

      // Check for expiring quotes
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + settings.quoteExpiryReminderDays);

      const expiringQuotes = await prisma.quotation.findMany({
        where: {
          organizationId,
          status: 'SENT',
          validUntil: {
            gte: expiryDate,
            lt: new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        include: {
          lead: true,
          organization: { select: { name: true } },
        },
      });

      for (const quote of expiringQuotes) {
        if (!quote.lead) continue;

        const recentLog = await prisma.crmAutomationLog.findFirst({
          where: {
            targetId: quote.id,
            automationType: 'quote_expiry',
            executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentLog) continue;

        try {
          const message = this.buildMessage(DEFAULT_TEMPLATES.quoteExpiry, {
            ...quote.lead,
            organizationName: quote.organization.name,
            quotationTitle: quote.title,
            expiryDate: quote.validUntil?.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          });

          await this.sendMultiChannel(
            organizationId,
            quote.lead,
            message,
            settings.quoteFollowupChannels,
            'quote_expiry'
          );
          result.sent++;
        } catch (error: any) {
          result.failed++;
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  // ==================== 6. LEAD AGING ALERTS ====================

  async processLeadAgingAlerts(organizationId: string, settings: AutomationSettings): Promise<AutomationResult> {
    const result: AutomationResult = { success: true, sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.leadAgingDays);

      // Find stale leads
      const staleLeads = await prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: false,
          updatedAt: { lt: cutoffDate },
        },
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            include: {
              assignedTo: {
                include: { manager: true },
              },
            },
            take: 1,
          },
        },
        take: 50,
      });

      for (const lead of staleLeads) {
        const recentAlert = await prisma.crmAutomationLog.findFirst({
          where: {
            targetId: lead.id,
            automationType: 'aging',
            executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (recentAlert) {
          result.skipped++;
          continue;
        }

        try {
          const assignment = lead.assignments[0];
          const assignee = assignment?.assignedTo;
          const manager = assignee?.manager;

          const daysSinceActivity = Math.round(
            (Date.now() - lead.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
          );

          const alertMessage = `⏰ Lead Aging Alert

Lead: ${lead.firstName} ${lead.lastName || ''}
Phone: ${lead.phone}
Days inactive: ${daysSinceActivity}
${assignee ? `Assigned to: ${assignee.firstName} ${assignee.lastName}` : 'Unassigned'}

This lead needs attention.`;

          // Alert based on settings
          if (settings.leadAgingAlertTo.includes('manager') && manager) {
            await this.sendInternalAlert(
              organizationId,
              manager.id,
              'Lead Aging Alert',
              alertMessage,
              settings.leadAgingChannels
            );
          }

          if (settings.leadAgingAlertTo.includes('assignee') && assignee) {
            await this.sendInternalAlert(
              organizationId,
              assignee.id,
              'Lead Aging Alert',
              alertMessage,
              settings.leadAgingChannels
            );
          }

          await this.logAutomation(organizationId, 'aging', 'lead', lead.id, 'push', 'sent');
          result.sent++;

          // Auto-reassign if enabled
          if (settings.leadAgingAutoReassign && daysSinceActivity >= settings.leadAgingReassignDays) {
            // Implementation would reassign to available user
            // This is a placeholder for the actual reassignment logic
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Lead ${lead.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  // ==================== 7. WELCOME SERIES ====================

  /**
   * Public method to trigger welcome series for a specific lead
   * Called from routes when a lead is manually triggered
   */
  async triggerWelcomeSeries(organizationId: string, leadId: string): Promise<void> {
    return this.processWelcomeSeries(organizationId, leadId);
  }

  async processWelcomeSeries(organizationId: string, leadId: string): Promise<void> {
    const settings = await this.getSettings(organizationId);

    if (!settings.welcomeEnabled) return;

    // Delay before sending
    setTimeout(async () => {
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          include: { organization: { select: { name: true } } },
        });

        if (!lead) return;

        // Check if already sent
        const existingLog = await prisma.crmAutomationLog.findFirst({
          where: {
            targetId: leadId,
            automationType: 'welcome',
          },
        });

        if (existingLog) return;

        const template = settings.welcomeTemplate || DEFAULT_TEMPLATES.welcome;
        const message = this.buildMessage(template, {
          ...lead,
          organizationName: lead.organization.name,
        });

        await this.sendMultiChannel(
          organizationId,
          lead,
          message,
          settings.welcomeChannels,
          'welcome'
        );

        console.log(`[CrmAutomation] Welcome message sent to lead ${leadId}`);
      } catch (error) {
        console.error('[CrmAutomation] Error sending welcome message:', error);
      }
    }, settings.welcomeDelayMinutes * 60 * 1000);
  }

  // ==================== 8. REVIEW REQUESTS ====================

  async processReviewRequests(organizationId: string, settings: AutomationSettings): Promise<AutomationResult> {
    const result: AutomationResult = { success: true, sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.reviewRequestDelay);

      // Find converted leads eligible for review request
      const convertedLeads = await prisma.lead.findMany({
        where: {
          organizationId,
          isConverted: true,
          convertedAt: {
            gte: new Date(cutoffDate.getTime() - 24 * 60 * 60 * 1000),
            lt: cutoffDate,
          },
          ...(settings.reviewMinDealValue
            ? { actualValue: { gte: settings.reviewMinDealValue } }
            : {}),
        },
        include: {
          organization: { select: { name: true } },
        },
      });

      for (const lead of convertedLeads) {
        const existingLog = await prisma.crmAutomationLog.findFirst({
          where: {
            targetId: lead.id,
            automationType: 'review',
          },
        });

        if (existingLog) {
          result.skipped++;
          continue;
        }

        try {
          // Build review link based on platforms
          let reviewLink = '';
          if (settings.reviewPlatforms.includes('google')) {
            // This would be the actual Google review link
            reviewLink = 'https://g.page/review/[YOUR_PLACE_ID]';
          }

          const template = settings.reviewRequestTemplate || DEFAULT_TEMPLATES.reviewRequest;
          const message = this.buildMessage(template, {
            ...lead,
            organizationName: lead.organization.name,
            reviewLink,
          });

          await this.sendMultiChannel(
            organizationId,
            lead,
            message,
            settings.reviewRequestChannels,
            'review'
          );
          result.sent++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Lead ${lead.id}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get settings for an organization
   */
  async getSettings(organizationId: string): Promise<AutomationSettings> {
    const settings = await prisma.crmAutomationSettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      return this.defaultSettings;
    }

    return {
      birthdayEnabled: settings.birthdayEnabled,
      birthdayChannels: settings.birthdayChannels as string[],
      birthdayTemplate: settings.birthdayTemplate,
      birthdayDaysBefore: settings.birthdayDaysBefore,
      birthdayTime: settings.birthdayTime,
      anniversaryEnabled: settings.anniversaryEnabled,
      anniversaryTemplate: settings.anniversaryTemplate,
      reengagementEnabled: settings.reengagementEnabled,
      reengagementDaysInactive: settings.reengagementDaysInactive,
      reengagementChannels: settings.reengagementChannels as string[],
      reengagementTemplate: settings.reengagementTemplate,
      reengagementMaxAttempts: settings.reengagementMaxAttempts,
      reengagementInterval: settings.reengagementInterval,
      reengagementExcludeConverted: settings.reengagementExcludeConverted,
      slaEnabled: settings.slaEnabled,
      slaFirstResponseMins: settings.slaFirstResponseMins,
      slaFollowUpHours: settings.slaFollowUpHours,
      slaAlertChannels: settings.slaAlertChannels as string[],
      slaAlertToManager: settings.slaAlertToManager,
      slaAlertToAssignee: settings.slaAlertToAssignee,
      slaEscalateAfterBreaches: settings.slaEscalateAfterBreaches,
      paymentReminderEnabled: settings.paymentReminderEnabled,
      paymentReminder1DaysBefore: settings.paymentReminder1DaysBefore,
      paymentReminder2DaysBefore: settings.paymentReminder2DaysBefore,
      paymentReminder3DaysAfter: settings.paymentReminder3DaysAfter,
      paymentReminderChannels: settings.paymentReminderChannels as string[],
      paymentReminderTemplate: settings.paymentReminderTemplate,
      paymentOverdueTemplate: settings.paymentOverdueTemplate,
      quoteFollowupEnabled: settings.quoteFollowupEnabled,
      quoteFollowupDays: settings.quoteFollowupDays as number[],
      quoteFollowupChannels: settings.quoteFollowupChannels as string[],
      quoteFollowupTemplate: settings.quoteFollowupTemplate,
      quoteExpiryReminderDays: settings.quoteExpiryReminderDays,
      leadAgingEnabled: settings.leadAgingEnabled,
      leadAgingDays: settings.leadAgingDays,
      leadAgingAlertTo: settings.leadAgingAlertTo as string[],
      leadAgingChannels: settings.leadAgingChannels as string[],
      leadAgingAutoReassign: settings.leadAgingAutoReassign,
      leadAgingReassignDays: settings.leadAgingReassignDays,
      welcomeEnabled: settings.welcomeEnabled,
      welcomeChannels: settings.welcomeChannels as string[],
      welcomeDelayMinutes: settings.welcomeDelayMinutes,
      welcomeTemplate: settings.welcomeTemplate,
      welcomeIncludeIntro: settings.welcomeIncludeIntro,
      welcomeIncludeCatalog: settings.welcomeIncludeCatalog,
      reviewRequestEnabled: settings.reviewRequestEnabled,
      reviewRequestDelay: settings.reviewRequestDelay,
      reviewRequestChannels: settings.reviewRequestChannels as string[],
      reviewRequestTemplate: settings.reviewRequestTemplate,
      reviewPlatforms: settings.reviewPlatforms as string[],
      reviewMinDealValue: settings.reviewMinDealValue ? Number(settings.reviewMinDealValue) : null,
    };
  }

  /**
   * Update settings for an organization
   */
  async updateSettings(organizationId: string, updates: Partial<AutomationSettings>): Promise<AutomationSettings> {
    await prisma.crmAutomationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        ...this.settingsToDbFormat(updates),
      },
      update: this.settingsToDbFormat(updates),
    });

    return this.getSettings(organizationId);
  }

  private settingsToDbFormat(settings: Partial<AutomationSettings>): any {
    const result: any = {};

    if (settings.birthdayEnabled !== undefined) result.birthdayEnabled = settings.birthdayEnabled;
    if (settings.birthdayChannels) result.birthdayChannels = settings.birthdayChannels;
    if (settings.birthdayTemplate !== undefined) result.birthdayTemplate = settings.birthdayTemplate;
    if (settings.birthdayDaysBefore !== undefined) result.birthdayDaysBefore = settings.birthdayDaysBefore;
    if (settings.birthdayTime) result.birthdayTime = settings.birthdayTime;
    if (settings.anniversaryEnabled !== undefined) result.anniversaryEnabled = settings.anniversaryEnabled;
    if (settings.anniversaryTemplate !== undefined) result.anniversaryTemplate = settings.anniversaryTemplate;

    if (settings.reengagementEnabled !== undefined) result.reengagementEnabled = settings.reengagementEnabled;
    if (settings.reengagementDaysInactive !== undefined) result.reengagementDaysInactive = settings.reengagementDaysInactive;
    if (settings.reengagementChannels) result.reengagementChannels = settings.reengagementChannels;
    if (settings.reengagementTemplate !== undefined) result.reengagementTemplate = settings.reengagementTemplate;
    if (settings.reengagementMaxAttempts !== undefined) result.reengagementMaxAttempts = settings.reengagementMaxAttempts;
    if (settings.reengagementInterval !== undefined) result.reengagementInterval = settings.reengagementInterval;
    if (settings.reengagementExcludeConverted !== undefined) result.reengagementExcludeConverted = settings.reengagementExcludeConverted;

    if (settings.slaEnabled !== undefined) result.slaEnabled = settings.slaEnabled;
    if (settings.slaFirstResponseMins !== undefined) result.slaFirstResponseMins = settings.slaFirstResponseMins;
    if (settings.slaFollowUpHours !== undefined) result.slaFollowUpHours = settings.slaFollowUpHours;
    if (settings.slaAlertChannels) result.slaAlertChannels = settings.slaAlertChannels;
    if (settings.slaAlertToManager !== undefined) result.slaAlertToManager = settings.slaAlertToManager;
    if (settings.slaAlertToAssignee !== undefined) result.slaAlertToAssignee = settings.slaAlertToAssignee;
    if (settings.slaEscalateAfterBreaches !== undefined) result.slaEscalateAfterBreaches = settings.slaEscalateAfterBreaches;

    if (settings.paymentReminderEnabled !== undefined) result.paymentReminderEnabled = settings.paymentReminderEnabled;
    if (settings.paymentReminder1DaysBefore !== undefined) result.paymentReminder1DaysBefore = settings.paymentReminder1DaysBefore;
    if (settings.paymentReminder2DaysBefore !== undefined) result.paymentReminder2DaysBefore = settings.paymentReminder2DaysBefore;
    if (settings.paymentReminder3DaysAfter !== undefined) result.paymentReminder3DaysAfter = settings.paymentReminder3DaysAfter;
    if (settings.paymentReminderChannels) result.paymentReminderChannels = settings.paymentReminderChannels;
    if (settings.paymentReminderTemplate !== undefined) result.paymentReminderTemplate = settings.paymentReminderTemplate;
    if (settings.paymentOverdueTemplate !== undefined) result.paymentOverdueTemplate = settings.paymentOverdueTemplate;

    if (settings.quoteFollowupEnabled !== undefined) result.quoteFollowupEnabled = settings.quoteFollowupEnabled;
    if (settings.quoteFollowupDays) result.quoteFollowupDays = settings.quoteFollowupDays;
    if (settings.quoteFollowupChannels) result.quoteFollowupChannels = settings.quoteFollowupChannels;
    if (settings.quoteFollowupTemplate !== undefined) result.quoteFollowupTemplate = settings.quoteFollowupTemplate;
    if (settings.quoteExpiryReminderDays !== undefined) result.quoteExpiryReminderDays = settings.quoteExpiryReminderDays;

    if (settings.leadAgingEnabled !== undefined) result.leadAgingEnabled = settings.leadAgingEnabled;
    if (settings.leadAgingDays !== undefined) result.leadAgingDays = settings.leadAgingDays;
    if (settings.leadAgingAlertTo) result.leadAgingAlertTo = settings.leadAgingAlertTo;
    if (settings.leadAgingChannels) result.leadAgingChannels = settings.leadAgingChannels;
    if (settings.leadAgingAutoReassign !== undefined) result.leadAgingAutoReassign = settings.leadAgingAutoReassign;
    if (settings.leadAgingReassignDays !== undefined) result.leadAgingReassignDays = settings.leadAgingReassignDays;

    if (settings.welcomeEnabled !== undefined) result.welcomeEnabled = settings.welcomeEnabled;
    if (settings.welcomeChannels) result.welcomeChannels = settings.welcomeChannels;
    if (settings.welcomeDelayMinutes !== undefined) result.welcomeDelayMinutes = settings.welcomeDelayMinutes;
    if (settings.welcomeTemplate !== undefined) result.welcomeTemplate = settings.welcomeTemplate;
    if (settings.welcomeIncludeIntro !== undefined) result.welcomeIncludeIntro = settings.welcomeIncludeIntro;
    if (settings.welcomeIncludeCatalog !== undefined) result.welcomeIncludeCatalog = settings.welcomeIncludeCatalog;

    if (settings.reviewRequestEnabled !== undefined) result.reviewRequestEnabled = settings.reviewRequestEnabled;
    if (settings.reviewRequestDelay !== undefined) result.reviewRequestDelay = settings.reviewRequestDelay;
    if (settings.reviewRequestChannels) result.reviewRequestChannels = settings.reviewRequestChannels;
    if (settings.reviewRequestTemplate !== undefined) result.reviewRequestTemplate = settings.reviewRequestTemplate;
    if (settings.reviewPlatforms) result.reviewPlatforms = settings.reviewPlatforms;
    if (settings.reviewMinDealValue !== undefined) result.reviewMinDealValue = settings.reviewMinDealValue;

    return result;
  }

  /**
   * Build message from template
   */
  private buildMessage(template: string, data: any): string {
    let message = template;

    const variables: Record<string, string> = {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      email: data.email || '',
      phone: data.phone || '',
      organizationName: data.organizationName || '',
      amount: data.amount || '',
      dueDate: data.dueDate || '',
      quotationTitle: data.quotationTitle || '',
      quotationNumber: data.quotationNumber || '',
      totalAmount: data.totalAmount || '',
      expiryDate: data.expiryDate || '',
      reviewLink: data.reviewLink || '',
    };

    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return message;
  }

  /**
   * Send message through multiple channels
   */
  private async sendMultiChannel(
    organizationId: string,
    lead: any,
    message: string,
    channels: string[],
    automationType: string
  ): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'whatsapp':
            if (lead.whatsapp || lead.phone) {
              const whatsappService = createWhatsAppService(organizationId);
              const isConfigured = await whatsappService.isConfigured();
              if (isConfigured) {
                await whatsappService.sendMessage({
                  to: lead.whatsapp || lead.phone,
                  message,
                });
              }
            }
            break;

          case 'sms':
            if (lead.phone) {
              const systemUser = await prisma.user.findFirst({
                where: { organizationId },
                select: { id: true },
              });
              if (systemUser) {
                await msg91Service.sendSms({
                  phone: lead.phone,
                  message,
                  userId: systemUser.id,
                  organizationId,
                });
              }
            }
            break;

          case 'email':
            if (lead.email) {
              await emailSettingsService.sendEmail(organizationId, {
                to: lead.email,
                subject: this.getEmailSubject(automationType),
                text: message,
                html: `<div style="font-family: sans-serif; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>`,
              });
            }
            break;
        }

        await this.logAutomation(organizationId, automationType, 'lead', lead.id, channel, 'sent');
      } catch (error: any) {
        await this.logAutomation(organizationId, automationType, 'lead', lead.id, channel, 'failed', null, error.message);
      }
    }
  }

  /**
   * Send internal alert to user
   */
  private async sendInternalAlert(
    organizationId: string,
    userId: string,
    title: string,
    message: string,
    channels: string[]
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    if (!user) return;

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'push':
            await pushNotificationService.sendToUser(userId, {
              title,
              body: message.substring(0, 200),
              data: { type: 'sla_alert' },
            });
            break;

          case 'email':
            if (user.email) {
              await emailSettingsService.sendEmail(organizationId, {
                to: user.email,
                subject: title,
                text: message,
              });
            }
            break;

          case 'sms':
            if (user.phone) {
              const systemUser = await prisma.user.findFirst({
                where: { organizationId },
                select: { id: true },
              });
              if (systemUser) {
                await msg91Service.sendSms({
                  phone: user.phone,
                  message: message.substring(0, 160),
                  userId: systemUser.id,
                  organizationId,
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error(`[CrmAutomation] Failed to send ${channel} alert:`, error);
      }
    }
  }

  /**
   * Get email subject based on automation type
   */
  private getEmailSubject(automationType: string): string {
    const subjects: Record<string, string> = {
      birthday: 'Happy Birthday! 🎂',
      anniversary: 'Happy Anniversary! 🎉',
      reengagement: 'We miss you!',
      payment: 'Payment Reminder',
      quote: 'Following up on your quotation',
      quote_expiry: 'Your quotation is expiring soon',
      welcome: 'Welcome!',
      review: 'We\'d love your feedback',
    };
    return subjects[automationType] || 'Notification';
  }

  /**
   * Log automation execution
   */
  private async logAutomation(
    organizationId: string,
    automationType: string,
    targetType: string,
    targetId: string,
    channel: string,
    status: string,
    metadata?: any,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.crmAutomationLog.create({
        data: {
          organizationId,
          automationType,
          targetType,
          targetId,
          channel,
          status,
          metadata,
          errorMessage,
        },
      });
    } catch (error) {
      console.error('[CrmAutomation] Failed to log automation:', error);
    }
  }

  /**
   * Get automation logs
   */
  async getLogs(organizationId: string, options: {
    automationType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    return prisma.crmAutomationLog.findMany({
      where: {
        organizationId,
        ...(options.automationType ? { automationType: options.automationType } : {}),
      },
      orderBy: { executedAt: 'desc' },
      take: options.limit || 100,
      skip: options.offset || 0,
    });
  }

  /**
   * Get automation statistics
   */
  async getStats(organizationId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    const stats = await prisma.crmAutomationLog.groupBy({
      by: ['automationType', 'status'],
      where: {
        organizationId,
        executedAt: { gte: last30Days },
      },
      _count: { id: true },
    });

    // Transform to summary
    const summary: Record<string, { sent: number; failed: number; skipped: number }> = {};

    for (const stat of stats) {
      if (!summary[stat.automationType]) {
        summary[stat.automationType] = { sent: 0, failed: 0, skipped: 0 };
      }
      if (stat.status === 'sent') {
        summary[stat.automationType].sent = stat._count.id;
      } else if (stat.status === 'failed') {
        summary[stat.automationType].failed = stat._count.id;
      } else if (stat.status === 'skipped') {
        summary[stat.automationType].skipped = stat._count.id;
      }
    }

    return summary;
  }
}

export const crmAutomationService = new CrmAutomationService();
