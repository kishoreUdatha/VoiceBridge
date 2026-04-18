import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { roleService, Role as APIRole } from '../../services/role.service';

// Permission categories with their sub-permissions - Based on MyLeadX CRM Features
const permissionCategories = [
  {
    id: 'roles',
    name: 'Roles & Permissions',
    permissions: [
      { id: 'roles_view', name: 'View Roles & Permissions' },
      { id: 'roles_create', name: 'Create Roles' },
      { id: 'roles_edit', name: 'Edit Roles' },
      { id: 'roles_delete', name: 'Delete Roles' },
    ],
  },
  {
    id: 'leads',
    name: 'Leads Management',
    permissions: [
      { id: 'leads_view', name: 'View Leads' },
      { id: 'leads_create', name: 'Create Leads' },
      { id: 'leads_edit', name: 'Edit Leads' },
      { id: 'leads_delete', name: 'Delete Leads' },
      { id: 'leads_import', name: 'Import Leads' },
      { id: 'leads_export', name: 'Export Leads' },
      { id: 'leads_assign', name: 'Assign Leads' },
      { id: 'leads_transfer', name: 'Transfer Leads' },
      { id: 'leads_bulk_update', name: 'Bulk Update Leads' },
      { id: 'leads_view_all', name: 'View All Leads (Team)' },
    ],
  },
  {
    id: 'pipeline',
    name: 'Lead Pipeline',
    permissions: [
      { id: 'pipeline_view', name: 'View Pipeline' },
      { id: 'pipeline_manage_stages', name: 'Manage Pipeline Stages' },
      { id: 'pipeline_move_leads', name: 'Move Leads Between Stages' },
      { id: 'pipeline_configure', name: 'Configure Pipeline Settings' },
    ],
  },
  {
    id: 'calls',
    name: 'Calls & Telephony',
    permissions: [
      { id: 'calls_view', name: 'View Call History' },
      { id: 'calls_make', name: 'Make Outbound Calls' },
      { id: 'calls_receive', name: 'Receive Inbound Calls' },
      { id: 'calls_record', name: 'Access Call Recordings' },
      { id: 'calls_delete', name: 'Delete Call Records' },
      { id: 'calls_monitor', name: 'Monitor Live Calls' },
      { id: 'calls_barge', name: 'Barge Into Calls' },
      { id: 'calls_whisper', name: 'Whisper During Calls' },
    ],
  },
  {
    id: 'voice_ai',
    name: 'Voice AI & Agents',
    permissions: [
      { id: 'voice_ai_view', name: 'View Voice AI Agents' },
      { id: 'voice_ai_create', name: 'Create Voice AI Agents' },
      { id: 'voice_ai_edit', name: 'Edit Voice AI Agents' },
      { id: 'voice_ai_deploy', name: 'Deploy Voice AI Agents' },
      { id: 'voice_ai_analytics', name: 'View AI Analytics' },
    ],
  },
  {
    id: 'ivr',
    name: 'IVR Builder',
    permissions: [
      { id: 'ivr_view', name: 'View IVR Flows' },
      { id: 'ivr_create', name: 'Create IVR Flows' },
      { id: 'ivr_edit', name: 'Edit IVR Flows' },
      { id: 'ivr_delete', name: 'Delete IVR Flows' },
      { id: 'ivr_publish', name: 'Publish IVR Flows' },
    ],
  },
  {
    id: 'followups',
    name: 'Follow-ups',
    permissions: [
      { id: 'followups_view', name: 'View Follow-ups' },
      { id: 'followups_create', name: 'Create Follow-ups' },
      { id: 'followups_edit', name: 'Edit Follow-ups' },
      { id: 'followups_delete', name: 'Delete Follow-ups' },
      { id: 'followups_view_team', name: 'View Team Follow-ups' },
    ],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    permissions: [
      { id: 'tasks_view', name: 'View Tasks' },
      { id: 'tasks_create', name: 'Create Tasks' },
      { id: 'tasks_edit', name: 'Edit Tasks' },
      { id: 'tasks_delete', name: 'Delete Tasks' },
      { id: 'tasks_assign', name: 'Assign Tasks' },
      { id: 'tasks_view_team', name: 'View Team Tasks' },
    ],
  },
  {
    id: 'campaigns',
    name: 'Campaigns',
    permissions: [
      { id: 'campaigns_view', name: 'View Campaigns' },
      { id: 'campaigns_create', name: 'Create Campaigns' },
      { id: 'campaigns_edit', name: 'Edit Campaigns' },
      { id: 'campaigns_delete', name: 'Delete Campaigns' },
      { id: 'campaigns_launch', name: 'Launch Campaigns' },
      { id: 'campaigns_analytics', name: 'View Campaign Analytics' },
    ],
  },
  {
    id: 'admissions',
    name: 'Admissions',
    permissions: [
      { id: 'admissions_view', name: 'View Admissions' },
      { id: 'admissions_create', name: 'Create Admissions' },
      { id: 'admissions_edit', name: 'Edit Admissions' },
      { id: 'admissions_approve', name: 'Approve Admissions' },
      { id: 'admissions_cancel', name: 'Cancel Admissions' },
    ],
  },
  {
    id: 'fees',
    name: 'Fee Collection',
    permissions: [
      { id: 'fees_view', name: 'View Fee Records' },
      { id: 'fees_collect', name: 'Collect Fees' },
      { id: 'fees_edit', name: 'Edit Fee Records' },
      { id: 'fees_refund', name: 'Process Refunds' },
      { id: 'fees_reports', name: 'View Fee Reports' },
      { id: 'fees_configure', name: 'Configure Fee Categories' },
    ],
  },
  {
    id: 'courses',
    name: 'Courses & Programs',
    permissions: [
      { id: 'courses_view', name: 'View Courses' },
      { id: 'courses_create', name: 'Create Courses' },
      { id: 'courses_edit', name: 'Edit Courses' },
      { id: 'courses_delete', name: 'Delete Courses' },
    ],
  },
  {
    id: 'field_sales',
    name: 'Field Sales',
    permissions: [
      { id: 'field_view', name: 'View Field Activities' },
      { id: 'field_checkin', name: 'Check-in/Check-out' },
      { id: 'field_visits', name: 'Record Site Visits' },
      { id: 'field_expenses', name: 'Submit Expenses' },
      { id: 'field_tracking', name: 'Location Tracking' },
      { id: 'field_view_team', name: 'View Team Field Activities' },
    ],
  },
  {
    id: 'quotations',
    name: 'Quotations',
    permissions: [
      { id: 'quotations_view', name: 'View Quotations' },
      { id: 'quotations_create', name: 'Create Quotations' },
      { id: 'quotations_edit', name: 'Edit Quotations' },
      { id: 'quotations_send', name: 'Send Quotations' },
      { id: 'quotations_approve', name: 'Approve Quotations' },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    permissions: [
      { id: 'whatsapp_view', name: 'View Messages' },
      { id: 'whatsapp_send', name: 'Send Messages' },
      { id: 'whatsapp_bulk', name: 'Bulk Messaging' },
      { id: 'whatsapp_templates', name: 'Manage Templates' },
      { id: 'whatsapp_chatbot', name: 'Configure Chatbot' },
    ],
  },
  {
    id: 'email',
    name: 'Email',
    permissions: [
      { id: 'email_view', name: 'View Emails' },
      { id: 'email_send', name: 'Send Emails' },
      { id: 'email_bulk', name: 'Bulk Emails' },
      { id: 'email_templates', name: 'Manage Templates' },
      { id: 'email_sequences', name: 'Manage Email Sequences' },
    ],
  },
  {
    id: 'sms',
    name: 'SMS',
    permissions: [
      { id: 'sms_view', name: 'View SMS' },
      { id: 'sms_send', name: 'Send SMS' },
      { id: 'sms_bulk', name: 'Bulk SMS' },
      { id: 'sms_templates', name: 'Manage SMS Templates' },
    ],
  },
  {
    id: 'live_chat',
    name: 'Live Chat',
    permissions: [
      { id: 'live_chat_view', name: 'View Live Chats' },
      { id: 'live_chat_respond', name: 'Respond to Chats' },
      { id: 'live_chat_transfer', name: 'Transfer Chats' },
      { id: 'live_chat_configure', name: 'Configure Chat Widget' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    permissions: [
      { id: 'reports_view', name: 'View Reports' },
      { id: 'reports_export', name: 'Export Reports' },
      { id: 'reports_user', name: 'User Reports' },
      { id: 'reports_campaign', name: 'Campaign Reports' },
      { id: 'reports_call', name: 'Call Reports' },
      { id: 'reports_admission', name: 'Admission Reports' },
      { id: 'reports_payment', name: 'Payment Reports' },
      { id: 'reports_custom', name: 'Create Custom Reports' },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & AI',
    permissions: [
      { id: 'analytics_view', name: 'View Analytics Dashboard' },
      { id: 'analytics_ai_scoring', name: 'View AI Lead Scoring' },
      { id: 'analytics_sentiment', name: 'View Sentiment Analysis' },
      { id: 'analytics_predictive', name: 'View Predictive Analytics' },
      { id: 'analytics_export', name: 'Export Analytics Data' },
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    permissions: [
      { id: 'dashboard_view', name: 'View Dashboard' },
      { id: 'dashboard_analytics', name: 'View Dashboard Analytics' },
      { id: 'dashboard_team', name: 'View Team Stats' },
      { id: 'dashboard_customize', name: 'Customize Dashboard' },
    ],
  },
  {
    id: 'team',
    name: 'Team Management',
    permissions: [
      { id: 'team_view', name: 'View Team Members' },
      { id: 'team_create', name: 'Create Teams' },
      { id: 'team_edit', name: 'Edit Teams' },
      { id: 'team_monitor', name: 'Monitor Team Performance' },
      { id: 'team_targets', name: 'Set Team Targets' },
    ],
  },
  {
    id: 'users',
    name: 'User Management',
    permissions: [
      { id: 'users_view', name: 'View Users' },
      { id: 'users_create', name: 'Create Users' },
      { id: 'users_edit', name: 'Edit Users' },
      { id: 'users_delete', name: 'Delete Users' },
      { id: 'users_activate', name: 'Activate/Deactivate Users' },
      { id: 'users_reset_password', name: 'Reset User Passwords' },
    ],
  },
  {
    id: 'integrations',
    name: 'Integrations',
    permissions: [
      { id: 'integrations_view', name: 'View Integrations' },
      { id: 'integrations_facebook', name: 'Manage Facebook Ads' },
      { id: 'integrations_google', name: 'Manage Google Ads' },
      { id: 'integrations_indiamart', name: 'Manage IndiaMART' },
      { id: 'integrations_justdial', name: 'Manage JustDial' },
      { id: 'integrations_zapier', name: 'Manage Zapier' },
      { id: 'integrations_api', name: 'Manage API Keys' },
    ],
  },
  {
    id: 'workflows',
    name: 'Workflow Automation',
    permissions: [
      { id: 'workflows_view', name: 'View Workflows' },
      { id: 'workflows_create', name: 'Create Workflows' },
      { id: 'workflows_edit', name: 'Edit Workflows' },
      { id: 'workflows_delete', name: 'Delete Workflows' },
      { id: 'workflows_activate', name: 'Activate/Deactivate Workflows' },
    ],
  },
  {
    id: 'gamification',
    name: 'Gamification',
    permissions: [
      { id: 'gamification_view', name: 'View Leaderboards' },
      { id: 'gamification_configure', name: 'Configure Gamification Rules' },
      { id: 'gamification_rewards', name: 'Manage Rewards' },
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance & Audit',
    permissions: [
      { id: 'compliance_view', name: 'View Compliance Settings' },
      { id: 'compliance_edit', name: 'Edit Compliance Settings' },
      { id: 'audit_logs_view', name: 'View Audit Logs' },
      { id: 'audit_logs_export', name: 'Export Audit Logs' },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    permissions: [
      { id: 'settings_view', name: 'View Settings' },
      { id: 'settings_general', name: 'Edit General Settings' },
      { id: 'settings_lead_sources', name: 'Manage Lead Sources' },
      { id: 'settings_lead_stages', name: 'Manage Lead Stages' },
      { id: 'settings_custom_fields', name: 'Manage Custom Fields' },
      { id: 'settings_templates', name: 'Manage Templates' },
      { id: 'settings_notifications', name: 'Configure Notifications' },
    ],
  },
  {
    id: 'data',
    name: 'Data Management',
    permissions: [
      { id: 'data_import', name: 'Import Data' },
      { id: 'data_export', name: 'Export Data' },
      { id: 'data_bulk_delete', name: 'Bulk Delete Data' },
      { id: 'data_deduplication', name: 'Run Deduplication' },
      { id: 'data_backup', name: 'Manage Backups' },
    ],
  },
];

// Default roles with their permissions - Based on MyLeadX CRM hierarchy
const defaultRoles = [
  {
    id: '1',
    name: 'ORG_ADMIN',
    displayName: 'Org Admin',
    isSystem: true,
    permissions: permissionCategories.flatMap(c => c.permissions.map(p => p.id)), // All permissions
  },
  {
    id: '2',
    name: 'MANAGER',
    displayName: 'Manager',
    isSystem: true,
    permissions: [
      // Roles - View only
      'roles_view',
      // Leads - Full access except delete and bulk operations
      'leads_view', 'leads_create', 'leads_edit', 'leads_import', 'leads_export', 'leads_assign', 'leads_transfer', 'leads_view_all',
      // Pipeline
      'pipeline_view', 'pipeline_move_leads',
      // Calls - Full access except delete
      'calls_view', 'calls_make', 'calls_receive', 'calls_record', 'calls_monitor',
      // Voice AI - View only
      'voice_ai_view', 'voice_ai_analytics',
      // IVR - View only
      'ivr_view',
      // Follow-ups
      'followups_view', 'followups_create', 'followups_edit', 'followups_view_team',
      // Tasks
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign', 'tasks_view_team',
      // Campaigns
      'campaigns_view', 'campaigns_create', 'campaigns_edit', 'campaigns_analytics',
      // Admissions
      'admissions_view', 'admissions_create', 'admissions_edit', 'admissions_approve',
      // Fees
      'fees_view', 'fees_collect', 'fees_edit', 'fees_reports',
      // Courses
      'courses_view',
      // Field Sales
      'field_view', 'field_view_team',
      // Quotations
      'quotations_view', 'quotations_create', 'quotations_edit', 'quotations_send',
      // WhatsApp
      'whatsapp_view', 'whatsapp_send', 'whatsapp_bulk',
      // Email
      'email_view', 'email_send', 'email_bulk',
      // SMS
      'sms_view', 'sms_send',
      // Live Chat
      'live_chat_view', 'live_chat_respond', 'live_chat_transfer',
      // Reports - Full access
      'reports_view', 'reports_export', 'reports_user', 'reports_campaign', 'reports_call', 'reports_admission', 'reports_payment',
      // Analytics
      'analytics_view', 'analytics_ai_scoring',
      // Dashboard
      'dashboard_view', 'dashboard_analytics', 'dashboard_team',
      // Team
      'team_view', 'team_monitor', 'team_targets',
      // Users - View only
      'users_view',
      // Integrations - View only
      'integrations_view',
      // Workflows - View only
      'workflows_view',
      // Gamification
      'gamification_view',
      // Compliance
      'compliance_view', 'audit_logs_view',
      // Settings - Limited
      'settings_view',
      // Data
      'data_import', 'data_export',
    ],
  },
  {
    id: '3',
    name: 'TEAM_LEADER',
    displayName: 'Team Leader',
    isSystem: true,
    permissions: [
      // Leads
      'leads_view', 'leads_create', 'leads_edit', 'leads_assign', 'leads_view_all',
      // Pipeline
      'pipeline_view', 'pipeline_move_leads',
      // Calls
      'calls_view', 'calls_make', 'calls_receive', 'calls_record', 'calls_monitor',
      // Voice AI
      'voice_ai_view',
      // Follow-ups
      'followups_view', 'followups_create', 'followups_edit', 'followups_view_team',
      // Tasks
      'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign', 'tasks_view_team',
      // Campaigns
      'campaigns_view',
      // Admissions
      'admissions_view', 'admissions_create', 'admissions_edit',
      // Fees
      'fees_view', 'fees_collect',
      // Field Sales
      'field_view', 'field_view_team',
      // Quotations
      'quotations_view', 'quotations_create', 'quotations_send',
      // WhatsApp
      'whatsapp_view', 'whatsapp_send',
      // Email
      'email_view', 'email_send',
      // SMS
      'sms_view', 'sms_send',
      // Live Chat
      'live_chat_view', 'live_chat_respond',
      // Reports
      'reports_view', 'reports_user', 'reports_call',
      // Dashboard
      'dashboard_view', 'dashboard_team',
      // Team
      'team_view', 'team_monitor',
      // Gamification
      'gamification_view',
    ],
  },
  {
    id: '4',
    name: 'TELECALLER',
    displayName: 'Tele Caller',
    isSystem: true,
    permissions: [
      // Leads - Limited
      'leads_view', 'leads_edit',
      // Pipeline
      'pipeline_view', 'pipeline_move_leads',
      // Calls - Core functionality
      'calls_view', 'calls_make', 'calls_receive', 'calls_record',
      // Follow-ups
      'followups_view', 'followups_create', 'followups_edit',
      // Tasks
      'tasks_view', 'tasks_create', 'tasks_edit',
      // Admissions
      'admissions_view', 'admissions_create',
      // Fees
      'fees_view',
      // WhatsApp
      'whatsapp_view', 'whatsapp_send',
      // Email
      'email_view', 'email_send',
      // SMS
      'sms_view', 'sms_send',
      // Live Chat
      'live_chat_view', 'live_chat_respond',
      // Dashboard
      'dashboard_view',
      // Gamification
      'gamification_view',
    ],
  },
  {
    id: '5',
    name: 'FIELD_EXECUTIVE',
    displayName: 'Field Executive',
    isSystem: true,
    permissions: [
      // Leads - Limited
      'leads_view', 'leads_edit',
      // Pipeline
      'pipeline_view', 'pipeline_move_leads',
      // Calls
      'calls_view', 'calls_make', 'calls_receive',
      // Follow-ups
      'followups_view', 'followups_create', 'followups_edit',
      // Tasks
      'tasks_view', 'tasks_create', 'tasks_edit',
      // Admissions
      'admissions_view', 'admissions_create',
      // Fees
      'fees_view', 'fees_collect',
      // Field Sales - Full access
      'field_view', 'field_checkin', 'field_visits', 'field_expenses', 'field_tracking',
      // Quotations
      'quotations_view', 'quotations_create', 'quotations_send',
      // WhatsApp
      'whatsapp_view', 'whatsapp_send',
      // SMS
      'sms_view', 'sms_send',
      // Dashboard
      'dashboard_view',
      // Gamification
      'gamification_view',
    ],
  },
  {
    id: '6',
    name: 'COUNSELOR',
    displayName: 'Counselor',
    isSystem: true,
    permissions: [
      // Leads
      'leads_view', 'leads_create', 'leads_edit',
      // Pipeline
      'pipeline_view', 'pipeline_move_leads',
      // Calls
      'calls_view', 'calls_make', 'calls_receive', 'calls_record',
      // Follow-ups
      'followups_view', 'followups_create', 'followups_edit',
      // Tasks
      'tasks_view', 'tasks_create', 'tasks_edit',
      // Admissions - Full access
      'admissions_view', 'admissions_create', 'admissions_edit',
      // Fees
      'fees_view', 'fees_collect',
      // Courses
      'courses_view',
      // WhatsApp
      'whatsapp_view', 'whatsapp_send',
      // Email
      'email_view', 'email_send',
      // SMS
      'sms_view', 'sms_send',
      // Dashboard
      'dashboard_view',
      // Gamification
      'gamification_view',
    ],
  },
  {
    id: '7',
    name: 'ACCOUNTS',
    displayName: 'Accounts',
    isSystem: true,
    permissions: [
      // Leads - View only
      'leads_view',
      // Admissions
      'admissions_view',
      // Fees - Full access
      'fees_view', 'fees_collect', 'fees_edit', 'fees_refund', 'fees_reports', 'fees_configure',
      // Reports - Payment focused
      'reports_view', 'reports_export', 'reports_payment', 'reports_admission',
      // Dashboard
      'dashboard_view',
      // Data
      'data_export',
    ],
  },
];

interface Role {
  id: string;
  name: string;
  displayName: string;
  isSystem: boolean;
  permissions: string[];
}

export default function RolesListPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['roles']);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [editingRoleName, setEditingRoleName] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');

  // Load roles from API
  const loadRoles = useCallback(async () => {
    try {
      const apiRoles = await roleService.getAll();
      // Transform API roles to component format
      const transformedRoles: Role[] = apiRoles.map(r => ({
        id: r.id,
        name: r.slug.toUpperCase(),
        displayName: r.name,
        isSystem: r.isSystem,
        permissions: r.permissions || [],
      }));

      // If no roles from API, use defaults
      if (transformedRoles.length === 0) {
        setRoles(defaultRoles);
      } else {
        setRoles(transformedRoles);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
      // Fallback to default roles on error
      setRoles(defaultRoles);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const expandAllCategories = () => {
    setExpandedCategories(permissionCategories.map(c => c.id));
  };

  const collapseAllCategories = () => {
    setExpandedCategories([]);
  };

  const togglePermission = async (roleId: string, permissionId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const hasPermission = role.permissions.includes(permissionId);
    const newPermissions = hasPermission
      ? role.permissions.filter(p => p !== permissionId)
      : [...role.permissions, permissionId];

    // Optimistic update
    setRoles(prev =>
      prev.map(r => r.id === roleId ? { ...r, permissions: newPermissions } : r)
    );

    try {
      await roleService.updatePermissions(roleId, newPermissions);
    } catch (error) {
      // Revert on error
      setRoles(prev =>
        prev.map(r => r.id === roleId ? { ...r, permissions: role.permissions } : r)
      );
      toast.error('Failed to update permission');
      console.error('Failed to update permission:', error);
    }
  };

  const toggleCategoryPermissions = async (roleId: string, categoryId: string) => {
    const category = permissionCategories.find(c => c.id === categoryId);
    if (!category) return;

    const categoryPermissionIds = category.permissions.map(p => p.id);
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const allSelected = categoryPermissionIds.every(pId => role.permissions.includes(pId));
    const originalPermissions = [...role.permissions];

    let newPermissions: string[];
    if (allSelected) {
      newPermissions = role.permissions.filter(p => !categoryPermissionIds.includes(p));
    } else {
      newPermissions = [...new Set([...role.permissions, ...categoryPermissionIds])];
    }

    // Optimistic update
    setRoles(prev =>
      prev.map(r => r.id === roleId ? { ...r, permissions: newPermissions } : r)
    );

    try {
      await roleService.updatePermissions(roleId, newPermissions);
    } catch (error) {
      // Revert on error
      setRoles(prev =>
        prev.map(r => r.id === roleId ? { ...r, permissions: originalPermissions } : r)
      );
      toast.error('Failed to update permissions');
      console.error('Failed to update permissions:', error);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }

    try {
      const created = await roleService.create({
        name: newRoleName,
        slug: newRoleName.toLowerCase().replace(/\s+/g, '_'),
        permissions: [],
      });

      const newRole: Role = {
        id: created.id,
        name: created.slug.toUpperCase(),
        displayName: created.name,
        isSystem: created.isSystem,
        permissions: created.permissions || [],
      };

      setRoles(prev => [...prev, newRole]);
      setNewRoleName('');
      setShowAddRoleModal(false);
      toast.success('Role added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add role');
      console.error('Failed to add role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystem) {
      toast.error('System roles cannot be deleted');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${role?.displayName}"?`)) {
      return;
    }

    try {
      await roleService.delete(roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
      toast.success('Role deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
      console.error('Failed to delete role:', error);
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('This will reload all roles from the server. Continue?')) {
      setIsLoading(true);
      await loadRoles();
      toast.success('Roles reloaded from server');
    }
  };

  const handleUpdateRoleName = async (roleId: string, newName: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    try {
      await roleService.update(roleId, { name: newName });
      setRoles(prev =>
        prev.map(r => {
          if (r.id === roleId) {
            return {
              ...r,
              displayName: newName,
              name: newName.toUpperCase().replace(/\s+/g, '_'),
            };
          }
          return r;
        })
      );
      setEditingRoleName(null);
      toast.success('Role name updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update role name');
      console.error('Failed to update role name:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Roles and Permissions</h1>
          <span className="text-xs text-slate-500">
            {permissionCategories.length} categories • {permissionCategories.flatMap(c => c.permissions).length} permissions • {roles.length} roles
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAllCategories}
            className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
          >
            Expand All
          </button>
          <button
            onClick={collapseAllCategories}
            className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
          >
            Collapse All
          </button>
          <button
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddRoleModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Role
          </button>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-180px)]">
          <table className="min-w-full border-collapse">
            {/* Table Header - Roles */}
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 min-w-[240px] sticky left-0 bg-slate-50 z-30">
                  Permission
                </th>
                {roles.map((role) => (
                  <th key={role.id} className="px-2 py-2 text-center min-w-[100px] bg-slate-50">
                    <div className="flex flex-col items-center gap-0.5">
                      {editingRoleName === role.id ? (
                        <input
                          type="text"
                          defaultValue={role.displayName}
                          className="w-full px-1 py-0.5 text-xs text-center border border-primary-300 rounded focus:ring-1 focus:ring-primary-500"
                          onBlur={(e) => handleUpdateRoleName(role.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateRoleName(role.id, e.currentTarget.value);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide">
                            {role.name}
                          </span>
                          <button
                            onClick={() => setEditingRoleName(role.id)}
                            className="p-0.5 text-slate-400 hover:text-primary-600"
                          >
                            <PencilIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {!role.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-[10px] text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body - Permission Categories */}
            <tbody className="divide-y divide-slate-100">
              {permissionCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category.id);

                return (
                  <>
                    {/* Category Row */}
                    <tr key={category.id} className="bg-slate-100 hover:bg-slate-150">
                      <td className="px-4 py-1.5 sticky left-0 bg-slate-100 z-10">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="flex items-center gap-1.5 w-full text-left"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className="font-medium text-sm text-slate-900">{category.name}</span>
                          <span className="text-[10px] text-slate-400">
                            ({category.permissions.length})
                          </span>
                        </button>
                      </td>
                      {roles.map((role) => {
                        const categoryPermissionIds = category.permissions.map(p => p.id);
                        const selectedCount = categoryPermissionIds.filter(pId =>
                          role.permissions.includes(pId)
                        ).length;
                        const allSelected = selectedCount === categoryPermissionIds.length;
                        const someSelected = selectedCount > 0 && selectedCount < categoryPermissionIds.length;

                        return (
                          <td key={role.id} className="px-2 py-1.5 text-center bg-slate-100">
                            <button
                              onClick={() => toggleCategoryPermissions(role.id, category.id)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mx-auto ${
                                allSelected
                                  ? 'bg-primary-600 border-primary-600 text-white'
                                  : someSelected
                                  ? 'bg-primary-100 border-primary-400'
                                  : 'border-slate-300 hover:border-primary-400'
                              }`}
                            >
                              {allSelected && <CheckIcon className="w-3 h-3" />}
                              {someSelected && <div className="w-1.5 h-1.5 bg-primary-500 rounded-full" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Permission Rows (Expanded) */}
                    {isExpanded &&
                      category.permissions.map((permission) => (
                        <tr key={permission.id} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-1 pl-10 sticky left-0 bg-white z-10">
                            <span className="text-xs text-slate-600">{permission.name}</span>
                          </td>
                          {roles.map((role) => {
                            const hasPermission = role.permissions.includes(permission.id);
                            return (
                              <td key={role.id} className="px-2 py-1 text-center bg-white">
                                <button
                                  onClick={() => togglePermission(role.id, permission.id)}
                                  className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all mx-auto ${
                                    hasPermission
                                      ? 'bg-primary-600 border-primary-600 text-white'
                                      : 'border-slate-300 hover:border-primary-400'
                                  }`}
                                >
                                  {hasPermission && <CheckIcon className="w-2.5 h-2.5" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Add New Role</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Senior Executive"
                autoFocus
              />
              <p className="mt-2 text-xs text-slate-500">
                The role will be created with no permissions. You can assign permissions after creating.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddRoleModal(false);
                  setNewRoleName('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
