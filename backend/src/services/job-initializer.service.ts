import { jobQueueService } from './job-queue.service';
import { apifySchedulerService } from './apify-scheduler.service';
import { leadLifecycleService } from './lead-lifecycle.service';
import { assignmentScheduleService } from './assignmentSchedule.service';
import { messageRetryService } from './message-retry.service';
import { appointmentReminderService } from './appointment-reminder.service';
import { crmAutomationService } from './crm-automation.service';
import { autoReportsService } from './auto-reports.service';
import { resendService } from './resend.service';
import { reportGeneratorService } from './report-generator.service';

/**
 * Job Initializer Service
 * Initializes all scheduled jobs on server startup
 */
class JobInitializerService {
  private initialized: boolean = false;

  /**
   * Initialize all scheduled jobs
   * Call this after the server has started
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[JobInitializer] Already initialized, skipping...');
      return;
    }

    console.log('[JobInitializer] Initializing scheduled jobs...');

    try {
      // 1. Schedule score decay job (runs daily at 2 AM)
      await this.scheduleScoreDecayJob();

      // 2. Schedule ad insights sync job (runs every 4 hours)
      await this.scheduleAdInsightsSyncJob();

      // 3. Start the scheduled call checker (runs every minute)
      this.startScheduledCallChecker();

      // 4. Start the ad insights sync checker (fallback for non-Redis mode)
      this.startAdInsightsSyncChecker();

      // 5. Start the Apify scheduler
      this.startApifyScheduler();

      // 6. Start the AI follow-up checker (runs every 5 minutes)
      this.startAIFollowUpChecker();

      // 7. Start the assignment schedule checker (runs every 5 minutes)
      this.startAssignmentScheduleChecker();

      // 8. Start the message retry processor (runs every minute)
      this.startMessageRetryProcessor();

      // 9. Start the appointment reminder checker (runs every 15 minutes)
      this.startAppointmentReminderChecker();

      // 10. Start the CRM automation checker (runs every 30 minutes)
      this.startCrmAutomationChecker();

      // 11. Start the auto-report scheduler (runs every minute to check for due reports)
      this.startAutoReportChecker();

      this.initialized = true;
      console.log('[JobInitializer] All scheduled jobs initialized successfully');
    } catch (error) {
      console.error('[JobInitializer] Failed to initialize jobs:', error);
    }
  }

  /**
   * Schedule the score decay job
   * Runs daily at 2 AM to apply decay to lead scores based on inactivity
   */
  private async scheduleScoreDecayJob(): Promise<void> {
    try {
      await jobQueueService.scheduleScoreDecayJob('0 2 * * *'); // 2 AM daily
      console.log('[JobInitializer] Score decay job scheduled (daily at 2 AM)');
    } catch (error) {
      console.warn('[JobInitializer] Could not schedule score decay job (Redis may not be available):', error);
    }
  }

  /**
   * Schedule the ad insights sync job
   * Runs every 4 hours to sync campaign metrics from all ad platforms
   */
  private async scheduleAdInsightsSyncJob(): Promise<void> {
    try {
      await jobQueueService.scheduleAdInsightsSyncJob('0 */4 * * *'); // Every 4 hours
      console.log('[JobInitializer] Ad insights sync job scheduled (every 4 hours)');
    } catch (error) {
      console.warn('[JobInitializer] Could not schedule ad insights sync job (Redis may not be available):', error);
    }
  }

  /**
   * Start the scheduled call checker
   * Polls for pending scheduled calls every minute
   */
  private startScheduledCallChecker(): void {
    jobQueueService.startScheduledCallChecker();
    console.log('[JobInitializer] Scheduled call checker started (polls every minute)');
  }

  /**
   * Start the ad insights sync checker
   * Fallback for when Redis is not available - uses in-memory scheduling
   */
  private startAdInsightsSyncChecker(): void {
    jobQueueService.startAdInsightsSyncChecker();
    console.log('[JobInitializer] Ad insights sync checker started (fallback mode, runs every 4 hours)');
  }

  /**
   * Start the Apify scheduler
   * Checks for scheduled scrapes every minute
   */
  private startApifyScheduler(): void {
    apifySchedulerService.start();
    console.log('[JobInitializer] Apify scheduler started (checks every minute)');
  }

  /**
   * Start the AI follow-up checker
   * Processes pending AI follow-ups every 5 minutes
   */
  private startAIFollowUpChecker(): void {
    // Run every 5 minutes (300000ms)
    setInterval(async () => {
      try {
        const results = await leadLifecycleService.executePendingAIFollowUps();
        if (results.length > 0) {
          console.log(`[JobInitializer] Processed ${results.length} AI follow-ups: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
        }
      } catch (error) {
        console.error('[JobInitializer] Error executing AI follow-ups:', error);
      }
    }, 5 * 60 * 1000);

    // Also run once immediately on startup (after 30 second delay to let server stabilize)
    setTimeout(async () => {
      try {
        const results = await leadLifecycleService.executePendingAIFollowUps();
        if (results.length > 0) {
          console.log(`[JobInitializer] Initial AI follow-up check: processed ${results.length} follow-ups`);
        }
      } catch (error) {
        console.error('[JobInitializer] Error in initial AI follow-up check:', error);
      }
    }, 30000);

    console.log('[JobInitializer] AI follow-up checker started (runs every 5 minutes)');
  }

  /**
   * Start the assignment schedule checker
   * Checks for due assignment schedules every 5 minutes and runs them
   */
  private startAssignmentScheduleChecker(): void {
    // Run every 5 minutes (300000ms)
    setInterval(async () => {
      try {
        const dueSchedules = await assignmentScheduleService.getDueSchedules();

        if (dueSchedules.length > 0) {
          console.log(`[AssignmentSchedule] Found ${dueSchedules.length} due schedules`);

          for (const schedule of dueSchedules) {
            try {
              const result = await assignmentScheduleService.runScheduledAssignment(
                schedule.id,
                'scheduler'
              );
              console.log(
                `[AssignmentSchedule] Schedule "${schedule.name}" completed: ` +
                  `${result.totalRecordsAssigned} records assigned`
              );
            } catch (error) {
              console.error(
                `[AssignmentSchedule] Error running schedule "${schedule.name}":`,
                error
              );
            }
          }
        }
      } catch (error) {
        console.error('[AssignmentSchedule] Error checking due schedules:', error);
      }
    }, 5 * 60 * 1000);

    // Also run once on startup (after 60 second delay to let server stabilize)
    setTimeout(async () => {
      try {
        const dueSchedules = await assignmentScheduleService.getDueSchedules();
        if (dueSchedules.length > 0) {
          console.log(
            `[AssignmentSchedule] Initial check found ${dueSchedules.length} due schedules`
          );
          for (const schedule of dueSchedules) {
            try {
              await assignmentScheduleService.runScheduledAssignment(
                schedule.id,
                'scheduler'
              );
            } catch (error) {
              console.error(
                `[AssignmentSchedule] Error running initial schedule "${schedule.name}":`,
                error
              );
            }
          }
        }
      } catch (error) {
        console.error('[AssignmentSchedule] Error in initial check:', error);
      }
    }, 60000);

    console.log('[JobInitializer] Assignment schedule checker started (runs every 5 minutes)');
  }

  /**
   * Start the message retry processor
   * Retries failed WhatsApp/SMS messages with exponential backoff
   */
  private startMessageRetryProcessor(): void {
    messageRetryService.start();
    console.log('[JobInitializer] Message retry processor started (runs every minute)');
  }

  /**
   * Start the appointment reminder checker
   * Sends reminders at 24h, 2h, and 30min before appointments
   */
  private startAppointmentReminderChecker(): void {
    // Run every 15 minutes (900000ms)
    setInterval(async () => {
      try {
        const results = await appointmentReminderService.checkAndSendReminders();
        if (results.length > 0) {
          const successful = results.filter(r => r.success).length;
          console.log(`[AppointmentReminder] Processed ${results.length} reminders: ${successful} successful`);
        }
      } catch (error) {
        console.error('[AppointmentReminder] Error checking reminders:', error);
      }
    }, 15 * 60 * 1000);

    // Run once on startup (after 30 second delay)
    setTimeout(async () => {
      try {
        const results = await appointmentReminderService.checkAndSendReminders();
        if (results.length > 0) {
          console.log(`[AppointmentReminder] Initial check: processed ${results.length} reminders`);
        }
      } catch (error) {
        console.error('[AppointmentReminder] Error in initial check:', error);
      }
    }, 30000);

    console.log('[JobInitializer] Appointment reminder checker started (runs every 15 minutes)');
  }

  /**
   * Start the CRM automation checker
   * Processes Birthday, Re-engagement, SLA, Payment, Quote, Aging, Review automations
   */
  private startCrmAutomationChecker(): void {
    // Run every 30 minutes (1800000ms)
    setInterval(async () => {
      try {
        const results = await crmAutomationService.runAllAutomations();
        const totalProcessed = Object.values(results).reduce(
          (sum, r: any) => sum + (r.processed || 0),
          0
        );
        if (totalProcessed > 0) {
          console.log(`[CrmAutomation] Processed ${totalProcessed} automation tasks`);
        }
      } catch (error) {
        console.error('[CrmAutomation] Error running automations:', error);
      }
    }, 30 * 60 * 1000);

    // Run once on startup (after 45 second delay to let server stabilize)
    setTimeout(async () => {
      try {
        const results = await crmAutomationService.runAllAutomations();
        const totalProcessed = Object.values(results).reduce(
          (sum, r: any) => sum + (r.processed || 0),
          0
        );
        if (totalProcessed > 0) {
          console.log(`[CrmAutomation] Initial check: processed ${totalProcessed} automation tasks`);
        }
      } catch (error) {
        console.error('[CrmAutomation] Error in initial check:', error);
      }
    }, 45000);

    console.log('[JobInitializer] CRM automation checker started (runs every 30 minutes)');
  }

  /**
   * Start the auto-report scheduler
   * Checks for due report schedules and sends them via email
   */
  private startAutoReportChecker(): void {
    // Run every minute (60000ms) to check for due reports
    setInterval(async () => {
      try {
        const dueSchedules = await autoReportsService.getDueSchedules();

        if (dueSchedules.length > 0) {
          console.log(`[AutoReports] Found ${dueSchedules.length} due report(s)`);

          for (const schedule of dueSchedules) {
            try {
              // Generate and send the report
              await this.generateAndSendReport(schedule);

              // Mark as sent and calculate next send time
              await autoReportsService.markScheduleSent(schedule.id);

              console.log(`[AutoReports] Report "${schedule.name}" sent to ${schedule.recipients.length} recipient(s)`);
            } catch (error) {
              console.error(`[AutoReports] Error sending report "${schedule.name}":`, error);
            }
          }
        }
      } catch (error) {
        console.error('[AutoReports] Error checking due schedules:', error);
      }
    }, 60 * 1000);

    // Run once on startup (after 20 second delay)
    setTimeout(async () => {
      try {
        const dueSchedules = await autoReportsService.getDueSchedules();
        if (dueSchedules.length > 0) {
          console.log(`[AutoReports] Initial check: found ${dueSchedules.length} due report(s)`);
          for (const schedule of dueSchedules) {
            try {
              await this.generateAndSendReport(schedule);
              await autoReportsService.markScheduleSent(schedule.id);
              console.log(`[AutoReports] Initial: Report "${schedule.name}" sent`);
            } catch (error) {
              console.error(`[AutoReports] Error in initial send "${schedule.name}":`, error);
            }
          }
        }
      } catch (error) {
        console.error('[AutoReports] Error in initial check:', error);
      }
    }, 20000);

    console.log('[JobInitializer] Auto-report scheduler started (checks every minute)');
  }

  /**
   * Generate and send a report via email with attachment
   */
  private async generateAndSendReport(schedule: any): Promise<void> {
    const orgName = schedule.organization?.name || 'Your Organization';
    const reportTypeLabel = autoReportsService.REPORT_TYPES.find(
      (t: any) => t.value === schedule.reportType
    )?.label || schedule.reportType;

    // Generate the report file
    let reportFile: { buffer: Buffer; filename: string; contentType: string } | null = null;
    try {
      const format = schedule.format === 'excel' ? 'excel' : 'csv';
      reportFile = await reportGeneratorService.generateReport(
        schedule.organizationId,
        schedule.reportType,
        format
      );
      console.log(`[AutoReports] Generated ${reportFile.filename} (${reportFile.buffer.length} bytes)`);
    } catch (error) {
      console.error(`[AutoReports] Failed to generate report:`, error);
    }

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">${reportTypeLabel}</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi,</p>
          <p>Please find attached your scheduled <strong>${reportTypeLabel}</strong> for <strong>${orgName}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Schedule:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${schedule.frequency} at ${schedule.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Format:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${schedule.format.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Generated:</strong></td>
              <td style="padding: 8px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          </table>
          ${reportFile ? `<p style="color: #22c55e;">✅ Report attached: <strong>${reportFile.filename}</strong></p>` : '<p style="color: #ef4444;">⚠️ Report generation failed. Please contact support.</p>'}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p style="color: #666; font-size: 12px;">
            This is an automated report from MyLeadX.<br/>
            To manage your report schedules, visit Settings → Automatic Reports.
          </p>
        </div>
      </div>
    `;

    // Send to all recipients
    for (const recipient of schedule.recipients) {
      try {
        await resendService.sendEmail({
          to: recipient,
          subject: `[${orgName}] ${reportTypeLabel} - ${new Date().toLocaleDateString('en-IN')}`,
          body: `Your scheduled ${reportTypeLabel} is attached.`,
          html: emailContent,
          attachments: reportFile ? [{
            filename: reportFile.filename,
            content: reportFile.buffer,
            contentType: reportFile.contentType,
          }] : undefined,
        });
        console.log(`[AutoReports] Email sent to ${recipient} with attachment`);
      } catch (error) {
        console.error(`[AutoReports] Failed to send to ${recipient}:`, error);
      }
    }
  }

  /**
   * Trigger an immediate ad insights sync for all organizations
   */
  async triggerImmediateAdInsightsSync(): Promise<string> {
    console.log('[JobInitializer] Triggering immediate ad insights sync...');
    return jobQueueService.addJob('AD_INSIGHTS_SYNC_ALL', {});
  }

  /**
   * Trigger an immediate score decay run
   */
  async triggerImmediateScoreDecay(): Promise<string> {
    console.log('[JobInitializer] Triggering immediate score decay...');
    return jobQueueService.addJob('SCORE_DECAY', {});
  }

  /**
   * Get the status of all scheduled jobs
   */
  async getJobsStatus(): Promise<{
    initialized: boolean;
    queueStats: any;
  }> {
    const queueStats = await jobQueueService.getQueueStats();
    return {
      initialized: this.initialized,
      queueStats,
    };
  }
}

export const jobInitializerService = new JobInitializerService();

/**
 * Helper function to initialize scheduled jobs
 * Use this in the main index.ts after server starts
 */
export async function initializeScheduledJobs(): Promise<void> {
  await jobInitializerService.initialize();
}
