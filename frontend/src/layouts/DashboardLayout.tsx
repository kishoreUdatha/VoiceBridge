import { useState, useMemo, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import LanguageSwitcher from '../components/LanguageSwitcher';
import VoiceMinutesIndicator from '../components/VoiceMinutesIndicator';
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
  EyeIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  FunnelIcon,
  TrophyIcon,
  MagnifyingGlassCircleIcon,
  BoltIcon,
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
// CLEAN NAVIGATION - Organized by Business Function
// ===========================================

// Main Navigation - Core daily workflow (visible to all)
const mainNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['admin', 'manager', 'counselor', 'telecaller'] },
  { name: 'Assigned Data', href: '/assigned-data', icon: DocumentArrowUpIcon, roles: ['telecaller', 'counselor'] },
  { name: 'My Conversions', href: '/qualified-leads', icon: TrophyIcon, roles: ['telecaller'] },
  { name: 'Leads', href: '/leads', icon: UserGroupIcon, roles: ['admin', 'manager', 'counselor', 'telecaller'] },
  { name: 'Inbox', href: '/hybrid-inbox', icon: ChatBubbleLeftRightIcon, roles: ['admin', 'manager', 'counselor', 'telecaller'] },
];

// Voice AI - AI Agents & Automation
const voiceAINavigation: NavItem[] = [
  { name: 'Voice Agents', href: '/voice-ai', icon: SparklesIcon, roles: ['admin', 'manager'] },
  { name: 'Call Flows', href: '/call-flows', icon: ArrowPathRoundedSquareIcon, roles: ['admin', 'manager'] },
];

// Calls - Calling Operations
const callsNavigation: NavItem[] = [
  { name: 'Outbound Calls', href: '/outbound-calls', icon: PhoneIcon, roles: ['admin', 'manager', 'telecaller'] },
  { name: 'Call Queue', href: '/telecaller-queue', icon: QueueListIcon, roles: ['admin', 'manager', 'telecaller'] },
  { name: 'Call Monitoring', href: '/call-monitoring', icon: EyeIcon, roles: ['admin', 'manager'] },
];

// Messaging - WhatsApp, SMS, Campaigns
const messagingNavigation: NavItem[] = [
  { name: 'Bulk WhatsApp', href: '/whatsapp/bulk', icon: WhatsAppIcon, roles: ['admin', 'manager', 'counselor'] },
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon, roles: ['admin', 'manager', 'counselor'] },
  { name: 'Templates', href: '/templates', icon: DocumentTextIcon, roles: ['admin', 'manager'] },
];

// Data - Import & Lead Sources
const dataNavigation: NavItem[] = [
  { name: 'Import Data', href: '/raw-imports', icon: DocumentArrowUpIcon, roles: ['admin', 'manager'] },
  { name: 'Ad Integrations', href: '/ad-integrations', icon: ArrowPathRoundedSquareIcon, roles: ['admin', 'manager'] },
  { name: 'Webhook URLs', href: '/webhook-urls', icon: KeyIcon, roles: ['admin'] },
  { name: 'Web Scraping', href: '/apify-dashboard', icon: MagnifyingGlassCircleIcon, roles: ['admin', 'manager'] },
];

// Analytics - Reports & insights (consolidated)
const analyticsNavigation: NavItem[] = [
  { name: 'Overview', href: '/analytics', icon: PresentationChartLineIcon, roles: ['admin', 'manager'] },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: ['admin', 'manager'] },
  { name: 'Funnel', href: '/analytics/funnel', icon: FunnelIcon, roles: ['admin', 'manager'] },
  { name: 'Agent Performance', href: '/analytics/agents', icon: TrophyIcon, roles: ['admin', 'manager'] },
];

// Settings - All Configuration (consolidated)
const settingsNavigation: NavItem[] = [
  { name: 'Users', href: '/users', icon: UsersIcon, roles: ['admin'] },
  { name: 'Organization', href: '/settings/institution', icon: Cog6ToothIcon, roles: ['admin'] },
  { name: 'API Credentials', href: '/settings/integrations', icon: KeyIcon, roles: ['admin'] },
  { name: 'WhatsApp', href: '/settings/whatsapp', icon: WhatsAppIcon, roles: ['admin', 'manager'] },
  { name: 'SMS', href: '/settings/sms', icon: ChatBubbleLeftRightIcon, roles: ['admin', 'manager'] },
  { name: 'Auto-Assign', href: '/settings/auto-assign', icon: BoltIcon, roles: ['admin', 'manager'] },
  { name: 'CRM Integrations', href: '/settings/crm-integration', icon: ArrowPathRoundedSquareIcon, roles: ['admin', 'manager'] },
  { name: 'Compliance', href: '/compliance', icon: ShieldCheckIcon, roles: ['admin', 'manager'] },
  { name: 'Subscription', href: '/subscription', icon: CreditCardIcon, roles: ['admin', 'manager'] },
];

// Routes where top header should be hidden
const headerHiddenRoutes = ['/voice-ai/create', '/voice-ai/create-from-template', '/voice-ai/agents', '/call-flows/builder'];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Collapsible sidebar state - persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation(['navigation', 'common']);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Toggle sidebar collapsed state
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // Check if current route should hide header
  const hideHeader = headerHiddenRoutes.some(route => location.pathname.startsWith(route));

  // Get user's role slug (lowercase)
  const rawRole = user?.role || '';
  const userRole = rawRole.toLowerCase().trim();
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const showAdvancedSections = isAdmin || isManager;

  // Check if telecaller/counselor on dashboard (for dark theme header)
  const isTelecallerDashboard = (userRole === 'telecaller' || userRole === 'counselor') && location.pathname === '/dashboard';

  // Filter navigation based on user role
  const filterByRole = (items: NavItem[]) => {
    if (!userRole) return items.filter(item => ['Dashboard', 'Leads'].includes(item.name));
    return items.filter(item => item.roles.includes(userRole));
  };

  const filteredMain = useMemo(() => filterByRole(mainNavigation), [userRole]);
  const filteredVoiceAI = useMemo(() => filterByRole(voiceAINavigation), [userRole]);
  const filteredCalls = useMemo(() => filterByRole(callsNavigation), [userRole]);
  const filteredMessaging = useMemo(() => filterByRole(messagingNavigation), [userRole]);
  const filteredData = useMemo(() => filterByRole(dataNavigation), [userRole]);
  const filteredAnalytics = useMemo(() => filterByRole(analyticsNavigation), [userRole]);
  const filteredSettings = useMemo(() => filterByRole(settingsNavigation), [userRole]);

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
          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1">
              {filteredMain.map((item) => (
                <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </div>

            {/* Voice AI Section */}
            {showAdvancedSections && filteredVoiceAI.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                  Voice AI
                </div>
                <div className="mt-1 space-y-1">
                  {filteredVoiceAI.map((item) => (
                    <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
                  ))}
                </div>
              </div>
            )}

            {/* Calls Section */}
            {filteredCalls.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Calls
                </div>
                <div className="mt-1 space-y-1">
                  {filteredCalls.map((item) => (
                    <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
                  ))}
                </div>
              </div>
            )}

            {/* Messaging Section */}
            {filteredMessaging.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-green-400 uppercase tracking-wider">
                  Messaging
                </div>
                <div className="mt-1 space-y-1">
                  {filteredMessaging.map((item) => (
                    <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
                  ))}
                </div>
              </div>
            )}

            {/* Data Section */}
            {showAdvancedSections && filteredData.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                  Data
                </div>
                <div className="mt-1 space-y-1">
                  {filteredData.map((item) => (
                    <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Section */}
            {showAdvancedSections && filteredAnalytics.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                  Analytics
                </div>
                <div className="mt-1 space-y-1">
                  {filteredAnalytics.map((item) => (
                    <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
                  ))}
                </div>
              </div>
            )}

            {/* Settings Section */}
            {showAdvancedSections && filteredSettings.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Settings
                </div>
                <div className="mt-1 space-y-1">
                  {filteredSettings.map((item) => (
                    <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar - Collapsible */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-52'
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
            <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto scrollbar-hide">
              {/* Main Navigation */}
              {filteredMain.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider */}
              {showAdvancedSections && filteredVoiceAI.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}

              {/* Voice AI */}
              {showAdvancedSections && filteredVoiceAI.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider */}
              {filteredCalls.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}

              {/* Calls */}
              {filteredCalls.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider */}
              {filteredMessaging.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}

              {/* Messaging */}
              {filteredMessaging.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider */}
              {showAdvancedSections && filteredData.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}

              {/* Data */}
              {showAdvancedSections && filteredData.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider */}
              {showAdvancedSections && filteredAnalytics.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}

              {/* Analytics */}
              {showAdvancedSections && filteredAnalytics.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}

              {/* Divider */}
              {showAdvancedSections && filteredSettings.length > 0 && (
                <div className="my-2 border-t border-slate-700/50" />
              )}

              {/* Settings */}
              {showAdvancedSections && filteredSettings.map((item) => (
                <NavItemCollapsed key={item.name} item={item} />
              ))}
            </nav>
          ) : (
            /* Navigation - Expanded View (Full Labels) */
            <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto scrollbar-hide">
              {/* Main Navigation */}
              <div className="space-y-1">
                {filteredMain.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>

              {/* Voice AI Section */}
              {showAdvancedSections && filteredVoiceAI.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                    Voice AI
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredVoiceAI.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Calls Section */}
              {filteredCalls.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Calls
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredCalls.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Messaging Section */}
              {filteredMessaging.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-green-400 uppercase tracking-wider">
                    Messaging
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredMessaging.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Data Section */}
              {showAdvancedSections && filteredData.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                    Data
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredData.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Analytics Section */}
              {showAdvancedSections && filteredAnalytics.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                    Analytics
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredAnalytics.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Settings Section */}
              {showAdvancedSections && filteredSettings.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Settings
                  </div>
                  <div className="mt-1 space-y-1">
                    {filteredSettings.map((item) => (
                      <NavItem key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-52'
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
    </div>
  );
}
