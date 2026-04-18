import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Settings,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Check,
  X,
  ArrowRight,
  Zap,
  Clock,
  Users,
  FileText,
  ChevronDown,
  ChevronRight,
  Copy,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import pipelineSettingsService, {
  Pipeline,
  PipelineStage,
  CreateStageInput
} from '../../services/pipeline-settings.service';

// Stage colors
const STAGE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

// Automation configuration
interface StageAutomation {
  id: string;
  trigger: 'on_enter' | 'on_exit' | 'after_duration';
  action: 'send_email' | 'send_sms' | 'send_whatsapp' | 'assign_user' | 'create_task' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

const AUTOMATION_TRIGGERS = [
  { value: 'on_enter', label: 'When entering stage', icon: ArrowRight },
  { value: 'on_exit', label: 'When exiting stage', icon: ArrowRight },
  { value: 'after_duration', label: 'After time in stage', icon: Clock },
];

const AUTOMATION_ACTIONS = [
  { value: 'send_email', label: 'Send Email', icon: FileText },
  { value: 'send_sms', label: 'Send SMS', icon: FileText },
  { value: 'send_whatsapp', label: 'Send WhatsApp', icon: FileText },
  { value: 'assign_user', label: 'Assign to User', icon: Users },
  { value: 'create_task', label: 'Create Task', icon: FileText },
  { value: 'webhook', label: 'Call Webhook', icon: Zap },
];

// Helper to extract automations from stage actions
function getStageAutomations(stage: PipelineStage): StageAutomation[] {
  const automations: StageAutomation[] = [];

  // Extract from autoActions (on_enter)
  if (stage.autoActions && typeof stage.autoActions === 'object') {
    Object.entries(stage.autoActions).forEach(([action, config], idx) => {
      if (config && typeof config === 'object' && (config as any).enabled !== false) {
        automations.push({
          id: `enter-${action}-${idx}`,
          trigger: 'on_enter',
          action: action as StageAutomation['action'],
          config: config as Record<string, any>,
          enabled: true,
        });
      }
    });
  }

  // Extract from exitActions (on_exit)
  if (stage.exitActions && typeof stage.exitActions === 'object') {
    Object.entries(stage.exitActions).forEach(([action, config], idx) => {
      if (config && typeof config === 'object' && (config as any).enabled !== false) {
        automations.push({
          id: `exit-${action}-${idx}`,
          trigger: 'on_exit',
          action: action as StageAutomation['action'],
          config: config as Record<string, any>,
          enabled: true,
        });
      }
    });
  }

  return automations;
}

// Helper to get stage type badge
function getStageTypeBadge(stageType: string) {
  switch (stageType) {
    case 'entry':
      return { label: 'Entry', className: 'bg-blue-100 text-blue-700' };
    case 'won':
      return { label: 'Won', className: 'bg-green-100 text-green-700' };
    case 'lost':
      return { label: 'Lost', className: 'bg-red-100 text-red-700' };
    default:
      return null;
  }
}

export default function WorkflowConfigPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [showAutomationModal, setShowAutomationModal] = useState<{
    stageId: string;
    automation?: StageAutomation;
  } | null>(null);
  const [draggedStage, setDraggedStage] = useState<string | null>(null);

  const [newStage, setNewStage] = useState<Partial<CreateStageInput>>({
    name: '',
    color: STAGE_COLORS[0],
    stageType: 'active',
    probability: 50,
  });

  const [newAutomation, setNewAutomation] = useState<Partial<StageAutomation>>({
    trigger: 'on_enter',
    action: 'send_email',
    enabled: true,
    config: {},
  });

  // Fetch pipelines on mount
  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const data = await pipelineSettingsService.getPipelines('LEAD');
      setPipelines(data);
      if (data.length > 0 && !selectedPipeline) {
        // Select the default pipeline or first one
        const defaultPipeline = data.find(p => p.isDefault) || data[0];
        setSelectedPipeline(defaultPipeline);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
      toast.error('Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = async () => {
    if (!selectedPipeline || !newStage.name) return;

    try {
      setSaving(true);
      const stage = await pipelineSettingsService.createStage(selectedPipeline.id, {
        name: newStage.name,
        color: newStage.color || STAGE_COLORS[0],
        stageType: newStage.stageType || 'active',
        probability: newStage.probability || 50,
      });

      // Refresh pipeline to get updated stages
      const updated = await pipelineSettingsService.getPipeline(selectedPipeline.id);
      setSelectedPipeline(updated);
      setPipelines(pipelines.map(p => p.id === updated.id ? updated : p));

      setNewStage({ name: '', color: STAGE_COLORS[0], stageType: 'active', probability: 50 });
      setShowAddStage(false);
      toast.success('Stage added successfully');
    } catch (error) {
      console.error('Failed to add stage:', error);
      toast.error('Failed to add stage');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStage = async (stageId: string, updates: Partial<CreateStageInput>) => {
    if (!selectedPipeline) return;

    try {
      setSaving(true);
      await pipelineSettingsService.updateStage(selectedPipeline.id, stageId, updates);

      // Refresh pipeline
      const updated = await pipelineSettingsService.getPipeline(selectedPipeline.id);
      setSelectedPipeline(updated);
      setPipelines(pipelines.map(p => p.id === updated.id ? updated : p));

      setEditingStage(null);
      toast.success('Stage updated successfully');
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error('Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!selectedPipeline) return;

    const stage = selectedPipeline.stages.find(s => s.id === stageId);
    if (stage?.stageType === 'entry' || stage?.stageType === 'won' || stage?.stageType === 'lost') {
      toast.error('Cannot delete system stages (entry, won, lost)');
      return;
    }

    if (!confirm('Are you sure you want to delete this stage?')) return;

    try {
      setSaving(true);
      await pipelineSettingsService.deleteStage(selectedPipeline.id, stageId);

      // Refresh pipeline
      const updated = await pipelineSettingsService.getPipeline(selectedPipeline.id);
      setSelectedPipeline(updated);
      setPipelines(pipelines.map(p => p.id === updated.id ? updated : p));

      toast.success('Stage deleted successfully');
    } catch (error) {
      console.error('Failed to delete stage:', error);
      toast.error('Failed to delete stage');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (stageId: string) => {
    setDraggedStage(stageId);
  };

  const handleDragOver = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    // Visual feedback only - actual reorder on drop
  };

  const handleDragEnd = async () => {
    if (!draggedStage || !selectedPipeline) {
      setDraggedStage(null);
      return;
    }

    // Get current order
    const stages = [...selectedPipeline.stages].sort((a, b) => a.order - b.order);
    const draggedIndex = stages.findIndex(s => s.id === draggedStage);

    // For now, just reset - would need to implement proper reorder
    setDraggedStage(null);
  };

  const handleReorderStages = async (stageIds: string[]) => {
    if (!selectedPipeline) return;

    try {
      setSaving(true);
      await pipelineSettingsService.reorderStages(selectedPipeline.id, stageIds);

      // Refresh pipeline
      const updated = await pipelineSettingsService.getPipeline(selectedPipeline.id);
      setSelectedPipeline(updated);
      setPipelines(pipelines.map(p => p.id === updated.id ? updated : p));

      toast.success('Stages reordered');
    } catch (error) {
      console.error('Failed to reorder stages:', error);
      toast.error('Failed to reorder stages');
    } finally {
      setSaving(false);
    }
  };

  const toggleStageExpand = (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const handleAddAutomation = async (stageId: string) => {
    if (!selectedPipeline || !newAutomation.trigger || !newAutomation.action) return;

    const stage = selectedPipeline.stages.find(s => s.id === stageId);
    if (!stage) return;

    try {
      setSaving(true);

      // Build the action config
      const actionConfig = {
        ...newAutomation.config,
        enabled: true,
      };

      // Update the appropriate actions field
      let updates: Partial<CreateStageInput>;
      if (newAutomation.trigger === 'on_enter') {
        updates = {
          autoActions: {
            ...(stage.autoActions || {}),
            [newAutomation.action]: actionConfig,
          },
        };
      } else {
        updates = {
          exitActions: {
            ...(stage.exitActions || {}),
            [newAutomation.action]: actionConfig,
          },
        };
      }

      await pipelineSettingsService.updateStage(selectedPipeline.id, stageId, updates);

      // Refresh pipeline
      const updated = await pipelineSettingsService.getPipeline(selectedPipeline.id);
      setSelectedPipeline(updated);
      setPipelines(pipelines.map(p => p.id === updated.id ? updated : p));

      setShowAutomationModal(null);
      setNewAutomation({ trigger: 'on_enter', action: 'send_email', enabled: true, config: {} });
      toast.success('Automation added successfully');
    } catch (error) {
      console.error('Failed to add automation:', error);
      toast.error('Failed to add automation');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAutomation = async (stageId: string, automation: StageAutomation) => {
    if (!selectedPipeline) return;

    const stage = selectedPipeline.stages.find(s => s.id === stageId);
    if (!stage) return;

    try {
      setSaving(true);

      let updates: Partial<CreateStageInput>;
      if (automation.trigger === 'on_enter') {
        const newAutoActions = { ...(stage.autoActions || {}) };
        delete newAutoActions[automation.action];
        updates = { autoActions: newAutoActions };
      } else {
        const newExitActions = { ...(stage.exitActions || {}) };
        delete newExitActions[automation.action];
        updates = { exitActions: newExitActions };
      }

      await pipelineSettingsService.updateStage(selectedPipeline.id, stageId, updates);

      // Refresh pipeline
      const updated = await pipelineSettingsService.getPipeline(selectedPipeline.id);
      setSelectedPipeline(updated);
      setPipelines(pipelines.map(p => p.id === updated.id ? updated : p));

      toast.success('Automation removed');
    } catch (error) {
      console.error('Failed to remove automation:', error);
      toast.error('Failed to remove automation');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicatePipeline = async (pipeline: Pipeline) => {
    try {
      setSaving(true);

      // Create new pipeline
      const newPipeline = await pipelineSettingsService.createPipeline({
        name: `${pipeline.name} (Copy)`,
        description: pipeline.description,
        entityType: pipeline.entityType,
        color: pipeline.color,
        isDefault: false,
      });

      // Create stages
      for (const stage of pipeline.stages.sort((a, b) => a.order - b.order)) {
        await pipelineSettingsService.createStage(newPipeline.id, {
          name: stage.name,
          color: stage.color,
          stageType: stage.stageType,
          probability: stage.probability,
          autoActions: stage.autoActions,
          exitActions: stage.exitActions,
        });
      }

      // Refresh pipelines
      await fetchPipelines();
      toast.success('Pipeline duplicated successfully');
    } catch (error) {
      console.error('Failed to duplicate pipeline:', error);
      toast.error('Failed to duplicate pipeline');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Workflow Configuration</h1>
              <p className="text-slate-600 mt-1">
                Configure your pipelines with stages and automations
              </p>
            </div>
          </div>
          <button
            onClick={fetchPipelines}
            disabled={loading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Pipeline Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 mb-4">Pipelines</h3>
            <div className="space-y-2">
              {pipelines.map(pipeline => (
                <div
                  key={pipeline.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPipeline?.id === pipeline.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                  }`}
                  onClick={() => setSelectedPipeline(pipeline)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{pipeline.name}</p>
                        {pipeline.isDefault && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{pipeline.stages?.length || 0} stages</p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDuplicatePipeline(pipeline);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Duplicate pipeline"
                      disabled={saving}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pipelines.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No pipelines found</p>
                <p className="text-xs mt-1">Create one from Pipeline Settings</p>
              </div>
            )}

            <Link
              to="/settings/pipeline"
              className="w-full mt-4 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-primary-300 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manage Pipelines
            </Link>
          </div>
        </div>

        {/* Pipeline Editor */}
        <div className="lg:col-span-3">
          {selectedPipeline ? (
            <div className="bg-white rounded-lg border border-slate-200">
              {/* Pipeline Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedPipeline.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedPipeline.description || `${selectedPipeline.entityType} pipeline`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPipeline.isDefault && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
                        Default Pipeline
                      </span>
                    )}
                    <span className={`px-2 py-1 text-sm rounded ${
                      selectedPipeline.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedPipeline.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stages List */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-slate-900">Pipeline Stages</h3>
                  <button
                    onClick={() => setShowAddStage(true)}
                    className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5"
                    disabled={saving}
                  >
                    <Plus className="w-4 h-4" />
                    Add Stage
                  </button>
                </div>

                {/* Visual Pipeline */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {selectedPipeline.stages
                    .sort((a, b) => a.order - b.order)
                    .map((stage, index) => (
                      <div key={stage.id} className="flex items-center">
                        <div
                          className="px-3 py-1.5 rounded-full text-white text-xs font-medium whitespace-nowrap"
                          style={{ backgroundColor: stage.color }}
                        >
                          {stage.name}
                        </div>
                        {index < selectedPipeline.stages.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-slate-400 mx-1 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                </div>

                {/* Detailed Stages */}
                <div className="space-y-3">
                  {selectedPipeline.stages
                    .sort((a, b) => a.order - b.order)
                    .map(stage => {
                      const automations = getStageAutomations(stage);
                      const typeBadge = getStageTypeBadge(stage.stageType);
                      const isSystemStage = stage.stageType === 'entry' || stage.stageType === 'won' || stage.stageType === 'lost';

                      return (
                        <div
                          key={stage.id}
                          draggable={!isSystemStage}
                          onDragStart={() => handleDragStart(stage.id)}
                          onDragOver={e => handleDragOver(e, stage.id)}
                          onDragEnd={handleDragEnd}
                          className={`border rounded-lg transition-all ${
                            draggedStage === stage.id ? 'opacity-50' : ''
                          } ${
                            expandedStages.has(stage.id)
                              ? 'border-primary-200 bg-primary-50/30'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="p-3 flex items-center gap-3">
                            {!isSystemStage && (
                              <div className="cursor-grab text-slate-400 hover:text-slate-600">
                                <GripVertical className="w-4 h-4" />
                              </div>
                            )}
                            {isSystemStage && <div className="w-4" />}

                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: stage.color }}
                            />

                            {editingStage?.id === stage.id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingStage.name}
                                  onChange={e =>
                                    setEditingStage({ ...editingStage, name: e.target.value })
                                  }
                                  className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                  autoFocus
                                />
                                <select
                                  value={editingStage.color}
                                  onChange={e =>
                                    setEditingStage({ ...editingStage, color: e.target.value })
                                  }
                                  className="px-2 py-1 border border-slate-300 rounded text-sm"
                                >
                                  {STAGE_COLORS.map(color => (
                                    <option key={color} value={color}>
                                      {color}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleUpdateStage(stage.id, {
                                    name: editingStage.name,
                                    color: editingStage.color
                                  })}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  disabled={saving}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingStage(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-900">{stage.name}</span>
                                    {typeBadge && (
                                      <span className={`px-1.5 py-0.5 text-xs rounded ${typeBadge.className}`}>
                                        {typeBadge.label}
                                      </span>
                                    )}
                                    {automations.length > 0 && (
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        {automations.length}
                                      </span>
                                    )}
                                  </div>
                                  {stage.probability !== undefined && (
                                    <p className="text-xs text-slate-500">
                                      {stage.probability}% probability
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => toggleStageExpand(stage.id)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                  >
                                    {expandedStages.has(stage.id) ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setEditingStage(stage)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  {!isSystemStage && (
                                    <button
                                      onClick={() => handleDeleteStage(stage.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                      disabled={saving}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Expanded Content - Automations */}
                          {expandedStages.has(stage.id) && (
                            <div className="border-t border-slate-200 p-3 bg-slate-50/50">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-slate-700">
                                  Stage Automations
                                </h4>
                                <button
                                  onClick={() => setShowAutomationModal({ stageId: stage.id })}
                                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                  disabled={saving}
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Automation
                                </button>
                              </div>

                              {automations.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">
                                  No automations configured
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {automations.map(automation => (
                                    <div
                                      key={automation.id}
                                      className="flex items-center justify-between bg-white p-2 rounded border border-slate-200"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm text-slate-700">
                                          {AUTOMATION_TRIGGERS.find(t => t.value === automation.trigger)?.label}
                                          {' → '}
                                          {AUTOMATION_ACTIONS.find(a => a.value === automation.action)?.label}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleDeleteAutomation(stage.id, automation)}
                                          className="p-1 text-slate-400 hover:text-red-600"
                                          disabled={saving}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Add Stage Form */}
                {showAddStage && (
                  <div className="mt-4 p-4 border border-primary-200 rounded-lg bg-primary-50/30">
                    <h4 className="font-medium text-slate-900 mb-3">Add New Stage</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Stage Name</label>
                        <input
                          type="text"
                          value={newStage.name}
                          onChange={e => setNewStage({ ...newStage, name: e.target.value })}
                          placeholder="e.g., Interview Scheduled"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Stage Type</label>
                        <select
                          value={newStage.stageType}
                          onChange={e => setNewStage({ ...newStage, stageType: e.target.value as any })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="entry">Entry</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Probability %</label>
                        <input
                          type="number"
                          value={newStage.probability}
                          onChange={e => setNewStage({ ...newStage, probability: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="100"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Color</label>
                        <div className="flex gap-1 flex-wrap">
                          {STAGE_COLORS.map(color => (
                            <button
                              key={color}
                              onClick={() => setNewStage({ ...newStage, color })}
                              className={`w-6 h-6 rounded-full border-2 ${
                                newStage.color === color
                                  ? 'border-slate-900'
                                  : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setShowAddStage(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddStage}
                        disabled={!newStage.name || saving}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Add Stage
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Select a pipeline to configure</p>
            </div>
          )}
        </div>
      </div>

      {/* Automation Modal */}
      {showAutomationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Add Stage Automation</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trigger</label>
                <select
                  value={newAutomation.trigger}
                  onChange={e =>
                    setNewAutomation({ ...newAutomation, trigger: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {AUTOMATION_TRIGGERS.map(trigger => (
                    <option key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                <select
                  value={newAutomation.action}
                  onChange={e =>
                    setNewAutomation({ ...newAutomation, action: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {AUTOMATION_ACTIONS.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>

              {newAutomation.trigger === 'after_duration' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={newAutomation.config?.hours || 24}
                    onChange={e =>
                      setNewAutomation({
                        ...newAutomation,
                        config: { ...newAutomation.config, hours: parseInt(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Configure detailed action settings after adding the automation.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowAutomationModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddAutomation(showAutomationModal.stageId)}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
