import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import leadRoutes from './lead.routes';
import formRoutes from './form.routes';
import landingRoutes from './landing.routes';
import campaignRoutes from './campaign.routes';
import chatbotRoutes from './chatbot.routes';
import paymentRoutes from './payment.routes';
import adRoutes from './ad.routes';
import plivoRoutes from './plivo.routes';
import voiceAIRoutes from './voice-ai.routes';
import voiceTemplateRoutes from './voice-template.routes';
import callFlowRoutes from './call-flow.routes';
import specializedAgentsRoutes from './specialized-agents.routes';
import outboundCallRoutes from './outbound-call.routes';
import advancedFeaturesRoutes from './advanced-features.routes';
import uploadRoutes from './upload.routes';
import emailTrackingRoutes from './email-tracking.routes';
import telecallerQueueRoutes from './telecallerQueue.routes';
import autoAssignRoutes from './autoAssign.routes';
import subscriptionRoutes from './subscription.routes';
import walletRoutes from './wallet.routes';
import promoCodeRoutes from './promo-code.routes';
import leadDetailsRoutes from './leadDetails.routes';
import hybridAgentRoutes from './hybrid-agent.routes';
import indiaCallingRoutes from './india-calling.routes';
import realtimeVoiceRoutes from './realtime-voice.routes';
import exotelRoutes from './exotel.routes';
import softphoneRoutes from './softphone.routes';
import telephonyRoutes from './telephony.routes';
import unifiedVoiceRoutes from './telephony/voice.routes';
import superAdminRoutes from './super-admin.routes';
import whiteLabelRoutes from './white-label.routes';
import emailSettingsRoutes from './email-settings.routes';
import partnerRoutes from './partner.routes';
import marketplaceRoutes from './marketplace.routes';
import publicApiRoutes from './public-api.routes';
import apiKeysRoutes from './api-keys.routes';
import webhooksRoutes from './webhooks.routes';
import templatesRoutes from './templates.routes';
import scheduledMessagesRoutes from './scheduled-messages.routes';
import contactListsRoutes from './contact-lists.routes';
import conversationRoutes from './conversation.routes';
import messageStatusCallbackRoutes from './message-status-callback.routes';
import auditLogsRoutes from './audit-logs.routes';
import analyticsRoutes from './analytics.routes';
import trackingRoutes from './tracking.routes';
import adInsightsRoutes from './ad-insights.routes';
import organizationRoutes from './organization.routes';
import organizationIntegrationsRoutes from './organization-integrations.routes';
import rawImportRoutes from './rawImport.routes';
import assignmentScheduleRoutes from './assignmentSchedule.routes';
import telecallerRoutes from './telecaller.routes';
import phoneNumberRoutes from './phone-number.routes';
import numbersShopRoutes from './numbers-shop.routes';
import ivrRoutes from './ivr.routes';
import callQueueRoutes from './call-queue.routes';
import voicemailRoutes from './voicemail.routes';
import callbackRoutes from './callback.routes';
import inboundAnalyticsRoutes from './inbound-analytics.routes';
import monitoringRoutes from './monitoring.routes';
import voiceMinutesRoutes from './voice-minutes.routes';
import calendarRoutes from './calendar.routes';
import notificationChannelRoutes from './notification-channel.routes';
import emailSequenceRoutes from './email-sequence.routes';
import crmIntegrationRoutes from './crm-integration.routes';
import integrationRoutes from './integration.routes';
import instagramIntegrationRoutes from './instagram-integration.routes';
import facebookIntegrationRoutes from './facebook-integration.routes';
import linkedinIntegrationRoutes from './linkedin-integration.routes';
import googleAdsIntegrationRoutes from './google-ads-integration.routes';
import youtubeIntegrationRoutes from './youtube-integration.routes';
import twitterIntegrationRoutes from './twitter-integration.routes';
import tiktokIntegrationRoutes from './tiktok-integration.routes';
import apifyIntegrationRoutes from './apify-integration.routes';
import justDialIntegrationRoutes from './justdial-integration.routes';
import indiaMartIntegrationRoutes from './indiamart-integration.routes';
import realEstateIntegrationRoutes from './realestate-integration.routes';
import sulekhaIntegrationRoutes from './sulekha-integration.routes';
import tawkToIntegrationRoutes from './tawkto-integration.routes';
import zapierIntegrationRoutes from './zapier-integration.routes';
import scheduledCallsRoutes from './scheduled-calls.routes';
import healthRoutes from './health.routes';
import complianceRoutes from './compliance.routes';
import leadScoringRoutes from './lead-scoring.routes';
import aiLeadScoringRoutes from './ai-lead-scoring.routes';
import liveChatRoutes from './live-chat.routes';
import quotationRoutes from './quotation.routes';
import callAnalyticsRoutes from './call-analytics.routes';
import telecallerAnalyticsRoutes from './telecaller-analytics.routes';
import otpRoutes from './otp.routes';
import leadLifecycleRoutes from './lead-lifecycle.routes';
import conversationalAIAgentRoutes from './conversational-ai-agent.routes';
import ragRoutes from './rag.routes';
import agentAnalyticsRoutes from './agent-analytics.routes';
import messagingRoutes from './messaging.routes';
import whatsappRoutes from './whatsapp.routes';
import notificationDeviceRoutes from './notification-device.routes';
import smsRoutes from './sms.routes';
import emailRoutes from './email.routes';
import messagingWebhooksRoutes from './messaging-webhooks.routes';
import fieldSalesRoutes from './fieldSales';
import userManagementRoutes from './user-management.routes';
import branchRoutes from './branch.routes';
import roleRoutes from './role.routes';
import leadStageRoutes from './lead-stage.routes';
import industryCustomFieldsRoutes from './industry-custom-fields.routes';
import industryManagementRoutes from './admin/industry-management.routes';
import customFieldsRoutes from './custom-fields.routes';
import paymentCategoriesRoutes from './payment-categories.routes';
import leadDeduplicationRoutes from './lead-deduplication.routes';
import leadRoutingRoutes from './lead-routing.routes';
import leadTagsRoutes from './lead-tags.routes';
import leadWorkflowRoutes from './lead-workflow.routes';
import leadViewsRoutes from './lead-views.routes';
import leadSlaRoutes from './lead-sla.routes';
import leadSourceRoutes from './lead-source.routes';
import leadReportsRoutes from './lead-reports.routes';
import followUpReportsRoutes from './followup-reports.routes';
import taskReportsRoutes from './task-reports.routes';
import dealReportsRoutes from './deal-reports.routes';
import businessTrendsRoutes from './business-trends.routes';
import userTrendsRoutes from './user-trends.routes';
import messageActivityReportsRoutes from './message-activity-reports.routes';
import callReportsRoutes from './call-reports.routes';
import paymentReportsRoutes from './payment-reports.routes';
import admissionReportsRoutes from './admission-reports.routes';
import userPerformanceReportsRoutes from './user-performance-reports.routes';
import aiUsageReportsRoutes from './ai-usage-reports.routes';
import campaignReportsRoutes from './campaign-reports.routes';
import auditReportsRoutes from './audit-reports.routes';
import followUpConfigRoutes from './follow-up-config.routes';
import universityRoutes from './university.routes';
import studentVisitRoutes from './student-visit.routes';
import admissionRoutes from './admission.routes';
import scholarshipRoutes from './scholarship.routes';
import courseRoutes from './course.routes';
import businessExpenseRoutes from './business-expense.routes';
import profitRoutes from './profit.routes';
import teamMessagingRoutes from './team-messaging.routes';
import performanceTargetsRoutes from './performance-targets.routes';
import approvalWorkflowRoutes from './approval-workflow.routes';
import teamManagementRoutes from './team-management.routes';
import qaRoutes from './qa.routes';
import fieldPermissionsRoutes from './field-permissions.routes';
import salesForecastingRoutes from './sales-forecasting.routes';
import collaborationRoutes from './collaboration.routes';
import commissionRoutes from './commission.routes';
import commissionConfigRoutes from './commission-config.routes';
import unifiedInboxRoutes from './unified-inbox.routes';
import predictiveAnalyticsRoutes from './predictive-analytics.routes';
import customerHealthRoutes from './customer-health.routes';
import customerSegmentationRoutes from './customer-segmentation.routes';
import sentimentAnalysisRoutes from './sentiment-analysis.routes';
import dealIntelligenceRoutes from './deal-intelligence.routes';
import reportBuilderRoutes from './report-builder.routes';
import workflowAutomationRoutes from './workflow-automation.routes';
import pipelineKanbanRoutes from './pipeline-kanban.routes';
import batchOperationsRoutes from './batch-operations.routes';
import realtimeAlertsRoutes from './realtime-alerts.routes';

// Enterprise CRM Features
import territoryRoutes from './territory.routes';
import accountRoutes from './account.routes';
import dataEnrichmentRoutes from './data-enrichment.routes';
import serviceTicketRoutes from './service-ticket.routes';
import videoMeetingRoutes from './video-meeting.routes';
import abmRoutes from './abm.routes';
import customerPortalRoutes from './customer-portal.routes';
import contractRoutes from './contract.routes';
import customerJourneyRoutes from './customer-journey.routes';
import salesPlaybookRoutes from './sales-playbook.routes';
import gamificationRoutes from './gamification.routes';
import socialCrmRoutes from './social-crm.routes';
import exportBiRoutes from './export-bi.routes';
import teamMonitoringRoutes from './team-monitoring.routes';
import industryTemplateRoutes from './industry-template.routes';
import tenantConfigRoutes from './tenant-config.routes';
import permissionRoutes from './permission.routes';
import pipelineRoutes from './pipeline.routes';
import dynamicFieldsRoutes from './dynamic-fields.routes';
import leadPipelineRoutes from './lead-pipeline.routes';

// Comprehensive Settings System
import userPreferencesRoutes from './user-preferences.routes';
import columnVisibilityRoutes from './column-visibility.routes';
import retrySettingsRoutes from './retry-settings.routes';
import leadPrioritySettingsRoutes from './lead-priority-settings.routes';
import autoReportsRoutes from './auto-reports.routes';
import notificationPreferencesRoutes from './notification-preferences.routes';
import workSessionRoutes from './work-session.routes';
import brandingRoutes from './branding.routes';

const router = Router();

// Health check endpoints (comprehensive)
router.use('/health', healthRoutes);

// Public branding endpoint (no auth required)
router.use('/branding', brandingRoutes);

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user-management', userManagementRoutes);
router.use('/leads', leadRoutes);
router.use('/forms', formRoutes);
router.use('/landing-pages', landingRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/payments', paymentRoutes);
router.use('/ads', adRoutes);
router.use('/plivo', plivoRoutes);
router.use('/voice-ai', voiceAIRoutes);
router.use('/voice-ai', ragRoutes); // RAG endpoints under /voice-ai/agents/:agentId/rag/*
router.use('/voice-ai', agentAnalyticsRoutes); // Analytics endpoints under /voice-ai/agents/:agentId/analytics
router.use('/voice-templates', voiceTemplateRoutes);
router.use('/call-flows', callFlowRoutes);
router.use('/agents', specializedAgentsRoutes);
router.use('/outbound-calls', outboundCallRoutes);
router.use('/advanced', advancedFeaturesRoutes);
router.use('/uploads', uploadRoutes);
router.use('/email-tracking', emailTrackingRoutes);
router.use('/telecaller-queue', telecallerQueueRoutes);
router.use('/auto-assign', autoAssignRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/wallet', walletRoutes);
router.use('/promo-codes', promoCodeRoutes);
router.use('/lead-details', leadDetailsRoutes);
router.use('/hybrid-agent', hybridAgentRoutes);
router.use('/india-calling', indiaCallingRoutes);
router.use('/realtime-voice', realtimeVoiceRoutes);
router.use('/exotel', exotelRoutes);
router.use('/softphone', softphoneRoutes);
router.use('/telephony', telephonyRoutes);
router.use('/telephony/voice', unifiedVoiceRoutes); // Unified voice routes for AI calls
router.use('/super-admin', superAdminRoutes);
router.use('/white-label', whiteLabelRoutes);
router.use('/email-settings', emailSettingsRoutes);
router.use('/partner', partnerRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/templates', templatesRoutes);
router.use('/scheduled-messages', scheduledMessagesRoutes);
router.use('/contact-lists', contactListsRoutes);
router.use('/conversations', conversationRoutes);
router.use('/message-status', messageStatusCallbackRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/tracking', trackingRoutes);
router.use('/ad-insights', adInsightsRoutes);
router.use('/organization', organizationRoutes);
router.use('/organization/integrations', organizationIntegrationsRoutes);
router.use('/raw-imports', rawImportRoutes);
router.use('/assignment-schedules', assignmentScheduleRoutes);
router.use('/telecaller', telecallerRoutes);
router.use('/messaging', messagingRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/sms', smsRoutes);
router.use('/email', emailRoutes);
router.use('/messaging-webhooks', messagingWebhooksRoutes);
router.use('/phone-numbers', phoneNumberRoutes);
router.use('/numbers-shop', numbersShopRoutes);

// Inbound Call Features
router.use('/ivr', ivrRoutes);
router.use('/call-queues', callQueueRoutes);
router.use('/voicemail', voicemailRoutes);
router.use('/callbacks', callbackRoutes);
router.use('/inbound-analytics', inboundAnalyticsRoutes);
router.use('/monitoring', monitoringRoutes);

// Voice Minutes Management
router.use('/voice-minutes', voiceMinutesRoutes);

// Integration Settings
router.use('/calendar', calendarRoutes);
router.use('/notification-channels', notificationChannelRoutes);
router.use('/notifications', notificationDeviceRoutes);
router.use('/email-sequences', emailSequenceRoutes);
router.use('/crm-integrations', crmIntegrationRoutes);

// Indian Lead Source Integrations (MUST be before /integrations to avoid auth conflict)
router.use('/integrations/justdial', justDialIntegrationRoutes);
router.use('/integrations/indiamart', indiaMartIntegrationRoutes);
router.use('/integrations/realestate', realEstateIntegrationRoutes);
router.use('/integrations/sulekha', sulekhaIntegrationRoutes);
router.use('/integrations/tawkto', tawkToIntegrationRoutes);
router.use('/integrations/zapier', zapierIntegrationRoutes);

// General integrations (has global auth middleware)
router.use('/integrations', integrationRoutes);

// Social Media Ad Integrations
router.use('/instagram', instagramIntegrationRoutes);
router.use('/facebook', facebookIntegrationRoutes);
router.use('/linkedin', linkedinIntegrationRoutes);
router.use('/google-ads', googleAdsIntegrationRoutes);
router.use('/youtube', youtubeIntegrationRoutes);
router.use('/twitter', twitterIntegrationRoutes);
router.use('/tiktok', tiktokIntegrationRoutes);
router.use('/apify', apifyIntegrationRoutes);

// Scheduled Calls & Reminders
router.use('/scheduled-calls', scheduledCallsRoutes);

// Compliance & Analytics
router.use('/compliance', complianceRoutes);
router.use('/lead-scoring', leadScoringRoutes);
router.use('/ai-scoring', aiLeadScoringRoutes);
router.use('/live-chat', liveChatRoutes);
router.use('/quotations', quotationRoutes);
router.use('/call-analytics', callAnalyticsRoutes);
router.use('/telecaller-analytics', telecallerAnalyticsRoutes);

// Lead Lifecycle Management
router.use('/lead-lifecycle', leadLifecycleRoutes);

// ElevenLabs Conversational AI
router.use('/conversational-ai', conversationalAIAgentRoutes);

// OTP Verification
router.use('/otp', otpRoutes);

// Field Sales Management
router.use('/field-sales', fieldSalesRoutes);

// Branch Management (Multi-branch support)
router.use('/branches', branchRoutes);

// Role Management
router.use('/roles', roleRoutes);

// Lead Stage Management (Industry-specific)
router.use('/lead-stages', leadStageRoutes);

// Lead Source Management (Custom sources)
router.use('/lead-sources', leadSourceRoutes);

// Lead Reports (Tenant-scoped)
router.use('/lead-reports', leadReportsRoutes);

// Follow-up Reports (Tenant-scoped)
router.use('/followup-reports', followUpReportsRoutes);

// Task Reports (Tenant-scoped)
router.use('/task-reports', taskReportsRoutes);

// Deal Reports (Tenant-scoped)
router.use('/deal-reports', dealReportsRoutes);

// Business Trends (Tenant-scoped)
router.use('/business-trends', businessTrendsRoutes);

// User Trends (Tenant-scoped)
router.use('/user-trends', userTrendsRoutes);

// Message Activity Reports (Tenant-scoped)
router.use('/message-activity-reports', messageActivityReportsRoutes);

// Call Reports (Tenant-scoped)
router.use('/call-reports', callReportsRoutes);

// Payment Reports (Tenant-scoped)
router.use('/payment-reports', paymentReportsRoutes);

// Admission Reports (Tenant-scoped)
router.use('/admission-reports', admissionReportsRoutes);

// User Performance Reports (Tenant-scoped)
router.use('/user-performance-reports', userPerformanceReportsRoutes);

// Work Session Management (Login/Logout, Breaks)
router.use('/work-sessions', workSessionRoutes);

// AI Usage Reports (Tenant-scoped)
router.use('/ai-usage-reports', aiUsageReportsRoutes);

// Campaign/Source Reports (Tenant-scoped)
router.use('/campaign-reports', campaignReportsRoutes);

// Audit Reports (Tenant-scoped)
router.use('/audit-reports', auditReportsRoutes);

// Follow-up Configuration
router.use('/follow-up-config', followUpConfigRoutes);

// Industry Custom Fields
router.use('/industry-fields', industryCustomFieldsRoutes);

// Admin Industry Management (Dynamic Industries)
router.use('/admin/industries', industryManagementRoutes);

// Custom Fields (Organization-specific)
router.use('/custom-fields', customFieldsRoutes);

// Payment Categories (Organization-specific)
router.use('/payment-categories', paymentCategoriesRoutes);

// Lead Management Features
router.use('/lead-deduplication', leadDeduplicationRoutes);
router.use('/lead-routing', leadRoutingRoutes);
router.use('/lead-tags', leadTagsRoutes);
router.use('/lead-workflows', leadWorkflowRoutes);
router.use('/lead-views', leadViewsRoutes);
router.use('/lead-sla', leadSlaRoutes);

// Approval Workflows (Multi-level approvals for payments, admissions, etc.)
router.use('/approvals', approvalWorkflowRoutes);

// Education Admission Management
router.use('/universities', universityRoutes);
router.use('/student-visits', studentVisitRoutes);
router.use('/admissions', admissionRoutes);
router.use('/scholarships', scholarshipRoutes);
router.use('/courses', courseRoutes);
router.use('/expenses', businessExpenseRoutes);
router.use('/profit', profitRoutes);

// Team Communication & Performance
router.use('/team-messaging', teamMessagingRoutes);
router.use('/team-management', teamManagementRoutes);
router.use('/team-monitoring', teamMonitoringRoutes);
router.use('/performance', performanceTargetsRoutes);

// Quality Assurance
router.use('/qa', qaRoutes);

// Field-Level Permissions
router.use('/field-permissions', fieldPermissionsRoutes);

// Sales Forecasting
router.use('/sales-forecasting', salesForecastingRoutes);

// Team Collaboration
router.use('/collaboration', collaborationRoutes);

// Commission Tracking
router.use('/commissions', commissionRoutes);
router.use('/commission-config', commissionConfigRoutes);

// Unified Inbox (Multi-channel)
router.use('/unified-inbox', unifiedInboxRoutes);

// Advanced Analytics & Intelligence
router.use('/predictive-analytics', predictiveAnalyticsRoutes);
router.use('/customer-health', customerHealthRoutes);
router.use('/customer-segmentation', customerSegmentationRoutes);
router.use('/sentiment-analysis', sentimentAnalysisRoutes);
router.use('/deal-intelligence', dealIntelligenceRoutes);

// High-Priority CRM Features
router.use('/reports', reportBuilderRoutes);
router.use('/workflows', workflowAutomationRoutes);
router.use('/pipeline', pipelineKanbanRoutes);
router.use('/batch-operations', batchOperationsRoutes);
router.use('/alerts', realtimeAlertsRoutes);

// Enterprise CRM Features
router.use('/territories', territoryRoutes);
router.use('/accounts', accountRoutes);
router.use('/data-enrichment', dataEnrichmentRoutes);
router.use('/tickets', serviceTicketRoutes);
router.use('/video-meetings', videoMeetingRoutes);
router.use('/abm', abmRoutes);
router.use('/portal', customerPortalRoutes);
router.use('/contracts', contractRoutes);
router.use('/journeys', customerJourneyRoutes);
router.use('/playbooks', salesPlaybookRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/social', socialCrmRoutes);
router.use('/export-bi', exportBiRoutes);

// Universal CRM - Industry Templates & Configuration
router.use('/industry-templates', industryTemplateRoutes);
router.use('/tenant-config', tenantConfigRoutes);

// Enhanced Architecture - Permissions, Pipelines, Dynamic Fields
router.use('/permissions', permissionRoutes);
router.use('/pipelines', pipelineRoutes);
router.use('/dynamic-fields', dynamicFieldsRoutes);

// Unified Lead Pipeline System (connects leads to pipeline stages)
router.use('/lead-pipeline', leadPipelineRoutes);

// Comprehensive Settings System
router.use('/settings', userPreferencesRoutes);
router.use('/settings', columnVisibilityRoutes);
router.use('/settings', retrySettingsRoutes);
router.use('/settings', leadPrioritySettingsRoutes);
router.use('/settings', autoReportsRoutes);
router.use('/settings', notificationPreferencesRoutes);

// Public API (versioned) - for external integrations
router.use('/v1', publicApiRoutes);

export default router;
