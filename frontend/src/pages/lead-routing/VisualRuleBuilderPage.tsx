/**
 * Visual Lead Routing Rule Builder
 * Drag-drop interface for creating and managing lead routing rules
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  ArrowsUpDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  leadRoutingService,
  RoutingRule,
  RoutingGroup,
  RuleCondition,
  ActionType,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  ACTION_TYPES,
  ConditionOperator,
} from '../../services/lead-routing.service';
import { userService } from '../../services/user.service';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function VisualRuleBuilderPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [groups, setGroups] = useState<RoutingGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testLeadData, setTestLeadData] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; rule?: string; reason: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    conditions: [] as RuleCondition[],
    conditionLogic: 'AND' as 'AND' | 'OR',
    actionType: 'ROUND_ROBIN' as ActionType,
    assignToUserId: '',
    routingGroupId: '',
    priority: 50,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesData, groupsData, usersResponse] = await Promise.all([
        leadRoutingService.getRules(),
        leadRoutingService.getGroups(),
        userService.getAll({ limit: 100 }),
      ]);
      setRules(rulesData);
      setGroups(groupsData);
      setUsers(usersResponse.users || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load routing rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      conditions: [],
      conditionLogic: 'AND',
      actionType: 'ROUND_ROBIN',
      assignToUserId: '',
      routingGroupId: '',
      priority: 50,
    });
    setEditingRule(null);
  };

  const handleCreateRule = () => {
    resetForm();
    setShowRuleModal(true);
  };

  const handleEditRule = (rule: RoutingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      conditions: rule.conditions || [],
      conditionLogic: rule.conditionLogic,
      actionType: rule.actionType,
      assignToUserId: rule.assignToUserId || '',
      routingGroupId: rule.routingGroupId || '',
      priority: rule.priority,
    });
    setShowRuleModal(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await leadRoutingService.deleteRule(ruleId);
      toast.success('Rule deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleToggleRule = async (rule: RoutingRule) => {
    try {
      await leadRoutingService.updateRule(rule.id, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Rule disabled' : 'Rule enabled');
      fetchData();
    } catch (error) {
      toast.error('Failed to update rule');
    }
  };

  const handleSaveRule = async () => {
    if (!formData.name) {
      toast.error('Please enter a rule name');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        conditions: formData.conditions.map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
        conditionLogic: formData.conditionLogic,
        actionType: formData.actionType,
        assignToUserId: formData.actionType === 'ASSIGN_USER' ? formData.assignToUserId : undefined,
        routingGroupId: ['ROUND_ROBIN', 'LOAD_BALANCE'].includes(formData.actionType) ? formData.routingGroupId : undefined,
        priority: formData.priority,
      };

      if (editingRule) {
        await leadRoutingService.updateRule(editingRule.id, payload);
        toast.success('Rule updated');
      } else {
        await leadRoutingService.createRule(payload);
        toast.success('Rule created');
      }

      setShowRuleModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save rule');
    }
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          id: `cond-${Date.now()}`,
          field: 'source',
          operator: 'equals' as ConditionOperator,
          value: '',
        },
      ],
    }));
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleTestRule = async () => {
    // Simulate rule testing with provided lead data
    setTestResult(null);

    // For now, show a mock result based on conditions
    const matchedRule = rules.find(rule => {
      if (!rule.isActive) return false;
      if (!rule.conditions || rule.conditions.length === 0) return true;

      const results = rule.conditions.map(cond => {
        const leadValue = testLeadData[cond.field] || '';
        switch (cond.operator) {
          case 'equals':
            return String(leadValue).toLowerCase() === String(cond.value).toLowerCase();
          case 'contains':
            return String(leadValue).toLowerCase().includes(String(cond.value).toLowerCase());
          default:
            return false;
        }
      });

      return rule.conditionLogic === 'OR' ? results.some(r => r) : results.every(r => r);
    });

    if (matchedRule) {
      setTestResult({
        success: true,
        rule: matchedRule.name,
        reason: `Lead would be routed by rule: ${matchedRule.name}`,
      });
    } else {
      setTestResult({
        success: false,
        reason: 'No matching routing rule found',
      });
    }
  };

  const getActionIcon = (actionType: ActionType) => {
    switch (actionType) {
      case 'ASSIGN_USER':
        return <UserIcon className="h-4 w-4" />;
      case 'ASSIGN_TEAM':
        return <UserGroupIcon className="h-4 w-4" />;
      case 'ROUND_ROBIN':
        return <ArrowPathIcon className="h-4 w-4" />;
      case 'LOAD_BALANCE':
        return <ScaleIcon className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead Routing Rules</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create rules to automatically route leads to the right team members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <PlayIcon className="h-4 w-4" />
            Test Rules
          </button>
          <button
            onClick={handleCreateRule}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <ArrowsUpDownIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No routing rules yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Create your first rule to start automatically routing leads
            </p>
            <button
              onClick={handleCreateRule}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Create First Rule
            </button>
          </div>
        ) : (
          rules.map((rule, index) => (
            <div
              key={rule.id}
              className={`bg-white rounded-xl border ${
                rule.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'
              } p-5 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        rule.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      Priority: {rule.priority}
                    </span>
                  </div>

                  {rule.description && (
                    <p className="text-sm text-slate-500 mb-3 ml-11">{rule.description}</p>
                  )}

                  {/* Conditions */}
                  <div className="ml-11 mb-3">
                    {rule.conditions && rule.conditions.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">When</span>
                        {rule.conditions.map((cond, i) => (
                          <div key={i} className="flex items-center gap-1">
                            {i > 0 && (
                              <span className="text-xs font-medium text-orange-600 px-1">
                                {rule.conditionLogic}
                              </span>
                            )}
                            <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                              <span className="font-medium">{cond.field}</span>{' '}
                              <span className="text-slate-500">{cond.operator}</span>{' '}
                              <span className="text-primary-600">"{cond.value}"</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">All leads (no conditions)</span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="ml-11 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Then</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg">
                      {getActionIcon(rule.actionType)}
                      <span className="text-sm font-medium text-primary-700">
                        {ACTION_TYPES.find(a => a.value === rule.actionType)?.label}
                      </span>
                      {rule.assignToUser && (
                        <span className="text-sm text-primary-600">
                          → {rule.assignToUser.firstName} {rule.assignToUser.lastName}
                        </span>
                      )}
                      {rule.routingGroup && (
                        <span className="text-sm text-primary-600">
                          → {rule.routingGroup.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  {rule.matchCount > 0 && (
                    <div className="ml-11 mt-2 text-xs text-slate-400">
                      Matched {rule.matchCount} leads
                      {rule.lastMatchedAt && (
                        <> · Last match: {new Date(rule.lastMatchedAt).toLocaleDateString()}</>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleRule(rule)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                    title={rule.isActive ? 'Disable' : 'Enable'}
                  >
                    {rule.isActive ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <XCircleIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rule Editor Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRule ? 'Edit Rule' : 'Create Routing Rule'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., High-value leads to Senior Sales"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Higher priority rules are evaluated first</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Condition Logic
                  </label>
                  <select
                    value={formData.conditionLogic}
                    onChange={(e) => setFormData(prev => ({ ...prev, conditionLogic: e.target.value as 'AND' | 'OR' }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="AND">Match ALL conditions (AND)</option>
                    <option value="OR">Match ANY condition (OR)</option>
                  </select>
                </div>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Conditions
                  </label>
                  <button
                    onClick={addCondition}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Condition
                  </button>
                </div>

                {formData.conditions.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                    No conditions - rule will match all leads
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.conditions.map((condition, index) => (
                      <div
                        key={condition.id}
                        className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
                      >
                        {index > 0 && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                            {formData.conditionLogic}
                          </span>
                        )}
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(index, { field: e.target.value })}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          {CONDITION_FIELDS.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionOperator })}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          {CONDITION_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <button
                          onClick={() => removeCondition(index)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Action
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ACTION_TYPES.map(action => (
                    <button
                      key={action.value}
                      onClick={() => setFormData(prev => ({ ...prev, actionType: action.value }))}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.actionType === action.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getActionIcon(action.value)}
                        <span className="font-medium text-sm">{action.label}</span>
                      </div>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </button>
                  ))}
                </div>

                {/* Action Target */}
                {formData.actionType === 'ASSIGN_USER' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Assign to User
                    </label>
                    <select
                      value={formData.assignToUserId}
                      onChange={(e) => setFormData(prev => ({ ...prev, assignToUserId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {['ROUND_ROBIN', 'LOAD_BALANCE'].includes(formData.actionType) && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Routing Group
                    </label>
                    <select
                      value={formData.routingGroupId}
                      onChange={(e) => setFormData(prev => ({ ...prev, routingGroupId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a group...</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.members.length} members)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRuleModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Rules Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Test Routing Rules</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter sample lead data to see which rule would match
              </p>
            </div>

            <div className="p-6 space-y-4">
              {CONDITION_FIELDS.slice(0, 5).map(field => (
                <div key={field.value}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={testLeadData[field.value] || ''}
                    onChange={(e) => setTestLeadData(prev => ({ ...prev, [field.value]: e.target.value }))}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}

              {testResult && (
                <div
                  className={`p-4 rounded-lg ${
                    testResult.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-amber-50 border border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {testResult.success ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-amber-600" />
                    )}
                    <span
                      className={`font-medium ${
                        testResult.success ? 'text-green-700' : 'text-amber-700'
                      }`}
                    >
                      {testResult.success ? 'Match Found' : 'No Match'}
                    </span>
                  </div>
                  <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-amber-600'}`}>
                    {testResult.reason}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestLeadData({});
                  setTestResult(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={handleTestRule}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <PlayIcon className="h-4 w-4" />
                Test Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
