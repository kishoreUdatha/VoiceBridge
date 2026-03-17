/**
 * Advanced Features Service - Orchestration Layer
 *
 * This file re-exports specialized services for backward compatibility.
 * Each service follows Single Responsibility Principle:
 *
 * - leadScoringService: Lead scoring and prioritization
 * - callSchedulingService: Scheduled call management
 * - dncListService: Do Not Call list management
 * - autoFollowUpService: Automatic follow-up rules and execution
 * - appointmentService: Appointment booking and management
 * - analyticsService: Analytics aggregation and reporting
 * - callEventService: Real-time call event logging
 *
 * Note: webhookService is defined in webhook.service.ts
 */

// Re-export all specialized services
export { leadScoringService } from './lead-scoring.service';
export { callSchedulingService } from './call-scheduling.service';
export { dncListService } from './dnc-list.service';
export { autoFollowUpService } from './auto-followup.service';
export { appointmentService } from './appointment.service';
export { analyticsAggregationService as analyticsService } from './analytics-aggregation.service';
export { callEventService } from './call-event.service';

// Re-export webhook service from its dedicated file
export { webhookService } from './webhook.service';

// Default export for convenience
import { leadScoringService } from './lead-scoring.service';
import { callSchedulingService } from './call-scheduling.service';
import { dncListService } from './dnc-list.service';
import { autoFollowUpService } from './auto-followup.service';
import { appointmentService } from './appointment.service';
import { analyticsAggregationService } from './analytics-aggregation.service';
import { callEventService } from './call-event.service';

export default {
  leadScoringService,
  callSchedulingService,
  dncListService,
  autoFollowUpService,
  appointmentService,
  analyticsService: analyticsAggregationService,
  callEventService,
};
