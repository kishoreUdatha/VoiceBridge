/**
 * Specialized Agents Service - Orchestration Layer
 *
 * This file re-exports specialized agent services for backward compatibility.
 * Each service follows Single Responsibility Principle:
 *
 * - salesAgentService: Sales conversation handling
 * - appointmentAgentService: Appointment booking
 * - paymentAgentService: Payment collection
 * - supportAgentService: Customer support
 * - followUpAgentService: Lead nurturing
 * - surveyAgentService: Feedback collection
 * - agentOrchestratorService: Routes to appropriate agent
 */

// Re-export types
export * from './specialized-agent.types';

// Re-export all specialized agent services
export { salesAgentService } from './sales-agent.service';
export { appointmentAgentService } from './appointment-agent.service';
export { paymentAgentService } from './payment-agent.service';
export { supportAgentService } from './support-agent.service';
export { followUpAgentService } from './followup-agent.service';
export { surveyAgentService } from './survey-agent.service';
export { agentOrchestratorService, agentOrchestratorService as agentOrchestrator } from './agent-orchestrator.service';

// Re-export class-based services for backward compatibility
import { salesAgentService } from './sales-agent.service';
import { appointmentAgentService } from './appointment-agent.service';
import { paymentAgentService } from './payment-agent.service';
import { supportAgentService } from './support-agent.service';
import { followUpAgentService } from './followup-agent.service';
import { surveyAgentService } from './survey-agent.service';
import { agentOrchestratorService } from './agent-orchestrator.service';

// Backward compatible class exports
export class SalesAgentService {
  handleConversation = salesAgentService.handleConversation;
  generateQuote = salesAgentService.generateQuote;
}

export class AppointmentAgentService {
  handleConversation = appointmentAgentService.handleConversation;
  getAvailableSlots = appointmentAgentService.getAvailableSlots;
  bookAppointment = appointmentAgentService.bookAppointment;
  sendReminders = appointmentAgentService.sendReminders;
}

export class PaymentAgentService {
  handleConversation = paymentAgentService.handleConversation;
  getPendingPayments = paymentAgentService.getPendingPayments;
  generatePaymentLink = paymentAgentService.generatePaymentLink;
  sendPaymentReminder = paymentAgentService.sendPaymentReminder;
}

export class SupportAgentService {
  handleConversation = supportAgentService.handleConversation;
  createTicket = supportAgentService.createTicket;
}

export class FollowUpAgentService {
  handleConversation = followUpAgentService.handleConversation;
  executeFollowUpSequence = followUpAgentService.executeFollowUpSequence;
}

export class SurveyAgentService {
  handleConversation = surveyAgentService.handleConversation;
  sendSurveyRequest = surveyAgentService.sendSurveyRequest;
}

export class AgentOrchestrator {
  handleConversation = agentOrchestratorService.handleConversation;
  handoffConversation = agentOrchestratorService.handoffConversation;
}

// Default export for convenience
export default {
  salesAgentService,
  appointmentAgentService,
  paymentAgentService,
  supportAgentService,
  followUpAgentService,
  surveyAgentService,
  agentOrchestratorService,
};
