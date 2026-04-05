/**
 * Industry Stages Constants
 * Frontend configuration for industry-specific lead journeys
 */

export type OrganizationIndustry =
  | 'EDUCATION'
  | 'REAL_ESTATE'
  | 'HEALTHCARE'
  | 'INSURANCE'
  | 'FINANCE'
  | 'IT_RECRUITMENT'
  | 'ECOMMERCE'
  | 'GENERAL';

export interface IndustryConfig {
  value: OrganizationIndustry;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
  journeyTitle: string;
  wonLabel: string;
  lostLabel: string;
}

export const INDUSTRY_CONFIGS: Record<OrganizationIndustry, IndustryConfig> = {
  EDUCATION: {
    value: 'EDUCATION',
    label: 'Education',
    description: 'Universities, colleges, and educational institutions',
    icon: 'AcademicCapIcon',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    journeyTitle: 'Admission Journey',
    wonLabel: 'Enrolled',
    lostLabel: 'Dropped',
  },
  REAL_ESTATE: {
    value: 'REAL_ESTATE',
    label: 'Real Estate',
    description: 'Property sales, rentals, and real estate agencies',
    icon: 'BuildingOffice2Icon',
    color: '#F97316',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    journeyTitle: 'Property Journey',
    wonLabel: 'Deal Closed',
    lostLabel: 'Lost',
  },
  HEALTHCARE: {
    value: 'HEALTHCARE',
    label: 'Healthcare',
    description: 'Hospitals, clinics, and healthcare providers',
    icon: 'HeartIcon',
    color: '#EC4899',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    journeyTitle: 'Patient Journey',
    wonLabel: 'Completed',
    lostLabel: 'Cancelled',
  },
  INSURANCE: {
    value: 'INSURANCE',
    label: 'Insurance',
    description: 'Insurance companies and agents',
    icon: 'ShieldCheckIcon',
    color: '#6366F1',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    journeyTitle: 'Policy Journey',
    wonLabel: 'Policy Issued',
    lostLabel: 'Rejected',
  },
  FINANCE: {
    value: 'FINANCE',
    label: 'Finance',
    description: 'Banks, NBFCs, and financial services',
    icon: 'BanknotesIcon',
    color: '#10B981',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    journeyTitle: 'Loan Journey',
    wonLabel: 'Disbursed',
    lostLabel: 'Rejected',
  },
  IT_RECRUITMENT: {
    value: 'IT_RECRUITMENT',
    label: 'IT Recruitment',
    description: 'Tech staffing and recruitment agencies',
    icon: 'ComputerDesktopIcon',
    color: '#8B5CF6',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    journeyTitle: 'Hiring Journey',
    wonLabel: 'Joined',
    lostLabel: 'Rejected',
  },
  ECOMMERCE: {
    value: 'ECOMMERCE',
    label: 'E-Commerce',
    description: 'Online stores and retail businesses',
    icon: 'ShoppingCartIcon',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    journeyTitle: 'Purchase Journey',
    wonLabel: 'Delivered',
    lostLabel: 'Abandoned',
  },
  GENERAL: {
    value: 'GENERAL',
    label: 'General',
    description: 'Generic sales pipeline for any business',
    icon: 'BuildingOfficeIcon',
    color: '#6B7280',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    journeyTitle: 'Sales Pipeline',
    wonLabel: 'Won',
    lostLabel: 'Lost',
  },
};

export interface LeadStage {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  journeyOrder: number | null;
  icon: string | null;
  autoSyncStatus: string | null;
  isSystemStage: boolean;
  isDefault: boolean;
  isActive: boolean;
}

/**
 * Get industry config by value
 */
export function getIndustryConfig(industry: OrganizationIndustry): IndustryConfig {
  return INDUSTRY_CONFIGS[industry] || INDUSTRY_CONFIGS.GENERAL;
}

/**
 * Get all industry options for selection
 */
export function getIndustryOptions(): IndustryConfig[] {
  return Object.values(INDUSTRY_CONFIGS);
}

/**
 * Check if a stage is a "lost" stage (negative journey order)
 */
export function isLostStage(stage: LeadStage): boolean {
  return (stage.journeyOrder || 0) < 0 || stage.autoSyncStatus === 'LOST';
}

/**
 * Check if a stage is a "won" stage
 */
export function isWonStage(stage: LeadStage): boolean {
  return stage.autoSyncStatus === 'WON';
}

/**
 * Separate progress stages from lost stage
 */
export function separateStages(stages: LeadStage[]): {
  progressStages: LeadStage[];
  lostStage: LeadStage | null;
} {
  const progressStages = stages.filter((s) => !isLostStage(s)).sort((a, b) => (a.journeyOrder || 0) - (b.journeyOrder || 0));
  const lostStage = stages.find((s) => isLostStage(s)) || null;
  return { progressStages, lostStage };
}

/**
 * Get step number for a stage in the journey
 */
export function getStageStep(stage: LeadStage, allStages: LeadStage[]): number {
  const { progressStages } = separateStages(allStages);
  const index = progressStages.findIndex((s) => s.id === stage.id);
  return index >= 0 ? index + 1 : -1;
}
