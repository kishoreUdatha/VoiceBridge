/**
 * Lead Stage Templates Configuration
 * Defines industry-specific lead stage templates for the CRM
 * Single Responsibility: Define templates for different industry lead journeys
 */

import { OrganizationIndustry } from '@prisma/client';

export interface LeadStageTemplate {
  name: string;
  slug: string;
  color: string;
  journeyOrder: number;
  icon: string;
  autoSyncStatus?: 'WON' | 'LOST';
  isDefault?: boolean;
}

export interface IndustryLeadStageConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  stages: LeadStageTemplate[];
  lostStage: LeadStageTemplate;
}

export const LEAD_STAGE_TEMPLATES: Record<OrganizationIndustry, IndustryLeadStageConfig> = {
  EDUCATION: {
    label: 'Education',
    description: 'Universities, colleges, and educational institutions',
    icon: 'AcademicCapIcon',
    color: '#10B981',
    stages: [
      { name: 'Inquiry', slug: 'inquiry', color: '#94A3B8', journeyOrder: 1, icon: 'QuestionMarkCircleIcon', isDefault: true },
      { name: 'Interested', slug: 'interested', color: '#3B82F6', journeyOrder: 2, icon: 'SparklesIcon' },
      { name: 'Visit Scheduled', slug: 'visit-scheduled', color: '#6366F1', journeyOrder: 3, icon: 'CalendarIcon' },
      { name: 'Visit Completed', slug: 'visit-completed', color: '#8B5CF6', journeyOrder: 4, icon: 'CheckCircleIcon' },
      { name: 'Documents Pending', slug: 'documents-pending', color: '#F97316', journeyOrder: 5, icon: 'DocumentTextIcon' },
      { name: 'Processing', slug: 'processing', color: '#EAB308', journeyOrder: 6, icon: 'CogIcon' },
      { name: 'Payment Pending', slug: 'payment-pending', color: '#F59E0B', journeyOrder: 7, icon: 'CurrencyRupeeIcon' },
      { name: 'Admitted', slug: 'admitted', color: '#22C55E', journeyOrder: 8, icon: 'CheckBadgeIcon' },
      { name: 'Enrolled', slug: 'enrolled', color: '#10B981', journeyOrder: 9, icon: 'AcademicCapIcon', autoSyncStatus: 'WON' },
    ],
    lostStage: { name: 'Dropped', slug: 'dropped', color: '#EF4444', journeyOrder: -1, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  },

  REAL_ESTATE: {
    label: 'Real Estate',
    description: 'Property sales, rentals, and real estate agencies',
    icon: 'BuildingOffice2Icon',
    color: '#F97316',
    stages: [
      { name: 'New Inquiry', slug: 'new-inquiry', color: '#94A3B8', journeyOrder: 1, icon: 'InboxIcon', isDefault: true },
      { name: 'Requirements', slug: 'requirements', color: '#3B82F6', journeyOrder: 2, icon: 'ClipboardDocumentListIcon' },
      { name: 'Site Visit Scheduled', slug: 'site-visit-scheduled', color: '#6366F1', journeyOrder: 3, icon: 'CalendarIcon' },
      { name: 'Site Visit Done', slug: 'site-visit-done', color: '#8B5CF6', journeyOrder: 4, icon: 'MapPinIcon' },
      { name: 'Negotiation', slug: 'negotiation', color: '#EAB308', journeyOrder: 5, icon: 'ScaleIcon' },
      { name: 'Documentation', slug: 'documentation', color: '#F59E0B', journeyOrder: 6, icon: 'DocumentTextIcon' },
      { name: 'Deal Closed', slug: 'deal-closed', color: '#10B981', journeyOrder: 7, icon: 'HomeModernIcon', autoSyncStatus: 'WON' },
    ],
    lostStage: { name: 'Lost', slug: 'lost', color: '#EF4444', journeyOrder: -1, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  },

  HEALTHCARE: {
    label: 'Healthcare',
    description: 'Hospitals, clinics, and healthcare providers',
    icon: 'HeartIcon',
    color: '#EC4899',
    stages: [
      { name: 'Inquiry', slug: 'inquiry', color: '#94A3B8', journeyOrder: 1, icon: 'PhoneIcon', isDefault: true },
      { name: 'Appointment Scheduled', slug: 'appointment-scheduled', color: '#3B82F6', journeyOrder: 2, icon: 'CalendarIcon' },
      { name: 'Consultation', slug: 'consultation', color: '#6366F1', journeyOrder: 3, icon: 'UserIcon' },
      { name: 'Tests/Diagnostics', slug: 'tests-diagnostics', color: '#8B5CF6', journeyOrder: 4, icon: 'BeakerIcon' },
      { name: 'Treatment Planned', slug: 'treatment-planned', color: '#EAB308', journeyOrder: 5, icon: 'ClipboardDocumentCheckIcon' },
      { name: 'In Treatment', slug: 'in-treatment', color: '#F59E0B', journeyOrder: 6, icon: 'HeartIcon' },
      { name: 'Completed', slug: 'completed', color: '#10B981', journeyOrder: 7, icon: 'CheckCircleIcon', autoSyncStatus: 'WON' },
    ],
    lostStage: { name: 'Cancelled', slug: 'cancelled', color: '#EF4444', journeyOrder: -1, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  },

  INSURANCE: {
    label: 'Insurance',
    description: 'Insurance companies and agents',
    icon: 'ShieldCheckIcon',
    color: '#6366F1',
    stages: [
      { name: 'Lead', slug: 'lead', color: '#94A3B8', journeyOrder: 1, icon: 'UserPlusIcon', isDefault: true },
      { name: 'Needs Analysis', slug: 'needs-analysis', color: '#3B82F6', journeyOrder: 2, icon: 'ClipboardDocumentListIcon' },
      { name: 'Quote Sent', slug: 'quote-sent', color: '#6366F1', journeyOrder: 3, icon: 'DocumentTextIcon' },
      { name: 'Proposal Accepted', slug: 'proposal-accepted', color: '#8B5CF6', journeyOrder: 4, icon: 'HandThumbUpIcon' },
      { name: 'Documents', slug: 'documents', color: '#EAB308', journeyOrder: 5, icon: 'FolderIcon' },
      { name: 'Underwriting', slug: 'underwriting', color: '#F59E0B', journeyOrder: 6, icon: 'ShieldCheckIcon' },
      { name: 'Payment', slug: 'payment', color: '#22C55E', journeyOrder: 7, icon: 'CreditCardIcon' },
      { name: 'Policy Issued', slug: 'policy-issued', color: '#10B981', journeyOrder: 8, icon: 'DocumentCheckIcon', autoSyncStatus: 'WON' },
    ],
    lostStage: { name: 'Rejected', slug: 'rejected', color: '#EF4444', journeyOrder: -1, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  },

  FINANCE: {
    label: 'Finance',
    description: 'Banks, NBFCs, and financial services',
    icon: 'BanknotesIcon',
    color: '#10B981',
    stages: [
      { name: 'Inquiry', slug: 'inquiry', color: '#94A3B8', journeyOrder: 1, icon: 'PhoneIcon', isDefault: true },
      { name: 'KYC Pending', slug: 'kyc-pending', color: '#3B82F6', journeyOrder: 2, icon: 'IdentificationIcon' },
      { name: 'Documents Submitted', slug: 'documents-submitted', color: '#6366F1', journeyOrder: 3, icon: 'DocumentTextIcon' },
      { name: 'Credit Check', slug: 'credit-check', color: '#8B5CF6', journeyOrder: 4, icon: 'ClipboardDocumentCheckIcon' },
      { name: 'Approval Pending', slug: 'approval-pending', color: '#EAB308', journeyOrder: 5, icon: 'ClockIcon' },
      { name: 'Approved', slug: 'approved', color: '#22C55E', journeyOrder: 6, icon: 'CheckCircleIcon' },
      { name: 'Disbursed', slug: 'disbursed', color: '#10B981', journeyOrder: 7, icon: 'BanknotesIcon', autoSyncStatus: 'WON' },
    ],
    lostStage: { name: 'Rejected', slug: 'rejected', color: '#EF4444', journeyOrder: -1, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  },

  IT_RECRUITMENT: {
    label: 'IT Recruitment',
    description: 'Tech staffing and recruitment agencies',
    icon: 'ComputerDesktopIcon',
    color: '#8B5CF6',
    stages: [
      { name: 'Sourced', slug: 'sourced', color: '#94A3B8', journeyOrder: 1, icon: 'UserPlusIcon', isDefault: true },
      { name: 'Screening', slug: 'screening', color: '#3B82F6', journeyOrder: 2, icon: 'PhoneIcon' },
      { name: 'Technical Round', slug: 'technical-round', color: '#6366F1', journeyOrder: 3, icon: 'CodeBracketIcon' },
      { name: 'HR Round', slug: 'hr-round', color: '#8B5CF6', journeyOrder: 4, icon: 'UserGroupIcon' },
      { name: 'Offer Extended', slug: 'offer-extended', color: '#EAB308', journeyOrder: 5, icon: 'EnvelopeIcon' },
      { name: 'Offer Accepted', slug: 'offer-accepted', color: '#22C55E', journeyOrder: 6, icon: 'HandThumbUpIcon' },
      { name: 'Joined', slug: 'joined', color: '#10B981', journeyOrder: 7, icon: 'BriefcaseIcon', autoSyncStatus: 'WON' },
    ],
    lostStage: { name: 'Rejected', slug: 'rejected', color: '#EF4444', journeyOrder: -1, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  },

  ECOMMERCE: {
    label: 'E-Commerce',
    description: 'Online stores and retail businesses',
    icon: 'ShoppingCartIcon',
    color: '#F59E0B',
    stages: [
      { name: 'Browsing', slug: 'browsing', color: '#94A3B8', journeyOrder: 1, icon: 'EyeIcon', isDefault: true },
      { name: 'Cart Added', slug: 'cart-added', color: '#3B82F6', journeyOrder: 2, icon: 'ShoppingCartIcon' },
      { name: 'Checkout Started', slug: 'checkout-started', color: '#6366F1', journeyOrder: 3, icon: 'CreditCardIcon' },
      { name: 'Payment Pending', slug: 'payment-pending', color: '#EAB308', journeyOrder: 4, icon: 'ClockIcon' },
      { name: 'Order Placed', slug: 'order-placed', color: '#22C55E', journeyOrder: 5, icon: 'CheckCircleIcon' },
      { name: 'Delivered', slug: 'delivered', color: '#10B981', journeyOrder: 6, icon: 'TruckIcon', autoSyncStatus: 'WON' },
    ],
    lostStage: { name: 'Abandoned', slug: 'abandoned', color: '#EF4444', journeyOrder: -1, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  },

  GENERAL: {
    label: 'General',
    description: 'Generic sales pipeline for any business',
    icon: 'BuildingOfficeIcon',
    color: '#6B7280',
    stages: [
      { name: 'New', slug: 'new', color: '#94A3B8', journeyOrder: 1, icon: 'SparklesIcon', isDefault: true },
      { name: 'Contacted', slug: 'contacted', color: '#3B82F6', journeyOrder: 2, icon: 'PhoneIcon' },
      { name: 'Qualified', slug: 'qualified', color: '#6366F1', journeyOrder: 3, icon: 'CheckCircleIcon' },
      { name: 'Proposal', slug: 'proposal', color: '#8B5CF6', journeyOrder: 4, icon: 'DocumentTextIcon' },
      { name: 'Negotiation', slug: 'negotiation', color: '#EAB308', journeyOrder: 5, icon: 'ScaleIcon' },
      { name: 'Won', slug: 'won', color: '#10B981', journeyOrder: 6, icon: 'TrophyIcon', autoSyncStatus: 'WON' },
    ],
    lostStage: { name: 'Lost', slug: 'lost', color: '#EF4444', journeyOrder: -1, icon: 'XCircleIcon', autoSyncStatus: 'LOST' },
  },
};

/**
 * Get all available industry options for display
 */
export function getIndustryOptions() {
  return Object.entries(LEAD_STAGE_TEMPLATES).map(([key, config]) => ({
    value: key as OrganizationIndustry,
    label: config.label,
    description: config.description,
    icon: config.icon,
    color: config.color,
    stageCount: config.stages.length + 1, // +1 for lost stage
  }));
}

/**
 * Get stage templates for a specific industry
 */
export function getStageTemplatesForIndustry(industry: OrganizationIndustry): LeadStageTemplate[] {
  const config = LEAD_STAGE_TEMPLATES[industry];
  return [...config.stages, config.lostStage];
}
