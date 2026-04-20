import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchUsers, fetchRoles, fetchManagers, createUser, updateUser, deleteUser } from '../../store/slices/userSlice';
import { useForm, useWatch } from 'react-hook-form';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  KeyIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  EyeIcon,
  CalendarDaysIcon,
  UserIcon,
  ArrowUpTrayIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentArrowUpIcon,
  UsersIcon,
  ShieldExclamationIcon,
  DeviceTabletIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  InformationCircleIcon,
  LockClosedIcon,
  SparklesIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { userManagementService, LoginHistoryEntry, UserSession, UserAnalytics, ImportUserData } from '../../services/user-management.service';
import subscriptionService, { Subscription } from '../../services/subscription.service';
import { fetchBranches } from '../../store/slices/branchSlice';

interface UserFormData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  managerId?: string;
  branchId?: string;
  isActive?: boolean;
}

type TabType = 'users' | 'activity' | 'sessions' | 'analytics';

// Enterprise-only plans
const ENTERPRISE_PLANS = ['enterprise', 'business'];

export default function UsersListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { users, roles, managers, isLoading } = useSelector((state: RootState) => state.users);
  const { branches } = useSelector((state: RootState) => state.branches);

  // Subscription state
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Check if user has enterprise features
  const isEnterprise = useMemo(() => {
    if (!subscription) return false;
    return ENTERPRISE_PLANS.includes(subscription.planId);
  }, [subscription]);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isUserAnalyticsModalOpen, setIsUserAnalyticsModalOpen] = useState(false);

  // Selection states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form states
  const [newPassword, setNewPassword] = useState('');

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportUserData[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  // Bulk assign states
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [bulkManagerId, setBulkManagerId] = useState('');

  // Activity states
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loginHistoryTotal, setLoginHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Session states
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Analytics states
  const [userAnalytics, setUserAnalytics] = useState<Record<string, UserAnalytics>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedUserAnalytics, setSelectedUserAnalytics] = useState<UserAnalytics | null>(null);

  const { register, handleSubmit, reset, control, setValue } = useForm<UserFormData>();

  const selectedRoleId = useWatch({ control, name: 'roleId' });
  const selectedBranchId = useWatch({ control, name: 'branchId' });
  const selectedRole = roles.find(r => r.id === selectedRoleId);
  // Show manager dropdown for all roles except admin and owner
  const showManagerDropdown = selectedRole && !['admin', 'owner'].includes(selectedRole.slug);

  // Define strict role hierarchy - each role reports to immediate level above only
  // Note: team_lead and team_leader are both valid slugs for the same role
  const getValidManagerRoles = (roleSlug: string): string[] => {
    switch (roleSlug) {
      case 'telecaller':
      case 'counselor':
        return ['team_lead', 'team_leader']; // Telecallers & Counselors report to Team Leads only
      case 'team_lead':
      case 'team_leader':
        return ['manager']; // Team Leads report to Managers only
      case 'manager':
        return ['admin']; // Managers report to Admins only
      case 'field_sales':
        return ['team_lead', 'team_leader']; // Field Sales report to Team Leads only
      default:
        return ['admin', 'manager', 'team_lead', 'team_leader']; // Default: any manager role
    }
  };

  // Filter managers by selected branch AND role hierarchy
  const filteredManagers = useMemo(() => {
    // Get valid manager roles based on selected user role
    const validManagerRoles = selectedRole ? getValidManagerRoles(selectedRole.slug) : ['admin', 'manager', 'team_lead'];

    // Filter by role hierarchy first
    // For Admins (who manage Managers), don't filter by branch - Admins are org-wide
    // For other roles, filter by branch if selected
    return managers.filter((m: any) => {
      const managerRoleSlug = m.role?.slug || m.roleSlug;
      const roleMatch = validManagerRoles.includes(managerRoleSlug);

      // Admins can manage anyone in the org regardless of branch
      if (validManagerRoles.includes('admin') && managerRoleSlug === 'admin') {
        return roleMatch;
      }

      // For non-admin managers, filter by branch if a branch is selected
      const branchMatch = !selectedBranchId || m.branchId === selectedBranchId || m.branchId === null;
      return branchMatch && roleMatch;
    });
  }, [managers, selectedBranchId, selectedRole]);

  // Clear manager selection when branch changes (only if current manager is not in filtered list)
  useEffect(() => {
    const currentManagerId = watch('managerId');
    if (currentManagerId && !filteredManagers.find((m: any) => m.id === currentManagerId)) {
      setValue('managerId', '');
    }
  }, [selectedBranchId, filteredManagers, setValue, watch]);

  useEffect(() => {
    dispatch(fetchUsers({ role: roleFilter || undefined }));
    dispatch(fetchRoles());
    dispatch(fetchManagers());
    dispatch(fetchBranches(true)); // Fetch active branches
  }, [dispatch, roleFilter]);

  // Fetch subscription to check enterprise status
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const sub = await subscriptionService.getCurrentSubscription();
        setSubscription(sub);
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    fetchSubscription();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'activity') {
      loadLoginHistory();
    } else if (activeTab === 'sessions') {
      loadActiveSessions();
    } else if (activeTab === 'analytics') {
      loadBulkAnalytics();
    }
  }, [activeTab]);

  const loadLoginHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const { history, total } = await userManagementService.getLoginHistory({ page, limit: 20 });
      setLoginHistory(history);
      setLoginHistoryTotal(total);
      setHistoryPage(page);
    } catch (error) {
      toast.error('Failed to load login history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    setSessionsLoading(true);
    try {
      const sessions = await userManagementService.getAllActiveSessions();
      setActiveSessions(sessions);
    } catch (error) {
      toast.error('Failed to load active sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadBulkAnalytics = async () => {
    if (users.length === 0) return;
    setAnalyticsLoading(true);
    try {
      const userIds = users.slice(0, 50).map(u => u.id);
      const analytics = await userManagementService.getBulkUserAnalytics(userIds);
      setUserAnalytics(analytics);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchQuery === '' ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);
      const matchesBranch = branchFilter === '' || user.branchId === branchFilter;
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [users, searchQuery, statusFilter, branchFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const byRole: Record<string, number> = {};
    users.forEach(u => {
      const roleName = u.role?.name || 'Unknown';
      byRole[roleName] = (byRole[roleName] || 0) + 1;
    });
    return { total, active, inactive: total - active, byRole };
  }, [users]);

  const onCreateSubmit = async (data: UserFormData) => {
    try {
      await dispatch(createUser(data)).unwrap();
      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      reset();
    } catch (error: any) {
      // rejectWithValue returns a string directly, not an object
      const errorMessage = typeof error === 'string' ? error : (error?.message || 'Failed to create user');
      toast.error(errorMessage);
    }
  };

  const onEditSubmit = async (data: UserFormData) => {
    if (!selectedUser) return;
    try {
      await dispatch(updateUser({ id: selectedUser.id, data })).unwrap();
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      reset();
    } catch (error: any) {
      const errorMessage = typeof error === 'string' ? error : (error?.message || 'Failed to update user');
      toast.error(errorMessage);
    }
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setValue('firstName', user.firstName);
    setValue('lastName', user.lastName);
    setValue('email', user.email);
    setValue('phone', user.phone || '');
    setValue('roleId', user.role?.id || '');
    setValue('managerId', user.managerId || '');
    setValue('branchId', user.branchId || '');
    setValue('isActive', user.isActive);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await dispatch(deleteUser(id)).unwrap();
        toast.success('User deleted');
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      await dispatch(updateUser({ id: user.id, data: { isActive: !user.isActive } })).unwrap();
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, { password: newPassword });
      toast.success('Password reset successfully');
      setIsResetPasswordModalOpen(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Delete ${selectedUsers.size} users?`)) return;
    try {
      if (action === 'delete') {
        await userManagementService.bulkDeleteUsers(Array.from(selectedUsers));
        dispatch(fetchUsers({ role: roleFilter || undefined }));
      } else {
        await userManagementService.bulkUpdateUsers({
          userIds: Array.from(selectedUsers),
          isActive: action === 'activate',
        });
        dispatch(fetchUsers({ role: roleFilter || undefined }));
      }
      toast.success(`${selectedUsers.size} users ${action === 'delete' ? 'deleted' : action + 'd'}`);
      setSelectedUsers(new Set());
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkRoleId && !bulkManagerId) {
      toast.error('Select a role or manager to assign');
      return;
    }
    try {
      await userManagementService.bulkUpdateUsers({
        userIds: Array.from(selectedUsers),
        roleId: bulkRoleId || undefined,
        managerId: bulkManagerId || undefined,
      });
      toast.success(`${selectedUsers.size} users updated`);
      setSelectedUsers(new Set());
      setIsBulkAssignModalOpen(false);
      setBulkRoleId('');
      setBulkManagerId('');
      dispatch(fetchUsers({ role: roleFilter || undefined }));
    } catch (error) {
      toast.error('Bulk assignment failed');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Manager', 'Status'];
    const rows = filteredUsers.map(u => [
      `${u.firstName} ${u.lastName}`, u.email, u.phone || '', u.role?.name || '',
      u.manager ? `${u.manager.firstName} ${u.manager.lastName}` : '', u.isActive ? 'Active' : 'Inactive'
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    try {
      const content = await file.text();
      const users = userManagementService.parseCSV(content);
      setImportPreview(users);
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse CSV');
      setImportPreview([]);
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) {
      toast.error('No valid users to import');
      return;
    }
    setImportLoading(true);
    try {
      const result = await userManagementService.importUsers(importPreview);
      if (result.success > 0) {
        toast.success(`${result.success} users imported successfully`);
        dispatch(fetchUsers({ role: roleFilter || undefined }));
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} users failed to import`);
      }
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = userManagementService.generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'user-import-template.csv';
    a.click();
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm('Revoke this session?')) return;
    try {
      await userManagementService.revokeSession(sessionId);
      toast.success('Session revoked');
      loadActiveSessions();
    } catch (error) {
      toast.error('Failed to revoke session');
    }
  };

  const handleViewUserAnalytics = async (user: any) => {
    setSelectedUser(user);
    setIsUserAnalyticsModalOpen(true);
    try {
      const analytics = await userManagementService.getUserAnalytics(user.id);
      setSelectedUserAnalytics(analytics);
    } catch (error) {
      toast.error('Failed to load user analytics');
    }
  };

  const getRoleBadgeStyle = (slug?: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-violet-100 text-violet-700 border-violet-200',
      manager: 'bg-blue-100 text-blue-700 border-blue-200',
      owner: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      telecaller: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      counselor: 'bg-amber-100 text-amber-700 border-amber-200',
      field_sales: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return styles[slug || ''] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getDeviceIcon = (device?: string | null) => {
    if (!device) return <ComputerDesktopIcon className="w-4 h-4" />;
    if (device === 'mobile') return <DevicePhoneMobileIcon className="w-4 h-4" />;
    if (device === 'tablet') return <DeviceTabletIcon className="w-4 h-4" />;
    return <ComputerDesktopIcon className="w-4 h-4" />;
  };

  const tabs = [
    { id: 'users', name: 'Users', icon: UsersIcon, count: stats.total, locked: false },
    { id: 'activity', name: 'Activity', icon: ClockIcon, count: null, locked: !isEnterprise },
    { id: 'sessions', name: 'Sessions', icon: GlobeAltIcon, count: activeSessions?.length || null, locked: !isEnterprise },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon, count: null, locked: !isEnterprise },
  ];

  // Enterprise upgrade banner component
  const EnterpriseUpgradeBanner = () => (
    <div className="p-8 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <SparklesIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise Feature</h3>
        <p className="text-gray-600 mb-6">
          Unlock advanced user management features including login activity tracking, session management, and detailed analytics with our Enterprise plan.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/subscription')}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
          >
            <RocketLaunchIcon className="w-5 h-5" />
            Upgrade to Enterprise
          </button>
          <p className="text-xs text-gray-500">
            Current plan: <span className="font-medium text-gray-700 capitalize">{subscription?.planId || 'Free'}</span>
          </p>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4 text-left">
          <div className="p-3 bg-gray-50 rounded-lg">
            <ClockIcon className="w-5 h-5 text-violet-600 mb-2" />
            <p className="text-xs font-medium text-gray-900">Login History</p>
            <p className="text-xs text-gray-500">Track all user logins</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <GlobeAltIcon className="w-5 h-5 text-violet-600 mb-2" />
            <p className="text-xs font-medium text-gray-900">Sessions</p>
            <p className="text-xs text-gray-500">Manage active sessions</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <ChartBarIcon className="w-5 h-5 text-violet-600 mb-2" />
            <p className="text-xs font-medium text-gray-900">Analytics</p>
            <p className="text-xs text-gray-500">Performance metrics</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500">{stats.total} members · {stats.active} active</p>
        </div>
        <div className="flex items-center gap-2">
          {isEnterprise ? (
            <button onClick={() => setIsImportModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ArrowUpTrayIcon className="w-4 h-4" />
              Import
            </button>
          ) : (
            <button
              onClick={() => navigate('/subscription')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
              title="Upgrade to Enterprise for bulk import"
            >
              <LockClosedIcon className="w-4 h-4" />
              Import
              <span className="text-xs bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full">Pro</span>
            </button>
          )}
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
          <button onClick={() => { reset(); setIsCreateModalOpen(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
            <UserPlusIcon className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
                {tab.locked && (
                  <LockClosedIcon className="w-3.5 h-3.5 text-amber-500" />
                )}
                {tab.count !== null && !tab.locked && (
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.locked && (
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 font-medium">
                    Enterprise
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            {/* Filters */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">All Roles</option>
                  {roles.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}
                </select>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">All Branches</option>
                  {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button
                  onClick={() => dispatch(fetchUsers({ role: roleFilter || undefined }))}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Bulk Actions */}
              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">{selectedUsers.size} selected</span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button onClick={() => handleBulkAction('activate')} className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100">Activate</button>
                    <button onClick={() => handleBulkAction('deactivate')} className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100">Deactivate</button>
                    <button onClick={() => setIsBulkAssignModalOpen(true)} className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">Assign Role/Manager</button>
                    <button onClick={() => handleBulkAction('delete')} className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100">Delete</button>
                    <button onClick={() => setSelectedUsers(new Set())} className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Clear</button>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reports To</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <ArrowPathIcon className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Loading...</p>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <UserGroupIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No users found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => {
                              const next = new Set(selectedUsers);
                              next.has(user.id) ? next.delete(user.id) : next.add(user.id);
                              setSelectedUsers(next);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm ${getAvatarStyle(user.firstName)}`}>
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getRoleBadgeStyle(user.role?.slug)}`}>
                            {user.role?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.branch ? (
                            <span className="text-sm text-gray-700">{user.branch.name}</span>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {user.manager ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                                {user.manager.firstName?.[0]}{user.manager.lastName?.[0]}
                              </div>
                              <span className="text-sm text-gray-700">{user.manager.firstName} {user.manager.lastName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                              user.isActive
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {user.isActive ? <><CheckCircleSolid className="w-3.5 h-3.5" /> Active</> : <><XCircleIcon className="w-3.5 h-3.5" /> Inactive</>}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setSelectedUser(user); setIsViewModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="View">
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            {isEnterprise ? (
                              <button onClick={() => handleViewUserAnalytics(user)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Analytics">
                                <ChartBarIcon className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => navigate('/subscription')} className="p-1.5 text-gray-300 hover:text-violet-500 hover:bg-violet-50 rounded-md transition-colors" title="Upgrade for Analytics">
                                <ChartBarIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleEdit(user)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors" title="Edit">
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setSelectedUser(user); setIsResetPasswordModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Reset Password">
                              <KeyIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(user.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
              <p className="text-xs text-gray-500">Showing <span className="font-medium text-gray-700">{filteredUsers.length}</span> of <span className="font-medium text-gray-700">{users.length}</span> users</p>
            </div>
          </>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          !isEnterprise ? (
            <EnterpriseUpgradeBanner />
          ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Login Activity</h3>
              <button onClick={() => loadLoginHistory(1)} className="text-sm text-primary-600 hover:text-primary-700">Refresh</button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : !loginHistory || loginHistory.length === 0 ? (
              <div className="text-center py-12">
                <ClockIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No login activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loginHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      entry.status === 'success' ? 'bg-emerald-100 text-emerald-600' :
                      entry.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {entry.status === 'success' ? <CheckIcon className="w-5 h-5" /> :
                       entry.status === 'failed' ? <XMarkIcon className="w-5 h-5" /> :
                       <ShieldExclamationIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{entry.user.firstName} {entry.user.lastName}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          entry.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                          entry.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">{getDeviceIcon(entry.device)} {entry.browser} on {entry.os}</span>
                        {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{new Date(entry.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}

                {loginHistoryTotal > 20 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => loadLoginHistory(historyPage - 1)}
                      disabled={historyPage === 1}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-500">Page {historyPage} of {Math.ceil(loginHistoryTotal / 20)}</span>
                    <button
                      onClick={() => loadLoginHistory(historyPage + 1)}
                      disabled={historyPage >= Math.ceil(loginHistoryTotal / 20)}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          )
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          !isEnterprise ? (
            <EnterpriseUpgradeBanner />
          ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Active Sessions</h3>
              <button onClick={loadActiveSessions} className="text-sm text-primary-600 hover:text-primary-700">Refresh</button>
            </div>

            {sessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : !activeSessions || activeSessions.length === 0 ? (
              <div className="text-center py-12">
                <GlobeAltIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No active sessions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                      {getDeviceIcon(session.device)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{session.user?.firstName} {session.user?.lastName}</span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Active</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{session.browser} on {session.os}</span>
                        {session.ipAddress && <span>IP: {session.ipAddress}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Last active: {new Date(session.lastActivityAt).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          !isEnterprise ? (
            <EnterpriseUpgradeBanner />
          ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">User Performance</h3>
              <button onClick={loadBulkAnalytics} className="text-sm text-primary-600 hover:text-primary-700">Refresh</button>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : !userAnalytics || Object.keys(userAnalytics).length === 0 ? (
              <div className="text-center py-12">
                <ChartBarIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No analytics data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Total Calls</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Success Rate</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Conversions</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Logins</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.slice(0, 50).map((user) => {
                      const analytics = userAnalytics[user.id];
                      if (!analytics) return null;
                      const successRate = analytics.totalCalls > 0
                        ? Math.round((analytics.successfulCalls / analytics.totalCalls) * 100)
                        : 0;
                      return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarStyle(user.firstName)}`}>
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-gray-500">{user.role?.name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-gray-900">{analytics.totalCalls}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              successRate >= 70 ? 'bg-emerald-100 text-emerald-700' :
                              successRate >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {successRate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-emerald-600">{analytics.leadsConverted}</span>
                            <span className="text-gray-400 text-xs ml-1">/ {analytics.leadsAssigned}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{analytics.loginCount}</td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">
                            {analytics.lastActiveAt ? new Date(analytics.lastActiveAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )
        )}
      </div>

      {/* Create/Edit Modal - Redesigned */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); reset(); }} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary-100 rounded-md">
                      <UserPlusIcon className="w-4 h-4 text-primary-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">{isEditModalOpen ? 'Edit User' : 'Add New User'}</h2>
                  </div>
                  <button onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); reset(); }} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit(isEditModalOpen ? onEditSubmit : onCreateSubmit)} className="p-5">
                {/* Personal Info Section */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personal Info</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                      <input {...register('firstName', { required: true })} placeholder="John" className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Last Name <span className="text-red-500">*</span></label>
                      <input {...register('lastName', { required: true })} placeholder="Doe" className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                      <input type="email" {...register('email', { required: true })} placeholder="john@example.com" autoComplete="off" className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input {...register('phone')} placeholder="+91 9876543210" className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Account Section */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account & Role</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {!isEditModalOpen && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Password <span className="text-red-500">*</span></label>
                        <input type="password" {...register('password', { required: !isEditModalOpen, minLength: 8 })} placeholder="Min 8 chars" autoComplete="new-password" className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
                      </div>
                    )}
                    <div className={!isEditModalOpen ? '' : 'col-span-2'}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Role <span className="text-red-500">*</span></label>
                      <select {...register('roleId', { required: true })} className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white transition-colors">
                        <option value="">Select role</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                      <select {...register('branchId')} className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white transition-colors">
                        <option value="">Select branch</option>
                        {branches.filter(b => b.isActive).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    {showManagerDropdown && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Reports To</label>
                        <select {...register('managerId')} className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white transition-colors disabled:bg-gray-50 disabled:text-gray-400">
                          {filteredManagers.length === 0 ? (
                            <option value="">No managers available</option>
                          ) : (
                            <>
                              <option value="">Select manager</option>
                              {filteredManagers.map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                            </>
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Toggle for Edit Mode */}
                {isEditModalOpen && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">User Status</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Active</span>
                        <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      </div>
                    </label>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); reset(); }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm transition-colors">
                    {isEditModalOpen ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 px-6 py-8">
                <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg ${getAvatarStyle(selectedUser.firstName)}`}>
                    {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedUser.firstName} {selectedUser.lastName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/20 text-white">{selectedUser.role?.name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${selectedUser.isActive ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'}`}>{selectedUser.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0"><EnvelopeIcon className="w-4 h-4 text-blue-600" /></div>
                    <div className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p><p className="text-sm text-gray-900 mt-0.5 break-all">{selectedUser.email}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 rounded-lg flex-shrink-0"><PhoneIcon className="w-4 h-4 text-green-600" /></div>
                    <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p><p className="text-sm text-gray-900 mt-0.5">{selectedUser.phone || '—'}</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-violet-50 rounded-lg"><ShieldCheckIcon className="w-4 h-4 text-violet-600" /></div>
                    <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</p><p className="text-sm text-gray-900 mt-0.5">{selectedUser.role?.name || '—'}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg"><UserIcon className="w-4 h-4 text-amber-600" /></div>
                    <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reports To</p><p className="text-sm text-gray-900 mt-0.5">{selectedUser.manager ? `${selectedUser.manager.firstName} ${selectedUser.manager.lastName}` : '—'}</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg"><UserGroupIcon className="w-4 h-4 text-emerald-600" /></div>
                    <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Branch</p><p className="text-sm text-gray-900 mt-0.5">{selectedUser.branch ? `${selectedUser.branch.name} (${selectedUser.branch.code})` : '—'}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg"><CalendarDaysIcon className="w-4 h-4 text-gray-600" /></div>
                    <div><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</p><p className="text-sm text-gray-900 mt-0.5">{new Date(selectedUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button onClick={() => { setIsViewModalOpen(false); handleEdit(selectedUser); }} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100"><PencilSquareIcon className="w-4 h-4" /> Edit</button>
                  <button onClick={() => { setIsViewModalOpen(false); handleViewUserAnalytics(selectedUser); }} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"><ChartBarIcon className="w-4 h-4" /> Analytics</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsResetPasswordModalOpen(false); setNewPassword(''); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-amber-100 rounded-xl"><KeyIcon className="w-5 h-5 text-amber-600" /></div>
                  <div><h3 className="font-semibold text-gray-900">Reset Password</h3><p className="text-sm text-gray-500">{selectedUser.firstName} {selectedUser.lastName}</p></div>
                </div>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" />
                  <p className="text-xs text-gray-400 mt-1.5">Minimum 8 characters</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIsResetPasswordModalOpen(false); setNewPassword(''); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={handleResetPassword} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 shadow-sm">Reset</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportPreview([]); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg"><DocumentArrowUpIcon className="w-5 h-5 text-blue-600" /></div>
                    <h2 className="text-lg font-semibold text-gray-900">Import Users</h2>
                  </div>
                  <button onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportPreview([]); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><XMarkIcon className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">CSV Format Required</p>
                      <p className="text-xs text-blue-700 mt-1">Columns: email, firstName, lastName, phone (optional), roleSlug, managerEmail (optional), password (optional)</p>
                      <button onClick={handleDownloadTemplate} className="text-xs font-medium text-blue-600 hover:text-blue-700 mt-2 underline">Download Template</button>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block">
                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
                      <div className="text-center">
                        <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">{importFile ? importFile.name : 'Click to upload CSV file'}</p>
                      </div>
                    </div>
                    <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                {importPreview.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Preview ({importPreview.length} users)</h4>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Email</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500">Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importPreview.slice(0, 10).map((user, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2">{user.firstName} {user.lastName}</td>
                              <td className="px-3 py-2">{user.email}</td>
                              <td className="px-3 py-2">{user.roleSlug}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importPreview.length > 10 && <p className="text-xs text-gray-500 text-center py-2">...and {importPreview.length - 10} more</p>}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportPreview([]); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={handleImport} disabled={importPreview.length === 0 || importLoading} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm disabled:opacity-50">
                    {importLoading ? 'Importing...' : `Import ${importPreview.length} Users`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsBulkAssignModalOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Bulk Assignment</h2>
                  <button onClick={() => setIsBulkAssignModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><XMarkIcon className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">Assign role or manager to {selectedUsers.size} selected users</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Role (optional)</label>
                  <select value={bulkRoleId} onChange={(e) => setBulkRoleId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                    <option value="">Keep current role</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Manager (optional)</label>
                  <select value={bulkManagerId} onChange={(e) => setBulkManagerId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                    <option value="">Keep current manager</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setIsBulkAssignModalOpen(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={handleBulkAssign} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm">Apply to {selectedUsers.size} Users</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Analytics Modal - Enhanced */}
      {isUserAnalyticsModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsUserAnalyticsModalOpen(false); setSelectedUserAnalytics(null); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 px-6 py-6">
                <button onClick={() => { setIsUserAnalyticsModalOpen(false); setSelectedUserAnalytics(null); }} className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg ${getAvatarStyle(selectedUser.firstName)}`}>
                    {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedUser.firstName} {selectedUser.lastName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/20 text-white">{selectedUser.role?.name}</span>
                      <span className="text-white/70 text-sm">{selectedUser.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {!selectedUserAnalytics ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <ArrowPathIcon className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                    <p className="text-sm text-gray-500">Loading analytics...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Key Metrics Row */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Performance Overview</h3>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-500 rounded-lg">
                              <PhoneIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-medium text-blue-600">Total Calls</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-700">{selectedUserAnalytics.totalCalls}</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-500 rounded-lg">
                              <CheckCircleIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-medium text-emerald-600">Successful</span>
                          </div>
                          <p className="text-2xl font-bold text-emerald-700">{selectedUserAnalytics.successfulCalls}</p>
                          {selectedUserAnalytics.totalCalls > 0 && (
                            <p className="text-xs text-emerald-600 mt-1">{Math.round((selectedUserAnalytics.successfulCalls / selectedUserAnalytics.totalCalls) * 100)}% success rate</p>
                          )}
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-purple-500 rounded-lg">
                              <SparklesIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-medium text-purple-600">Conversions</span>
                          </div>
                          <p className="text-2xl font-bold text-purple-700">{selectedUserAnalytics.leadsConverted}</p>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-amber-500 rounded-lg">
                              <ChartBarIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs font-medium text-amber-600">Conversion Rate</span>
                          </div>
                          <p className="text-2xl font-bold text-amber-700">{selectedUserAnalytics.conversionRate.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Lead Management */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Lead Management</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Leads Assigned</span>
                            <span className="text-lg font-bold text-gray-900">{selectedUserAnalytics.leadsAssigned}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (selectedUserAnalytics.leadsAssigned / 100) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Leads Converted</span>
                            <span className="text-lg font-bold text-emerald-600">{selectedUserAnalytics.leadsConverted}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all"
                              style={{ width: `${selectedUserAnalytics.leadsAssigned > 0 ? (selectedUserAnalytics.leadsConverted / selectedUserAnalytics.leadsAssigned) * 100 : 0}%` }}
                            />
                          </div>
                          {selectedUserAnalytics.leadsAssigned > 0 && (
                            <p className="text-xs text-gray-500 mt-2">{selectedUserAnalytics.leadsConverted} of {selectedUserAnalytics.leadsAssigned} leads converted</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Activity Stats */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Activity & Sessions</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                          <div className="flex items-center gap-2 mb-1">
                            <ClockIcon className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-medium text-indigo-600">Avg Call Duration</span>
                          </div>
                          <p className="text-xl font-bold text-indigo-700">{formatDuration(selectedUserAnalytics.averageCallDuration)}</p>
                        </div>
                        <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                          <div className="flex items-center gap-2 mb-1">
                            <UserIcon className="w-4 h-4 text-teal-500" />
                            <span className="text-xs font-medium text-teal-600">Total Logins</span>
                          </div>
                          <p className="text-xl font-bold text-teal-700">{selectedUserAnalytics.loginCount}</p>
                        </div>
                        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                          <div className="flex items-center gap-2 mb-1">
                            <GlobeAltIcon className="w-4 h-4 text-rose-500" />
                            <span className="text-xs font-medium text-rose-600">Active Sessions</span>
                          </div>
                          <p className="text-xl font-bold text-rose-700">{selectedUserAnalytics.activeSessions}</p>
                        </div>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">User Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm font-medium text-gray-900">{selectedUser.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <PhoneIcon className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{selectedUser.phone || 'Not provided'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-violet-50 rounded-lg">
                            <ShieldCheckIcon className="w-4 h-4 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Role</p>
                            <p className="text-sm font-medium text-gray-900">{selectedUser.role?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-50 rounded-lg">
                            <UserIcon className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Reports To</p>
                            <p className="text-sm font-medium text-gray-900">{selectedUser.manager ? `${selectedUser.manager.firstName} ${selectedUser.manager.lastName}` : 'None'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <CalendarDaysIcon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Member Since</p>
                            <p className="text-sm font-medium text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 rounded-lg">
                            <ClockIcon className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Last Active</p>
                            <p className="text-sm font-medium text-gray-900">{selectedUserAnalytics.lastActiveAt ? new Date(selectedUserAnalytics.lastActiveAt).toLocaleString() : 'Never'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full ${
                          selectedUser.isActive
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {selectedUser.isActive ? <CheckCircleSolid className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                          {selectedUser.isActive ? 'Active User' : 'Inactive User'}
                        </span>
                      </div>
                      <button
                        onClick={() => { setIsUserAnalyticsModalOpen(false); handleEdit(selectedUser); }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Edit User
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getAvatarStyle(name?: string) {
  const colors = [
    'bg-gradient-to-br from-violet-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-cyan-600',
    'bg-gradient-to-br from-emerald-500 to-teal-600',
    'bg-gradient-to-br from-orange-500 to-red-600',
    'bg-gradient-to-br from-pink-500 to-rose-600',
    'bg-gradient-to-br from-indigo-500 to-blue-600',
  ];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}
