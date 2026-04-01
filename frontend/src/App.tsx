import { useEffect } from 'react';
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
import UsersListPage from './pages/users/UsersListPage';
import FormBuilderPage from './pages/forms/FormBuilderPage';
import LandingPagesPage from './pages/landing/LandingPagesPage';
import LandingPageBuilderPage from './pages/landing/LandingPageBuilderPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import { VoiceAgentsPage, CreateAgentPage, CreateAgentFromTemplatePage, NewAgentSelectionPage } from './pages/voice-ai';
import { ConversationalAIAgentWizard } from './pages/voice-ai/ConversationalAIAgentWizard';
import { ConversationalAIAgentDetail } from './pages/voice-ai/ConversationalAIAgentDetail';
import { VoiceTemplatesPage, EditTemplatePage } from './pages/voice-templates';
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
} from './pages/telecaller-app';
import {
  TransferConfigPage,
  HybridInboxPage,
  InboundCallsPage,
} from './pages/hybrid-agent';
import { AutoAssignSettingsPage, AssignmentSchedulePage, SmsSettingsPage, InstitutionSettingsPage, WhatsAppSettingsPage, VoiceMinutesPage, NotificationChannelsPage, CalendarSettingsPage, EmailSequencesPage, CRMIntegrationPage, PostCallMessagingPage, IntegrationCredentialsPage } from './pages/settings';
import IntegrationSettingsPage from './pages/settings/IntegrationSettingsPage';
import { ReportsPage } from './pages/reports';
import { SocialMediaAdsPage, InstagramLeadSetupPage, AdIntegrationsPage, FacebookSetupPage, LinkedInSetupPage, GoogleAdsSetupPage, YouTubeSetupPage, TwitterSetupPage, TikTokSetupPage, WebhookUrlsPage } from './pages/ads';
import { ApifyDashboardPage, ApifyJobsPage, ApifySmartScrapePage, ApifyRecordsPage } from './pages/apify';
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
import { ScheduledMessagesPage } from './pages/scheduled-messages';
import AnalyticsDashboardPage from './pages/analytics/AnalyticsDashboardPage';
import ConversionFunnelPage from './pages/analytics/ConversionFunnelPage';
import AgentPerformancePage from './pages/analytics/AgentPerformancePage';
import LeadSourcesPage from './pages/analytics/LeadSourcesPage';
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
import { BulkWhatsAppPage } from './pages/whatsapp';
import { PhoneNumbersPage } from './pages/phone-numbers';
import { IvrListPage, IvrBuilderPage } from './pages/ivr';
import { QueueManagementPage } from './pages/queues';
import { VoicemailPage } from './pages/voicemail';
import { CallbacksPage } from './pages/callbacks';
import { InboundAnalyticsDashboard } from './pages/inbound-analytics';
import { CallMonitoringPage } from './pages/call-monitoring';
import { CallFlowsPage, CallFlowBuilderPage } from './pages/call-flows';

// Field Sales Pages
import {
  FieldSalesDashboard,
  CollegeListPage,
  CollegeDetailPage,
  VisitListPage,
  VisitCheckInPage,
  DealPipelinePage,
  ExpenseListPage,
} from './pages/field-sales';

// Super Admin Pages
import SuperAdminLayout from './layouts/SuperAdminLayout';
import {
  SuperAdminLoginPage,
  SuperAdminDashboard,
  OrganizationsPage as SuperAdminOrganizationsPage,
  OrganizationDetailPage as SuperAdminOrganizationDetailPage,
  RevenuePage as SuperAdminRevenuePage,
  BulkEmailPage as SuperAdminBulkEmailPage,
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
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);

  // Wait for auth check to complete before deciding
  if (!isInitialized) {
    return <AuthLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);

  // Wait for auth check to complete before deciding
  if (!isInitialized) {
    return <AuthLoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Home Route - shows landing page for guests, redirects to dashboard for authenticated
function HomeRoute() {
  const { isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);

  // Wait for auth check to complete before deciding
  if (!isInitialized) {
    return <AuthLoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

// Super Admin Protected Route
function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = superAdminService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />;
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
  }, [dispatch, isInitialized]);

  // Fetch current user if authenticated but user data is missing (rare edge case)
  useEffect(() => {
    if (isAuthenticated && !user && isInitialized) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, isAuthenticated, user, isInitialized]);

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

      {/* Public Realtime Voice Test Page */}
      <Route path="/realtime-test" element={<RealtimeTestPage />} />

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
        <Route path="leads/:id" element={<LeadDetailPage />} />
        <Route path="leads/bulk-upload" element={<BulkUploadPage />} />
        <Route path="raw-imports" element={<RawImportsPage />} />
        <Route path="raw-imports/:id" element={<RawImportDetailPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="forms" element={<FormBuilderPage />} />
        <Route path="landing-pages" element={<LandingPagesPage />} />
        <Route path="landing-pages/new" element={<LandingPageBuilderPage />} />
        <Route path="landing-pages/:id/edit" element={<LandingPageBuilderPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="voice-ai" element={<VoiceAgentsPage />} />
        <Route path="voice-ai/new" element={<NewAgentSelectionPage />} />
        <Route path="voice-ai/create" element={<CreateAgentPage />} />
        <Route path="voice-ai/create-conversational" element={<ConversationalAIAgentWizard />} />
        <Route path="voice-ai/create-from-template/:templateId" element={<CreateAgentFromTemplatePage />} />
        <Route path="voice-ai/agents/:agentId" element={<ConversationalAIAgentDetail />} />

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
        <Route path="telecaller-queue" element={<TelecallerQueuePage />} />
        <Route path="assigned-data" element={<AssignedDataPage />} />
        <Route path="qualified-leads" element={<QualifiedLeadsPage />} />
        <Route path="telecaller-app" element={<TelecallerDashboard />} />
        <Route path="telecaller-app/call/:leadId" element={<TelecallerCallPage />} />
        <Route path="telecaller-app/calls" element={<TelecallerCallHistory />} />
        <Route path="hybrid-inbox" element={<HybridInboxPage />} />
        <Route path="call-history" element={<InboundCallsPage />} />
        <Route path="transfer-config" element={<TransferConfigPage />} />
        <Route path="settings/auto-assign" element={<AutoAssignSettingsPage />} />
        <Route path="settings/assignment-schedules" element={<AssignmentSchedulePage />} />
        <Route path="settings/sms" element={<SmsSettingsPage />} />
        <Route path="settings/institution" element={<InstitutionSettingsPage />} />
        <Route path="settings/whatsapp" element={<WhatsAppSettingsPage />} />
        <Route path="settings/integrations" element={<IntegrationCredentialsPage />} />
        <Route path="settings/voice-minutes" element={<VoiceMinutesPage />} />
        <Route path="settings/notifications" element={<NotificationChannelsPage />} />
        <Route path="settings/calendar" element={<CalendarSettingsPage />} />
        <Route path="settings/email-sequences" element={<EmailSequencesPage />} />
        <Route path="settings/crm-integration" element={<CRMIntegrationPage />} />
        <Route path="settings/integrations-advanced" element={<IntegrationSettingsPage />} />
        <Route path="settings/post-call-messaging" element={<PostCallMessagingPage />} />
        <Route path="reports" element={<ReportsPage />} />
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
        <Route path="apify-setup" element={<ApifySmartScrapePage />} />
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
        <Route path="analytics/lead-sources" element={<LeadSourcesPage />} />
        <Route path="analytics/funnel" element={<ConversionFunnelPage />} />
        <Route path="analytics/agents" element={<AgentPerformancePage />} />

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

        {/* IVR Builder */}
        <Route path="ivr" element={<IvrListPage />} />
        <Route path="ivr/builder" element={<IvrBuilderPage />} />
        <Route path="ivr/builder/:id" element={<IvrBuilderPage />} />

        {/* Call Flow Builder */}
        <Route path="call-flows" element={<CallFlowsPage />} />
        <Route path="call-flows/builder" element={<CallFlowBuilderPage />} />
        <Route path="call-flows/builder/:id" element={<CallFlowBuilderPage />} />

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

        {/* Field Sales */}
        <Route path="field-sales" element={<FieldSalesDashboard />} />
        <Route path="field-sales/colleges" element={<CollegeListPage />} />
        <Route path="field-sales/colleges/:id" element={<CollegeDetailPage />} />
        <Route path="field-sales/visits" element={<VisitListPage />} />
        <Route path="field-sales/visits/check-in" element={<VisitCheckInPage />} />
        <Route path="field-sales/deals" element={<DealPipelinePage />} />
        <Route path="field-sales/expenses" element={<ExpenseListPage />} />
      </Route>

      {/* Super Admin Routes */}
      <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
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
      </Route>

      {/* Catch all */}
      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  );
}

export default App;
