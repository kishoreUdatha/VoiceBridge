import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { usePermission } from '../hooks/usePermission';
import LanguageSwitcher from '../components/LanguageSwitcher';
import VoiceMinutesIndicator from '../components/VoiceMinutesIndicator';
import { workSessionService, WorkSession, TeamWorkStatus } from '../services/work-session.service';
import FloatingChatButton from '../components/FloatingChatButton';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
  MegaphoneIcon,
  PhoneIcon,
  SparklesIcon,
  BellIcon,
  Cog6ToothIcon,
  QueueListIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathRoundedSquareIcon,
  KeyIcon,
  PresentationChartLineIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  FunnelIcon,
  TrophyIcon,
  MagnifyingGlassCircleIcon,
  BoltIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  CurrencyRupeeIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  ClipboardDocumentCheckIcon,
  ArrowsRightLeftIcon,
  ArrowTrendingUpIcon,
  InboxIcon,
  ClockIcon,
  AtSymbolIcon,
  CalendarIcon,
  ArrowsUpDownIcon,
  FlagIcon,
  TagIcon,
  PauseCircleIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[]; // Which roles can see this item (legacy)
  permission?: string; // Required permission to see this item
}

// WhatsApp Icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ===========================================
// NAVIGATION - Dynamic Industry-Specific Menus
// ===========================================

// Industry types
type Industry = 'EDUCATION' | 'REAL_ESTATE' | 'HEALTHCARE' | 'INSURANCE' | 'FINANCE' | 'RECRUITMENT' | 'ECOMMERCE' | 'AUTOMOTIVE' | 'IT_SERVICES' | 'GENERIC' | string;

// Industry-specific labels for dynamic terminology
const industryLabels: Record<string, { lead: string; leads: string; deal: string; pipeline: string; team: string }> = {
  EDUCATION: { lead: 'Student', leads: 'Students', deal: 'Admission', pipeline: 'Admission Pipeline', team: 'Counselors' },
  REAL_ESTATE: { lead: 'Buyer', leads: 'Buyers', deal: 'Booking', pipeline: 'Sales Pipeline', team: 'Agents' },
  HEALTHCARE: { lead: 'Patient', leads: 'Patients', deal: 'Appointment', pipeline: 'Patient Pipeline', team: 'Staff' },
  INSURANCE: { lead: 'Prospect', leads: 'Prospects', deal: 'Policy', pipeline: 'Policy Pipeline', team: 'Advisors' },
  AUTOMOTIVE: { lead: 'Buyer', leads: 'Buyers', deal: 'Sale', pipeline: 'Sales Pipeline', team: 'Sales Team' },
  IT_SERVICES: { lead: 'Client', leads: 'Clients', deal: 'Project', pipeline: 'Project Pipeline', team: 'Team' },
  RECRUITMENT: { lead: 'Candidate', leads: 'Candidates', deal: 'Placement', pipeline: 'Hiring Pipeline', team: 'Recruiters' },
  FINANCE: { lead: 'Client', leads: 'Clients', deal: 'Account', pipeline: 'Client Pipeline', team: 'Advisors' },
  ECOMMERCE: { lead: 'Customer', leads: 'Customers', deal: 'Order', pipeline: 'Order Pipeline', team: 'Support' },
  GENERIC: { lead: 'Lead', leads: 'Leads', deal: 'Deal', pipeline: 'Pipeline', team: 'Team' },
};

// Define which sections are relevant for each industry
const industrySections: Record<string, string[]> = {
  EDUCATION: ['main', 'education', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
  REAL_ESTATE: ['main', 'realestate', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
  HEALTHCARE: ['main', 'healthcare', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
  INSURANCE: ['main', 'insurance', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
  AUTOMOTIVE: ['main', 'automotive', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
  IT_SERVICES: ['main', 'itservices', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
  RECRUITMENT: ['main', 'recruitment', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
  FINANCE: ['main', 'sales', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
  ECOMMERCE: ['main', 'sales', 'communication', 'data', 'analytics', 'team', 'integrations', 'settings'],
  GENERIC: ['main', 'sales', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'],
};

// Helper to get label based on industry
const getLabel = (industry: string, key: keyof typeof industryLabels.GENERIC) => {
  const labels = industryLabels[industry?.toUpperCase()] || industryLabels.GENERIC;
  return labels[key];
};

// ============================================
// 1. MAIN - Core workflow (dynamic labels)
// ============================================
const getMainNavigation = (industry: string): NavItem[] => [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'counselor', 'telecaller'] }, // No permission needed - all authenticated users
  { name: 'Platform Admin', href: '/super-admin/dashboard', icon: ShieldCheckIcon, roles: ['super_admin'], permission: 'super_admin' },
  { name: 'My Tasks', href: '/assigned-data', icon: ClipboardDocumentCheckIcon, roles: ['telecaller', 'counselor'], permission: 'tasks_view' },
  { name: getLabel(industry, 'leads'), href: '/leads', icon: UserGroupIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'counselor', 'telecaller'], permission: 'leads_view' },
  { name: getLabel(industry, 'pipeline'), href: '/pipeline', icon: FunnelIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
];

// ============================================
// EDUCATION - Admissions & Academic
// ============================================
const educationNavigation: NavItem[] = [
  { name: 'Universities', href: '/universities', icon: BuildingOffice2Icon, roles: ['super_admin', 'admin', 'manager'], permission: 'settings_view' },
  { name: 'Courses', href: '/courses', icon: AcademicCapIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'settings_view' },
  { name: 'Applications', href: '/admissions', icon: ClipboardDocumentCheckIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'counselor'], permission: 'admissions_view' },
  { name: 'Campus Visits', href: '/student-visits', icon: MapPinIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'counselor'], permission: 'admissions_view' },
  { name: 'Fee Collection', href: '/fees', icon: BanknotesIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'fees_view' },
  { name: 'Scholarships', href: '/scholarships', icon: AcademicCapIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'fees_view' },
  { name: 'Commission', href: '/commissions', icon: CurrencyRupeeIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'counselor', 'telecaller'] },
];

// ============================================
// REAL ESTATE - Properties & Bookings
// ============================================
const realEstateNavigation: NavItem[] = [
  { name: 'Properties', href: '/properties', icon: BuildingOffice2Icon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'settings_view' },
  { name: 'Site Visits', href: '/site-visits', icon: MapPinIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'field_sales'], permission: 'leads_view' },
  { name: 'Bookings', href: '/bookings', icon: ClipboardDocumentCheckIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_view' },
  { name: 'Inventory', href: '/inventory', icon: QueueListIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'settings_view' },
  { name: 'Brokerage', href: '/brokerage', icon: CurrencyRupeeIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'fees_view' },
];

// ============================================
// HEALTHCARE - Patients & Appointments
// ============================================
const healthcareNavigation: NavItem[] = [
  { name: 'Appointments', href: '/appointments', icon: CalendarIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Consultations', href: '/consultations', icon: ChatBubbleLeftRightIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_view' },
  { name: 'Follow-up Care', href: '/patient-followups', icon: ArrowPathRoundedSquareIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'followups_view' },
  { name: 'Billing', href: '/patient-billing', icon: CreditCardIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'fees_view' },
];

// ============================================
// INSURANCE - Policies & Claims
// ============================================
const insuranceNavigation: NavItem[] = [
  { name: 'Policies', href: '/policies', icon: DocumentTextIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Quotations', href: '/quotations', icon: ReceiptPercentIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Claims', href: '/claims', icon: ClipboardDocumentCheckIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_view' },
  { name: 'Renewals', href: '/renewals', icon: ArrowPathRoundedSquareIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'followups_view' },
  { name: 'Commission', href: '/commissions', icon: CurrencyRupeeIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'counselor', 'telecaller'] },
];

// ============================================
// AUTOMOTIVE - Vehicles & Test Drives
// ============================================
const automotiveNavigation: NavItem[] = [
  { name: 'Vehicles', href: '/vehicles', icon: BriefcaseIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'settings_view' },
  { name: 'Test Drives', href: '/test-drives', icon: MapPinIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Quotations', href: '/quotations', icon: DocumentTextIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Bookings', href: '/vehicle-bookings', icon: ClipboardDocumentCheckIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_view' },
  { name: 'Exchange', href: '/exchange', icon: ArrowsRightLeftIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_view' },
];

// ============================================
// IT SERVICES - Projects & Clients
// ============================================
const itServicesNavigation: NavItem[] = [
  { name: 'Projects', href: '/projects', icon: BriefcaseIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Proposals', href: '/proposals', icon: DocumentTextIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Contracts', href: '/contracts', icon: ClipboardDocumentCheckIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_view' },
  { name: 'Invoicing', href: '/invoicing', icon: ReceiptPercentIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'fees_view' },
  { name: 'Support Tickets', href: '/tickets', icon: ChatBubbleLeftRightIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
];

// ============================================
// RECRUITMENT - Candidates & Placements
// ============================================
const recruitmentNavigation: NavItem[] = [
  { name: 'Job Openings', href: '/jobs', icon: BriefcaseIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'settings_view' },
  { name: 'Applications', href: '/applications', icon: DocumentTextIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Interviews', href: '/interviews', icon: CalendarIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Placements', href: '/placements', icon: ClipboardDocumentCheckIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_view' },
  { name: 'Clients', href: '/hiring-clients', icon: BuildingOffice2Icon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_view' },
];

// ============================================
// GENERIC SALES - Default for other industries
// ============================================
const salesNavigation: NavItem[] = [
  { name: 'Quotations', href: '/quotations', icon: DocumentTextIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_view' },
  { name: 'Payments', href: '/payments', icon: CreditCardIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'fees_view' },
  { name: 'Invoices', href: '/invoices', icon: ReceiptPercentIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'fees_view' },
];

// ============================================
// COMMON SECTIONS (All Industries)
// ============================================

// Communication - Outreach & Messaging
const communicationNavigation: NavItem[] = [
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'campaigns_view' },
  { name: 'WhatsApp', href: '/whatsapp/bulk', icon: WhatsAppIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'whatsapp_view' },
  { name: 'Templates', href: '/templates', icon: DocumentTextIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'settings_view' },
  { name: 'Follow-ups', href: '/reports/followup', icon: ArrowPathRoundedSquareIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'telecaller'], permission: 'followups_view' },
];

// Calling - Voice & AI Calls
const voiceAINavigation: NavItem[] = [
  { name: 'Outbound Calls', href: '/outbound-calls', icon: PhoneIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'telecaller', 'counselor'] }, // All roles - has AI analysis
  { name: 'AI Voice Agents', href: '/voice-ai', icon: SparklesIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'voice_ai_view' },
  { name: 'Call Queue', href: '/telecaller-queue', icon: QueueListIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'calls_view' },
  { name: 'Call Monitoring', href: '/call-monitoring', icon: PhoneIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'calls_view' },
];

// Data - Import & Management
const dataNavigation: NavItem[] = [
  { name: 'Import Data', href: '/raw-imports', icon: DocumentArrowUpIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_import' },
  { name: 'Distribution', href: '/assignments', icon: ShareIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'leads_assign' },
  { name: 'Export Data', href: '/export', icon: ArrowDownTrayIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'leads_export' },
];

// Reports - Analytics & Insights (consolidated - all reports accessible from main page)
const getAnalyticsNavigation = (industry: string): NavItem[] => [
  { name: 'All Reports', href: '/reports', icon: ChartBarIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'reports_view' },
  { name: 'Payments', href: '/reports/payments', icon: CurrencyRupeeIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'reports_view' },
  { name: 'Audit Logs', href: '/reports/audit', icon: EyeIcon, roles: ['super_admin', 'admin'], permission: 'reports_view' },
];

// Team - Users & Management
const getTeamNavigation = (industry: string): NavItem[] => [
  { name: `All ${getLabel(industry, 'team')}`, href: '/users', icon: UsersIcon, roles: ['super_admin', 'admin'], permission: 'users_view' },
  { name: 'Roles & Access', href: '/roles', icon: ShieldCheckIcon, roles: ['super_admin', 'admin'], permission: 'roles_view' },
  { name: 'My Team', href: '/team-management', icon: UserGroupIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead'], permission: 'users_view' },
  { name: 'Leaderboard', href: '/performance', icon: TrophyIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'telecaller'], permission: 'reports_view' },
];

// Integrations - External Connections
const integrationsNavigation: NavItem[] = [
  { name: 'Facebook/Google Ads', href: '/ad-integrations', icon: MegaphoneIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'integrations_view' },
  { name: 'Lead Sources', href: '/integrations/indian-sources', icon: ArrowDownTrayIcon, roles: ['super_admin', 'admin', 'manager'], permission: 'integrations_view' },
  { name: 'Email', href: '/settings/email', icon: AtSymbolIcon, roles: ['super_admin', 'admin'], permission: 'integrations_view' },
  { name: 'SMS', href: '/settings/sms', icon: ChatBubbleLeftRightIcon, roles: ['super_admin', 'admin'], permission: 'integrations_view' },
  { name: 'WhatsApp', href: '/settings/whatsapp', icon: WhatsAppIcon, roles: ['super_admin', 'admin'], permission: 'integrations_view' },
  { name: 'Google Calendar', href: '/settings/calendar', icon: CalendarIcon, roles: ['super_admin', 'admin'], permission: 'integrations_view' },
  { name: 'Razorpay', href: '/settings/razorpay', icon: CreditCardIcon, roles: ['super_admin', 'admin'], permission: 'integrations_view' },
  { name: 'Webhooks', href: '/api-keys/webhooks', icon: ArrowsRightLeftIcon, roles: ['super_admin', 'admin'], permission: 'integrations_view' },
];

// Settings - Configuration
const settingsNavigation: NavItem[] = [
  { name: 'All Settings', href: '/settings', icon: Cog6ToothIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'telecaller', 'counselor'], permission: 'settings_view' },
  { name: 'Profile', href: '/settings/profile', icon: UsersIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'telecaller', 'counselor'] }, // No permission needed - everyone can edit their profile
  { name: 'Pipeline', href: '/settings/pipeline', icon: FunnelIcon, roles: ['super_admin', 'admin'], permission: 'settings_general' },
  { name: 'Lead Tags', href: '/settings/tags', icon: TagIcon, roles: ['super_admin', 'admin'], permission: 'settings_general' },
  { name: 'Commission', href: '/settings/commission', icon: CurrencyRupeeIcon, roles: ['super_admin', 'admin'], permission: 'settings_general' },
  { name: 'Notifications', href: '/settings/notification-preferences', icon: BellIcon, roles: ['super_admin', 'admin', 'manager', 'team_lead', 'telecaller', 'counselor'] }, // Everyone can manage their notifications
  { name: 'Billing', href: '/subscription', icon: CreditCardIcon, roles: ['super_admin', 'admin'], permission: 'settings_general' },
];

// Get industry-specific navigation based on industry type
const getIndustryNavigation = (industry: string): NavItem[] => {
  switch (industry?.toUpperCase()) {
    case 'EDUCATION': return educationNavigation;
    case 'REAL_ESTATE': return realEstateNavigation;
    case 'HEALTHCARE': return healthcareNavigation;
    case 'INSURANCE': return insuranceNavigation;
    case 'AUTOMOTIVE': return automotiveNavigation;
    case 'IT_SERVICES': return itServicesNavigation;
    case 'RECRUITMENT': return recruitmentNavigation;
    default: return salesNavigation;
  }
};

// Get industry section title
const getIndustrySectionTitle = (industry: string): string => {
  switch (industry?.toUpperCase()) {
    case 'EDUCATION': return 'Admissions';
    case 'REAL_ESTATE': return 'Properties';
    case 'HEALTHCARE': return 'Patient Care';
    case 'INSURANCE': return 'Policies';
    case 'AUTOMOTIVE': return 'Showroom';
    case 'IT_SERVICES': return 'Projects';
    case 'RECRUITMENT': return 'Hiring';
    default: return 'Sales';
  }
};

// Legacy navigation arrays for backward compatibility
const mainNavigation = getMainNavigation('GENERIC');
const analyticsNavigation = getAnalyticsNavigation('GENERIC');
const teamNavigation = getTeamNavigation('GENERIC');
const fieldSalesNavigation = realEstateNavigation;
const admissionsNavigation = educationNavigation;

// Routes where top header should be hidden
const headerHiddenRoutes = ['/voice-ai/create', '/voice-ai/create-from-template', '/voice-ai/agents', '/call-flows/builder'];

// Sidebar scroll position persistence key
const SIDEBAR_SCROLL_KEY = 'sidebarScrollPosition';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [workStatus, setWorkStatus] = useState<'active' | 'break' | 'offline'>('active');
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [breakDuration, setBreakDuration] = useState<number>(0);
  const [teamStatus, setTeamStatus] = useState<TeamWorkStatus | null>(null);
  const [showTeamStatus, setShowTeamStatus] = useState(false);
  // Collapsible sidebar state - persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  // Collapsible section states - persisted in localStorage
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('navExpandedSections');
    return saved ? JSON.parse(saved) : { sales: true, communication: false, voiceAI: true, data: false, analytics: false, team: false, integrations: false, settings: false, fieldSales: false, admissions: false };
  });
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation(['navigation', 'common']);

  // Permission hook for checking user permissions
  const { hasPermission, isAdmin: permIsAdmin, isManager: permIsManager, isTeamLead: permIsTeamLead, role } = usePermission();

  // Get user's role slug (lowercase) - needed early for team status fetch
  const rawRole = user?.role || '';
  const userRole = rawRole.toLowerCase().trim().replace(/[_-]/g, '');
  const isSuperAdmin = userRole === 'superadmin' || role === 'super_admin';
  const isOrgAdmin = userRole === 'orgadmin' || userRole === 'organizationadmin' || role === 'org_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin || isOrgAdmin || permIsAdmin;
  const isManager = userRole === 'manager' || permIsManager;
  const isTeamLead = userRole === 'teamlead' || userRole === 'teamleader' || permIsTeamLead;

  // Callback ref for sidebar scroll - restores position when element mounts
  const sidebarRefCallback = (node: HTMLElement | null) => {
    if (node) {
      // Restore saved scroll position
      const savedScroll = parseInt(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || '0', 10);
      node.scrollTop = savedScroll;

      // Attach scroll listener
      const handleScroll = () => {
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(node.scrollTop));
      };
      node.addEventListener('scroll', handleScroll);
    }
  };

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Persist expanded sections state
  useEffect(() => {
    localStorage.setItem('navExpandedSections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  // Scroll main content to top on route change (sidebar scroll is preserved via callback ref)
  // Also close any open dropdowns when navigating
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Close dropdowns when route changes
    setShowUserMenu(false);
    setShowTeamStatus(false);
  }, [location.pathname]);

  // Function to check and update session status
  const checkSessionStatus = useCallback(async () => {
    try {
      const session = await workSessionService.getCurrentSession();
      console.log('[WorkSession] Current session:', session);
      console.log('[WorkSession] Session status:', session?.status);
      console.log('[WorkSession] Session breaks:', session?.breaks);

      if (session) {
        setCurrentSession(session);
        if (session.status === 'ON_BREAK') {
          setWorkStatus('break');
          // Get break start time from session.breaks array (active breaks)
          if (session.breaks && session.breaks.length > 0) {
            const activeBreak = session.breaks[0]; // First active break
            console.log('[WorkSession] Active break:', activeBreak);
            console.log('[WorkSession] Break startedAt:', activeBreak.startedAt);
            const startTime = new Date(activeBreak.startedAt);
            console.log('[WorkSession] Parsed start time:', startTime);
            setBreakStartTime(startTime);
            // Calculate duration immediately
            const now = new Date();
            const durationSec = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            console.log('[WorkSession] Immediate duration:', durationSec);
            setBreakDuration(durationSec);
          } else {
            console.log('[WorkSession] No breaks in session, fetching from API...');
            // Fallback: fetch breaks separately
            try {
              const breaks = await workSessionService.getBreaks();
              const activeBreak = breaks.find(b => !b.endedAt);
              if (activeBreak) {
                console.log('[WorkSession] Found active break from API:', activeBreak);
                const startTime = new Date(activeBreak.startedAt);
                setBreakStartTime(startTime);
                // Calculate duration immediately
                const now = new Date();
                const durationSec = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                setBreakDuration(durationSec);
              }
            } catch (e) {
              console.error('[WorkSession] Failed to fetch breaks:', e);
            }
          }
        } else {
          setWorkStatus('active');
          setBreakStartTime(null);
        }
      }
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
  }, []);

  // Check current work session status on load and when tab becomes visible
  useEffect(() => {
    checkSessionStatus();

    // Also refresh when tab becomes visible (user switches back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSessionStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkSessionStatus]);

  // Update break duration every second when on break
  useEffect(() => {
    if (workStatus === 'break' && breakStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const durationSec = Math.floor((now.getTime() - breakStartTime.getTime()) / 1000);
        setBreakDuration(durationSec);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setBreakDuration(0);
    }
  }, [workStatus, breakStartTime]);

  // Fetch team status for admins/managers
  useEffect(() => {
    const fetchTeamStatus = async () => {
      // Only fetch for admins/managers
      if (!isAdmin && !isManager && !isTeamLead && !isSuperAdmin) return;

      try {
        const status = await workSessionService.getTeamWorkStatus();
        setTeamStatus(status);
      } catch (error) {
        console.error('Failed to fetch team status:', error);
      }
    };

    fetchTeamStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTeamStatus, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, isManager, isTeamLead, isSuperAdmin]);

  // Format duration as mm:ss or hh:mm:ss
  const formatBreakDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle sidebar collapsed state
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // Toggle section expanded state - accordion behavior (only one section open at a time)
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const isCurrentlyOpen = prev[section];
      // Close all sections first, then open the clicked one (if it was closed)
      const allClosed = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);

      return {
        ...allClosed,
        [section]: !isCurrentlyOpen, // Toggle the clicked section
      };
    });
  };

  // Check if current route should hide header
  const hideHeader = headerHiddenRoutes.some(route => location.pathname.startsWith(route));

  // Derived value for showing advanced sections
  const showAdvancedSections = isSuperAdmin || isOrgAdmin || isAdmin || isManager || isTeamLead;

  // Get organization industry (default to 'GENERIC' if not set)
  const orgIndustry = (user?.organizationIndustry || 'GENERIC').toUpperCase().replace(/\s+/g, '_');
  const allowedSections = industrySections[orgIndustry] || industrySections.GENERIC;

  // Get industry-specific section key
  const industrySection = orgIndustry === 'EDUCATION' ? 'education' :
                          orgIndustry === 'REAL_ESTATE' ? 'realestate' :
                          orgIndustry === 'HEALTHCARE' ? 'healthcare' :
                          orgIndustry === 'INSURANCE' ? 'insurance' :
                          orgIndustry === 'AUTOMOTIVE' ? 'automotive' :
                          orgIndustry === 'IT_SERVICES' ? 'itservices' :
                          orgIndustry === 'RECRUITMENT' ? 'recruitment' : 'sales';

  // Super Admin sees ALL sections regardless of industry
  const allSections = ['main', 'sales', 'education', 'realestate', 'healthcare', 'insurance', 'automotive', 'itservices', 'recruitment', 'communication', 'voiceAI', 'data', 'analytics', 'team', 'integrations', 'settings'];

  // Check if a section should be shown for this industry (Super Admin / Admin sees all)
  const isSectionAllowed = useCallback((sectionKey: string) => {
    if (isSuperAdmin || isAdmin) return allSections.includes(sectionKey);
    // Telecallers/counselors see voiceAI section for "My Calls"
    if (sectionKey === 'voiceAI' && (userRole === 'telecaller' || userRole === 'counselor')) return true;
    return allowedSections.includes(sectionKey);
  }, [isSuperAdmin, isAdmin, allowedSections, userRole]);

  // Check if telecaller/counselor on dashboard (no longer used for dark theme - now white)
  const isTelecallerDashboard = false; // Disabled dark theme for telecaller dashboard

  // Filter navigation based on user role AND permissions
  const filterByRole = useCallback((items: NavItem[], alwaysShowNames: string[] = []) => {
    if (!userRole) return items.filter(item => ['Dashboard'].includes(item.name));
    return items.filter(item => {
      // Always show certain items (like Dashboard)
      if (alwaysShowNames.includes(item.name)) return true;

      // Special case for super_admin permission - only super_admin can see
      if (item.permission === 'super_admin') {
        return isSuperAdmin;
      }

      // Check if user's role is in the allowed roles list
      const roleAllowed = item.roles.some(r => {
        const normalizedRole = r.toLowerCase().replace(/[_-]/g, '');
        if (isSuperAdmin && (normalizedRole === 'superadmin' || normalizedRole === 'admin')) return true;
        if (isOrgAdmin && (normalizedRole === 'orgadmin' || normalizedRole === 'admin')) return true;
        if (isAdmin && normalizedRole === 'admin') return true;
        return normalizedRole === userRole;
      });

      // Role must be allowed first
      if (!roleAllowed) return false;

      // Super admin / org_admin / admin bypasses permission checks (but not role checks)
      if (isSuperAdmin || isOrgAdmin || isAdmin) return true;

      // For other users: check permission if defined
      if (item.permission) {
        return hasPermission(item.permission);
      }

      // Role is allowed and no specific permission required
      return true;
    });
  }, [userRole, isSuperAdmin, isOrgAdmin, isAdmin, hasPermission]);

  // Dynamic navigation based on industry
  const filteredMain = useMemo(() => filterByRole(getMainNavigation(orgIndustry), ['Dashboard']), [filterByRole, orgIndustry]);
  const filteredIndustry = useMemo(() => isSectionAllowed(industrySection) ? filterByRole(getIndustryNavigation(orgIndustry)) : [], [filterByRole, orgIndustry, industrySection]);
  const industrySectionTitle = getIndustrySectionTitle(orgIndustry);
  const filteredCommunication = useMemo(() => isSectionAllowed('communication') ? filterByRole(communicationNavigation) : [], [filterByRole, isSectionAllowed]);
  const filteredVoiceAI = useMemo(() => isSectionAllowed('voiceAI') ? filterByRole(voiceAINavigation) : [], [filterByRole, isSectionAllowed]);
  const filteredData = useMemo(() => isSectionAllowed('data') ? filterByRole(dataNavigation) : [], [filterByRole, isSectionAllowed]);
  const filteredAnalytics = useMemo(() => isSectionAllowed('analytics') ? filterByRole(getAnalyticsNavigation(orgIndustry)) : [], [filterByRole, orgIndustry, isSectionAllowed]);
  const filteredTeam = useMemo(() => isSectionAllowed('team') ? filterByRole(getTeamNavigation(orgIndustry)) : [], [filterByRole, orgIndustry, isSectionAllowed]);
  const filteredIntegrations = useMemo(() => isSectionAllowed('integrations') ? filterByRole(integrationsNavigation) : [], [filterByRole, isSectionAllowed]);
  const filteredSettings = useMemo(() => isSectionAllowed('settings') ? filterByRole(settingsNavigation) : [], [filterByRole, isSectionAllowed]);

  // Legacy - kept for backward compatibility but now use filteredIndustry
  const filteredSales = useMemo(() => [], []);
  const filteredFieldSales = useMemo(() => [], []);
  const filteredAdmissions = useMemo(() => [], []);

  const handleLogout = async () => {
    // Close the dropdown menu immediately
    setShowUserMenu(false);
    await dispatch(logout());
    navigate('/login');
  };

  // Toggle work status (Take Break / Go Active)
  const handleToggleWorkStatus = async () => {
    // Close the dropdown menu immediately
    setShowUserMenu(false);
    try {
      if (workStatus === 'break') {
        // End break - go active
        await workSessionService.endBreak();
        setWorkStatus('active');
        setBreakStartTime(null);
        setBreakDuration(0);
      } else {
        // Start break
        const breakRecord = await workSessionService.startBreak('SHORT', 'Break from dashboard');
        setWorkStatus('break');
        setBreakStartTime(new Date(breakRecord.startedAt));
      }
    } catch (error) {
      console.error('Failed to update work status:', error);
    }
  };

  // NavItem for expanded sidebar
  const NavItem = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
      }
    >
      <item.icon className="sidebar-link-icon" />
      <span>{item.name}</span>
    </NavLink>
  );

  // SubNavItem for submenu items (smaller size)
  const SubNavItem = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-sublink ${isActive ? 'sidebar-sublink-active' : ''}`
      }
    >
      <item.icon className="sidebar-sublink-icon" />
      <span>{item.name}</span>
    </NavLink>
  );

  // NavItem for collapsed sidebar - icons only with tooltip
  const NavItemCollapsed = ({ item }: { item: NavItem }) => (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        `group relative flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-primary-600/20 text-primary-400'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`
      }
      title={item.name}
    >
      <item.icon className="h-5 w-5" />
      {/* Tooltip */}
      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
        {item.name}
      </div>
    </NavLink>
  );

  // Section icons mapping
  const sectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    sales: FunnelIcon,
    communication: ChatBubbleLeftRightIcon,
    voiceAI: SparklesIcon,
    data: DocumentArrowUpIcon,
    analytics: ChartBarIcon,
    team: UserGroupIcon,
    integrations: ArrowPathRoundedSquareIcon,
    settings: Cog6ToothIcon,
    fieldSales: BriefcaseIcon,
    admissions: AcademicCapIcon,
  };

  // Collapsible Section component - Professional design with icon
  const CollapsibleSection = ({
    title,
    sectionKey,
    items,
    colorClass,
    onClick
  }: {
    title: string;
    sectionKey: string;
    items: NavItem[];
    colorClass: string;
    onClick?: () => void;
  }) => {
    const isExpanded = expandedSections[sectionKey];
    const SectionIcon = sectionIcons[sectionKey] || Cog6ToothIcon;

    return (
      <div>
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors group ${
            isExpanded ? 'bg-slate-800/30' : 'hover:bg-slate-800/50'
          }`}
        >
          <SectionIcon className={`w-5 h-5 ${colorClass}`} />
          <span className="flex-1 text-left text-[15px] font-medium text-slate-300 whitespace-nowrap">
            {title}
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="mt-0.5 pl-7 space-y-0.5">
            {items.map((item) => (
              <SubNavItem key={item.name} item={item} onClick={onClick} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${hideHeader ? 'bg-white overflow-x-hidden' : 'bg-slate-50'}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-56 transform bg-slate-900 transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center justify-between px-4 border-b border-slate-800">
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
              CRM Pro
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation - Clean & Organized */}
          <nav ref={sidebarRefCallback} className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
            {/* Main */}
            <div className="space-y-1">
              {filteredMain.map((item) => (
                <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </div>

            {/* Industry-Specific Section (dynamic based on organization industry) */}
            {filteredIndustry.length > 0 && (
              <CollapsibleSection
                title={industrySectionTitle}
                sectionKey="industry"
                items={filteredIndustry}
                colorClass="text-emerald-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Communication */}
            {filteredCommunication.length > 0 && (
              <CollapsibleSection
                title="Outreach"
                sectionKey="communication"
                items={filteredCommunication}
                colorClass="text-sky-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Calling */}
            {filteredVoiceAI.length > 0 && (
              <CollapsibleSection
                title="Calling"
                sectionKey="voiceAI"
                items={filteredVoiceAI}
                colorClass="text-violet-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Data */}
            {showAdvancedSections && filteredData.length > 0 && (
              <CollapsibleSection
                title="Data"
                sectionKey="data"
                items={filteredData}
                colorClass="text-cyan-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Reports */}
            {showAdvancedSections && filteredAnalytics.length > 0 && (
              <CollapsibleSection
                title="Reports"
                sectionKey="analytics"
                items={filteredAnalytics}
                colorClass="text-amber-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Team */}
            {filteredTeam.length > 0 && (
              <CollapsibleSection
                title="Team"
                sectionKey="team"
                items={filteredTeam}
                colorClass="text-teal-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Integrations */}
            {showAdvancedSections && filteredIntegrations.length > 0 && (
              <CollapsibleSection
                title="Integrations"
                sectionKey="integrations"
                items={filteredIntegrations}
                colorClass="text-purple-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Field Sales (Industry specific) */}
            {filteredFieldSales.length > 0 && (
              <CollapsibleSection
                title="Field Sales"
                sectionKey="fieldSales"
                items={filteredFieldSales}
                colorClass="text-orange-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Admissions (Industry specific) */}
            {filteredAdmissions.length > 0 && (
              <CollapsibleSection
                title="Admissions"
                sectionKey="admissions"
                items={filteredAdmissions}
                colorClass="text-pink-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Settings */}
            {showAdvancedSections && filteredSettings.length > 0 && (
              <CollapsibleSection
                title="Settings"
                sectionKey="settings"
                items={filteredSettings}
                colorClass="text-slate-400"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar - Collapsible */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'
      }`}>
        <div className="flex min-h-0 flex-1 flex-col bg-slate-900">
          {/* Logo - Clickable to toggle collapse */}
          <div
            className="flex h-14 items-center justify-between px-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors"
            onClick={toggleSidebar}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold text-white whitespace-nowrap">CRM Pro</span>
              )}
            </div>
            {!sidebarCollapsed && (
              <ChevronLeftIcon className="w-4 h-4 text-slate-400" />
            )}
            {sidebarCollapsed && (
              <ChevronRightIcon className="w-4 h-4 text-slate-400 absolute right-3" />
            )}
          </div>

          {/* Navigation - Collapsed View (Icons Only) */}
          {sidebarCollapsed ? (
            <nav ref={sidebarRefCallback} className="flex-1 px-2 py-3 space-y-1 overflow-y-auto scrollbar-hide">
              {/* Main */}
              {filteredMain.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Sales */}
              {filteredSales.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {filteredSales.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Communication */}
              {filteredCommunication.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {filteredCommunication.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Voice AI */}
              {filteredVoiceAI.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {filteredVoiceAI.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Data */}
              {showAdvancedSections && filteredData.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {showAdvancedSections && filteredData.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Analytics */}
              {showAdvancedSections && filteredAnalytics.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {showAdvancedSections && filteredAnalytics.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Team */}
              {filteredTeam.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {filteredTeam.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Integrations */}
              {showAdvancedSections && filteredIntegrations.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {showAdvancedSections && filteredIntegrations.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Field Sales */}
              {filteredFieldSales.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {filteredFieldSales.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Admissions */}
              {filteredAdmissions.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {filteredAdmissions.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider + Settings */}
              {showAdvancedSections && filteredSettings.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}
              {showAdvancedSections && filteredSettings.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}
            </nav>
          ) : (
            /* Navigation - Expanded View (Full Labels) */
            <nav ref={sidebarRefCallback} className="flex-1 px-2 py-3 space-y-3 overflow-y-auto scrollbar-hide">
              {/* Main */}
              <div className="space-y-1">
                {filteredMain.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>

              {/* Industry-Specific Section */}
              {filteredIndustry.length > 0 && (
                <CollapsibleSection
                  title={industrySectionTitle}
                  sectionKey="industry"
                  items={filteredIndustry}
                  colorClass="text-emerald-400"
                />
              )}

              {/* Communication */}
              {filteredCommunication.length > 0 && (
                <CollapsibleSection
                  title="Outreach"
                  sectionKey="communication"
                  items={filteredCommunication}
                  colorClass="text-sky-400"
                />
              )}

              {/* Calling */}
              {filteredVoiceAI.length > 0 && (
                <CollapsibleSection
                  title="Calling"
                  sectionKey="voiceAI"
                  items={filteredVoiceAI}
                  colorClass="text-violet-400"
                />
              )}

              {/* Data */}
              {showAdvancedSections && filteredData.length > 0 && (
                <CollapsibleSection
                  title="Data"
                  sectionKey="data"
                  items={filteredData}
                  colorClass="text-cyan-400"
                />
              )}

              {/* Reports */}
              {showAdvancedSections && filteredAnalytics.length > 0 && (
                <CollapsibleSection
                  title="Reports"
                  sectionKey="analytics"
                  items={filteredAnalytics}
                  colorClass="text-amber-400"
                />
              )}

              {/* Team */}
              {filteredTeam.length > 0 && (
                <CollapsibleSection
                  title="Team"
                  sectionKey="team"
                  items={filteredTeam}
                  colorClass="text-teal-400"
                />
              )}

              {/* Integrations */}
              {showAdvancedSections && filteredIntegrations.length > 0 && (
                <CollapsibleSection
                  title="Integrations"
                  sectionKey="integrations"
                  items={filteredIntegrations}
                  colorClass="text-purple-400"
                />
              )}

              {/* Field Sales (Industry specific) */}
              {filteredFieldSales.length > 0 && (
                <CollapsibleSection
                  title="Field Sales"
                  sectionKey="fieldSales"
                  items={filteredFieldSales}
                  colorClass="text-orange-400"
                />
              )}

              {/* Admissions (Industry specific) */}
              {filteredAdmissions.length > 0 && (
                <CollapsibleSection
                  title="Admissions"
                  sectionKey="admissions"
                  items={filteredAdmissions}
                  colorClass="text-pink-400"
                />
              )}

              {/* Settings */}
              {showAdvancedSections && filteredSettings.length > 0 && (
                <CollapsibleSection
                  title="Settings"
                  sectionKey="settings"
                  items={filteredSettings}
                  colorClass="text-slate-400"
                />
              )}
            </nav>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
      } ${hideHeader ? 'bg-white overflow-hidden scrollbar-hide' : ''} ${
        isTelecallerDashboard ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : ''
      }`}>
        {/* Top bar - Compact (hidden on certain routes) */}
        {!hideHeader && (
        <header className={`sticky top-0 z-30 ${
          isTelecallerDashboard
            ? 'bg-transparent border-0'
            : 'bg-white/95 backdrop-blur-sm border-b border-slate-200/60'
        }`}>
          <div className="flex h-11 items-center justify-between px-3 sm:px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
              type="button"
              className={`lg:hidden p-1.5 rounded-lg transition-colors ${
                isTelecallerDashboard
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>

            {/* Spacer for desktop */}
            <div className="hidden lg:block" />

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Team Status Indicator (for admins/managers) - Shows who is Active, On Break, Offline */}
              {teamStatus && (isAdmin || isManager || isTeamLead || isSuperAdmin) && (
                <div className="relative">
                  <button
                    onClick={() => setShowTeamStatus(!showTeamStatus)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <UsersIcon className="h-4 w-4 text-slate-600" />
                    <div className="flex items-center gap-1 text-xs">
                      <span className="flex items-center gap-0.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span className="font-medium">{teamStatus.active.length}</span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        <span className="font-medium">{teamStatus.onBreak.length}</span>
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span className="font-medium">{teamStatus.offline.length}</span>
                      </span>
                    </div>
                  </button>

                  {/* Team Status Dropdown */}
                  {showTeamStatus && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowTeamStatus(false)} />
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
                        <div className="p-3 border-b border-slate-100">
                          <h3 className="font-semibold text-slate-800">Team Status</h3>
                        </div>

                        {/* Active Members */}
                        {teamStatus.active.length > 0 && (
                          <div className="p-2">
                            <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                              Active ({teamStatus.active.length})
                            </div>
                            <div className="mt-1 space-y-1">
                              {teamStatus.active.map(member => (
                                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded">
                                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-medium">
                                    {member.name.charAt(0)}
                                  </span>
                                  <span>{member.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* On Break Members */}
                        {teamStatus.onBreak.length > 0 && (
                          <div className="p-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded">
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                              On Break ({teamStatus.onBreak.length})
                            </div>
                            <div className="mt-1 space-y-1">
                              {teamStatus.onBreak.map(member => (
                                <div key={member.id} className="flex items-center justify-between px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-medium">
                                      {member.name.charAt(0)}
                                    </span>
                                    <span>{member.name}</span>
                                  </div>
                                  <span className="text-xs text-amber-600">{member.breakType}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Offline Members */}
                        {teamStatus.offline.length > 0 && (
                          <div className="p-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded">
                              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                              Offline ({teamStatus.offline.length})
                            </div>
                            <div className="mt-1 space-y-1">
                              {teamStatus.offline.map(member => (
                                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-50 rounded">
                                  <span className="w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-medium">
                                    {member.name.charAt(0)}
                                  </span>
                                  <span>{member.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Break Status Indicator */}
              {workStatus === 'break' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full animate-pulse">
                  <PauseCircleIcon className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    On Break <span className="font-mono">({formatBreakDuration(breakDuration)})</span>
                  </span>
                  <button
                    onClick={handleToggleWorkStatus}
                    className="ml-1 px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors"
                  >
                    Resume
                  </button>
                </div>
              )}

              {/* Voice Minutes Indicator */}
              <VoiceMinutesIndicator />

              {/* Language Switcher */}
              <LanguageSwitcher variant="compact" />

              {/* Notifications */}
              <button className={`relative p-1.5 rounded-lg transition-colors ${
                isTelecallerDashboard
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}>
                <BellIcon className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-danger-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-1.5 p-1 rounded-lg transition-colors ${
                    isTelecallerDashboard ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xs font-semibold text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    {/* Work Status Indicator */}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      workStatus === 'active' ? 'bg-emerald-500' :
                      workStatus === 'break' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 hidden sm:block ${
                    isTelecallerDashboard ? 'text-slate-400' : 'text-slate-400'
                  }`} />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="dropdown-menu">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{user?.email}</p>
                        <p className="text-xs text-primary-600 capitalize mt-1">{user?.role}</p>
                      </div>
                      <div className="py-1">
                        {/* Work Status Toggle */}
                        <button
                          onClick={handleToggleWorkStatus}
                          className={`dropdown-item w-full ${
                            workStatus === 'break'
                              ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {workStatus === 'break' ? (
                            <>
                              <PlayCircleIcon className="dropdown-item-icon" />
                              Go Active
                            </>
                          ) : (
                            <>
                              <PauseCircleIcon className="dropdown-item-icon" />
                              Take Break
                            </>
                          )}
                        </button>
                        <button className="dropdown-item w-full">
                          <Cog6ToothIcon className="dropdown-item-icon" />
                          {t('navigation:userMenu.settings')}
                        </button>
                        <button
                          onClick={handleLogout}
                          className="dropdown-item w-full text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                        >
                          <ArrowLeftOnRectangleIcon className="dropdown-item-icon" />
                          {t('navigation:userMenu.logout')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Page content */}
        <main className={
          hideHeader
            ? "min-h-screen bg-white overflow-x-hidden"
            : isTelecallerDashboard
              ? "p-0 bg-transparent"
              : "py-4 px-4 sm:px-5 lg:px-6"
        }>
          <Outlet />
        </main>
      </div>

      {/* Floating Chat Button - Bottom Right */}
      <FloatingChatButton />
    </div>
  );
}
