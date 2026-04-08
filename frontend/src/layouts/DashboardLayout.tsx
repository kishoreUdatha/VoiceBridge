import { useState, useMemo, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import LanguageSwitcher from '../components/LanguageSwitcher';
import VoiceMinutesIndicator from '../components/VoiceMinutesIndicator';
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
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[]; // Which roles can see this item
}

// WhatsApp Icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// ===========================================
// NAVIGATION - Clean & User-Friendly
// ===========================================

// 1. MAIN - Core daily workflow (always visible, not collapsible)
const mainNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['admin', 'manager', 'team_lead', 'counselor', 'telecaller'] },
  { name: 'My Tasks', href: '/assigned-data', icon: ClipboardDocumentCheckIcon, roles: ['telecaller', 'counselor'] },
  { name: 'My Conversions', href: '/qualified-leads', icon: TrophyIcon, roles: ['telecaller'] },
  { name: 'Leads', href: '/leads', icon: UserGroupIcon, roles: ['admin', 'manager', 'team_lead', 'counselor', 'telecaller'] },
  { name: 'Accounts', href: '/accounts', icon: BuildingOffice2Icon, roles: ['admin', 'manager', 'team_lead'] },
];

// 2. SALES - Pipeline & Revenue
const salesNavigation: NavItem[] = [
  { name: 'Pipeline', href: '/pipeline', icon: FunnelIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Quotations', href: '/quotations', icon: DocumentTextIcon, roles: ['admin', 'manager', 'team_lead', 'counselor'] },
  { name: 'Contracts', href: '/contracts', icon: DocumentTextIcon, roles: ['admin', 'manager'] },
  { name: 'Payments', href: '/payments', icon: CreditCardIcon, roles: ['admin', 'manager'] },
  { name: 'Customer Journey', href: '/customer-journey', icon: ArrowTrendingUpIcon, roles: ['admin', 'manager'] },
];

// 3. OUTREACH - Communication channels
const communicationNavigation: NavItem[] = [
  { name: 'Inbox', href: '/unified-inbox', icon: InboxIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon, roles: ['admin', 'manager', 'team_lead', 'counselor'] },
  { name: 'WhatsApp Bulk', href: '/whatsapp/bulk', icon: WhatsAppIcon, roles: ['admin', 'manager', 'team_lead', 'counselor'] },
  { name: 'Email Sequences', href: '/email-sequences', icon: AtSymbolIcon, roles: ['admin', 'manager'] },
  { name: 'Live Chat', href: '/live-chat', icon: ChatBubbleLeftRightIcon, roles: ['admin', 'manager', 'team_lead', 'counselor'] },
  { name: 'Message Templates', href: '/templates', icon: DocumentTextIcon, roles: ['admin', 'manager'] },
];

// 4. CALLING - Voice & Calls
const voiceAINavigation: NavItem[] = [
  { name: 'AI Agents', href: '/voice-ai', icon: SparklesIcon, roles: ['admin', 'manager'] },
  { name: 'Call Flows', href: '/call-flows', icon: ArrowPathRoundedSquareIcon, roles: ['admin', 'manager'] },
  { name: 'Outbound Calls', href: '/outbound-calls', icon: PhoneIcon, roles: ['admin', 'manager', 'team_lead', 'telecaller'] },
  { name: 'Call Queue', href: '/telecaller-queue', icon: QueueListIcon, roles: ['admin', 'manager', 'team_lead', 'telecaller'] },
  { name: 'Live Monitoring', href: '/call-monitoring', icon: EyeIcon, roles: ['admin', 'manager', 'team_lead'] },
];

// 5. DATA - Import & Management
const dataNavigation: NavItem[] = [
  { name: 'Import', href: '/raw-imports', icon: DocumentArrowUpIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Distribution', href: '/assignments', icon: ShareIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Enrichment', href: '/data-enrichment', icon: BoltIcon, roles: ['admin', 'manager'] },
  { name: 'Web Scraping', href: '/apify-dashboard', icon: MagnifyingGlassCircleIcon, roles: ['admin', 'manager'] },
  { name: 'Bulk Actions', href: '/batch-operations', icon: QueueListIcon, roles: ['admin', 'manager'] },
];

// 6. REPORTS - Analytics & Insights
const analyticsNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/analytics', icon: PresentationChartLineIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Custom Reports', href: '/reports', icon: ChartBarIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Sales Forecast', href: '/analytics/forecasting', icon: ArrowTrendingUpIcon, roles: ['admin', 'manager'] },
  { name: 'Funnels', href: '/analytics/funnel', icon: FunnelIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Performance', href: '/analytics/agents', icon: TrophyIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Export Data', href: '/export-bi', icon: ArrowDownTrayIcon, roles: ['admin', 'manager'] },
];

// 7. TEAM - Users & Management
const teamNavigation: NavItem[] = [
  { name: 'Users', href: '/users', icon: UsersIcon, roles: ['admin'] },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon, roles: ['admin'] },
  { name: 'Overview', href: '/team-management', icon: UserGroupIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Leaderboard', href: '/performance', icon: TrophyIcon, roles: ['admin', 'manager', 'team_lead', 'telecaller'] },
  { name: 'Commissions', href: '/commissions', icon: CurrencyRupeeIcon, roles: ['admin', 'manager'] },
  { name: 'QA Reviews', href: '/qa', icon: ClipboardDocumentCheckIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Approvals', href: '/approvals', icon: ClipboardDocumentCheckIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Announcements', href: '/team-messaging', icon: MegaphoneIcon, roles: ['admin', 'manager', 'team_lead', 'telecaller'] },
];

// 8. INTEGRATIONS - External connections
const integrationsNavigation: NavItem[] = [
  { name: 'Ad Platforms', href: '/ad-integrations', icon: MegaphoneIcon, roles: ['admin', 'manager'] },
  { name: 'Lead Portals', href: '/integrations/indian-sources', icon: ArrowDownTrayIcon, roles: ['admin', 'manager'] },
  { name: 'Zapier', href: '/integrations/zapier', icon: BoltIcon, roles: ['admin', 'manager'] },
  { name: 'WhatsApp Setup', href: '/settings/whatsapp', icon: WhatsAppIcon, roles: ['admin', 'manager'] },
  { name: 'API & Webhooks', href: '/settings/integrations', icon: KeyIcon, roles: ['admin'] },
];

// 9. SETTINGS - Configuration
const settingsNavigation: NavItem[] = [
  { name: 'Organization', href: '/settings/institution', icon: BuildingOffice2Icon, roles: ['admin'] },
  { name: 'Branches', href: '/settings/branches', icon: MapPinIcon, roles: ['admin'] },
  { name: 'Territories', href: '/territories', icon: MapPinIcon, roles: ['admin', 'manager'] },
  { name: 'Lead Stages', href: '/settings/lead-management', icon: QueueListIcon, roles: ['admin', 'manager'] },
  { name: 'Routing Rules', href: '/settings/lead-routing', icon: ArrowsRightLeftIcon, roles: ['admin', 'manager'] },
  { name: 'Auto-Assignment', href: '/settings/auto-assign', icon: BoltIcon, roles: ['admin', 'manager'] },
  { name: 'Workflows', href: '/workflow-builder', icon: ArrowPathRoundedSquareIcon, roles: ['admin', 'manager'] },
  { name: 'AI Scoring', href: '/ai-scoring', icon: BoltIcon, roles: ['admin', 'manager'] },
  { name: 'Notifications', href: '/settings/notifications', icon: BellIcon, roles: ['admin', 'manager'] },
  { name: 'Billing', href: '/subscription', icon: CreditCardIcon, roles: ['admin'] },
];

// INDUSTRY SPECIFIC - Only show for relevant industries
// Field Sales (B2B)
const fieldSalesNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/field-sales', icon: BriefcaseIcon, roles: ['admin', 'manager', 'team_lead', 'field_sales'] },
  { name: 'Institutions', href: '/field-sales/colleges', icon: BuildingOffice2Icon, roles: ['admin', 'manager', 'team_lead', 'field_sales'] },
  { name: 'Visits', href: '/field-sales/visits', icon: MapPinIcon, roles: ['admin', 'manager', 'team_lead', 'field_sales'] },
  { name: 'Deals', href: '/field-sales/deals', icon: FunnelIcon, roles: ['admin', 'manager', 'team_lead', 'field_sales'] },
  { name: 'Expenses', href: '/field-sales/expenses', icon: CurrencyRupeeIcon, roles: ['admin', 'manager', 'team_lead', 'field_sales'] },
];

// Admissions (Education)
const admissionsNavigation: NavItem[] = [
  { name: 'Universities', href: '/universities', icon: AcademicCapIcon, roles: ['admin', 'manager', 'team_lead'] },
  { name: 'Campus Visits', href: '/student-visits', icon: MapPinIcon, roles: ['admin', 'manager', 'team_lead', 'counselor'] },
  { name: 'Applications', href: '/admissions', icon: AcademicCapIcon, roles: ['admin', 'manager', 'team_lead', 'counselor'] },
  { name: 'Revenue', href: '/profit', icon: ReceiptPercentIcon, roles: ['admin'] },
];

// Routes where top header should be hidden
const headerHiddenRoutes = ['/voice-ai/create', '/voice-ai/create-from-template', '/voice-ai/agents', '/call-flows/builder'];

// Sidebar scroll position persistence key
const SIDEBAR_SCROLL_KEY = 'sidebarScrollPosition';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

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

  // Get user's role slug (lowercase)
  const rawRole = user?.role || '';
  const userRole = rawRole.toLowerCase().trim();
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const isTeamLead = userRole === 'team_lead' || userRole === 'teamlead';
  const showAdvancedSections = isAdmin || isManager || isTeamLead;

  // Check if telecaller/counselor on dashboard (for dark theme header)
  const isTelecallerDashboard = (userRole === 'telecaller' || userRole === 'counselor') && location.pathname === '/dashboard';

  // Filter navigation based on user role
  const filterByRole = (items: NavItem[], alwaysShowNames: string[] = []) => {
    if (!userRole) return items.filter(item => ['Dashboard', 'Leads'].includes(item.name));
    return items.filter(item => alwaysShowNames.includes(item.name) || item.roles.includes(userRole));
  };

  const filteredMain = useMemo(() => filterByRole(mainNavigation, ['Dashboard', 'Leads']), [userRole]);
  const filteredSales = useMemo(() => filterByRole(salesNavigation), [userRole]);
  const filteredCommunication = useMemo(() => filterByRole(communicationNavigation), [userRole]);
  const filteredVoiceAI = useMemo(() => filterByRole(voiceAINavigation), [userRole]);
  const filteredData = useMemo(() => filterByRole(dataNavigation), [userRole]);
  const filteredAnalytics = useMemo(() => filterByRole(analyticsNavigation), [userRole]);
  const filteredTeam = useMemo(() => filterByRole(teamNavigation), [userRole]);
  const filteredIntegrations = useMemo(() => filterByRole(integrationsNavigation), [userRole]);
  const filteredSettings = useMemo(() => filterByRole(settingsNavigation), [userRole]);
  const filteredFieldSales = useMemo(() => filterByRole(fieldSalesNavigation), [userRole]);
  const filteredAdmissions = useMemo(() => filterByRole(admissionsNavigation), [userRole]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
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

            {/* Sales */}
            {filteredSales.length > 0 && (
              <CollapsibleSection
                title="Sales"
                sectionKey="sales"
                items={filteredSales}
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

              {/* Sales */}
              {filteredSales.length > 0 && (
                <CollapsibleSection
                  title="Sales"
                  sectionKey="sales"
                  items={filteredSales}
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
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xs font-semibold text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
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
