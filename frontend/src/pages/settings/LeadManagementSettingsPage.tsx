import { useState, useEffect } from 'react';
import {
  DocumentDuplicateIcon,
  ArrowPathRoundedSquareIcon,
  TagIcon,
  CogIcon,
  ClockIcon,
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ArrowPathIcon,
  XCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  leadDeduplicationService,
  leadRoutingService,
  leadTagsService,
  leadWorkflowService,
  leadSlaService,
  leadScoringService,
} from '../../services/lead-management.service';

type TabType = 'deduplication' | 'routing' | 'tags' | 'workflows' | 'sla' | 'scoring';

// ==================== Deduplication Tab ====================
function DeduplicationTab() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await leadDeduplicationService.getDuplicateGroups('PENDING');
      setGroups(response.data?.groups || []);
    } catch (error) {
      toast.error('Failed to load duplicate groups');
    }
    setLoading(false);
  };

  const handleAutoDetect = async () => {
    setDetecting(true);
    try {
      const result = await leadDeduplicationService.autoDetectDuplicates();
      toast.success(`Found ${result.data?.groupsCreated || 0} duplicate groups`);
      loadGroups();
    } catch (error) {
      toast.error('Failed to detect duplicates');
    }
    setDetecting(false);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Duplicate Detection</h2>
          <p className="text-xs text-slate-500">Find and merge duplicate leads</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadGroups} className="btn btn-secondary btn-sm">
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Refresh
          </button>
          <button
            onClick={handleAutoDetect}
            disabled={detecting}
            className="btn btn-primary btn-sm"
          >
            {detecting ? (
              <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4 mr-1" />
            )}
            {detecting ? 'Detecting...' : 'Auto-Detect'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="spinner spinner-lg"></span>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-green-700">No duplicate groups found. Your data is clean!</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Leads</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Matched Fields</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Confidence</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {group.leads?.map((lead: any) => (
                        <span key={lead.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                          {lead.firstName} {lead.lastName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {group.matchedFields?.map((field: string) => (
                        <span key={field} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                          {field}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      group.confidence >= 90 ? 'bg-red-100 text-red-700' :
                      group.confidence >= 70 ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {group.confidence}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn btn-primary btn-xs mr-1">Merge</button>
                    <button className="btn btn-secondary btn-xs">Ignore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== Routing Tab ====================
function RoutingTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesResponse, groupsResponse] = await Promise.all([
        leadRoutingService.getRoutingRules(),
        leadRoutingService.getRoutingGroups(),
      ]);
      setRules(rulesResponse.data?.rules || []);
      setGroups(groupsResponse.data?.groups || []);
    } catch (error) {
      toast.error('Failed to load routing data');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Routing Rules</h2>
          <p className="text-xs text-slate-500">Automatically assign leads based on conditions</p>
        </div>
        <button className="btn btn-primary btn-sm">
          <PlusIcon className="w-4 h-4 mr-1" />
          Add Rule
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="spinner spinner-lg"></span>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-6">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Priority</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Matches</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      No routing rules configured
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{rule.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{rule.priority}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs">
                          {rule.actionType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          rule.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{rule.matchCount}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1 text-slate-400 hover:text-slate-600">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-slate-400 hover:text-red-600">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-slate-900 mb-3">Routing Groups</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {groups.map((group) => (
              <div key={group.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="font-medium text-slate-900">{group.name}</div>
                <div className="text-xs text-slate-500">{group.members?.length || 0} members</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ==================== Tags Tab ====================
function TagsTab() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', color: '#6B7280', description: '' });

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await leadTagsService.getTags(true);
      setTags(response.data?.tags || []);
    } catch (error) {
      toast.error('Failed to load tags');
    }
    setLoading(false);
  };

  const handleCreateTag = async () => {
    try {
      await leadTagsService.createTag(newTag);
      toast.success('Tag created');
      setShowModal(false);
      setNewTag({ name: '', color: '#6B7280', description: '' });
      loadTags();
    } catch (error) {
      toast.error('Failed to create tag');
    }
  };

  const handleCreateDefaults = async () => {
    try {
      await leadTagsService.createDefaultTags();
      toast.success('Default tags created');
      loadTags();
    } catch (error) {
      toast.error('Failed to create default tags');
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Lead Tags</h2>
          <p className="text-xs text-slate-500">Categorize and organize your leads</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCreateDefaults} className="btn btn-secondary btn-sm">
            Create Defaults
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Tag
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="spinner spinner-lg"></span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="font-medium text-slate-900 text-sm">{tag.name}</span>
                {tag.isSystem && (
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">System</span>
                )}
              </div>
              <div className="text-xs text-slate-500">{tag._count?.leadAssignments || 0} leads</div>
              {tag.description && (
                <div className="text-xs text-slate-400 mt-1 truncate">{tag.description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Create New Tag</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newTag.name}
                  onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                  className="input input-sm w-full"
                  placeholder="Tag name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                <input
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  value={newTag.description}
                  onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                  className="input input-sm w-full"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleCreateTag} className="btn btn-primary btn-sm">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Workflows Tab ====================
function WorkflowsTab() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await leadWorkflowService.getWorkflows(true);
      setWorkflows(response.data?.workflows || []);
    } catch (error) {
      toast.error('Failed to load workflows');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Workflow Automation</h2>
          <p className="text-xs text-slate-500">Automate lead actions with triggers</p>
        </div>
        <button className="btn btn-primary btn-sm">
          <PlusIcon className="w-4 h-4 mr-1" />
          Create Workflow
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="spinner spinner-lg"></span>
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <CogIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No workflows created yet</p>
          <p className="text-xs text-slate-400">Create your first automation workflow</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-slate-900">{workflow.name}</h3>
                  <p className="text-xs text-slate-500">{workflow.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={workflow.isActive} readOnly className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              <div className="flex gap-2 mb-2">
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs">
                  {workflow.triggerType?.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                  {workflow.actions?.length || 0} actions
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Executed {workflow.executionCount} times
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== SLA Tab ====================
function SlaTab() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configsResponse, metricsResponse] = await Promise.all([
        leadSlaService.getSlaConfigs(),
        leadSlaService.getSlaMetrics(),
      ]);
      setConfigs(configsResponse.data?.configs || []);
      setMetrics(metricsResponse.data);
    } catch (error) {
      toast.error('Failed to load SLA data');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">SLA Configuration</h2>
          <p className="text-xs text-slate-500">Track response times and breaches</p>
        </div>
        <button className="btn btn-primary btn-sm">
          <PlusIcon className="w-4 h-4 mr-1" />
          Add Policy
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-900">{metrics.totalLeads}</div>
            <div className="text-xs text-slate-500">Total Leads</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">{metrics.onTrack}</div>
            <div className="text-xs text-green-600">On Track</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-amber-700">{metrics.atRisk}</div>
            <div className="text-xs text-amber-600">At Risk</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-700">{metrics.breached}</div>
            <div className="text-xs text-red-600">Breached</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-900">{metrics.avgFirstResponseTime || '-'}</div>
            <div className="text-xs text-slate-500">Avg Response (min)</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-900">{metrics.breachRate}%</div>
            <div className="text-xs text-slate-500">Breach Rate</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="spinner spinner-lg"></span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">First Response</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Follow-up</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Working Hours</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No SLA policies configured
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{config.name}</span>
                      {config.isDefault && (
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Default</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{config.firstResponseMinutes} min</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{config.followUpMinutes} min</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {config.workingHoursOnly
                        ? `${config.workingHoursStart} - ${config.workingHoursEnd}`
                        : '24/7'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        config.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== Scoring Tab ====================
function ScoringTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesResponse, distResponse] = await Promise.all([
        leadScoringService.getScoringRules(),
        leadScoringService.getScoreDistribution(),
      ]);
      setRules(rulesResponse.data?.rules || []);
      setDistribution(distResponse.data);
    } catch (error) {
      toast.error('Failed to load scoring data');
    }
    setLoading(false);
  };

  const handleCreateDefaults = async () => {
    try {
      await leadScoringService.createDefaultScoringRules();
      toast.success('Default rules created');
      loadData();
    } catch (error) {
      toast.error('Failed to create default rules');
    }
  };

  const handleBatchCalculate = async () => {
    setCalculating(true);
    try {
      const result = await leadScoringService.batchCalculateScores();
      toast.success(`Calculated scores for ${result.data?.leadsProcessed || 0} leads`);
      loadData();
    } catch (error) {
      toast.error('Failed to calculate scores');
    }
    setCalculating(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Lead Scoring</h2>
          <p className="text-xs text-slate-500">Configure scoring rules and view distribution</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCreateDefaults} className="btn btn-secondary btn-sm">
            Create Defaults
          </button>
          <button onClick={handleBatchCalculate} disabled={calculating} className="btn btn-secondary btn-sm">
            {calculating && <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />}
            Recalculate All
          </button>
          <button className="btn btn-primary btn-sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Rule
          </button>
        </div>
      </div>

      {distribution && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-700">{distribution.excellent}</div>
            <div className="text-xs text-green-600">Excellent (80-100)</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-700">{distribution.good}</div>
            <div className="text-xs text-blue-600">Good (60-79)</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-amber-700">{distribution.average}</div>
            <div className="text-xs text-amber-600">Average (40-59)</div>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-700">{distribution.poor}</div>
            <div className="text-xs text-slate-600">Poor (20-39)</div>
          </div>
          <div className="bg-slate-200 border border-slate-300 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-700">{distribution.cold}</div>
            <div className="text-xs text-slate-600">Cold (0-19)</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="spinner spinner-lg"></span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Score</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Decay</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No scoring rules configured
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs">
                        {rule.scoreType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rule.scoreValue > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {rule.scoreAction === 'SUBTRACT' ? '-' : '+'}{rule.scoreValue}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {rule.decayEnabled ? `${rule.decayPercent}% / ${rule.decayDays}d` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        rule.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1 text-slate-400 hover:text-slate-600">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-slate-400 hover:text-red-600">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== Main Component ====================
export default function LeadManagementSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('deduplication');

  const tabs = [
    { id: 'deduplication' as TabType, name: 'Deduplication', icon: DocumentDuplicateIcon },
    { id: 'routing' as TabType, name: 'Routing', icon: ArrowPathRoundedSquareIcon },
    { id: 'tags' as TabType, name: 'Tags', icon: TagIcon },
    { id: 'workflows' as TabType, name: 'Workflows', icon: CogIcon },
    { id: 'sla' as TabType, name: 'SLA', icon: ClockIcon },
    { id: 'scoring' as TabType, name: 'Scoring', icon: ChartBarIcon },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Lead Management</h1>
        <p className="text-xs text-slate-500">Configure deduplication, routing, tags, workflows, SLA, and scoring</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'deduplication' && <DeduplicationTab />}
      {activeTab === 'routing' && <RoutingTab />}
      {activeTab === 'tags' && <TagsTab />}
      {activeTab === 'workflows' && <WorkflowsTab />}
      {activeTab === 'sla' && <SlaTab />}
      {activeTab === 'scoring' && <ScoringTab />}
    </div>
  );
}
