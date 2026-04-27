import { jobQueueService } from './job-queue.service';
import { apifySchedulerService } from './apify-scheduler.service';
import { leadLifecycleService } from './lead-lifecycle.service';
import { assignmentScheduleService } from './assignmentSchedule.service';
import { messageRetryService } from './message-retry.service';

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
