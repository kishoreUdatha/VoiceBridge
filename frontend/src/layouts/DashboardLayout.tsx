import { useState, useMemo } from 'react';
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
  ShieldCheckIcon,
  FunnelIcon,
  TrophyIcon,
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
// SIMPLIFIED NAVIGATION - Clean & Intuitive
// Based on user workflows, not feature categories
// ===========================================

// Main Navigation - Core daily workflow (visible to all)
const mainNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['admin', 'manager', 'counselor', 'telecaller'] },
  { name: 'Leads', href: '/leads', icon: UserGroupIcon, roles: ['admin', 'manager', 'counselor', 'telecaller'] },
  { name: 'Inbox', href: '/hybrid-inbox', icon: ChatBubbleLeftRightIcon, roles: ['admin', 'manager', 'counselor', 'telecaller'] },
];

// Calls - All calling related features
const callsNavigation: NavItem[] = [
  { name: 'AI Calling', href: '/outbound-calls', icon: PhoneIcon, roles: ['admin', 'manager', 'telecaller'] },
  { name: 'My Queue', href: '/telecaller-queue', icon: QueueListIcon, roles: ['admin', 'manager', 'telecaller'] },
  { name: 'Voice Agents', href: '/voice-ai', icon: SparklesIcon, roles: ['admin', 'manager'] },
  { name: 'Call Flows', href: '/call-flows', icon: ArrowPathRoundedSquareIcon, roles: ['admin', 'manager'] },
  { name: 'Call Monitoring', href: '/call-monitoring', icon: EyeIcon, roles: ['admin', 'manager'] },
];

// Marketing - Campaigns & outreach
const marketingNavigation: NavItem[] = [
  { name: 'Campaigns', href: '/campaigns', icon: MegaphoneIcon, roles: ['admin', 'manager', 'counselor'] },
  { name: 'WhatsApp', href: '/whatsapp/bulk', icon: WhatsAppIcon, roles: ['admin', 'manager', 'counselor'] },
  { name: 'Templates', href: '/templates', icon: DocumentTextIcon, roles: ['admin', 'manager'] },
  { name: 'Raw Data', href: '/raw-imports', icon: DocumentArrowUpIcon, roles: ['admin', 'manager'] },
];

// Analytics - Reports & insights
const analyticsNavigation: NavItem[] = [
  { name: 'Analytics', href: '/analytics', icon: PresentationChartLineIcon, roles: ['admin', 'manager'] },
  { name: 'Lead Sources', href: '/analytics/lead-sources', icon: UserGroupIcon, roles: ['admin', 'manager'] },
  { name: 'Funnel', href: '/analytics/funnel', icon: FunnelIcon, roles: ['admin', 'manager'] },
  { name: 'Agent Perf.', href: '/analytics/agents', icon: TrophyIcon, roles: ['admin', 'manager'] },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: ['admin', 'manager'] },
];

// Compliance - Consent & regulatory
const complianceNavigation: NavItem[] = [
  { name: 'Compliance', href: '/compliance', icon: ShieldCheckIcon, roles: ['admin', 'manager'] },
];

// Settings - Configuration (Admin focused)
const settingsNavigation: NavItem[] = [
  { name: 'Users', href: '/users', icon: UsersIcon, roles: ['admin'] },
  { name: 'Integrations', href: '/settings/crm-integration', icon: ArrowPathRoundedSquareIcon, roles: ['admin', 'manager'] },
  { name: 'Post-Call Messages', href: '/settings/post-call-messaging', icon: BellIcon, roles: ['admin', 'manager'] },
  { name: 'Subscription', href: '/subscription', icon: CreditCardIcon, roles: ['admin', 'manager'] },
  { name: 'API Keys', href: '/api-keys', icon: KeyIcon, roles: ['admin'] },
];

// Routes where top header should be hidden
const headerHiddenRoutes = ['/voice-ai/create', '/voice-ai/create-from-template', '/call-flows/builder'];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation(['navigation', 'common']);

  // Check if current route should hide header
  const hideHeader = headerHiddenRoutes.some(route => location.pathname.startsWith(route));

  // Get user's role slug (lowercase)
  const rawRole = user?.role || '';
  const userRole = rawRole.toLowerCase().trim();
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const showAdvancedSections = isAdmin || isManager;

  // Filter navigation based on user role
  const filterByRole = (items: NavItem[]) => {
    if (!userRole) return items.filter(item => ['Dashboard', 'Leads'].includes(item.name));
    return items.filter(item => item.roles.includes(userRole));
  };

  const filteredMain = useMemo(() => filterByRole(mainNavigation), [userRole]);
  const filteredCalls = useMemo(() => filterByRole(callsNavigation), [userRole]);
  const filteredMarketing = useMemo(() => filterByRole(marketingNavigation), [userRole]);
  const filteredAnalytics = useMemo(() => filterByRole(analyticsNavigation), [userRole]);
  const filteredCompliance = useMemo(() => filterByRole(complianceNavigation), [userRole]);
  const filteredSettings = useMemo(() => filterByRole(settingsNavigation), [userRole]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

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

  return (
    <div className="min-h-screen bg-slate-50">
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

          {/* Navigation - Simplified */}
          <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1">
              {filteredMain.map((item) => (
                <NavItem key={item.name} item={item} onClick={() => setSidebarOpen(false)} />
              ))}
            </div>

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

            {/* Marketing Section */}
            {showAdvancedSections && filteredMarketing.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                  Marketing
                </div>
                <div className="mt-1 space-y-1">
                  {filteredMarketing.map((item) => (
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

            {/* Compliance Section */}
            {showAdvancedSections && filteredCompliance.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
                  Compliance
                </div>
                <div className="mt-1 space-y-1">
                  {filteredCompliance.map((item) => (
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

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-52 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-slate-900">
          {/* Logo */}
          <div className="flex h-14 items-center px-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">CRM Pro</span>
            </div>
          </div>

          {/* Navigation - Simplified */}
          <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto scrollbar-hide">
            {/* Main Navigation */}
            <div className="space-y-1">
              {filteredMain.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>

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

            {/* Marketing Section */}
            {showAdvancedSections && filteredMarketing.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                  Marketing
                </div>
                <div className="mt-1 space-y-1">
                  {filteredMarketing.map((item) => (
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

            {/* Compliance Section */}
            {showAdvancedSections && filteredCompliance.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
                  Compliance
                </div>
                <div className="mt-1 space-y-1">
                  {filteredCompliance.map((item) => (
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
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-52">
        {/* Top bar - Compact (hidden on certain routes) */}
        {!hideHeader && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200/60">
          <div className="flex h-11 items-center justify-between px-3 sm:px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
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
              <button className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <BellIcon className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-danger-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xs font-semibold text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-slate-400 hidden sm:block" />
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
        <main className={hideHeader ? "p-0" : "py-4 px-4 sm:px-5 lg:px-6"}>
          <div className={hideHeader ? "" : "animate-fade-in"}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
