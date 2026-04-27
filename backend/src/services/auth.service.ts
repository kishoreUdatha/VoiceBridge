import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { UnauthorizedError, NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { emailService } from '../integrations/email.service';
import { workSessionService } from './work-session.service';
import { industryCacheService } from './industry-cache.service';

interface RegisterInput {
  organizationName: string;
  organizationSlug: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  planId?: string;
  industry?: string;
  teamSize?: string;
  expectedLeadsPerMonth?: string;
  country?: string;
  currency?: string;
}

// Industry-specific pipeline templates
// Pipeline = Generic, Stages = Industry-specific
const industryPipelineTemplates: Record<string, {
  name: string;
  stages: Array<{ name: string; slug: string; color: string; stageType: string; probability: number; slaHours: number | null }>;
}> = {
  EDUCATION: {
    name: 'Admission Pipeline',
    stages: [
      { name: 'New Enquiry', slug: 'new-enquiry', color: '#6B7280', stageType: 'entry', probability: 10, slaHours: 24 },
      { name: 'Contacted', slug: 'contacted', color: '#3B82F6', stageType: 'active', probability: 20, slaHours: 48 },
      { name: 'Counseling Done', slug: 'counseling-done', color: '#8B5CF6', stageType: 'active', probability: 35, slaHours: 72 },
      { name: 'Campus Visit', slug: 'campus-visit', color: '#F59E0B', stageType: 'active', probability: 50, slaHours: 120 },
      { name: 'Application Submitted', slug: 'application-submitted', color: '#EC4899', stageType: 'active', probability: 70, slaHours: 168 },
      { name: 'Fee Discussion', slug: 'fee-discussion', color: '#14B8A6', stageType: 'active', probability: 85, slaHours: 120 },
      { name: 'Enrolled', slug: 'enrolled', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Dropped', slug: 'dropped', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  REAL_ESTATE: {
    name: 'Property Sales Pipeline',
    stages: [
      { name: 'New Enquiry', slug: 'new-enquiry', color: '#6B7280', stageType: 'entry', probability: 10, slaHours: 24 },
      { name: 'Contacted', slug: 'contacted', color: '#3B82F6', stageType: 'active', probability: 20, slaHours: 48 },
      { name: 'Site Visit Scheduled', slug: 'visit-scheduled', color: '#8B5CF6', stageType: 'active', probability: 35, slaHours: 72 },
      { name: 'Site Visit Done', slug: 'visit-done', color: '#F59E0B', stageType: 'active', probability: 50, slaHours: 48 },
      { name: 'Negotiation', slug: 'negotiation', color: '#EC4899', stageType: 'active', probability: 65, slaHours: 120 },
      { name: 'Booking Amount', slug: 'booking-amount', color: '#14B8A6', stageType: 'active', probability: 80, slaHours: 72 },
      { name: 'Documentation', slug: 'documentation', color: '#6366F1', stageType: 'active', probability: 90, slaHours: 168 },
      { name: 'Registered', slug: 'registered', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Not Interested', slug: 'not-interested', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  HEALTHCARE: {
    name: 'Patient Pipeline',
    stages: [
      { name: 'Enquiry', slug: 'enquiry', color: '#6B7280', stageType: 'entry', probability: 15, slaHours: 12 },
      { name: 'Appointment Booked', slug: 'appointment-booked', color: '#3B82F6', stageType: 'active', probability: 30, slaHours: 24 },
      { name: 'Consultation Done', slug: 'consultation-done', color: '#8B5CF6', stageType: 'active', probability: 50, slaHours: 48 },
      { name: 'Treatment Plan', slug: 'treatment-plan', color: '#F59E0B', stageType: 'active', probability: 70, slaHours: 72 },
      { name: 'Treatment Started', slug: 'treatment-started', color: '#EC4899', stageType: 'active', probability: 85, slaHours: 168 },
      { name: 'Completed', slug: 'completed', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Cancelled', slug: 'cancelled', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  INSURANCE: {
    name: 'Policy Pipeline',
    stages: [
      { name: 'Lead', slug: 'lead', color: '#6B7280', stageType: 'entry', probability: 10, slaHours: 24 },
      { name: 'Contacted', slug: 'contacted', color: '#3B82F6', stageType: 'active', probability: 20, slaHours: 48 },
      { name: 'Needs Analysis', slug: 'needs-analysis', color: '#8B5CF6', stageType: 'active', probability: 35, slaHours: 72 },
      { name: 'Quote Generated', slug: 'quote-generated', color: '#F59E0B', stageType: 'active', probability: 50, slaHours: 48 },
      { name: 'Proposal Shared', slug: 'proposal-shared', color: '#EC4899', stageType: 'active', probability: 65, slaHours: 72 },
      { name: 'Documents Collected', slug: 'documents-collected', color: '#14B8A6', stageType: 'active', probability: 80, slaHours: 120 },
      { name: 'Policy Issued', slug: 'policy-issued', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Rejected', slug: 'rejected', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  AUTOMOTIVE: {
    name: 'Vehicle Sales Pipeline',
    stages: [
      { name: 'Walk-in/Enquiry', slug: 'walkin-enquiry', color: '#6B7280', stageType: 'entry', probability: 10, slaHours: 12 },
      { name: 'Test Drive Scheduled', slug: 'test-drive-scheduled', color: '#3B82F6', stageType: 'active', probability: 25, slaHours: 48 },
      { name: 'Test Drive Done', slug: 'test-drive-done', color: '#8B5CF6', stageType: 'active', probability: 40, slaHours: 24 },
      { name: 'Finance Discussion', slug: 'finance-discussion', color: '#F59E0B', stageType: 'active', probability: 55, slaHours: 72 },
      { name: 'Negotiation', slug: 'negotiation', color: '#EC4899', stageType: 'active', probability: 70, slaHours: 48 },
      { name: 'Booking', slug: 'booking', color: '#14B8A6', stageType: 'active', probability: 85, slaHours: 24 },
      { name: 'Delivered', slug: 'delivered', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Lost', slug: 'lost', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  IT_SERVICES: {
    name: 'Sales Pipeline',
    stages: [
      { name: 'Lead', slug: 'lead', color: '#6B7280', stageType: 'entry', probability: 10, slaHours: 24 },
      { name: 'Discovery Call', slug: 'discovery-call', color: '#3B82F6', stageType: 'active', probability: 20, slaHours: 48 },
      { name: 'Requirements Gathering', slug: 'requirements', color: '#8B5CF6', stageType: 'active', probability: 35, slaHours: 120 },
      { name: 'Proposal Sent', slug: 'proposal-sent', color: '#F59E0B', stageType: 'active', probability: 50, slaHours: 72 },
      { name: 'Demo/POC', slug: 'demo-poc', color: '#EC4899', stageType: 'active', probability: 65, slaHours: 168 },
      { name: 'Negotiation', slug: 'negotiation', color: '#14B8A6', stageType: 'active', probability: 80, slaHours: 120 },
      { name: 'Contract Signed', slug: 'contract-signed', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Lost', slug: 'lost', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  RECRUITMENT: {
    name: 'Hiring Pipeline',
    stages: [
      { name: 'New Candidate', slug: 'new-candidate', color: '#6B7280', stageType: 'entry', probability: 10, slaHours: 24 },
      { name: 'Screening', slug: 'screening', color: '#3B82F6', stageType: 'active', probability: 25, slaHours: 48 },
      { name: 'Interview Scheduled', slug: 'interview-scheduled', color: '#8B5CF6', stageType: 'active', probability: 40, slaHours: 72 },
      { name: 'Interview Done', slug: 'interview-done', color: '#F59E0B', stageType: 'active', probability: 55, slaHours: 48 },
      { name: 'Offer Discussion', slug: 'offer-discussion', color: '#EC4899', stageType: 'active', probability: 75, slaHours: 72 },
      { name: 'Offer Sent', slug: 'offer-sent', color: '#14B8A6', stageType: 'active', probability: 85, slaHours: 120 },
      { name: 'Hired', slug: 'hired', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Rejected', slug: 'rejected', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  FINANCE: {
    name: 'Client Pipeline',
    stages: [
      { name: 'Lead', slug: 'lead', color: '#6B7280', stageType: 'entry', probability: 10, slaHours: 24 },
      { name: 'Contacted', slug: 'contacted', color: '#3B82F6', stageType: 'active', probability: 20, slaHours: 48 },
      { name: 'KYC Collection', slug: 'kyc-collection', color: '#8B5CF6', stageType: 'active', probability: 40, slaHours: 72 },
      { name: 'Application', slug: 'application', color: '#F59E0B', stageType: 'active', probability: 55, slaHours: 48 },
      { name: 'Verification', slug: 'verification', color: '#EC4899', stageType: 'active', probability: 70, slaHours: 120 },
      { name: 'Approval', slug: 'approval', color: '#14B8A6', stageType: 'active', probability: 85, slaHours: 72 },
      { name: 'Disbursed', slug: 'disbursed', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Rejected', slug: 'rejected', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  ECOMMERCE: {
    name: 'Customer Pipeline',
    stages: [
      { name: 'New Lead', slug: 'new-lead', color: '#6B7280', stageType: 'entry', probability: 15, slaHours: 12 },
      { name: 'Engaged', slug: 'engaged', color: '#3B82F6', stageType: 'active', probability: 30, slaHours: 24 },
      { name: 'Cart Added', slug: 'cart-added', color: '#8B5CF6', stageType: 'active', probability: 50, slaHours: 12 },
      { name: 'Checkout Started', slug: 'checkout-started', color: '#F59E0B', stageType: 'active', probability: 70, slaHours: 6 },
      { name: 'Order Placed', slug: 'order-placed', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Abandoned', slug: 'abandoned', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
  DEFAULT: {
    name: 'Sales Pipeline',
    stages: [
      { name: 'New Lead', slug: 'new-lead', color: '#6B7280', stageType: 'entry', probability: 10, slaHours: 24 },
      { name: 'Contacted', slug: 'contacted', color: '#3B82F6', stageType: 'active', probability: 20, slaHours: 48 },
      { name: 'Qualified', slug: 'qualified', color: '#8B5CF6', stageType: 'active', probability: 40, slaHours: 72 },
      { name: 'Proposal Sent', slug: 'proposal-sent', color: '#F59E0B', stageType: 'active', probability: 60, slaHours: 120 },
      { name: 'Negotiation', slug: 'negotiation', color: '#EC4899', stageType: 'active', probability: 80, slaHours: 168 },
      { name: 'Won', slug: 'won', color: '#10B981', stageType: 'won', probability: 100, slaHours: null },
      { name: 'Lost', slug: 'lost', color: '#EF4444', stageType: 'lost', probability: 0, slaHours: null },
    ],
  },
};

// Default system roles with comprehensive permissions matching frontend
const defaultSystemRoles: Array<{ name: string; slug: string; permissions: string[] }> = [
  {
    name: 'Admin',
    slug: 'admin',
    permissions: [
      // All permissions - full access
      'roles_view', 'roles_create', 'roles_edit', 'roles_delete',
      'leads_view', 'leads_create', 'leads_edit', 'leads_delete', 'leads_import', 'leads_export', 'leads_assign', 'leads_transfer', 'leads_bulk_update', 'leads_view_all',
      'pipeline_view', 'pipeline_manage_stages', 'pipeline_move_leads', 'pipeline_configure',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record', 'calls_delete', 'calls_monitor', 'calls_barge', 'calls_whisper',
      'voice_ai_view', 'voice_ai_create', 'voice_ai_edit', 'voice_ai_deploy', 'voice_ai_analytics',
      'ivr_view', 'ivr_create', 'ivr_edit', 'ivr_delete', 'ivr_publish',
      'followups_view', 'followups_create', 'followups_edit', 'followups_delete', 'followups_view_team',
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_delete', 'tasks_assign', 'tasks_view_team',
      'campaigns_view', 'campaigns_create', 'campaigns_edit', 'campaigns_delete', 'campaigns_launch', 'campaigns_analytics',
      'admissions_view', 'admissions_create', 'admissions_edit', 'admissions_approve', 'admissions_cancel',
      'fees_view', 'fees_collect', 'fees_edit', 'fees_refund', 'fees_reports', 'fees_configure',
      'courses_view', 'courses_create', 'courses_edit', 'courses_delete',
      'field_view', 'field_checkin', 'field_visits', 'field_expenses', 'field_tracking', 'field_view_team',
      'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_send', 'quotations_approve',
      'whatsapp_view', 'whatsapp_send', 'whatsapp_bulk', 'whatsapp_templates', 'whatsapp_chatbot',
      'email_view', 'email_send', 'email_bulk', 'email_templates', 'email_sequences',
      'sms_view', 'sms_send', 'sms_bulk', 'sms_templates',
      'live_chat_view', 'live_chat_respond', 'live_chat_transfer', 'live_chat_configure',
      'reports_view', 'reports_export', 'reports_user', 'reports_campaign', 'reports_call', 'reports_admission', 'reports_payment', 'reports_custom',
      'analytics_view', 'analytics_ai_scoring', 'analytics_sentiment', 'analytics_predictive', 'analytics_export',
      'dashboard_view', 'dashboard_analytics', 'dashboard_team', 'dashboard_customize',
      'team_view', 'team_create', 'team_edit', 'team_monitor', 'team_targets',
      'users_view', 'users_create', 'users_edit', 'users_delete', 'users_activate', 'users_reset_password',
      'integrations_view', 'integrations_facebook', 'integrations_google', 'integrations_indiamart', 'integrations_justdial', 'integrations_zapier', 'integrations_api',
      'workflows_view', 'workflows_create', 'workflows_edit', 'workflows_delete', 'workflows_activate',
      'gamification_view', 'gamification_configure', 'gamification_rewards',
      'compliance_view', 'compliance_edit', 'audit_logs_view', 'audit_logs_export',
      'settings_view', 'settings_general', 'settings_lead_sources', 'settings_lead_stages', 'settings_custom_fields', 'settings_templates', 'settings_notifications',
      'data_import', 'data_export', 'data_bulk_delete', 'data_deduplication', 'data_backup',
    ],
  },
  {
    name: 'Manager',
    slug: 'manager',
    permissions: [
      'roles_view',
      'leads_view', 'leads_create', 'leads_edit', 'leads_import', 'leads_export', 'leads_assign', 'leads_transfer', 'leads_view_all',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record', 'calls_monitor',
      'voice_ai_view', 'voice_ai_analytics',
      'ivr_view',
      'followups_view', 'followups_create', 'followups_edit', 'followups_view_team',
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign', 'tasks_view_team',
      'campaigns_view', 'campaigns_create', 'campaigns_edit', 'campaigns_analytics',
      'admissions_view', 'admissions_create', 'admissions_edit', 'admissions_approve',
      'fees_view', 'fees_collect', 'fees_edit', 'fees_reports',
      'courses_view',
      'field_view', 'field_view_team',
      'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_send',
      'whatsapp_view', 'whatsapp_send', 'whatsapp_bulk',
      'email_view', 'email_send', 'email_bulk',
      'sms_view', 'sms_send',
      'live_chat_view', 'live_chat_respond', 'live_chat_transfer',
      'reports_view', 'reports_export', 'reports_user', 'reports_campaign', 'reports_call', 'reports_admission', 'reports_payment',
      'analytics_view', 'analytics_ai_scoring',
      'dashboard_view', 'dashboard_analytics', 'dashboard_team',
      'team_view', 'team_monitor', 'team_targets',
      'users_view',
      'integrations_view',
      'workflows_view',
      'gamification_view',
      'compliance_view', 'audit_logs_view',
      'settings_view',
      'data_import', 'data_export',
    ],
  },
  {
    name: 'Team Lead',
    slug: 'team_lead',
    permissions: [
      'leads_view', 'leads_create', 'leads_edit', 'leads_assign', 'leads_view_all',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record', 'calls_monitor',
      'voice_ai_view',
      'followups_view', 'followups_create', 'followups_edit', 'followups_view_team',
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign', 'tasks_view_team',
      'campaigns_view',
      'admissions_view', 'admissions_create', 'admissions_edit',
      'fees_view', 'fees_collect',
      'field_view', 'field_view_team',
      'quotations_view', 'quotations_create', 'quotations_send',
      'whatsapp_view', 'whatsapp_send',
      'email_view', 'email_send',
      'sms_view', 'sms_send',
      'live_chat_view', 'live_chat_respond',
      'reports_view', 'reports_user', 'reports_call',
      'dashboard_view', 'dashboard_team',
      'team_view', 'team_monitor',
      'gamification_view',
    ],
  },
  {
    name: 'Tele Caller',
    slug: 'telecaller',
    permissions: [
      'leads_view', 'leads_edit',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive', 'calls_record',
      'followups_view', 'followups_create', 'followups_edit',
      'tasks_view', 'tasks_create', 'tasks_edit',
      'admissions_view', 'admissions_create',
      'fees_view',
      'whatsapp_view', 'whatsapp_send',
      'email_view', 'email_send',
      'sms_view', 'sms_send',
      'live_chat_view', 'live_chat_respond',
      'dashboard_view',
      'gamification_view',
    ],
  },
  {
    name: 'Field Executive',
    slug: 'field_executive',
    permissions: [
      'leads_view', 'leads_edit',
      'pipeline_view', 'pipeline_move_leads',
      'calls_view', 'calls_make', 'calls_receive',
      'followups_view', 'followups_create', 'followups_edit',
      'tasks_view', 'tasks_create', 'tasks_edit',
      'admissions_view', 'admissions_create',
      'fees_view', 'fees_collect',
      'field_view', 'field_checkin', 'field_visits', 'field_expenses', 'field_tracking',
      'quotations_view', 'quotations_create', 'quotations_send',
      'whatsapp_view', 'whatsapp_send',
      'sms_view', 'sms_send',
      'dashboard_view',
      'gamification_view',
    ],
  },
  {
    name: 'Accounts',
    slug: 'accounts',
    permissions: [
      'leads_view',
      'admissions_view',
      'fees_view', 'fees_collect', 'fees_edit', 'fees_refund', 'fees_reports', 'fees_configure',
      'reports_view', 'reports_export', 'reports_payment', 'reports_admission',
      'dashboard_view',
      'data_export',
    ],
  },
];

// Industry-specific role configurations (additional roles based on industry)
const industryRoles: Record<string, Array<{ name: string; slug: string; permissions: string[] }>> = {
  EDUCATION: [
    // No additional roles - default system roles are sufficient for education CRM
  ],
  REAL_ESTATE: [
    { name: 'Sales Agent', slug: 'sales_agent', permissions: ['leads_view', 'leads_edit', 'calls_view', 'calls_make', 'field_view', 'field_visits', 'quotations_view', 'quotations_create', 'dashboard_view'] },
    { name: 'Site Manager', slug: 'site_manager', permissions: ['leads_view', 'field_view', 'field_view_team', 'field_checkin', 'dashboard_view'] },
  ],
  HEALTHCARE: [
    { name: 'Receptionist', slug: 'receptionist', permissions: ['leads_view', 'leads_create', 'leads_edit', 'calls_view', 'calls_make', 'calls_receive', 'fees_view', 'fees_collect', 'dashboard_view'] },
    { name: 'Coordinator', slug: 'coordinator', permissions: ['leads_view', 'leads_edit', 'followups_view', 'followups_create', 'tasks_view', 'tasks_create', 'dashboard_view'] },
  ],
  INSURANCE: [
    { name: 'Insurance Advisor', slug: 'advisor', permissions: ['leads_view', 'leads_edit', 'calls_view', 'calls_make', 'quotations_view', 'quotations_create', 'quotations_send', 'dashboard_view'] },
    { name: 'Claims Handler', slug: 'claims_handler', permissions: ['leads_view', 'fees_view', 'fees_edit', 'reports_view', 'dashboard_view'] },
  ],
  AUTOMOTIVE: [
    { name: 'Sales Executive', slug: 'sales_exec', permissions: ['leads_view', 'leads_edit', 'calls_view', 'calls_make', 'quotations_view', 'quotations_create', 'dashboard_view'] },
    { name: 'Service Advisor', slug: 'service_advisor', permissions: ['leads_view', 'followups_view', 'followups_create', 'fees_view', 'fees_collect', 'dashboard_view'] },
  ],
  IT_SERVICES: [
    { name: 'Business Development', slug: 'bd', permissions: ['leads_view', 'leads_create', 'leads_edit', 'calls_view', 'calls_make', 'campaigns_view', 'quotations_view', 'quotations_create', 'dashboard_view'] },
    { name: 'Account Manager', slug: 'account_manager', permissions: ['leads_view', 'leads_edit', 'fees_view', 'fees_collect', 'reports_view', 'reports_payment', 'dashboard_view'] },
  ],
  RECRUITMENT: [
    { name: 'Recruiter', slug: 'recruiter', permissions: ['leads_view', 'leads_create', 'leads_edit', 'calls_view', 'calls_make', 'email_view', 'email_send', 'dashboard_view'] },
    { name: 'HR Manager', slug: 'hr_manager', permissions: ['leads_view', 'leads_view_all', 'reports_view', 'reports_user', 'users_view', 'dashboard_view', 'dashboard_team'] },
  ],
  DEFAULT: [],
};

interface LoginInput {
  email: string;
  password: string;
  tenantSlug?: string; // Optional: validate user belongs to this tenant (subdomain)
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: string;
    permissions: string[];
    onboardingCompleted: boolean;
    organizationIndustry: string | null;
  };
  accessToken: string;
  refreshToken: string;
  tenantUrl?: string; // URL with subdomain for redirect
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    // Check if organization slug exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: input.organizationSlug },
    });

    if (existingOrg) {
      throw new ConflictError('Organization with this slug already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 12);

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Determine industry (default to GENERAL)
    const industry = (input.industry || 'GENERAL') as any;

    // Convert industry key to slug format for dynamic industry lookup
    const industrySlug = industry.toLowerCase().replace(/_/g, '-');

    // Look up dynamic industry (may be null if not seeded yet)
    const dynamicIndustry = await prisma.dynamicIndustry.findUnique({
      where: { slug: industrySlug },
      select: { id: true, slug: true },
    });

    // Create organization, admin role, and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Parse team size to set maxUsers limit
      const teamSizeMap: Record<string, number> = {
        '1': 1, '2-5': 5, '6-10': 10, '11-25': 25, '26-50': 50, '51-100': 100, '100+': 500
      };
      const maxUsers = teamSizeMap[input.teamSize || '2-5'] || 5;

      // Create organization with plan, industry, and trial
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: input.organizationSlug,
          email: input.email,
          phone: input.phone,
          contactPerson: `${input.firstName} ${input.lastName}`,
          industry: industry,
          // Link to dynamic industry system (for new organizations)
          dynamicIndustryId: dynamicIndustry?.id || null,
          industrySlug: dynamicIndustry?.slug || industrySlug,
          activePlanId: input.planId || 'starter',
          subscriptionStatus: 'TRIAL',
          trialEndsAt: trialEndsAt,
          maxUsers: maxUsers,
          billingCountry: input.country || 'India',
          currency: input.currency || 'INR',
          settings: {
            teamSize: input.teamSize || '2-5',
            expectedLeadsPerMonth: input.expectedLeadsPerMonth || '100-500',
            country: input.country || 'India',
            currency: input.currency || 'INR',
            onboardingData: {
              registeredAt: new Date().toISOString(),
              registeredBy: input.email,
            },
          },
        },
      });

      // Create all default system roles
      let adminRole: any = null;
      for (const roleConfig of defaultSystemRoles) {
        const role = await tx.role.create({
          data: {
            organizationId: organization.id,
            name: roleConfig.name,
            slug: roleConfig.slug,
            permissions: roleConfig.permissions,
            isSystem: true,
          },
        });
        // Keep reference to admin role for user creation
        if (roleConfig.slug === 'admin') {
          adminRole = role;
        }
      }

      // Create industry-specific roles (non-system, customizable)
      const industrySpecificRoles = industryRoles[input.industry || ''] || industryRoles.DEFAULT;
      for (const roleConfig of industrySpecificRoles) {
        await tx.role.create({
          data: {
            organizationId: organization.id,
            name: roleConfig.name,
            slug: roleConfig.slug,
            permissions: roleConfig.permissions,
            isSystem: false,
          },
        });
      }

      // Create industry-specific pipeline with stages
      // Pipeline = Generic CRM feature, Stages = Industry-specific
      const pipelineTemplate = industryPipelineTemplates[input.industry || ''] || industryPipelineTemplates.DEFAULT;
      const pipelineSlug = pipelineTemplate.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const pipeline = await tx.pipeline.create({
        data: {
          organizationId: organization.id,
          name: pipelineTemplate.name,
          slug: pipelineSlug,
          description: `Default ${pipelineTemplate.name} for ${organization.name}`,
          entityType: 'LEAD',
          color: '#3B82F6',
          isDefault: true,
          isActive: true,
          staleAlertDays: 7,
          allowMultiple: false,
        },
      });

      // Create stages for the pipeline
      for (let i = 0; i < pipelineTemplate.stages.length; i++) {
        const stage = pipelineTemplate.stages[i];
        await tx.pipelineStage.create({
          data: {
            pipelineId: pipeline.id,
            name: stage.name,
            slug: stage.slug,
            color: stage.color,
            stageType: stage.stageType,
            probability: stage.probability,
            order: i + 1,
            slaHours: stage.slaHours,
            isActive: true,
            requiredFields: [],
            autoActions: {},
            exitActions: {},
          },
        });
      }

      // Create default "Headquarters" branch
      const defaultBranch = await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: 'Headquarters',
          code: 'HQ-001',
          isHeadquarters: true,
          isActive: true,
          address: input.country || 'India',
          city: 'Main Office',
          state: input.country || 'India',
          country: input.country || 'India',
          email: input.email,
          phone: input.phone,
        },
      });

      // Create admin user and assign to headquarters branch
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          roleId: adminRole.id,
          branchId: defaultBranch.id,
        },
      });

      return { organization, user, role: adminRole, branch: defaultBranch };
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: result.user.id,
      organizationId: result.organization.id,
      roleSlug: 'admin',
    });

    // Save refresh token
    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    // Generate tenant URL for subdomain redirect
    const tenantUrl = this.getTenantUrl(result.organization.slug);

    // Get admin permissions
    const adminRoleConfig = defaultSystemRoles.find(r => r.slug === 'admin');
    const permissions = adminRoleConfig?.permissions || [];

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        organizationSlug: result.organization.slug,
        role: 'admin',
        permissions,
        onboardingCompleted: false, // New organizations haven't completed onboarding
        organizationIndustry: industry, // Industry selected during registration
      },
      ...tokens,
      tenantUrl,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findFirst({
      where: { email: input.email },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // If tenantSlug provided (subdomain login), validate user belongs to that tenant
    if (input.tenantSlug) {
      if (user.organization.slug !== input.tenantSlug) {
        throw new UnauthorizedError('Invalid email or password'); // Don't reveal user exists in different org
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated');
    }

    if (!user.organization.isActive) {
      throw new UnauthorizedError('Your organization has been deactivated');
    }

    // Check subscription status
    if (user.organization.subscriptionStatus === 'SUSPENDED') {
      throw new UnauthorizedError('Your organization subscription is suspended. Please contact support.');
    }

    if (user.organization.subscriptionStatus === 'EXPIRED') {
      throw new UnauthorizedError('Your organization subscription has expired. Please renew to continue.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      organizationId: user.organizationId,
      roleSlug: user.role.slug,
    });

    // Update refresh token and last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLoginAt: new Date(),
      },
    });

    // Start a work session for tracking
    try {
      await workSessionService.startSession(user.id, user.organizationId);
    } catch (err) {
      console.error('Failed to start work session:', err);
      // Don't fail login if session tracking fails
    }

    // Get onboarding status from organization settings
    const orgSettings = (user.organization.settings as any) || {};
    const onboardingCompleted = orgSettings.onboardingCompleted || false;

    // Generate tenant URL for subdomain redirect
    const tenantUrl = this.getTenantUrl(user.organization.slug);

    // Get permissions from role (stored as JSON array)
    const permissions = (user.role.permissions as string[]) || [];

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        organizationSlug: user.organization.slug,
        role: user.role.slug,
        permissions,
        onboardingCompleted,
        organizationIndustry: user.organization.industry,
      },
      ...tokens,
      tenantUrl,
    };
  }

  /**
   * Generate tenant URL with subdomain
   */
  private getTenantUrl(slug: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      const url = new URL(baseUrl);

      // For localhost, don't add subdomain
      if (url.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
        return baseUrl;
      }

      // Add subdomain
      url.hostname = `${slug}.${url.hostname}`;
      return url.toString().replace(/\/$/, '');
    } catch {
      return baseUrl;
    }
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { role: true },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('User account is deactivated');
      }

      // Generate new tokens
      const tokens = generateTokenPair({
        userId: user.id,
        organizationId: user.organizationId,
        roleSlug: user.role.slug,
      });

      // Update refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, organizationId?: string): Promise<void> {
    // End the work session
    if (organizationId) {
      try {
        await workSessionService.endSession(userId, organizationId);
      } catch (err) {
        console.error('Failed to end work session:', err);
        // Don't fail logout if session tracking fails
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists - return silently
      return;
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save hashed token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      // Clear token if email fails
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        refreshToken: null, // Invalidate existing sessions
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}

export const authService = new AuthService();
