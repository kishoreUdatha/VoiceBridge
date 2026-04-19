import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { fetchCurrentUser } from './store/slices/authSlice';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import LeadsListPage from './pages/leads/LeadsListPage';
import LeadDetailPage from './pages/leads/LeadDetailPage';
import BulkUploadPage from './pages/leads/BulkUploadPage';
import CreateLeadPage from './pages/leads/CreateLeadPage';
import UsersListPage from './pages/users/UsersListPage';
import FormBuilderPage from './pages/forms/FormBuilderPage';
import LandingPagesPage from './pages/landing/LandingPagesPage';
import LandingPageBuilderPage from './pages/landing/LandingPageBuilderPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import CampaignDetailPage from './pages/campaigns/CampaignDetailPage';
import { VoiceAgentsPage, CreateAgentPage, CreateAgentFromTemplatePage, NewAgentSelectionPage } from './pages/voice-ai';
import { ConversationalAIAgentWizard } from './pages/voice-ai/ConversationalAIAgentWizard';
import { ConversationalAIAgentDetail } from './pages/voice-ai/ConversationalAIAgentDetail';
import { VoiceTemplatesPage, EditTemplatePage } from './pages/voice-templates';
import CallFlowsPage from './pages/call-flows/CallFlowsPage';
import CallFlowBuilderPage from './pages/call-flows/CallFlowBuilderPage';
import {
  OutboundCallsPage,
  CallDetailsPage,
  MakeSingleCallPage,
  CreateCampaignPage,
  CampaignDetailsPage,
  ManualCallQueuePage,
  CampaignAnalytics,
} from './pages/outbound-calls';
import { CallSummaryPage } from './pages/call-summary';
import {
  AdvancedDashboardPage,
  ScheduledCallsPage,
  DNCListPage,
  FollowUpRulesPage,
  AppointmentsPage,
  WebhooksPage,
  RealTimeDashboardPage,
  LeadScoringPage,
} from './pages/advanced';
import { TelecallerQueuePage } from './pages/telecaller-queue';
import { AssignedDataPage } from './pages/assigned-data';
import QualifiedLeadsPage from './pages/qualified-leads/QualifiedLeadsPage';
import {
  TelecallerDashboard,
  TelecallerCallPage,
  TelecallerCallHistory,
  AdminTelecallerCallHistory,
} from './pages/telecaller-app';
import {
  TransferConfigPage,
  HybridInboxPage,
  InboundCallsPage,
} from './pages/hybrid-agent';
import {
  AutoAssignSettingsPage, AssignmentSchedulePage, SmsSettingsPage, InstitutionSettingsPage,
  WhatsAppSettingsPage, VoiceMinutesPage, NotificationChannelsPage, CalendarSettingsPage,
  EmailSequencesPage, CRMIntegrationPage, PostCallMessagingPage, IntegrationCredentialsPage,
  FieldPermissionsPage, LeadSourcesSettingsPage, FollowUpConfigPage, CustomFieldsConfigPage,
  EmailTemplateBuilderPage, WhatsAppTemplateBuilderPage, AIScriptBuilderPage, WorkflowConfigPage,
  PaymentCategoriesPage, IndustryTemplatesPage, TenantLabelConfigPage, PipelineSettingsPage, TagManagementPage,
  // New Settings Pages
  SettingsPage, ProfileSettingsPage, PreferencesPage, AccessibilityPage,
  AutomaticReportsPage, ManageColumnsPage, RetrySettingsPage, LeadPriorityPage,
  CustomContactPropertyPage, NotificationPreferencesPage, RolesPermissionsPage
} from './pages/settings';
import BranchesPage from './pages/settings/BranchesPage';
import BranchFormPage from './pages/settings/BranchFormPage';
import BrandingSettingsPage from './pages/settings/BrandingSettingsPage';
import IntegrationSettingsPage from './pages/settings/IntegrationSettingsPage';
import EmailSettingsPage from './pages/settings/EmailSettingsPage';
import RazorpaySettingsPage from './pages/settings/RazorpaySettingsPage';
import IndustrySettingsPage from './pages/settings/IndustrySettingsPage';
import LeadManagementSettingsPage from './pages/settings/LeadManagementSettingsPage';
import {
  ReportsPage,
  ReportsListingPage,
  PaymentReportsPage,
  AdmissionReportsPage,
  UserPerformanceReportsPage,
  AIUsageReportsPage,
  CampaignReportsPage,
  AuditReportsPage,
  // User Reports (10)
  UserReportPage,
  UserActivityReportPage,
  LeadDispositionReportPage,
  UserStageReportPage,
  UserCallReportPage,
  FollowUpReportPage,
  LoginReportPage,
  MessageActivityReportPage,
  UserDealReportPage,
  UserTaskReportPage,
  // Campaign Reports (5)
  CampaignReportPage,
  CampaignLeadReportPage,
  CampaignStageReportPage,
  CampaignDealReportPage,
  CampaignSourceReportPage,
  // Pipeline Reports
  DealVelocityReportPage,
  // Business Trends
  BusinessTrendsPage,
  // User Trends
  UserTrendsPage,
  // Call Analysis Reports
  FailureAnalysisReportPage,
} from './pages/reports';
import { RolesListPage } from './pages/roles';
import { SocialMediaAdsPage, InstagramLeadSetupPage, AdIntegrationsPage, FacebookSetupPage, LinkedInSetupPage, GoogleAdsSetupPage, YouTubeSetupPage, TwitterSetupPage, TikTokSetupPage, WebhookUrlsPage } from './pages/ads';
import { ApifyDashboardPage, ApifyJobsPage, ApifySmartScrapePage, ApifyRecordsPage, ApifySetupPage } from './pages/apify';
import { PricingPage } from './pages/pricing';
import { CheckoutPage, SubscriptionManagementPage, SuccessPage } from './pages/subscription';
import { RealtimeVoiceDemo } from './components/RealtimeVoiceWidget';
import LandingPage from './pages/LandingPage';
import RealtimeTestPage from './pages/RealtimeTestPage';
import {
  PartnerDashboardPage,
  PartnerCustomersPage,
  PartnerCommissionsPage,
  PartnerApplyPage,
} from './pages/partner';
import {
  MarketplacePage,
  AgentDetailPage,
  MyAgentsPage,
} from './pages/marketplace';
import ApiKeysPage from './pages/api-keys/ApiKeysPage';
import ApiDocsPage from './pages/api-keys/ApiDocsPage';
import ApiWebhooksPage from './pages/api-keys/WebhooksPage';
import { TemplatesPage } from './pages/templates';
import { DocsPage } from './pages/docs';
import { ScheduledMessagesPage } from './pages/scheduled-messages';
import AnalyticsDashboardPage from './pages/analytics/AnalyticsDashboardPage';
import AdvancedAnalyticsPage from './pages/analytics/AdvancedAnalyticsPage';
import SalesForecastingPage from './pages/analytics/SalesForecastingPage';
import AILeadScoringPage from './pages/ai-scoring/AILeadScoringPage';
import ChatWidgetSettingsPage from './pages/live-chat/ChatWidgetSettingsPage';
import ChatInboxPage from './pages/live-chat/ChatInboxPage';
import QuotationsListPage from './pages/quotations/QuotationsListPage';
import QuotationBuilderPage from './pages/quotations/QuotationBuilderPage';
import QuotationDetailPage from './pages/quotations/QuotationDetailPage';
import ConversionFunnelPage from './pages/analytics/ConversionFunnelPage';
import AgentPerformancePage from './pages/analytics/AgentPerformancePage';
import TelecallerPerformancePage from './pages/analytics/TelecallerPerformancePage';
import LeadSourcesPage from './pages/analytics/LeadSourcesPage';
import EmailSequenceBuilderPage from './pages/email-sequences/EmailSequenceBuilderPage';
import {
  ComplianceDashboardPage,
  ConsentManagementPage,
  RecordingDisclosurePage,
  ComplianceAuditLogsPage,
} from './pages/compliance';
import ContactListsPage from './pages/contact-lists/ContactListsPage';
import ConversationsPage from './pages/conversations/ConversationsPage';
import AuditLogsPage from './pages/audit-logs/AuditLogsPage';
import { LeadTrackingPage } from './pages/lead-tracking';
import { RawImportsPage, RawImportDetailPage } from './pages/raw-imports';
import { LeadDistributionPage } from './pages/data';
import { BulkWhatsAppPage } from './pages/whatsapp';
import { PhoneNumbersPage } from './pages/phone-numbers';
import NumbersShopPage from './pages/numbers-shop';
import { IvrListPage, IvrBuilderPage } from './pages/ivr';
import { QueueManagementPage } from './pages/queues';
import { VoicemailPage } from './pages/voicemail';
import { CallbacksPage } from './pages/callbacks';
import { InboundAnalyticsDashboard } from './pages/inbound-analytics';
import { CallMonitoringPage } from './pages/call-monitoring';
import { IndianLeadSourcesPage, ZapierIntegrationPage } from './pages/integrations';
import { PaymentsDashboard } from './pages/payments';
import { TeamMessagingPage } from './pages/team-messaging';
import { TeamManagementDashboard } from './pages/team-management';
import { TeamMonitoringPage } from './pages/team-monitoring';
import { QADashboardPage } from './pages/qa';
import { PerformanceTargetsPage } from './pages/performance';
import { PendingApprovalsPage, ApprovalWorkflowsPage } from './pages/approvals';
import { VisualRuleBuilderPage } from './pages/lead-routing';
import { ActivityFeedPage } from './pages/collaboration';
import { CommissionDashboardPage } from './pages/commissions';
import CommissionSettingsPage from './pages/settings/CommissionSettingsPage';
import { UnifiedInboxPage } from './pages/unified-inbox';
import { PredictiveAnalyticsDashboard } from './pages/predictive-analytics';
import { CustomerHealthDashboard } from './pages/customer-health';
import { CustomerSegmentationDashboard } from './pages/customer-segmentation';
import { SentimentAnalysisDashboard } from './pages/sentiment-analysis';
import { DealIntelligenceDashboard } from './pages/deal-intelligence';
import ReportBuilderPage from './pages/reports/ReportBuilderPage';
import WorkflowBuilderPage from './pages/workflows/WorkflowBuilderPage';
import PipelineKanbanPage from './pages/pipeline/PipelineKanbanPage';
import LeadPipelinePage from './pages/pipeline/LeadPipelinePage';
import BatchOperationsPage from './pages/batch-operations/BatchOperationsPage';
import AlertsPage from './pages/alerts/AlertsPage';

// Enterprise CRM Features
import TerritoriesPage from './pages/territories/TerritoriesPage';
import AccountsPage from './pages/accounts/AccountsPage';
import TicketsPage from './pages/tickets/TicketsPage';
import ContractsPage from './pages/contracts/ContractsPage';
import GamificationPage from './pages/gamification/GamificationPage';
import ABMCampaignsPage from './pages/abm/ABMCampaignsPage';
import CustomerJourneyPage from './pages/customer-journey/CustomerJourneyPage';
import SalesPlaybooksPage from './pages/sales-playbooks/SalesPlaybooksPage';
import VideoMeetingsPage from './pages/video-meetings/VideoMeetingsPage';
import SocialCRMPage from './pages/social-crm/SocialCRMPage';
import ExportBIPage from './pages/export-bi/ExportBIPage';
import DataEnrichmentPage from './pages/data-enrichment/DataEnrichmentPage';
import CustomerPortalPage from './pages/customer-portal/CustomerPortalPage';

// Field Sales Pages
import {
  FieldSalesDashboard,
  CollegeListPage,
  CollegeDetailPage,
  VisitListPage,
  VisitCheckInPage,
  DealPipelinePage,
  ExpenseListPage,
  AdminFieldSalesTracking,
} from './pages/field-sales';

// Education Admission Management
import { UniversitiesPage } from './pages/universities';
import { StudentVisitsPage } from './pages/student-visits';
import { AdmissionsPage } from './pages/admissions';
import { CoursesPage } from './pages/courses';
import { FeesPage } from './pages/fees';
import { ScholarshipsPage } from './pages/scholarships';
import { ExpensesPage } from './pages/expenses';
import { ProfitDashboardPage } from './pages/profit';

// Onboarding
import { OnboardingWizard } from './pages/onboarding';

// Super Admin Pages
import SuperAdminLayout from './layouts/SuperAdminLayout';
import {
  SuperAdminLoginPage,
  SuperAdminDashboard,
  OrganizationsPage as SuperAdminOrganizationsPage,
  OrganizationDetailPage as SuperAdminOrganizationDetailPage,
  RevenuePage as SuperAdminRevenuePage,
  BulkEmailPage as SuperAdminBulkEmailPage,
  RealtimePage as SuperAdminRealtimePage,
  IntelligencePage as SuperAdminIntelligencePage,
  FinancialPage as SuperAdminFinancialPage,
  FeatureFlagsPage as SuperAdminFeatureFlagsPage,
  WhiteLabelPage as SuperAdminWhiteLabelPage,
  SupportToolsPage as SuperAdminSupportToolsPage,
  CompliancePage as SuperAdminCompliancePage,
  SystemPage as SuperAdminSystemPage,
} from './pages/super-admin';
import { superAdminService } from './services/super-admin.service';

// Loading spinner for auth initialization
function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm">Checking authentication...</p>
      </div>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children, skipOnboardingCheck = false }: { children: React.ReactNode; skipOnboardingCheck?: boolean }) {
  const { isAuthenticated, isInitialized, user } = useSelector((state: RootState) => state.auth);

  // Wait for auth check to complete before deciding
  if (!isInitialized) {
    return <AuthLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed (skip for onboarding page itself).
  // Only admin/owner roles can complete org onboarding — other roles (telecaller,
  // agent, etc.) should go straight to the dashboard.
  const roleSlug = (user?.role || '').toLowerCase();
  const canCompleteOnboarding = ['admin', 'owner', 'super_admin', 'superadmin'].includes(roleSlug);
  if (!skipOnboardingCheck && user && !user.onboardingCompleted && canCompleteOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, user } = useSelector((state: RootState) => state.auth);

  // Wait for auth check to complete before deciding
  if (!isInitialized) {
    return <AuthLoadingSpinner />;
  }

  if (isAuthenticated) {
    // Super Admin goes to Platform Admin dashboard
    const role = user?.role?.toLowerCase();
    if (role === 'super_admin' || role === 'superadmin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Home Route - shows landing page for guests, redirects to dashboard for authenticated
function HomeRoute() {
  const { isAuthenticated, isInitialized, user } = useSelector((state: RootState) => state.auth);

  // Wait for auth check to complete before deciding
  if (!isInitialized) {
    return <AuthLoadingSpinner />;
  }

  if (isAuthenticated) {
    // Super Admin goes to Platform Admin dashboard
    const role = user?.role?.toLowerCase();
    if (role === 'super_admin' || role === 'superadmin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

// Super Admin Protected Route
function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if super admin is logged in via superAdminService
        const isAuth = await superAdminService.isAuthenticated();
        setIsAuthorized(isAuth);
      } catch {
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  if (isChecking) {
    return <AuthLoadingSpinner />;
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Catch All Route - redirects unmatched routes to home
function CatchAllRedirect() {
  return <Navigate to="/" replace />;
}

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user, isInitialized } = useSelector((state: RootState) => state.auth);

  // Check auth status on app initialization (validates httpOnly cookies)
  useEffect(() => {
    if (!isInitialized) {
      // On initial load, check if httpOnly cookie auth is valid
      dispatch(fetchCurrentUser());
    }
    // Note: Only run on mount, not when isInitialized changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return (
    <Routes>
      {/* Landing Page - public home */}
      <Route path="/" element={<HomeRoute />} />

      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <AuthLayout>
              <ForgotPasswordPage />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Public Pricing Page */}
      <Route path="/pricing" element={<PricingPage />} />

      {/* Public Documentation Page */}
      <Route path="/docs" element={<DocsPage />} />

      {/* Public Realtime Voice Test Page */}
      <Route path="/realtime-test" element={<RealtimeTestPage />} />

      {/* Onboarding - Protected but standalone (no DashboardLayout, skip onboarding check) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute skipOnboardingCheck>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="leads" element={<LeadsListPage />} />
        <Route path="leads/new" element={<CreateLeadPage />} />
        <Route path="leads/bulk-upload" element={<BulkUploadPage />} />
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="raw-imports" element={<RawImportsPage />} />
        <Route path="raw-imports/:id" element={<RawImportDetailPage />} />
        <Route path="assignments" element={<LeadDistributionPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="roles" element={<RolesListPage />} />
        <Route path="forms" element={<FormBuilderPage />} />
        <Route path="landing-pages" element={<LandingPagesPage />} />
        <Route path="landing-pages/new" element={<LandingPageBuilderPage />} />
        <Route path="landing-pages/:id/edit" element={<LandingPageBuilderPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="voice-ai" element={<VoiceAgentsPage />} />
        <Route path="voice-ai/new" element={<NewAgentSelectionPage />} />
        <Route path="voice-ai/create" element={<CreateAgentPage />} />
        <Route path="voice-ai/create-conversational" element={<ConversationalAIAgentWizard />} />
        <Route path="voice-ai/create-from-template/:templateId" element={<CreateAgentFromTemplatePage />} />
        <Route path="voice-ai/agents/:agentId" element={<ConversationalAIAgentDetail />} />

        {/* Call Flows / IVR Builder */}
        <Route path="call-flows" element={<CallFlowsPage />} />
        <Route path="call-flows/builder" element={<CallFlowBuilderPage />} />
        <Route path="call-flows/builder/:id" element={<CallFlowBuilderPage />} />

        {/* Voice Templates */}
        <Route path="voice-templates" element={<VoiceTemplatesPage />} />
        <Route path="voice-templates/create" element={<EditTemplatePage />} />
        <Route path="voice-templates/:id/edit" element={<EditTemplatePage />} />

        <Route path="outbound-calls" element={<OutboundCallsPage />} />
        <Route path="outbound-calls/calls/:id" element={<CallDetailsPage />} />
        <Route path="outbound-calls/calls/:id/summary" element={<CallSummaryPage />} />
        <Route path="outbound-calls/telecaller-calls/:id/summary" element={<CallSummaryPage />} />
        <Route path="outbound-calls/single" element={<MakeSingleCallPage />} />
        <Route path="outbound-calls/campaigns/create" element={<CreateCampaignPage />} />
        <Route path="outbound-calls/campaigns/:id" element={<CampaignDetailsPage />} />
        <Route path="outbound-calls/campaigns/:id/analytics" element={<CampaignAnalytics />} />
        <Route path="outbound-calls/campaigns/:campaignId/queue" element={<ManualCallQueuePage />} />
        <Route path="advanced" element={<AdvancedDashboardPage />} />
        <Route path="advanced/scheduled-calls" element={<ScheduledCallsPage />} />
        <Route path="advanced/dnc-list" element={<DNCListPage />} />
        <Route path="advanced/follow-up-rules" element={<FollowUpRulesPage />} />
        <Route path="advanced/appointments" element={<AppointmentsPage />} />
        <Route path="advanced/webhooks" element={<WebhooksPage />} />
        <Route path="advanced/realtime" element={<RealTimeDashboardPage />} />
        <Route path="advanced/lead-scoring" element={<LeadScoringPage />} />
        <Route path="ai-scoring" element={<AILeadScoringPage />} />
        <Route path="telecaller-queue" element={<TelecallerQueuePage />} />
        <Route path="assigned-data" element={<AssignedDataPage />} />
        <Route path="qualified-leads" element={<QualifiedLeadsPage />} />
        <Route path="telecaller-app" element={<TelecallerDashboard />} />
        <Route path="telecaller-app/call/:leadId" element={<TelecallerCallPage />} />
        <Route path="telecaller-app/calls" element={<TelecallerCallHistory />} />
        <Route path="telecaller-call-history" element={<AdminTelecallerCallHistory />} />
        <Route path="hybrid-inbox" element={<HybridInboxPage />} />
        <Route path="call-history" element={<InboundCallsPage />} />
        <Route path="transfer-config" element={<TransferConfigPage />} />
        <Route path="settings/auto-assign" element={<AutoAssignSettingsPage />} />
        <Route path="settings/assignment-schedules" element={<AssignmentSchedulePage />} />
        <Route path="settings/sms" element={<SmsSettingsPage />} />
        <Route path="settings/email" element={<EmailSettingsPage />} />
        <Route path="settings/razorpay" element={<RazorpaySettingsPage />} />
        <Route path="settings/institution" element={<InstitutionSettingsPage />} />
        <Route path="settings/industry" element={<IndustrySettingsPage />} />
        <Route path="settings/lead-management" element={<LeadManagementSettingsPage />} />
        <Route path="settings/pipelines" element={<PipelineSettingsPage />} />
        <Route path="settings/tags" element={<TagManagementPage />} />
        <Route path="settings/lead-sources" element={<LeadSourcesSettingsPage />} />
        <Route path="settings/follow-up-config" element={<FollowUpConfigPage />} />
        <Route path="settings/custom-fields" element={<CustomFieldsConfigPage />} />
        <Route path="settings/email-templates" element={<EmailTemplateBuilderPage />} />
        <Route path="settings/whatsapp-templates" element={<WhatsAppTemplateBuilderPage />} />
        <Route path="settings/ai-scripts" element={<AIScriptBuilderPage />} />
        <Route path="settings/workflows" element={<WorkflowConfigPage />} />
        <Route path="settings/payment-categories" element={<PaymentCategoriesPage />} />
        <Route path="settings/industry-templates" element={<IndustryTemplatesPage />} />
        <Route path="settings/crm-customization" element={<TenantLabelConfigPage />} />
        <Route path="settings/lead-routing" element={<VisualRuleBuilderPage />} />
        <Route path="settings/field-permissions" element={<FieldPermissionsPage />} />
        <Route path="settings/whatsapp" element={<WhatsAppSettingsPage />} />
        <Route path="settings/integrations" element={<IntegrationCredentialsPage />} />
        <Route path="settings/voice-minutes" element={<VoiceMinutesPage />} />
        <Route path="settings/notifications" element={<NotificationChannelsPage />} />
        <Route path="settings/calendar" element={<CalendarSettingsPage />} />
        <Route path="settings/email-sequences" element={<EmailSequencesPage />} />
        <Route path="settings/crm-integration" element={<CRMIntegrationPage />} />
        <Route path="settings/integrations-advanced" element={<IntegrationSettingsPage />} />
        <Route path="settings/post-call-messaging" element={<PostCallMessagingPage />} />
        <Route path="settings/branding" element={<BrandingSettingsPage />} />
        <Route path="settings/branches" element={<BranchesPage />} />
        <Route path="settings/branches/new" element={<BranchFormPage />} />
        <Route path="settings/branches/:id/edit" element={<BranchFormPage />} />
        {/* New Settings Pages */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/profile" element={<ProfileSettingsPage />} />
        <Route path="settings/preferences" element={<PreferencesPage />} />
        <Route path="settings/accessibility" element={<AccessibilityPage />} />
        <Route path="settings/automatic-reports" element={<AutomaticReportsPage />} />
        <Route path="settings/manage-columns" element={<ManageColumnsPage />} />
        <Route path="settings/retry-settings" element={<RetrySettingsPage />} />
        <Route path="settings/lead-priority" element={<LeadPriorityPage />} />
        <Route path="settings/custom-contact-property" element={<CustomContactPropertyPage />} />
        <Route path="settings/notification-preferences" element={<NotificationPreferencesPage />} />
        <Route path="settings/roles-permissions" element={<RolesPermissionsPage />} />
        <Route path="settings/pipeline" element={<PipelineSettingsPage />} />
        <Route path="reports" element={<ReportsListingPage />} />
        <Route path="reports/old" element={<ReportsPage />} />
        <Route path="reports/payments" element={<PaymentReportsPage />} />
        <Route path="reports/admissions" element={<AdmissionReportsPage />} />
        <Route path="reports/user-performance" element={<UserPerformanceReportsPage />} />
        <Route path="reports/ai-usage" element={<AIUsageReportsPage />} />
        <Route path="reports/campaigns" element={<CampaignReportsPage />} />
        <Route path="reports/audit" element={<AuditReportsPage />} />
        {/* User Reports (10) */}
        <Route path="reports/user" element={<UserReportPage />} />
        <Route path="reports/user-activity" element={<UserActivityReportPage />} />
        <Route path="reports/lead-disposition" element={<LeadDispositionReportPage />} />
        <Route path="reports/user-stage" element={<UserStageReportPage />} />
        <Route path="reports/user-call" element={<UserCallReportPage />} />
        <Route path="reports/followup" element={<FollowUpReportPage />} />
        <Route path="reports/login" element={<LoginReportPage />} />
        <Route path="reports/message-activity" element={<MessageActivityReportPage />} />
        <Route path="reports/user-deal" element={<UserDealReportPage />} />
        <Route path="reports/user-task" element={<UserTaskReportPage />} />
        {/* Campaign Reports (5) */}
        <Route path="reports/campaign" element={<CampaignReportPage />} />
        <Route path="reports/campaign-lead" element={<CampaignLeadReportPage />} />
        <Route path="reports/campaign-stage" element={<CampaignStageReportPage />} />
        <Route path="reports/campaign-deal" element={<CampaignDealReportPage />} />
        <Route path="reports/campaign-source" element={<CampaignSourceReportPage />} />
        {/* Pipeline Reports */}
        <Route path="reports/deal-velocity" element={<DealVelocityReportPage />} />
        {/* Business Trends */}
        <Route path="reports/business-trends" element={<BusinessTrendsPage />} />
        {/* User Trends */}
        <Route path="reports/user-trends" element={<UserTrendsPage />} />
        {/* Call Analysis Reports */}
        <Route path="reports/failure-analysis" element={<FailureAnalysisReportPage />} />
        <Route path="social-media-ads" element={<SocialMediaAdsPage />} />
        <Route path="ad-integrations" element={<AdIntegrationsPage />} />
        <Route path="webhook-urls" element={<WebhookUrlsPage />} />
        <Route path="instagram-setup" element={<InstagramLeadSetupPage />} />
        <Route path="facebook-setup" element={<FacebookSetupPage />} />
        <Route path="linkedin-setup" element={<LinkedInSetupPage />} />
        <Route path="google-ads-setup" element={<GoogleAdsSetupPage />} />
        <Route path="youtube-setup" element={<YouTubeSetupPage />} />
        <Route path="twitter-setup" element={<TwitterSetupPage />} />
        <Route path="tiktok-setup" element={<TikTokSetupPage />} />
        <Route path="apify" element={<ApifySmartScrapePage />} />
        <Route path="apify-setup" element={<ApifySetupPage />} />
        <Route path="apify-new-scraper" element={<ApifySetupPage />} />
        <Route path="apify-dashboard" element={<ApifyDashboardPage />} />
        <Route path="apify-jobs" element={<ApifyJobsPage />} />
        <Route path="apify-smart" element={<ApifySmartScrapePage />} />
        <Route path="apify-records/:jobId" element={<ApifyRecordsPage />} />
        <Route path="subscription" element={<SubscriptionManagementPage />} />
        <Route path="subscription/checkout" element={<CheckoutPage />} />
        <Route path="subscription/success" element={<SuccessPage />} />
        <Route path="voice-ai/realtime" element={<RealtimeVoiceDemo />} />

        {/* Partner Routes */}
        <Route path="partner" element={<PartnerDashboardPage />} />
        <Route path="partner/apply" element={<PartnerApplyPage />} />
        <Route path="partner/customers" element={<PartnerCustomersPage />} />
        <Route path="partner/commissions" element={<PartnerCommissionsPage />} />

        {/* Marketplace Routes */}
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="marketplace/my-agents" element={<MyAgentsPage />} />
        <Route path="marketplace/:slug" element={<AgentDetailPage />} />

        {/* API Keys Routes */}
        <Route path="api-keys" element={<ApiKeysPage />} />
        <Route path="api-keys/docs" element={<ApiDocsPage />} />
        <Route path="api-keys/webhooks" element={<ApiWebhooksPage />} />

        {/* Templates */}
        <Route path="templates" element={<TemplatesPage />} />

        {/* Scheduled Messages */}
        <Route path="scheduled-messages" element={<ScheduledMessagesPage />} />

        {/* Analytics */}
        <Route path="analytics" element={<AnalyticsDashboardPage />} />
        <Route path="analytics/advanced" element={<AdvancedAnalyticsPage />} />
        <Route path="analytics/lead-sources" element={<LeadSourcesPage />} />
        <Route path="analytics/funnel" element={<ConversionFunnelPage />} />
        <Route path="analytics/forecasting" element={<SalesForecastingPage />} />
        <Route path="analytics/agents" element={<AgentPerformancePage />} />
        <Route path="analytics/telecallers" element={<TelecallerPerformancePage />} />

        {/* Email Sequences */}
        <Route path="email-sequences" element={<EmailSequenceBuilderPage />} />
        <Route path="email-sequences/:id" element={<EmailSequenceBuilderPage />} />

        {/* Compliance */}
        <Route path="compliance" element={<ComplianceDashboardPage />} />
        <Route path="compliance/consent" element={<ConsentManagementPage />} />
        <Route path="compliance/recording-disclosure" element={<RecordingDisclosurePage />} />
        <Route path="compliance/audit-logs" element={<ComplianceAuditLogsPage />} />

        {/* Contact Lists */}
        <Route path="contact-lists" element={<ContactListsPage />} />

        {/* Conversations */}
        <Route path="conversations" element={<ConversationsPage />} />

        {/* Audit Logs */}
        <Route path="audit-logs" element={<AuditLogsPage />} />

        {/* Lead Tracking */}
        <Route path="lead-tracking" element={<LeadTrackingPage />} />

        {/* WhatsApp */}
        <Route path="whatsapp/bulk" element={<BulkWhatsAppPage />} />

        {/* Phone Numbers */}
        <Route path="phone-numbers" element={<PhoneNumbersPage />} />
        <Route path="numbers-shop" element={<NumbersShopPage />} />

        {/* IVR Builder */}
        <Route path="ivr" element={<IvrListPage />} />
        <Route path="ivr/builder" element={<IvrBuilderPage />} />
        <Route path="ivr/builder/:id" element={<IvrBuilderPage />} />

        {/* Queue Management */}
        <Route path="queues" element={<QueueManagementPage />} />

        {/* Voicemail */}
        <Route path="voicemail" element={<VoicemailPage />} />

        {/* Callbacks */}
        <Route path="callbacks" element={<CallbacksPage />} />

        {/* Inbound Analytics */}
        <Route path="inbound-analytics" element={<InboundAnalyticsDashboard />} />

        {/* Call Monitoring */}
        <Route path="call-monitoring" element={<CallMonitoringPage />} />

        {/* Indian Lead Source Integrations */}
        <Route path="integrations/indian-sources" element={<IndianLeadSourcesPage />} />
        <Route path="integrations/zapier" element={<ZapierIntegrationPage />} />

        {/* Live Chat */}
        <Route path="live-chat" element={<ChatInboxPage />} />
        <Route path="live-chat/settings" element={<ChatWidgetSettingsPage />} />

        {/* Quotation Management */}
        <Route path="quotations" element={<QuotationsListPage />} />
        <Route path="quotations/new" element={<QuotationBuilderPage />} />
        <Route path="quotations/:id" element={<QuotationDetailPage />} />
        <Route path="quotations/:id/edit" element={<QuotationBuilderPage />} />

        {/* Payments Dashboard */}
        <Route path="payments" element={<PaymentsDashboard />} />

        {/* Team Communication & Management */}
        <Route path="team-messaging" element={<TeamMessagingPage />} />
        <Route path="team-management" element={<TeamManagementDashboard />} />
        <Route path="team-monitoring" element={<TeamMonitoringPage />} />

        {/* Quality Assurance */}
        <Route path="qa" element={<QADashboardPage />} />

        {/* Team Collaboration */}
        <Route path="activity-feed" element={<ActivityFeedPage />} />

        {/* Commission Tracking */}
        <Route path="commissions" element={<CommissionDashboardPage />} />
        <Route path="settings/commission" element={<CommissionSettingsPage />} />

        {/* Unified Inbox */}
        <Route path="unified-inbox" element={<UnifiedInboxPage />} />

        {/* Advanced Analytics & Intelligence */}
        <Route path="predictive-analytics" element={<PredictiveAnalyticsDashboard />} />
        <Route path="customer-health" element={<CustomerHealthDashboard />} />
        <Route path="customer-segmentation" element={<CustomerSegmentationDashboard />} />
        <Route path="sentiment-analysis" element={<SentimentAnalysisDashboard />} />
        <Route path="deal-intelligence" element={<DealIntelligenceDashboard />} />

        {/* High-Priority CRM Features */}
        <Route path="report-builder" element={<ReportBuilderPage />} />
        <Route path="workflow-builder" element={<WorkflowBuilderPage />} />
        <Route path="pipeline" element={<LeadPipelinePage />} />
        <Route path="pipeline/advanced" element={<PipelineKanbanPage />} />
        <Route path="batch-operations" element={<BatchOperationsPage />} />
        <Route path="alerts" element={<AlertsPage />} />

        {/* Enterprise CRM Features */}
        <Route path="territories" element={<TerritoriesPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/:id" element={<AccountsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketsPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="contracts/:id" element={<ContractsPage />} />
        <Route path="contracts/new" element={<ContractsPage />} />
        <Route path="gamification" element={<GamificationPage />} />
        <Route path="abm" element={<ABMCampaignsPage />} />
        <Route path="abm/:id" element={<ABMCampaignsPage />} />
        <Route path="abm/new" element={<ABMCampaignsPage />} />
        <Route path="customer-journey" element={<CustomerJourneyPage />} />
        <Route path="sales-playbooks" element={<SalesPlaybooksPage />} />
        <Route path="video-meetings" element={<VideoMeetingsPage />} />
        <Route path="social-crm" element={<SocialCRMPage />} />
        <Route path="export-bi" element={<ExportBIPage />} />
        <Route path="data-enrichment" element={<DataEnrichmentPage />} />
        <Route path="customer-portal" element={<CustomerPortalPage />} />

        {/* Performance & Targets */}
        <Route path="performance" element={<PerformanceTargetsPage />} />

        {/* Approval Workflows */}
        <Route path="approvals" element={<PendingApprovalsPage />} />
        <Route path="approvals/workflows" element={<ApprovalWorkflowsPage />} />

        {/* Field Sales */}
        <Route path="field-sales" element={<FieldSalesDashboard />} />
        <Route path="field-sales/colleges" element={<CollegeListPage />} />
        <Route path="field-sales/colleges/:id" element={<CollegeDetailPage />} />
        <Route path="field-sales/visits" element={<VisitListPage />} />
        <Route path="field-sales/visits/check-in" element={<VisitCheckInPage />} />
        <Route path="field-sales/deals" element={<DealPipelinePage />} />
        <Route path="field-sales/expenses" element={<ExpenseListPage />} />
        <Route path="field-sales/tracking" element={<AdminFieldSalesTracking />} />

        {/* Education Admission Management */}
        <Route path="universities" element={<UniversitiesPage />} />
        <Route path="student-visits" element={<StudentVisitsPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="scholarships" element={<ScholarshipsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="profit" element={<ProfitDashboardPage />} />
      </Route>

      {/* Super Admin Routes */}
      {/* Super admin login is handled by the unified login page */}
      <Route path="/super-admin/login" element={<Navigate to="/login" replace />} />
      <Route
        element={
          <SuperAdminProtectedRoute>
            <SuperAdminLayout />
          </SuperAdminProtectedRoute>
        }
      >
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/organizations" element={<SuperAdminOrganizationsPage />} />
        <Route path="/super-admin/organizations/:id" element={<SuperAdminOrganizationDetailPage />} />
        <Route path="/super-admin/revenue" element={<SuperAdminRevenuePage />} />
        <Route path="/super-admin/bulk-email" element={<SuperAdminBulkEmailPage />} />
        {/* Advanced Features */}
        <Route path="/super-admin/realtime" element={<SuperAdminRealtimePage />} />
        <Route path="/super-admin/intelligence" element={<SuperAdminIntelligencePage />} />
        <Route path="/super-admin/financial" element={<SuperAdminFinancialPage />} />
        <Route path="/super-admin/feature-flags" element={<SuperAdminFeatureFlagsPage />} />
        <Route path="/super-admin/white-label" element={<SuperAdminWhiteLabelPage />} />
        <Route path="/super-admin/support" element={<SuperAdminSupportToolsPage />} />
        <Route path="/super-admin/compliance" element={<SuperAdminCompliancePage />} />
        <Route path="/super-admin/system" element={<SuperAdminSystemPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  );
}

export default App;
