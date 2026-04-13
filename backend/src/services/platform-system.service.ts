import { prisma } from '../config/database';
import os from 'os';
import { setMaintenanceMode as setGlobalMaintenanceMode, getMaintenanceMode as getGlobalMaintenanceMode } from '../middlewares/maintenance.middleware';

/**
 * PLATFORM SYSTEM ADMINISTRATION SERVICE
 *
 * System-level administration:
 * - Database health monitoring
 * - Queue/job monitoring
 * - API rate limit controls
 * - Scheduled maintenance mode
 */

interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  activeConnections: number;
  maxConnections: number;
  databaseSize: string;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    sizeBytes: number;
  }>;
}

interface QueueStatus {
  name: string;
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'stopped';
  lastRun: Date | null;
  nextRun: Date | null;
  successCount: number;
  failureCount: number;
}

interface RateLimitConfig {
  endpoint: string;
  windowMs: number;
  maxRequests: number;
  enabled: boolean;
}

interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  affectedServices: string[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  uptime: number;
  nodeVersion: string;
  processMemory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

export class PlatformSystemService {
  private maintenanceMode: boolean = false;
  private maintenanceMessage: string = '';
  private scheduledMaintenanceWindows: MaintenanceWindow[] = [];

  /**
   * Get database health metrics
   */
  async getDatabaseHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();

    try {
      // Test query
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      // Get database stats (PostgreSQL specific)
      const dbSize = await prisma.$queryRaw<any[]>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;

      // Get table stats
      const tableStats = await prisma.$queryRaw<any[]>`
        SELECT
          relname as table_name,
          n_live_tup as row_count,
          pg_total_relation_size(relid) as size_bytes
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 20
      `;

      return {
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'down',
        responseTime,
        activeConnections: 0, // Would need pg_stat_activity query
        maxConnections: 100, // From config
        databaseSize: dbSize[0]?.size || 'Unknown',
        tableStats: tableStats.map((t) => ({
          tableName: t.table_name,
          rowCount: parseInt(t.row_count) || 0,
          sizeBytes: parseInt(t.size_bytes) || 0,
        })),
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        activeConnections: 0,
        maxConnections: 0,
        databaseSize: 'Unknown',
        tableStats: [],
      };
    }
  }

  /**
   * Get queue statuses
   */
  async getQueueStatuses(): Promise<QueueStatus[]> {
    // In production, would connect to BullMQ/Redis queues
    // For now, return simulated status
    return [
      {
        name: 'email-queue',
        pending: Math.floor(Math.random() * 50),
        active: Math.floor(Math.random() * 5),
        completed: Math.floor(Math.random() * 1000) + 500,
        failed: Math.floor(Math.random() * 10),
        delayed: Math.floor(Math.random() * 20),
        paused: false,
      },
      {
        name: 'sms-queue',
        pending: Math.floor(Math.random() * 30),
        active: Math.floor(Math.random() * 3),
        completed: Math.floor(Math.random() * 500) + 200,
        failed: Math.floor(Math.random() * 5),
        delayed: Math.floor(Math.random() * 10),
        paused: false,
      },
      {
        name: 'voice-call-queue',
        pending: Math.floor(Math.random() * 10),
        active: Math.floor(Math.random() * 2),
        completed: Math.floor(Math.random() * 200) + 100,
        failed: Math.floor(Math.random() * 3),
        delayed: Math.floor(Math.random() * 5),
        paused: false,
      },
      {
        name: 'webhook-queue',
        pending: Math.floor(Math.random() * 100),
        active: Math.floor(Math.random() * 10),
        completed: Math.floor(Math.random() * 2000) + 1000,
        failed: Math.floor(Math.random() * 20),
        delayed: Math.floor(Math.random() * 30),
        paused: false,
      },
    ];
  }

  /**
   * Get scheduled job statuses
   */
  async getJobStatuses(): Promise<JobStatus[]> {
    return [
      {
        id: 'scheduled-calls-checker',
        name: 'Scheduled Calls Checker',
        status: 'running',
        lastRun: new Date(Date.now() - 60000),
        nextRun: new Date(Date.now() + 60000),
        successCount: 1440,
        failureCount: 2,
      },
      {
        id: 'ad-insights-sync',
        name: 'Ad Insights Sync',
        status: 'running',
        lastRun: new Date(Date.now() - 4 * 60 * 60000),
        nextRun: new Date(Date.now() + 4 * 60 * 60000),
        successCount: 180,
        failureCount: 1,
      },
      {
        id: 'ai-followup-checker',
        name: 'AI Follow-up Checker',
        status: 'running',
        lastRun: new Date(Date.now() - 5 * 60000),
        nextRun: new Date(Date.now() + 5 * 60000),
        successCount: 288,
        failureCount: 0,
      },
      {
        id: 'assignment-schedule-checker',
        name: 'Assignment Schedule Checker',
        status: 'running',
        lastRun: new Date(Date.now() - 5 * 60000),
        nextRun: new Date(Date.now() + 5 * 60000),
        successCount: 288,
        failureCount: 0,
      },
      {
        id: 'apify-scheduler',
        name: 'Apify Scraper Scheduler',
        status: 'running',
        lastRun: new Date(Date.now() - 60000),
        nextRun: new Date(Date.now() + 60000),
        successCount: 1440,
        failureCount: 5,
      },
    ];
  }

  /**
   * Get rate limit configurations
   */
  async getRateLimitConfigs(): Promise<RateLimitConfig[]> {
    return [
      {
        endpoint: '/api/auth/login',
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
        enabled: true,
      },
      {
        endpoint: '/api/auth/register',
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
        enabled: true,
      },
      {
        endpoint: '/api/auth/forgot-password',
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
        enabled: true,
      },
      {
        endpoint: '/api/*',
        windowMs: 60 * 1000,
        maxRequests: 100,
        enabled: true,
      },
      {
        endpoint: '/api/public/*',
        windowMs: 60 * 1000,
        maxRequests: 60,
        enabled: true,
      },
    ];
  }

  /**
   * Update rate limit config
   */
  async updateRateLimitConfig(
    endpoint: string,
    config: Partial<RateLimitConfig>
  ): Promise<RateLimitConfig> {
    // In production, would update actual rate limiter config
    // For now, return merged config
    return {
      endpoint,
      windowMs: config.windowMs || 60000,
      maxRequests: config.maxRequests || 100,
      enabled: config.enabled !== false,
    };
  }

  /**
   * Enable/disable maintenance mode
   * This now uses the global middleware state to actually block requests
   */
  async setMaintenanceMode(enabled: boolean, message?: string, startedBy?: string): Promise<void> {
    this.maintenanceMode = enabled;
    this.maintenanceMessage = message || 'System is under maintenance. Please try again later.';

    // Set global maintenance mode (this actually blocks requests via middleware)
    setGlobalMaintenanceMode(enabled, message, startedBy);

    // Log the change
    console.log(`[System] Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}${message ? `: ${message}` : ''}`);
  }

  /**
   * Check if maintenance mode is active
   */
  isMaintenanceModeActive(): { active: boolean; message: string; startedAt: Date | null; startedBy: string | null } {
    const globalState = getGlobalMaintenanceMode();
    return {
      active: globalState.active,
      message: globalState.message,
      startedAt: globalState.startedAt,
      startedBy: globalState.startedBy,
    };
  }

  /**
   * Schedule maintenance window
   */
  async scheduleMaintenanceWindow(
    window: Omit<MaintenanceWindow, 'id' | 'status'>
  ): Promise<MaintenanceWindow> {
    const newWindow: MaintenanceWindow = {
      ...window,
      id: `maint_${Date.now()}`,
      status: 'scheduled',
    };

    this.scheduledMaintenanceWindows.push(newWindow);

    // In production, would also send notifications to tenants
    console.log(`[System] Maintenance window scheduled: ${window.title}`);

    return newWindow;
  }

  /**
   * Get scheduled maintenance windows
   */
  async getMaintenanceWindows(): Promise<MaintenanceWindow[]> {
    return this.scheduledMaintenanceWindows.filter(
      (w) => w.status === 'scheduled' || w.status === 'in_progress'
    );
  }

  /**
   * Cancel maintenance window
   */
  async cancelMaintenanceWindow(windowId: string): Promise<void> {
    const window = this.scheduledMaintenanceWindows.find((w) => w.id === windowId);
    if (window) {
      window.status = 'cancelled';
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const processMemory = process.memoryUsage();

    return {
      cpu: {
        usage: Math.round(cpuUsage * 100) / 100,
        cores: os.cpus().length,
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      processMemory: {
        heapUsed: processMemory.heapUsed,
        heapTotal: processMemory.heapTotal,
        external: processMemory.external,
        rss: processMemory.rss,
      },
    };
  }

  /**
   * Get system overview
   */
  async getSystemOverview(): Promise<{
    status: 'operational' | 'degraded' | 'outage';
    database: 'healthy' | 'degraded' | 'down';
    queues: 'healthy' | 'degraded' | 'down';
    api: 'healthy' | 'degraded' | 'down';
    maintenanceMode: boolean;
    uptime: string;
    lastDeployment: Date | null;
  }> {
    const dbHealth = await this.getDatabaseHealth();
    const queues = await this.getQueueStatuses();
    const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0);
    const queueStatus = totalFailed > 50 ? 'degraded' : totalFailed > 100 ? 'down' : 'healthy';

    const overallStatus =
      dbHealth.status === 'down' || queueStatus === 'down'
        ? 'outage'
        : dbHealth.status === 'degraded' || queueStatus === 'degraded'
        ? 'degraded'
        : 'operational';

    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    return {
      status: overallStatus,
      database: dbHealth.status,
      queues: queueStatus,
      api: 'healthy',
      maintenanceMode: this.maintenanceMode,
      uptime: `${days}d ${hours}h ${minutes}m`,
      lastDeployment: null, // Would track from CI/CD
    };
  }

  /**
   * Clear queue (admin action)
   */
  async clearQueue(queueName: string): Promise<void> {
    // In production, would connect to actual queue and clear it
    console.log(`[System] Queue cleared: ${queueName}`);
  }

  /**
   * Retry failed jobs in queue
   */
  async retryFailedJobs(queueName: string): Promise<number> {
    // In production, would retry actual failed jobs
    console.log(`[System] Retrying failed jobs in queue: ${queueName}`);
    return Math.floor(Math.random() * 10);
  }

  /**
   * Pause/resume a job
   */
  async setJobStatus(jobId: string, status: 'running' | 'paused'): Promise<void> {
    // In production, would actually pause/resume the job
    console.log(`[System] Job ${jobId} status set to: ${status}`);
  }

  /**
   * Get error logs
   */
  async getErrorLogs(
    hours: number = 24,
    limit: number = 100
  ): Promise<Array<{
    timestamp: Date;
    level: string;
    message: string;
    stack?: string;
    context?: Record<string, any>;
  }>> {
    // In production, would read from actual error logging system
    // For now, return empty array
    return [];
  }

  /**
   * Trigger manual backup
   */
  async triggerBackup(): Promise<{ status: string; backupId: string }> {
    const backupId = `backup_${Date.now()}`;
    // In production, would trigger actual backup
    console.log(`[System] Manual backup triggered: ${backupId}`);

    return {
      status: 'initiated',
      backupId,
    };
  }
}

export const platformSystemService = new PlatformSystemService();
