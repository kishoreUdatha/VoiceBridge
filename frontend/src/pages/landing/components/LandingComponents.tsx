/**
 * MyLeadX Landing Page - AI-Themed Design
 * Dark, futuristic, AI-powered aesthetic
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Play,
  Phone,
  Menu,
  X,
  Bot,
  Zap,
  BarChart3,
  Users,
  Globe,
  Shield,
  Headphones,
  MessageSquare,
  TrendingUp,
  Clock,
  Star,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Target,
  PieChart,
  Mail,
  Building2,
  GraduationCap,
  Home,
  ShoppingCart,
  Briefcase,
  PhoneCall,
  Workflow,
  Brain,
  MousePointer,
  CheckCircle2,
  ArrowUpRight,
  Layers,
  Settings,
  Calendar,
  Cpu,
  Network,
  CircuitBoard,
  Mic,
  Activity,
  GitBranch,
  Database,
  Smartphone,
  FileText,
  UserCheck,
  LayoutDashboard,
  Gauge,
  Lock,
  Plug,
  FormInput,
  Award,
  Route,
  ClipboardList,
  Bell,
  Stethoscope,
  Car,
  Landmark,
  Heart,
} from 'lucide-react';

// =============================================
// MEGA MENU DATA - MyLeadX Actual Features with Public Pages
// =============================================
const FEATURES_MENU = {
  forManagers: {
    title: 'FOR SALES MANAGERS',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard Overview', description: 'Real-time sales metrics & KPIs', href: '/features/dashboard' },
      { icon: GitBranch, label: 'Sales Pipeline', description: 'Kanban board with drag-drop stages', href: '/features/pipeline' },
      { icon: Bot, label: 'Voice AI Agents', description: 'Create AI bots that call in 10+ languages', href: '/features/voice-ai' },
      { icon: BarChart3, label: 'Analytics & Reports', description: 'Conversion funnel & team performance', href: '/features/analytics' },
      { icon: Users, label: 'Team Management', description: 'Manage users, roles & permissions', href: '/features/team-management' },
      { icon: Activity, label: 'Live Call Monitoring', description: 'Listen to calls & coach in real-time', href: '/features/call-monitoring' },
      { icon: Workflow, label: 'Workflow Builder', description: 'Visual automation with triggers', href: '/features/workflow-builder' },
      { icon: PieChart, label: 'Predictive Analytics', description: 'AI forecasts & deal predictions', href: '/features/predictive-analytics' },
    ],
  },
  forReps: {
    title: 'FOR TELECALLERS',
    items: [
      { icon: Target, label: 'Lead Management', description: 'Track leads with AI scoring', href: '/features/leads' },
      { icon: PhoneCall, label: 'AI Outbound Calling', description: 'Single calls & bulk campaigns', href: '/features/outbound-calls' },
      { icon: Headphones, label: 'Telecaller Dashboard', description: 'Call queue, scripts & one-click dialing', href: '/features/telecaller-app' },
      { icon: Clock, label: 'Call History & Recordings', description: 'Full recordings with AI transcripts', href: '/features/call-history' },
      { icon: Route, label: 'Customer Journey', description: 'Track every lead interaction', href: '/features/customer-journey' },
      { icon: Brain, label: 'AI Lead Scoring', description: 'Prioritize high-intent leads', href: '/features/ai-scoring' },
      { icon: Smartphone, label: 'Mobile App', description: 'Android telecaller app with offline sync', href: '/features/mobile-app' },
      { icon: MessageSquare, label: 'WhatsApp & SMS', description: 'Multi-channel lead engagement', href: '/features/whatsapp-sms' },
    ],
  },
  communication: {
    title: 'COMMUNICATION',
    items: [
      { icon: Zap, label: 'Campaigns', description: 'Multi-channel marketing campaigns', href: '/features/campaigns' },
      { icon: FileText, label: 'Message Templates', description: 'Pre-built templates for all channels', href: '/features/templates' },
      { icon: Bell, label: 'Follow-up Management', description: 'Never miss a follow-up again', href: '/features/followups' },
      { icon: Mail, label: 'Email & SMS', description: 'Integrated email and SMS providers', href: '/features/email-sms-integration' },
    ],
  },
  data: {
    title: 'DATA & INTEGRATIONS',
    items: [
      { icon: Database, label: 'Data Import', description: 'Import from Excel, CSV, or web scraping', href: '/features/data-import' },
      { icon: Globe, label: 'Lead Sources', description: 'JustDial, IndiaMart, 99acres & more', href: '/features/lead-sources' },
      { icon: TrendingUp, label: 'Lead Distribution', description: 'Auto-assign leads to right team members', href: '/features/lead-distribution' },
      { icon: Settings, label: 'Webhooks & API', description: 'Connect with any external system', href: '/features/webhooks' },
      { icon: Plug, label: 'Facebook & Google Ads', description: 'Auto-capture leads from ad platforms', href: '/features/ad-integrations' },
      { icon: ClipboardList, label: 'Data Export', description: 'Export data in any format', href: '/features/data-export' },
    ],
  },
  billing: {
    title: 'BILLING & ADMIN',
    items: [
      { icon: FileText, label: 'Quotations', description: 'Professional quotes in minutes', href: '/features/quotations' },
      { icon: Gauge, label: 'Payment Collection', description: 'Accept payments via UPI, cards & more', href: '/features/payments' },
      { icon: FormInput, label: 'Invoice Management', description: 'GST-compliant invoicing', href: '/features/invoices' },
      { icon: Lock, label: 'Roles & Permissions', description: 'Granular access control', href: '/features/roles-permissions' },
      { icon: Award, label: 'Leaderboard', description: 'Gamification & team rankings', href: '/features/leaderboard' },
      { icon: Shield, label: 'Audit Logs', description: 'Complete activity tracking', href: '/features/audit-logs' },
    ],
  },
};

const INDUSTRIES_MENU = [
  { icon: GraduationCap, label: 'Education & EdTech', description: 'Admissions & student management', href: '/industries/education' },
  { icon: Home, label: 'Real Estate', description: 'Property leads & site visits', href: '/industries/real-estate' },
  { icon: Shield, label: 'Insurance & BFSI', description: 'Policy management & renewals', href: '/industries/insurance' },
  { icon: Briefcase, label: 'B2B Sales', description: 'Enterprise lead management', href: '/industries/b2b-sales' },
  { icon: Headphones, label: 'Call Centers & BPO', description: 'High-volume calling', href: '/industries/call-centers' },
  { icon: Stethoscope, label: 'Healthcare & Clinics', description: 'Patient management', href: '/industries/healthcare' },
  { icon: Car, label: 'Automotive & Dealers', description: 'Vehicle sales & service', href: '/industries/automotive' },
  { icon: ShoppingCart, label: 'E-commerce & Retail', description: 'Online store CRM', href: '/industries/ecommerce' },
  { icon: Landmark, label: 'Banking & NBFC', description: 'Loans & collections', href: '/industries/banking' },
  { icon: Globe, label: 'Travel & Hospitality', description: 'Bookings & guest experience', href: '/industries/travel' },
  { icon: Heart, label: 'Fitness & Wellness', description: 'Memberships & retention', href: '/industries/fitness' },
  { icon: Cpu, label: 'IT Services', description: 'Projects & consulting', href: '/industries/it-services' },
  { icon: UserCheck, label: 'IT Recruitment', description: 'Staffing & placements', href: '/industries/it-recruitment' },
];

// =============================================
// NAVIGATION - Glassmorphism Dark Navbar with Mega Menu
// =============================================
export const Navigation: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`fixed w-full z-50 transition-all duration-500 ${
      isScrolled
        ? 'bg-slate-900/95 backdrop-blur-xl border-b border-cyan-500/10 shadow-lg shadow-cyan-500/5'
        : 'bg-transparent'
    }`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <img src="/logo.png" alt="MyLeadX" className="h-9 w-9 rounded-lg relative z-10" />
              <div className="absolute inset-0 bg-cyan-500/30 blur-lg rounded-lg group-hover:bg-cyan-400/40 transition-all"></div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">MyLeadX</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1" ref={dropdownRef}>
            {/* Features Dropdown */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'features' ? null : 'features')}
                className={`flex items-center gap-1 px-4 py-2 text-gray-300 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-all ${activeDropdown === 'features' ? 'text-white bg-white/5' : ''}`}
              >
                Features
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'features' ? 'rotate-180' : ''}`} />
              </button>

              {/* Features Mega Menu */}
              {activeDropdown === 'features' && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 mt-2 w-[95vw] max-w-[1200px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="grid grid-cols-4">
                    {/* For Sales Managers */}
                    <div className="p-5 bg-gray-50/50 border-r border-gray-100">
                      <h3 className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-3">{FEATURES_MENU.forManagers.title}</h3>
                      <div className="space-y-0.5">
                        {FEATURES_MENU.forManagers.items.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors group"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <item.icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* For Telecallers */}
                    <div className="p-5 border-r border-gray-100">
                      <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">{FEATURES_MENU.forReps.title}</h3>
                      <div className="space-y-0.5">
                        {FEATURES_MENU.forReps.items.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <item.icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Communication & Data */}
                    <div className="p-5 border-r border-gray-100">
                      <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3">{FEATURES_MENU.communication.title}</h3>
                      <div className="space-y-0.5">
                        {FEATURES_MENU.communication.items.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <item.icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                      <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-3 mt-4">{FEATURES_MENU.data.title}</h3>
                      <div className="space-y-0.5">
                        {FEATURES_MENU.data.items.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <item.icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Billing & Admin */}
                    <div className="p-5 bg-gray-50/30">
                      <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">{FEATURES_MENU.billing.title}</h3>
                      <div className="space-y-0.5">
                        {FEATURES_MENU.billing.items.map((item) => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors group"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <item.icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                          </Link>
                        ))}
                      </div>
                      {/* All Features Link */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Link
                          to="/features"
                          className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                          onClick={() => setActiveDropdown(null)}
                        >
                          View All Features
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Industries Dropdown */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'industries' ? null : 'industries')}
                className={`flex items-center gap-1 px-4 py-2 text-gray-300 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-all ${activeDropdown === 'industries' ? 'text-white bg-white/5' : ''}`}
              >
                Industries
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'industries' ? 'rotate-180' : ''}`} />
              </button>

              {/* Industries Dropdown */}
              {activeDropdown === 'industries' && (
                <div className="absolute top-full left-0 mt-2 w-[600px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-4">
                  <div className="grid grid-cols-2 gap-1">
                    {INDUSTRIES_MENU.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <item.icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Link */}
            <Link to="/features/voice-ai" className="px-4 py-2 text-gray-300 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-all">
              AI
            </Link>

            {/* Pricing Link */}
            <Link to="/pricing" className="px-4 py-2 text-gray-300 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-all">
              Pricing
            </Link>

            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
                className={`flex items-center gap-1 px-4 py-2 text-gray-300 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-all ${activeDropdown === 'resources' ? 'text-white bg-white/5' : ''}`}
              >
                Discover
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'resources' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'resources' && (
                <div className="absolute top-full right-0 mt-2 w-[280px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-4">
                  <div className="space-y-1">
                    {[
                      { icon: FileText, label: 'Documentation', description: 'API docs & guides', href: '/docs' },
                      { icon: ClipboardList, label: 'Blog', description: 'Tips & best practices', href: '/docs' },
                      { icon: Bell, label: 'Whats New', description: 'Latest updates', href: '/docs' },
                      { icon: Headphones, label: 'Support', description: 'Get help from our team', href: 'mailto:support@myleadx.ai' },
                    ].map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center space-x-3">
            <Link to="/login" className="px-4 py-2 text-gray-300 hover:text-white font-medium transition-colors">
              Sign In
            </Link>
            <Link
              to="/register"
              className="relative px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-400 hover:to-red-400 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-400/40"
            >
              Book Demo
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-lg text-gray-300 hover:bg-white/10">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900/98 backdrop-blur-xl border-t border-cyan-500/10 py-4 max-h-[80vh] overflow-y-auto">
            <nav className="flex flex-col space-y-1 px-2">
              {/* Mobile Features Section */}
              <div className="py-2">
                <p className="px-4 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Sales & Management</p>
                <div className="grid grid-cols-2 gap-1">
                  {[...FEATURES_MENU.forManagers.items.slice(0, 6), ...FEATURES_MENU.forReps.items.slice(0, 6)].map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center gap-2 px-3 py-2 text-gray-300 text-sm hover:bg-white/5 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-4 h-4 text-cyan-400" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
                <p className="px-4 text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 mt-4">Communication & Data</p>
                <div className="grid grid-cols-2 gap-1">
                  {[...FEATURES_MENU.communication.items, ...FEATURES_MENU.data.items.slice(0, 4)].map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center gap-2 px-3 py-2 text-gray-300 text-sm hover:bg-white/5 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-4 h-4 text-purple-400" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
                <p className="px-4 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 mt-4">Billing & Admin</p>
                <div className="grid grid-cols-2 gap-1">
                  {FEATURES_MENU.billing.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center gap-2 px-3 py-2 text-gray-300 text-sm hover:bg-white/5 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-4 h-4 text-emerald-400" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Industries Section */}
              <div className="py-2 border-t border-white/5">
                <p className="px-4 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Industries</p>
                {INDUSTRIES_MENU.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-white/5 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5 text-purple-400" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              {/* Mobile Other Links */}
              <div className="py-2 border-t border-white/5">
                <Link to="/features/voice-ai" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  <Brain className="w-5 h-5 text-cyan-400" />
                  AI Features
                </Link>
                <Link to="/pricing" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  <PieChart className="w-5 h-5 text-green-400" />
                  Pricing
                </Link>
                <Link to="/docs" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  <FileText className="w-5 h-5 text-blue-400" />
                  Documentation
                </Link>
              </div>

              {/* Mobile CTA */}
              <div className="pt-3 px-2 space-y-2 border-t border-white/5">
                <Link to="/login" className="block w-full py-3 text-center text-gray-300 font-medium border border-cyan-500/30 rounded-lg hover:bg-white/5" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link to="/register" className="block w-full py-3 text-center bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  Book Demo
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

// =============================================
// HERO SECTION - AI-Powered with Animations
// =============================================
export const HeroSection: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const screenshots = [
    { src: '/screenshots/02-dashboard.png', title: 'Dashboard', subtitle: 'Real-time insights at a glance' },
    { src: '/screenshots/03-leads.png', title: 'Lead Management', subtitle: 'Track and nurture every lead' },
    { src: '/screenshots/04-pipeline.png', title: 'Sales Pipeline', subtitle: 'Visual deal tracking' },
    { src: '/screenshots/05-analytics.png', title: 'Analytics', subtitle: 'Data-driven decisions' },
    { src: '/screenshots/06-team.png', title: 'Team Management', subtitle: 'Monitor team performance' },
    { src: '/screenshots/07-calling.png', title: 'AI Calling', subtitle: 'Automated voice outreach' },
  ];

  // Auto-rotate screenshots
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScreen((prev) => (prev + 1) % screenshots.length);
        setIsTransitioning(false);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-20 pb-16 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-12 pt-8">
        {/* Hero Content */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <div className="inline-flex items-center bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
            <div className="relative mr-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              <div className="absolute inset-0 animate-ping">
                <Brain className="w-5 h-5 text-cyan-400 opacity-50" />
              </div>
            </div>
            <span className="text-cyan-300 text-sm font-medium">AI-Powered Sales Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            <span className="text-white">Your AI Sales Agent</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">That Never Sleeps</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 mb-8 leading-relaxed max-w-2xl mx-auto">
            Deploy AI voice agents that call, qualify, and convert leads 24/7. Built for Indian businesses with support for 10+ regional languages.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              to="/register"
              className="group relative inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <a
              href="https://www.youtube.com/watch?v=YOUR_DEMO_VIDEO_ID"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border-2 border-cyan-500/30 text-cyan-300 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-cyan-500/10 transition-all"
            >
              <Play className="mr-2 w-5 h-5 fill-cyan-400 text-cyan-400" />
              Watch AI Demo
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {['No credit card required', '14-day free trial', 'Cancel anytime'].map((badge) => (
              <div key={badge} className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Animated Screenshot Slideshow */}
        <div className="relative max-w-6xl mx-auto">
          {/* Glow effect behind */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl -z-10 scale-95 animate-pulse"></div>

          {/* Main Screenshot Display */}
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl shadow-cyan-500/20">
            {/* Browser Header */}
            <div className="bg-slate-800/80 border-b border-cyan-500/20 px-4 py-3 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1 border border-cyan-500/20">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-cyan-300">app.myleadx.ai</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{screenshots[currentScreen].title}</span>
                <div className="flex gap-1.5">
                  {screenshots.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentScreen(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        currentScreen === i ? 'bg-cyan-400 w-6' : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Screenshot with Transition */}
            <div className="relative overflow-hidden">
              <img
                src={screenshots[currentScreen].src}
                alt={screenshots[currentScreen].title}
                className={`w-full h-auto transition-all duration-500 ${
                  isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
              />

              {/* Screen Label Overlay */}
              <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-cyan-500/30">
                <p className="text-white font-semibold">{screenshots[currentScreen].title}</p>
                <p className="text-cyan-400 text-sm">{screenshots[currentScreen].subtitle}</p>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={() => setCurrentScreen((prev) => (prev - 1 + screenshots.length) % screenshots.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900/80 hover:bg-slate-800 rounded-full flex items-center justify-center border border-cyan-500/30 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 text-white rotate-180" />
              </button>
              <button
                onClick={() => setCurrentScreen((prev) => (prev + 1) % screenshots.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900/80 hover:bg-slate-800 rounded-full flex items-center justify-center border border-cyan-500/30 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Floating Notifications */}
          <div className="absolute -top-3 right-4 sm:right-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 shadow-xl border border-green-500/40 animate-bounce z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Deal Closed!</p>
                <p className="text-xs text-green-400">₹45,000 revenue</p>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-3 left-4 sm:left-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 shadow-xl border border-cyan-500/40 z-10" style={{ animation: 'bounce 2s infinite', animationDelay: '0.5s' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">AI Active</p>
                <p className="text-xs text-cyan-400">Processing leads...</p>
              </div>
            </div>
          </div>

          <div className="absolute top-1/3 -left-2 sm:left-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 shadow-xl border border-purple-500/40 z-10" style={{ animation: 'pulse 2s infinite' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Auto Follow-up</p>
                <p className="text-xs text-purple-400">Sent to 8 leads</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted By */}
        <div className="mt-12 pt-8 border-t border-cyan-500/10">
          <p className="text-center text-sm text-gray-500 mb-4">Trusted by 500+ AI-forward businesses across India</p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {['Education', 'Real Estate', 'Insurance', 'E-commerce', 'Healthcare'].map((industry, i) => (
              <div
                key={industry}
                className="px-4 py-1.5 bg-slate-800/50 rounded-lg text-gray-400 font-medium text-sm border border-slate-700/50 hover:border-cyan-500/30 transition-all hover:text-cyan-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {industry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================
// FEATURES SECTION - AI Grid Cards
// =============================================
const FEATURES_DATA = [
  { icon: Bot, title: 'AI Voice Agents', description: 'Intelligent agents that make natural calls in 10+ Indian languages.', gradient: 'from-cyan-500 to-blue-500' },
  { icon: Brain, title: 'Smart Lead Scoring', description: 'AI analyzes behavior patterns to prioritize high-intent leads.', gradient: 'from-purple-500 to-pink-500' },
  { icon: Workflow, title: 'Auto Workflows', description: 'Set triggers and let AI handle follow-ups automatically.', gradient: 'from-green-500 to-emerald-500' },
  { icon: MessageSquare, title: 'Omnichannel AI', description: 'AI engages via calls, WhatsApp, SMS, and email seamlessly.', gradient: 'from-orange-500 to-red-500' },
  { icon: PieChart, title: 'Predictive Analytics', description: 'AI forecasts conversions and identifies winning patterns.', gradient: 'from-blue-500 to-indigo-500' },
  { icon: Shield, title: 'AI Compliance', description: 'Automated DNC checks and call recording compliance.', gradient: 'from-red-500 to-rose-500' },
  { icon: Layers, title: 'Smart Pipeline', description: 'AI moves deals through stages based on engagement.', gradient: 'from-yellow-500 to-orange-500' },
  { icon: Phone, title: 'Mobile AI CRM', description: 'Full AI capabilities in your pocket with offline sync.', gradient: 'from-teal-500 to-cyan-500' },
];

export const FeaturesSection: React.FC = () => (
  <section id="features" className="py-16 lg:py-20 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

    <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-6">
          <Cpu className="w-4 h-4 text-cyan-400 mr-2" />
          <span className="text-cyan-300 text-sm font-medium">AI-Powered Features</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          Built on <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Advanced AI</span>
        </h2>
        <p className="text-lg text-gray-400">
          Every feature is enhanced with artificial intelligence to maximize your sales efficiency.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURES_DATA.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-500 hover:transform hover:-translate-y-1 backdrop-blur-sm overflow-hidden"
            >
              {/* Hover Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}></div>

              <div className={`relative w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

// =============================================
// PRODUCT DEMO SECTION - Interactive AI Tabs
// =============================================
export const ProductDemoSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('ai-calls');

  const tabs = [
    { id: 'ai-calls', label: 'AI Calls', icon: Bot },
    { id: 'pipeline', label: 'Pipeline', icon: Layers },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'automation', label: 'Automation', icon: Workflow },
  ];

  return (
    <section id="demo" className="py-16 lg:py-20 bg-slate-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            See <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">AI in Action</span>
          </h2>
          <p className="text-lg text-gray-400">
            Experience how our AI transforms every aspect of your sales process.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-800/50 text-gray-400 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden backdrop-blur-xl">
          <div className="p-8">
            {activeTab === 'ai-calls' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1 mb-4">
                    <Bot className="w-4 h-4 text-cyan-400 mr-2" />
                    <span className="text-cyan-300 text-sm">AI Voice Technology</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Intelligent Voice Agents</h3>
                  <p className="text-gray-400 mb-6">
                    Our AI makes natural-sounding calls in Hindi, English, Tamil, Telugu, and 6 more languages. It qualifies leads, handles objections, and books meetings.
                  </p>
                  <ul className="space-y-3">
                    {['Natural conversations with context', '10+ Indian language support', 'Real-time sentiment analysis', 'Auto meeting scheduling'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-cyan-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">AI Sales Agent</p>
                      <p className="text-cyan-400 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                        Speaking in Hindi...
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="bg-slate-700/50 rounded-lg p-3 text-gray-300">
                      "Namaste! Main MyLeadX se bol rahi hoon. Kya aapko humare CRM solution mein interest hai?"
                    </div>
                    <div className="bg-cyan-500/10 rounded-lg p-3 text-cyan-300 ml-6">
                      AI analyzing response... Positive intent detected
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pipeline' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">AI-Powered Pipeline</h3>
                  <p className="text-gray-400 mb-6">
                    Watch AI automatically move deals through your pipeline based on engagement signals and conversation outcomes.
                  </p>
                  <ul className="space-y-3">
                    {['Auto stage progression', 'AI deal predictions', 'Smart prioritization', 'Revenue forecasting'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-500/20">
                  <div className="flex gap-3">
                    {['New', 'Contacted', 'Qualified', 'Won'].map((stage, i) => (
                      <div key={stage} className="flex-1">
                        <div className={`h-2 rounded-full mb-2 ${
                          i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-yellow-500' : i === 2 ? 'bg-purple-500' : 'bg-green-500'
                        }`} style={{ width: `${100 - i * 15}%` }}></div>
                        <p className="text-xs text-gray-400">{stage}</p>
                        <p className="text-white font-bold">{[42, 28, 15, 8][i]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Predictive Analytics</h3>
                  <p className="text-gray-400 mb-6">
                    AI analyzes patterns across thousands of interactions to predict outcomes and recommend actions.
                  </p>
                  <ul className="space-y-3">
                    {['Conversion predictions', 'Best call time insights', 'Team performance AI', 'Revenue forecasting'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-blue-500/20">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">AI Prediction Accuracy</span>
                      <span className="text-green-400 font-bold">94%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'automation' && (
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4">Smart Automation</h3>
                  <p className="text-gray-400 mb-6">
                    Create AI-powered workflows that trigger actions based on lead behavior and conversation outcomes.
                  </p>
                  <ul className="space-y-3">
                    {['Behavior-based triggers', 'AI follow-up sequences', 'Smart task assignment', 'Multi-channel automation'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-green-500/20">
                  <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                        <Target className="w-6 h-6 text-blue-400" />
                      </div>
                      <span className="text-xs text-gray-400">Lead Created</span>
                    </div>
                    <ChevronRight className="w-8 h-8 text-cyan-500/50 mx-2" />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                        <Bot className="w-6 h-6 text-cyan-400" />
                      </div>
                      <span className="text-xs text-gray-400">AI Calls</span>
                    </div>
                    <ChevronRight className="w-8 h-8 text-cyan-500/50 mx-2" />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                        <Calendar className="w-6 h-6 text-green-400" />
                      </div>
                      <span className="text-xs text-gray-400">Meeting Set</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================
// INDUSTRIES SECTION
// =============================================
const INDUSTRIES_DATA = [
  { icon: GraduationCap, name: 'Education', description: 'AI handles admission inquiries 24/7', gradient: 'from-blue-500 to-cyan-500', href: '/industries/education' },
  { icon: Home, name: 'Real Estate', description: 'Qualify buyers and schedule site visits', gradient: 'from-green-500 to-emerald-500', href: '/industries/real-estate' },
  { icon: Briefcase, name: 'B2B Sales', description: 'AI qualifies enterprise leads at scale', gradient: 'from-purple-500 to-pink-500', href: '/industries/b2b-sales' },
  { icon: Shield, name: 'Insurance', description: 'Policy renewals and cross-sell automation', gradient: 'from-orange-500 to-red-500', href: '/industries/insurance' },
  { icon: Headphones, name: 'Call Centers', description: 'AI augments agent productivity 3x', gradient: 'from-cyan-500 to-blue-500', href: '/industries/call-centers' },
  { icon: Stethoscope, name: 'Healthcare', description: 'Patient appointments & follow-ups', gradient: 'from-rose-500 to-pink-500', href: '/industries/healthcare' },
  { icon: Car, name: 'Automotive', description: 'Test drives & service reminders', gradient: 'from-amber-500 to-orange-500', href: '/industries/automotive' },
  { icon: ShoppingCart, name: 'E-commerce', description: 'Cart recovery & repeat purchases', gradient: 'from-emerald-500 to-green-500', href: '/industries/ecommerce' },
  { icon: Landmark, name: 'Banking & NBFC', description: 'Loans & collection automation', gradient: 'from-indigo-500 to-blue-500', href: '/industries/banking' },
  { icon: Cpu, name: 'IT Services', description: 'Projects & client management', gradient: 'from-indigo-500 to-purple-500', href: '/industries/it-services' },
  { icon: UserCheck, name: 'IT Recruitment', description: 'Candidates & placements', gradient: 'from-teal-500 to-cyan-500', href: '/industries/it-recruitment' },
  { icon: Heart, name: 'Fitness', description: 'Memberships & member retention', gradient: 'from-red-500 to-rose-500', href: '/industries/fitness' },
];

export const IndustriesSection: React.FC = () => (
  <section id="solutions" className="py-16 lg:py-20 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

    <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-6">
          <Network className="w-4 h-4 text-purple-400 mr-2" />
          <span className="text-purple-300 text-sm font-medium">Industry Solutions</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          AI for <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Every Industry</span>
        </h2>
        <p className="text-lg text-gray-400">
          Pre-trained AI models optimized for your specific industry needs.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {INDUSTRIES_DATA.map((industry, index) => {
          const Icon = industry.icon;
          return (
            <Link
              key={index}
              to={industry.href}
              className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-slate-700/50 hover:border-purple-500/30 transition-all text-center backdrop-blur-sm hover:transform hover:-translate-y-1"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${industry.gradient} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">{industry.name}</h3>
              <p className="text-gray-400 text-xs">{industry.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

// =============================================
// AI SECTION - Deep Dive
// =============================================
export const AISection: React.FC = () => (
  <section className="py-16 lg:py-20 bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950 relative overflow-hidden">
    {/* Animated Circuit Pattern */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse"></div>
      <div className="absolute top-2/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
    </div>

    <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Content */}
        <div>
          <div className="inline-flex items-center bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-6">
            <CircuitBoard className="w-4 h-4 text-cyan-400 mr-2" />
            <span className="text-cyan-300 text-sm font-medium">Advanced AI Technology</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            AI That <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Learns & Adapts</span>
          </h2>
          <p className="text-lg text-gray-400 mb-8 leading-relaxed">
            Our neural networks analyze millions of sales conversations to continuously improve. The more you use MyLeadX, the smarter it gets.
          </p>

          <div className="space-y-6">
            {[
              { icon: Brain, title: 'Continuous Learning', desc: 'AI improves from every interaction' },
              { icon: Globe, title: 'Multi-lingual NLP', desc: 'Native understanding of 10+ Indian languages' },
              { icon: Zap, title: 'Real-time Processing', desc: 'Sub-second response times' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-cyan-500/20 group-hover:border-cyan-400/40 transition-all">
                  <item.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual */}
        <div className="relative">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
            {/* AI Brain Visual */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-cyan-500/30">
                  <Brain className="w-16 h-16 text-cyan-400" />
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '10s' }}>
                  <div className="absolute top-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
                  <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-purple-400 rounded-full -translate-x-1/2 translate-y-1/2"></div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">AI Calls Today</span>
                  <span className="text-2xl font-bold text-white">1,247</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full animate-pulse" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Conversion Rate</span>
                  <span className="text-2xl font-bold text-green-400">23.5%</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Accuracy Score</span>
                  <span className="text-2xl font-bold text-purple-400">97.2%</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '97%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// =============================================
// INTEGRATIONS SECTION
// =============================================
export const IntegrationsSection: React.FC = () => (
  <section className="py-16 lg:py-20 bg-slate-950 relative overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

    <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          Connect Your <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Ecosystem</span>
        </h2>
        <p className="text-lg text-gray-400">
          AI-powered integrations with 30+ tools you already use.
        </p>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-4">
        {['WhatsApp', 'Facebook Ads', 'Google Ads', 'Gmail', 'Zapier', 'Razorpay', 'Exotel', 'Twilio', 'Slack', 'HubSpot'].map((tool) => (
          <div
            key={tool}
            className="bg-slate-800/50 px-5 py-3 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800 transition-all group"
          >
            <span className="font-medium text-gray-300 group-hover:text-white transition-colors">{tool}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-gray-500 mt-6">and 20+ more AI-powered integrations</p>
    </div>
  </section>
);

// =============================================
// TESTIMONIALS
// =============================================
const TESTIMONIALS_DATA = [
  { quote: 'MyLeadX AI agents handle 500+ calls daily. Our conversion rate jumped from 8% to 23% in 2 months.', author: 'Rajesh Kumar', role: 'Sales Director', company: 'EduTech Solutions' },
  { quote: 'The AI understands Hindi perfectly. Our team now focuses only on high-intent leads.', author: 'Priya Sharma', role: 'Head of Sales', company: 'PropMart Realty' },
  { quote: 'Best AI CRM for insurance. The AI qualifies leads before our agents pick up the phone.', author: 'Amit Patel', role: 'Agency Owner', company: 'SecureLife Insurance' },
];

export const TestimonialsSection: React.FC = () => (
  <section className="py-16 lg:py-20 bg-gradient-to-b from-slate-950 to-slate-900 relative overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]"></div>

    <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          Loved by <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">AI-Forward Teams</span>
        </h2>
        <p className="text-lg text-gray-400">
          See what our customers say about MyLeadX AI
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TESTIMONIALS_DATA.map((testimonial, index) => (
          <div key={index} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50 hover:border-cyan-500/30 transition-all backdrop-blur-sm group hover:transform hover:-translate-y-1">
            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>

            <p className="text-gray-300 mb-6 leading-relaxed">"{testimonial.quote}"</p>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {testimonial.author.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-white">{testimonial.author}</p>
                <p className="text-gray-500 text-sm">{testimonial.role}, {testimonial.company}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// =============================================
// PRICING SECTION
// =============================================
const PRICING_DATA = [
  {
    name: 'Starter',
    price: '₹2,999',
    description: 'For small teams getting started with AI',
    features: ['5 users', '1,000 leads', '100 AI call minutes', 'Basic automation', 'Email support'],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹9,999',
    description: 'For growing teams with full AI power',
    features: ['15 users', '10,000 leads', '500 AI call minutes', 'Advanced automation', 'Priority support', 'Custom AI training'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large orgs with unlimited AI',
    features: ['Unlimited users', 'Unlimited leads', 'Unlimited AI calls', 'White label', 'Dedicated AI model', 'SLA guarantee'],
    highlighted: false,
  },
];

export const PricingSection: React.FC = () => (
  <section id="pricing" className="py-16 lg:py-20 bg-slate-900 relative overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

    <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4 text-green-400 mr-2" />
          <span className="text-green-300 text-sm font-medium">Simple AI Pricing</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
          Plans That <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Scale With AI</span>
        </h2>
        <p className="text-lg text-gray-400">
          Start free, upgrade when ready. All plans include 14-day trial with full AI access.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {PRICING_DATA.map((plan, index) => (
          <div
            key={index}
            className={`relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl overflow-hidden transition-all hover:transform hover:-translate-y-1 backdrop-blur-sm ${
              plan.highlighted ? 'ring-2 ring-cyan-500 shadow-xl shadow-cyan-500/20' : 'border border-slate-700/50 hover:border-cyan-500/30'
            }`}
          >
            {plan.highlighted && (
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center py-2 text-sm font-bold">
                MOST POPULAR
              </div>
            )}

            <div className="p-8">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-gray-500 text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-gray-500">/month</span>}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`block w-full py-3 rounded-xl font-semibold text-center transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-700/50 text-white hover:bg-slate-700 border border-slate-600/50'
                }`}
              >
                {plan.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link to="/pricing" className="inline-flex items-center text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">
          View full pricing details
          <ChevronRight className="w-5 h-5 ml-1" />
        </Link>
      </div>
    </div>
  </section>
);

// =============================================
// FINAL CTA
// =============================================
export const CTASection: React.FC = () => (
  <section className="py-16 lg:py-20 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 relative overflow-hidden">
    {/* Animated Background */}
    <div className="absolute inset-0">
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-[100px]"></div>
    </div>

    <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 text-center">
      <div className="inline-flex items-center bg-white/10 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
        <Bot className="w-5 h-5 text-white mr-2" />
        <span className="text-white/90 text-sm font-medium">Start Your AI Journey</span>
      </div>

      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
        Ready for AI-Powered Sales?
      </h2>
      <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
        Join 500+ businesses using MyLeadX AI to convert more leads. Start your free trial today.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/register"
          className="inline-flex items-center justify-center bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all shadow-xl group"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Start Free AI Trial
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        <a
          href="mailto:sales@myleadx.ai"
          className="inline-flex items-center justify-center border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
        >
          Talk to AI Expert
        </a>
      </div>

      <p className="text-white/60 text-sm mt-6">No credit card required • Full AI access for 14 days</p>
    </div>
  </section>
);

// =============================================
// FOOTER
// =============================================
export const Footer: React.FC = () => (
  <footer className="bg-slate-950 text-gray-400 border-t border-cyan-500/10">
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-12">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative">
              <img src="/logo.png" alt="MyLeadX" className="h-10 w-10 rounded-lg relative z-10" />
              <div className="absolute inset-0 bg-cyan-500/30 blur-lg rounded-lg"></div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">MyLeadX</span>
          </div>
          <p className="text-gray-500 mb-6 max-w-xs">
            AI-powered CRM helping Indian businesses convert more leads with intelligent automation.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent font-medium">Made in India</span>
            <span>🇮🇳</span>
          </div>
        </div>

        {/* Product */}
        <div>
          <h4 className="text-white font-semibold mb-4">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#features" className="hover:text-cyan-400 transition-colors">AI Features</a></li>
            <li><Link to="/pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link></li>
            <li><a href="#solutions" className="hover:text-cyan-400 transition-colors">Solutions</a></li>
            <li><Link to="/docs" className="hover:text-cyan-400 transition-colors">API</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-cyan-400 transition-colors">About</a></li>
            <li><Link to="/docs" className="hover:text-cyan-400 transition-colors">Blog</Link></li>
            <li><a href="mailto:careers@myleadx.ai" className="hover:text-cyan-400 transition-colors">Careers</a></li>
            <li><a href="mailto:support@myleadx.ai" className="hover:text-cyan-400 transition-colors">Contact</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-white font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy-policy" className="hover:text-cyan-400 transition-colors">Privacy</Link></li>
            <li><Link to="/terms-of-service" className="hover:text-cyan-400 transition-colors">Terms</Link></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Security</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cyan-500/10 mt-12 pt-8 text-center text-sm text-gray-600">
        <p>&copy; {new Date().getFullYear()} MyLeadX. All rights reserved. Powered by AI.</p>
      </div>
    </div>
  </footer>
);
