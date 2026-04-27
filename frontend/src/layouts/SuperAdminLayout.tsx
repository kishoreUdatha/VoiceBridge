import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import {
  HomeIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  ArrowLeftOnRectangleIcon,
  ArrowUturnLeftIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  LightBulbIcon,
  FlagIcon,
  PaintBrushIcon,
  WrenchScrewdriverIcon,
  DocumentCheckIcon,
  CogIcon,
  UserGroupIcon,
  BanknotesIcon,
  PhoneIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/super-admin/dashboard', icon: HomeIcon },
      { name: 'Organizations', href: '/super-admin/organizations', icon: BuildingOffice2Icon },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { name: 'Real-time', href: '/super-admin/realtime', icon: ChartBarIcon },
      { name: 'Tenant Intelligence', href: '/super-admin/intelligence', icon: LightBulbIcon },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Industries', href: '/super-admin/industries', icon: Squares2X2Icon },
      { name: 'Financial', href: '/super-admin/financial', icon: CurrencyDollarIcon },
      { name: 'Billing', href: '/super-admin/billing', icon: BanknotesIcon },
      { name: 'Phone Numbers', href: '/super-admin/phone-numbers', icon: PhoneIcon },
      { name: 'Feature Flags', href: '/super-admin/feature-flags', icon: FlagIcon },
      { name: 'White-Label', href: '/super-admin/white-label', icon: PaintBrushIcon },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Support Tools', href: '/super-admin/support', icon: WrenchScrewdriverIcon },
      { name: 'Compliance', href: '/super-admin/compliance', icon: DocumentCheckIcon },
      { name: 'System', href: '/super-admin/system', icon: CogIcon },
    ],
  },
  {
    title: 'Communication',
    items: [
      { name: 'Bulk Email', href: '/super-admin/bulk-email', icon: EnvelopeIcon },
    ],
  },
];

// Flat navigation for backward compatibility
const navigation: NavItem[] = navigationSections.flatMap(section => section.items);

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const navRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Use regular Redux auth instead of superAdminService
  const { user } = useSelector((state: RootState) => state.auth);
  const admin = user; // Use the regular logged-in user

  // Get current active index based on location
  const currentIndex = navigation.findIndex(item => location.pathname === item.href);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();

      const currentIdx = focusedIndex === -1 ? currentIndex : focusedIndex;
      let newIndex: number;

      if (e.key === 'ArrowDown') {
        newIndex = currentIdx < navigation.length - 1 ? currentIdx + 1 : 0;
      } else {
        newIndex = currentIdx > 0 ? currentIdx - 1 : navigation.length - 1;
      }

      setFocusedIndex(newIndex);

      // Scroll the item into view and focus it
      const navItem = navItemRefs.current[newIndex];
      if (navItem) {
        navItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        navItem.focus();
      }
    } else if (e.key === 'Enter' && focusedIndex !== -1) {
      // Navigate to the focused item
      navigate(navigation[focusedIndex].href);
    }
  }, [focusedIndex, currentIndex, navigate]);

  // Add keyboard event listener
  useEffect(() => {
    const nav = navRef.current;
    if (nav) {
      nav.addEventListener('keydown', handleKeyDown as any);
      return () => nav.removeEventListener('keydown', handleKeyDown as any);
    }
  }, [handleKeyDown]);

  // Reset focus when location changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [location.pathname]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  // Impersonation feature disabled for now (was using superAdminService)
  const isImpersonating = false;
  const impersonatedUser: { firstName: string; lastName: string; email: string; organizationName: string } | null = null;

  const handleExitImpersonation = () => {
    // Placeholder - impersonation is currently disabled
    console.log('Exit impersonation');
  };

  const NavItemComponent = ({ item, onClick, index }: { item: NavItem; onClick?: () => void; index: number }) => {
    const isFocused = focusedIndex === index;

    return (
      <NavLink
        to={item.href}
        onClick={onClick}
        ref={(el) => { navItemRefs.current[index] = el; }}
        tabIndex={0}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors outline-none ${
            isActive
              ? 'bg-purple-600 text-white'
              : isFocused
              ? 'bg-slate-800 text-white ring-2 ring-purple-400'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white'
          }`
        }
      >
        <item.icon className="w-5 h-5" />
        <span>{item.name}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Impersonation Banner */}
      {isImpersonating && impersonatedUser && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-900 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              <span className="font-medium">
                Impersonating: {impersonatedUser.firstName} {impersonatedUser.lastName} ({impersonatedUser.email})
                - {impersonatedUser.organizationName}
              </span>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="flex items-center gap-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
              Exit Impersonation
            </button>
          </div>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-950 transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isImpersonating ? 'pt-12' : ''}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Super Admin</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation - scrollable with mouse wheel and arrow keys */}
          <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scroll-smooth scrollbar-hide overscroll-contain">
            {(() => {
              let itemIndex = 0;
              return navigationSections.map((section) => (
                <div key={section.title}>
                  <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const currentItemIndex = itemIndex++;
                      return (
                        <NavItemComponent key={item.name} item={item} index={currentItemIndex} onClick={() => setSidebarOpen(false)} />
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-sm font-semibold text-white">
                {admin?.firstName?.[0]}{admin?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {admin?.firstName} {admin?.lastName}
                </p>
                <p className="text-xs text-purple-400 truncate">Super Admin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col ${isImpersonating ? 'lg:pt-10' : ''}`}>
        <div className="flex min-h-0 flex-1 flex-col bg-slate-950">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Super Admin</span>
            </div>
          </div>

          {/* Navigation - scrollable with mouse wheel and arrow keys */}
          <nav ref={navRef} tabIndex={0} className="flex-1 px-3 py-4 space-y-4 outline-none overflow-y-auto scroll-smooth scrollbar-hide overscroll-contain">
            {(() => {
              let itemIndex = 0;
              return navigationSections.map((section) => (
                <div key={section.title}>
                  <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const currentItemIndex = itemIndex++;
                      return (
                        <NavItemComponent key={item.name} item={item} index={currentItemIndex} />
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-sm font-semibold text-white ring-2 ring-slate-700">
                {admin?.firstName?.[0]}{admin?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {admin?.firstName} {admin?.lastName}
                </p>
                <p className="text-xs text-purple-400 truncate">Super Admin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`lg:pl-64 ${isImpersonating ? 'pt-10' : ''}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200/60">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>

            {/* Page Title */}
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-slate-800">Platform Administration</h1>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-xs font-semibold text-white">
                    {admin?.firstName?.[0]}{admin?.lastName?.[0]}
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">
                          {admin?.firstName} {admin?.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{admin?.email}</p>
                        <p className="text-xs text-purple-600 mt-1">Super Admin</p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="py-6 px-4 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
