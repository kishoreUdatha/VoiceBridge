/**
 * Pipeline Settings Page
 * Visual flow-based pipeline builder with stage editor
 */

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownIcon,
  SwatchIcon,
  TagIcon,
  Cog6ToothIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  StarIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  HandRaisedIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import pipelineSettingsService, {
  Pipeline,
  PipelineStage,
  CreatePipelineInput,
  CreateStageInput,
} from '../../services/pipeline-settings.service';

// Color options for stages
const stageColors = [
  { name: 'Purple', value: '#8B5CF6', bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700' },
  { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  { name: 'Green', value: '#10B981', bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700' },
  { name: 'Yellow', value: '#F59E0B', bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  { name: 'Red', value: '#EF4444', bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  { name: 'Pink', value: '#EC4899', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700' },
  { name: 'Gray', value: '#6B7280', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700' },
];

// Stage label options
const stageLabels = [
  { id: 'hot', name: 'Hot', icon: 'fire', color: '#EF4444', bgColor: 'bg-red-100', textColor: 'text-red-600' },
  { id: 'priority', name: 'Priority', icon: 'bolt', color: '#F59E0B', bgColor: 'bg-amber-100', textColor: 'text-amber-600' },
  { id: 'important', name: 'Important', icon: 'star', color: '#8B5CF6', bgColor: 'bg-violet-100', textColor: 'text-violet-600' },
  { id: 'urgent', name: 'Urgent', icon: 'exclamation', color: '#DC2626', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  { id: 'review', name: 'Review Required', icon: 'eye', color: '#3B82F6', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
  { id: 'action', name: 'Action Needed', icon: 'hand', color: '#10B981', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600' },
];

// Industry templates
const industryTemplates = [
  {
    id: 'education',
    name: 'Education / Admissions',
    stages: [
      { name: 'New Enquiry', stageType: 'entry', color: '#8B5CF6' },
      { name: 'Counseling', stageType: 'active', color: '#3B82F6' },
      { name: 'Campus Visit', stageType: 'active', color: '#8B5CF6' },
      { name: 'Application', stageType: 'active', color: '#F59E0B' },
      { name: 'Fee Discussion', stageType: 'active', color: '#EC4899' },
      { name: 'Enrolled', stageType: 'won', color: '#10B981' },
      { name: 'Dropped', stageType: 'lost', color: '#EF4444' },
    ],
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    stages: [
      { name: 'New Lead', stageType: 'entry', color: '#6B7280' },
      { name: 'Site Visit Scheduled', stageType: 'active', color: '#3B82F6' },
      { name: 'Site Visit Done', stageType: 'active', color: '#8B5CF6' },
      { name: 'Negotiation', stageType: 'active', color: '#F59E0B' },
      { name: 'Booking', stageType: 'active', color: '#EC4899' },
      { name: 'Registered', stageType: 'won', color: '#10B981' },
      { name: 'Not Interested', stageType: 'lost', color: '#EF4444' },
    ],
  },
  {
    id: 'sales',
    name: 'General Sales',
    stages: [
      { name: 'New Lead', stageType: 'entry', color: '#6B7280' },
      { name: 'Contacted', stageType: 'active', color: '#3B82F6' },
      { name: 'Qualified', stageType: 'active', color: '#8B5CF6' },
      { name: 'Proposal', stageType: 'active', color: '#F59E0B' },
      { name: 'Negotiation', stageType: 'active', color: '#EC4899' },
      { name: 'Won', stageType: 'won', color: '#10B981' },
      { name: 'Lost', stageType: 'lost', color: '#EF4444' },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    stages: [
      { name: 'Enquiry', stageType: 'entry', color: '#6B7280' },
      { name: 'Appointment Booked', stageType: 'active', color: '#3B82F6' },
      { name: 'Consultation Done', stageType: 'active', color: '#8B5CF6' },
      { name: 'Treatment Plan', stageType: 'active', color: '#F59E0B' },
      { name: 'Treatment Started', stageType: 'active', color: '#EC4899' },
      { name: 'Completed', stageType: 'won', color: '#10B981' },
      { name: 'Cancelled', stageType: 'lost', color: '#EF4444' },
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    stages: [
      { name: 'Lead', stageType: 'entry', color: '#6B7280' },
      { name: 'Needs Analysis', stageType: 'active', color: '#3B82F6' },
      { name: 'Quote Generated', stageType: 'active', color: '#8B5CF6' },
      { name: 'Proposal Shared', stageType: 'active', color: '#F59E0B' },
      { name: 'Documents Collected', stageType: 'active', color: '#EC4899' },
      { name: 'Policy Issued', stageType: 'won', color: '#10B981' },
      { name: 'Rejected', stageType: 'lost', color: '#EF4444' },
    ],
  },
];

export default function PipelineSettingsPage() {
  // State
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pipeline form
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
  const [pipelineForm, setPipelineForm] = useState<CreatePipelineInput>({
    name: '',
    description: '',
    entityType: 'LEAD',
    isDefault: true,
  });

  // Stage form with labels and auto-tags
  const [stageForm, setStageForm] = useState<CreateStageInput & {
    id?: string;
    expectedDays?: number;
    slaHours?: number;
    stageLabel?: string;
    autoTags?: string[];
  }>({
    name: '',
    color: '#8B5CF6',
    stageType: 'active',
    probability: 50,
    expectedDays: undefined,
    slaHours: undefined,
    stageLabel: undefined,
    autoTags: [],
  });
  const [showAdditionalSettings, setShowAdditionalSettings] = useState(false);
  const [selectedTransitions, setSelectedTransitions] = useState<string[]>([]);
  const [isAddingStage, setIsAddingStage] = useState(false);

  // Available tags for auto-assign
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; color: string }>>([]);

  // Template selection
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Get current pipeline
  const currentPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const stages = currentPipeline?.stages?.sort((a, b) => a.order - b.order) || [];
  const progressStages = stages.filter(s => s.stageType !== 'won' && s.stageType !== 'lost');
  const wonStage = stages.find(s => s.stageType === 'won');
  const lostStage = stages.find(s => s.stageType === 'lost');

  // Load pipelines
  useEffect(() => {
    loadPipelines();
    loadAvailableTags();
  }, []);

  // Load available tags for auto-assign
  const loadAvailableTags = async () => {
    try {
      const response = await api.get('/lead-tags');
      setAvailableTags(response.data.data || []);
    } catch {
      setAvailableTags([]);
    }
  };

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const data = await pipelineSettingsService.getPipelines();
      setPipelines(data);
      if (data.length > 0 && !selectedPipelineId) {
        setSelectedPipelineId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  // Handle pipeline selection change
  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    setSelectedStage(null);
  };

  // Handle stage click
  const handleStageClick = (stage: PipelineStage) => {
    setSelectedStage(stage);
    setIsAddingStage(false);
    // Extract stageLabel and autoTags from autoActions if available
    const autoActions = stage.autoActions || {};
    setStageForm({
      id: stage.id,
      name: stage.name,
      color: stage.color || '#8B5CF6',
      stageType: stage.stageType,
      probability: stage.probability || 50,
      expectedDays: stage.expectedDays,
      slaHours: stage.slaHours,
      stageLabel: autoActions.stageLabel,
      autoTags: autoActions.autoTags || [],
    });
    // Load transitions
    loadStageTransitions(stage.id);
  };

  // Load stage transitions
  const loadStageTransitions = async (stageId: string) => {
    try {
      const transitions = await pipelineSettingsService.getAllowedTransitions(stageId);
      setSelectedTransitions(transitions.map(t => t.toStageId));
    } catch {
      setSelectedTransitions([]);
    }
  };

  // Save stage
  const handleSaveStage = async () => {
    if (!currentPipeline || !stageForm.name) return;

    try {
      setSaving(true);
      setError(null);

      // Prepare stage data with autoActions for labels and tags
      const stageData = {
        ...stageForm,
        autoActions: {
          ...(stageForm.autoActions || {}),
          stageLabel: stageForm.stageLabel,
          autoTags: stageForm.autoTags || [],
        },
      };

      if (selectedStage && stageForm.id) {
        // Update existing stage
        await pipelineSettingsService.updateStage(currentPipeline.id, stageForm.id, stageData);
        setSuccessMessage('Stage updated successfully');
      } else {
        // Create new stage
        await pipelineSettingsService.createStage(currentPipeline.id, stageData);
        setSuccessMessage('Stage created successfully');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      await loadPipelines();
      setSelectedStage(null);
      setIsAddingStage(false);
      setStageForm({ name: '', color: '#8B5CF6', stageType: 'active', probability: 50, expectedDays: undefined, slaHours: undefined, stageLabel: undefined, autoTags: [] });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save stage');
    } finally {
      setSaving(false);
    }
  };

  // Add new stage at position
  const handleAddStageAt = (afterOrder: number) => {
    setSelectedStage(null);
    setIsAddingStage(true);
    setStageForm({
      name: '',
      color: '#8B5CF6',
      stageType: 'active',
      probability: 50,
    });
    // Focus the name input after a short delay
    setTimeout(() => {
      document.getElementById('stage-name-input')?.focus();
    }, 100);
  };

  // Start adding a new stage
  const handleStartAddStage = () => {
    setSelectedStage(null);
    setIsAddingStage(true);
    setStageForm({
      name: '',
      color: '#8B5CF6',
      stageType: 'active',
      probability: 50,
    });
    setTimeout(() => {
      document.getElementById('stage-name-input')?.focus();
    }, 100);
  };

  // Cancel adding stage
  const handleCancelAddStage = () => {
    setIsAddingStage(false);
    setSelectedStage(null);
    setStageForm({
      name: '',
      color: '#8B5CF6',
      stageType: 'active',
      probability: 50,
    });
  };

  // Delete stage
  const handleDeleteStage = async (stageId: string) => {
    if (!currentPipeline || !confirm('Are you sure you want to delete this stage?')) return;

    try {
      setSaving(true);
      await pipelineSettingsService.deleteStage(currentPipeline.id, stageId);
      setSuccessMessage('Stage deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadPipelines();
      setSelectedStage(null);
      setIsAddingStage(false);
      setStageForm({ name: '', color: '#8B5CF6', stageType: 'active', probability: 50, expectedDays: undefined, slaHours: undefined, stageLabel: undefined, autoTags: [] });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete stage');
    } finally {
      setSaving(false);
    }
  };

  // Create pipeline from template
  const handleCreateFromTemplate = async (template: typeof industryTemplates[0]) => {
    try {
      setSaving(true);
      setShowTemplateSelector(false);

      // Create pipeline
      const pipeline = await pipelineSettingsService.createPipeline({
        name: template.name,
        entityType: 'LEAD',
        isDefault: true,
      });

      // Create stages
      for (let i = 0; i < template.stages.length; i++) {
        const stage = template.stages[i];
        await pipelineSettingsService.createStage(pipeline.id, {
          name: stage.name,
          color: stage.color,
          stageType: stage.stageType as any,
          probability: stage.stageType === 'won' ? 100 : stage.stageType === 'lost' ? 0 : (i + 1) * 15,
        });
      }

      setSuccessMessage(`Pipeline "${template.name}" created with ${template.stages.length} stages!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadPipelines();
      setSelectedPipelineId(pipeline.id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create pipeline');
    } finally {
      setSaving(false);
    }
  };

  // Create new pipeline
  const handleCreatePipeline = async () => {
    if (!pipelineForm.name) return;

    try {
      setSaving(true);
      const pipeline = editingPipeline
        ? await pipelineSettingsService.updatePipeline(editingPipeline.id, pipelineForm)
        : await pipelineSettingsService.createPipeline(pipelineForm);

      setSuccessMessage(editingPipeline ? 'Pipeline updated!' : 'Pipeline created!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowPipelineModal(false);
      setEditingPipeline(null);
      setPipelineForm({ name: '', description: '', entityType: 'LEAD', isDefault: true });
      await loadPipelines();
      if (!editingPipeline) {
        setSelectedPipelineId(pipeline.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save pipeline');
    } finally {
      setSaving(false);
    }
  };

  // Edit pipeline
  const handleEditPipeline = () => {
    if (!currentPipeline) return;
    setEditingPipeline(currentPipeline);
    setPipelineForm({
      name: currentPipeline.name,
      description: currentPipeline.description || '',
      entityType: currentPipeline.entityType,
      isDefault: currentPipeline.isDefault,
    });
    setShowPipelineModal(true);
  };

  // Delete pipeline
  const handleDeletePipeline = async () => {
    if (!currentPipeline) return;

    const stageCount = currentPipeline.stages?.length || 0;
    const confirmMsg = stageCount > 0
      ? `Are you sure you want to delete "${currentPipeline.name}"? This pipeline has ${stageCount} stages. All stages will be deleted.`
      : `Are you sure you want to delete "${currentPipeline.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      setSaving(true);
      await pipelineSettingsService.deletePipeline(currentPipeline.id);
      setSuccessMessage('Pipeline deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reset selection and reload
      setSelectedPipelineId(null);
      setSelectedStage(null);
      setIsAddingStage(false);
      await loadPipelines();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to delete pipeline');
    } finally {
      setSaving(false);
    }
  };

  // Toggle transition
  const toggleTransition = (stageId: string) => {
    setSelectedTransitions(prev =>
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  // Migrate leads
  const handleMigrateLeads = async () => {
    try {
      setSaving(true);
      const response = await api.post('/lead-pipeline/migrate-leads');
      const data = response.data.data;
      if (data.migratedCount > 0) {
        setSuccessMessage(`Migrated ${data.migratedCount} leads to pipeline`);
      } else {
        setSuccessMessage('All leads are already synced');
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to migrate leads');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline Settings</h1>
        </div>
        <p className="text-slate-500 ml-12">
          All the leads uploaded go through different stages until it is finally closed. Tags further provide easy identification of leads.
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <CheckIcon className="w-5 h-5" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><XMarkIcon className="w-5 h-5" /></button>
        </div>
      )}

      {/* Main Content - 60/40 Split */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Pipeline Flow (60%) */}
        <div className="w-full lg:w-[60%] bg-white rounded-xl border border-slate-200 p-6">
          {/* Pipeline Selector */}
          <div className="flex items-center gap-4 mb-6">
            <label className="font-semibold text-slate-700">Select Pipeline :</label>
            <select
              value={selectedPipelineId || ''}
              onChange={(e) => handlePipelineChange(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleEditPipeline}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={handleDeletePipeline}
              disabled={saving || pipelines.length <= 1}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title={pipelines.length <= 1 ? 'Cannot delete the last pipeline' : 'Delete pipeline'}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditingPipeline(null);
                setPipelineForm({ name: '', description: '', entityType: 'LEAD', isDefault: true });
                setShowPipelineModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
            >
              + New Pipeline
            </button>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="px-4 py-2 border border-primary-300 text-primary-600 rounded-lg text-sm hover:bg-primary-50"
            >
              Use Template
            </button>
          </div>

          {/* Pipeline Flow Visualization */}
          {currentPipeline ? (
            <div className="flex flex-col items-center py-4">
              {/* Add Stage Button at Top */}
              <div className="mb-4">
                <button
                  onClick={handleStartAddStage}
                  className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 flex items-center gap-1.5 shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Stage
                </button>
              </div>

              {/* Progress Stages */}
              {progressStages.map((stage, index) => (
                <div key={stage.id} className="flex flex-col items-center">
                  {/* Stage Box */}
                  <div
                    onClick={() => handleStageClick(stage)}
                    className={`relative w-44 py-2 px-3 rounded-md border-2 text-center text-sm font-medium cursor-pointer transition-all ${
                      selectedStage?.id === stage.id
                        ? 'ring-2 ring-primary-500 ring-offset-1'
                        : 'hover:shadow-md'
                    }`}
                    style={{
                      backgroundColor: `${stage.color}15`,
                      borderColor: `${stage.color}50`,
                      color: stage.color,
                    }}
                  >
                    {stage.name}
                    {/* Stage Label Badge */}
                    {stage.autoActions?.stageLabel && (() => {
                      const label = stageLabels.find(l => l.id === stage.autoActions?.stageLabel);
                      if (!label) return null;
                      return (
                        <span
                          className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${label.bgColor} ${label.textColor}`}
                        >
                          {label.icon === 'fire' && <FireIcon className="w-2.5 h-2.5 inline mr-0.5" />}
                          {label.icon === 'bolt' && <BoltIcon className="w-2.5 h-2.5 inline mr-0.5" />}
                          {label.icon === 'star' && <StarIcon className="w-2.5 h-2.5 inline mr-0.5" />}
                          {label.icon === 'exclamation' && <ExclamationTriangleIcon className="w-2.5 h-2.5 inline mr-0.5" />}
                          {label.icon === 'eye' && <EyeIcon className="w-2.5 h-2.5 inline mr-0.5" />}
                          {label.icon === 'hand' && <HandRaisedIcon className="w-2.5 h-2.5 inline mr-0.5" />}
                          {label.name}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Connector with Add Button */}
                  {index < progressStages.length - 1 && (
                    <div className="flex flex-col items-center my-0.5">
                      <div className="w-px h-2 bg-slate-300"></div>
                      <button
                        onClick={() => handleAddStageAt(stage.order)}
                        className="w-5 h-5 rounded-full border border-primary-400 bg-white flex items-center justify-center text-primary-500 hover:bg-primary-50"
                      >
                        <PlusIcon className="w-3 h-3" />
                      </button>
                      <div className="w-px h-2 bg-slate-300"></div>
                      <ArrowDownIcon className="w-3 h-3 text-slate-400" />
                    </div>
                  )}
                </div>
              ))}

              {/* Connector to Final Stages */}
              {(wonStage || lostStage) && progressStages.length > 0 && (
                <div className="flex flex-col items-center my-0.5">
                  <div className="w-px h-2 bg-slate-300"></div>
                  <button
                    onClick={() => handleAddStageAt(progressStages[progressStages.length - 1]?.order || 0)}
                    className="w-5 h-5 rounded-full border border-primary-400 bg-white flex items-center justify-center text-primary-500 hover:bg-primary-50"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                  <div className="w-px h-2 bg-slate-300"></div>
                </div>
              )}

              {/* Won/Lost Stages */}
              <div className="flex items-center gap-3 mt-1">
                {wonStage && (
                  <div
                    onClick={() => handleStageClick(wonStage)}
                    className={`w-24 py-2 px-2 rounded-md border-2 text-center text-xs font-medium cursor-pointer transition-all ${
                      selectedStage?.id === wonStage.id
                        ? 'ring-2 ring-primary-500 ring-offset-1'
                        : 'hover:shadow-md'
                    }`}
                    style={{
                      backgroundColor: '#10B98120',
                      borderColor: '#10B98150',
                      color: '#10B981',
                    }}
                  >
                    {wonStage.name}
                  </div>
                )}
                {wonStage && lostStage && (
                  <div className="w-4 border-t border-dashed border-slate-300"></div>
                )}
                {lostStage && (
                  <div
                    onClick={() => handleStageClick(lostStage)}
                    className={`w-24 py-2 px-2 rounded-md border-2 text-center text-xs font-medium cursor-pointer transition-all ${
                      selectedStage?.id === lostStage.id
                        ? 'ring-2 ring-primary-500 ring-offset-1'
                        : 'hover:shadow-md'
                    }`}
                    style={{
                      backgroundColor: '#EF444420',
                      borderColor: '#EF444450',
                      color: '#EF4444',
                    }}
                  >
                    {lostStage.name}
                  </div>
                )}
              </div>

              {/* Add Won/Lost if missing */}
              {(!wonStage || !lostStage) && (
                <div className="flex items-center gap-2 mt-2">
                  {!wonStage && (
                    <button
                      onClick={() => {
                        setSelectedStage(null);
                        setIsAddingStage(true);
                        setStageForm({ name: 'Won', color: '#10B981', stageType: 'won', probability: 100 });
                        setTimeout(() => document.getElementById('stage-name-input')?.focus(), 100);
                      }}
                      className="px-2 py-1 border border-dashed border-green-300 text-green-600 rounded text-xs hover:bg-green-50"
                    >
                      + Won
                    </button>
                  )}
                  {!lostStage && (
                    <button
                      onClick={() => {
                        setSelectedStage(null);
                        setIsAddingStage(true);
                        setStageForm({ name: 'Lost', color: '#EF4444', stageType: 'lost', probability: 0 });
                        setTimeout(() => document.getElementById('stage-name-input')?.focus(), 100);
                      }}
                      className="px-2 py-1 border border-dashed border-red-300 text-red-600 rounded text-xs hover:bg-red-50"
                    >
                      + Lost
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <p className="mb-4">No pipeline selected. Create a new pipeline or use a template.</p>
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Use Industry Template
              </button>
            </div>
          )}

          {/* Sync Leads Button */}
          {currentPipeline && (
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleMigrateLeads}
                disabled={saving}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? 'Syncing...' : 'Sync Existing Leads to Pipeline'}
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Stage Editor (40%) */}
        <div className={`w-full lg:w-[40%] bg-white rounded-xl border shadow-sm transition-all h-fit lg:sticky lg:top-6 ${
          isAddingStage ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200'
        }`}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedStage ? 'bg-primary-100' : isAddingStage ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  {selectedStage ? (
                    <PencilIcon className="w-5 h-5 text-primary-600" />
                  ) : isAddingStage ? (
                    <SparklesIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <Cog6ToothIcon className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {selectedStage ? 'Edit Stage' : isAddingStage ? 'New Stage' : 'Stage Editor'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedStage ? `Editing "${selectedStage.name}"` : isAddingStage ? 'Configure your new stage' : 'Select or create a stage'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-5">
            {/* Stage Preview */}
            {(isAddingStage || selectedStage) && stageForm.name && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview</p>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 text-sm font-medium"
                  style={{
                    backgroundColor: `${stageForm.color}15`,
                    borderColor: `${stageForm.color}50`,
                    color: stageForm.color,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stageForm.color }}
                  />
                  {stageForm.name}
                </div>
              </div>
            )}

            {/* Stage Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <TagIcon className="w-4 h-4 text-slate-400" />
                Stage Name
              </label>
              <input
                id="stage-name-input"
                type="text"
                value={stageForm.name}
                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                placeholder="e.g., Qualified Lead"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white placeholder:text-slate-400"
              />
            </div>

            {/* Stage Type */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <ArrowsRightLeftIcon className="w-4 h-4 text-slate-400" />
                Stage Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'entry', label: 'Entry', desc: 'Starting point', color: 'slate' },
                  { value: 'active', label: 'Active', desc: 'In progress', color: 'blue' },
                  { value: 'won', label: 'Won', desc: 'Success', color: 'green' },
                  { value: 'lost', label: 'Lost', desc: 'Closed', color: 'red' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setStageForm({ ...stageForm, stageType: type.value as any })}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                      stageForm.stageType === type.value
                        ? type.color === 'green' ? 'border-green-500 bg-green-50'
                        : type.color === 'red' ? 'border-red-500 bg-red-50'
                        : type.color === 'blue' ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-500 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      stageForm.stageType === type.value
                        ? type.color === 'green' ? 'text-green-700'
                        : type.color === 'red' ? 'text-red-700'
                        : type.color === 'blue' ? 'text-blue-700'
                        : 'text-slate-700'
                        : 'text-slate-700'
                    }`}>{type.label}</span>
                    <span className="block text-xs text-slate-500">{type.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <SwatchIcon className="w-4 h-4 text-slate-400" />
                Color Theme
              </label>
              <div className="flex gap-2 p-2 bg-slate-50 rounded-lg">
                {stageColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setStageForm({ ...stageForm, color: color.value })}
                    className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                      stageForm.color === color.value
                        ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {stageForm.color === color.value && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Win Probability */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-slate-400" />
                  Win Probability
                </span>
                <span className="text-primary-600 font-semibold">{stageForm.probability}%</span>
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stageForm.probability}
                  onChange={(e) => setStageForm({ ...stageForm, probability: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Additional Settings Accordion */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowAdditionalSettings(!showAdditionalSettings)}
                className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Cog6ToothIcon className="w-4 h-4 text-slate-400" />
                  Advanced Settings
                </span>
                {showAdditionalSettings ? (
                  <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showAdditionalSettings && (
                <div className="p-4 border-t border-slate-200 bg-white space-y-4">
                  {/* Expected Days & SLA Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                        <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                        Expected Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stageForm.expectedDays || ''}
                        onChange={(e) => setStageForm({ ...stageForm, expectedDays: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="e.g., 7"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-400 mt-1">Days in this stage</p>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                        <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
                        SLA Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stageForm.slaHours || ''}
                        onChange={(e) => setStageForm({ ...stageForm, slaHours: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="e.g., 24"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-xs text-slate-400 mt-1">Alert if exceeded</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100"></div>

                  {/* Stage Label */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                      <StarIcon className="w-3.5 h-3.5 text-amber-500" />
                      Stage Label
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {stageLabels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => setStageForm({
                            ...stageForm,
                            stageLabel: stageForm.stageLabel === label.id ? undefined : label.id
                          })}
                          className={`flex items-center gap-1.5 p-2 rounded-md text-xs font-medium transition-all border ${
                            stageForm.stageLabel === label.id
                              ? `${label.bgColor} ${label.textColor} border-current`
                              : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
                          }`}
                        >
                          {label.icon === 'fire' && <FireIcon className="w-3.5 h-3.5" />}
                          {label.icon === 'bolt' && <BoltIcon className="w-3.5 h-3.5" />}
                          {label.icon === 'star' && <StarIcon className="w-3.5 h-3.5" />}
                          {label.icon === 'exclamation' && <ExclamationTriangleIcon className="w-3.5 h-3.5" />}
                          {label.icon === 'eye' && <EyeIcon className="w-3.5 h-3.5" />}
                          {label.icon === 'hand' && <HandRaisedIcon className="w-3.5 h-3.5" />}
                          <span className="truncate">{label.name}</span>
                        </button>
                      ))}
                    </div>
                    {stageForm.stageLabel && (
                      <button
                        onClick={() => setStageForm({ ...stageForm, stageLabel: undefined })}
                        className="mt-2 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Clear label
                      </button>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100"></div>

                  {/* Auto-assign Tags */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                      <TagIcon className="w-3.5 h-3.5 text-primary-500" />
                      Auto-assign Tags
                      <span className="text-slate-400 font-normal">(when lead enters stage)</span>
                    </label>
                    {availableTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {availableTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              const currentTags = stageForm.autoTags || [];
                              const newTags = currentTags.includes(tag.id)
                                ? currentTags.filter(t => t !== tag.id)
                                : [...currentTags, tag.id];
                              setStageForm({ ...stageForm, autoTags: newTags });
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                              (stageForm.autoTags || []).includes(tag.id)
                                ? 'ring-2 ring-offset-1 ring-primary-400'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                            }}
                          >
                            {(stageForm.autoTags || []).includes(tag.id) && (
                              <CheckIcon className="w-3 h-3" />
                            )}
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-lg">
                        No tags available. Create tags in Tag Management first.
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100"></div>

                  {/* Allowed Transitions */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                      <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-slate-400" />
                      Can Move To
                    </label>
                    {stages.filter(s => s.id !== selectedStage?.id).length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {stages.filter(s => s.id !== selectedStage?.id).map((stage) => (
                          <label
                            key={stage.id}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors border ${
                              selectedTransitions.includes(stage.id)
                                ? 'bg-primary-50 border-primary-200'
                                : 'bg-slate-50 border-transparent hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedTransitions.includes(stage.id)}
                              onChange={() => toggleTransition(stage.id)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-xs text-slate-600 truncate">{stage.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-lg">No other stages available</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <div className="flex items-center justify-between">
              {/* Delete Button (only when editing) */}
              {selectedStage ? (
                <button
                  onClick={() => handleDeleteStage(selectedStage.id)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div></div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {(isAddingStage || selectedStage) && (
                  <button
                    onClick={handleCancelAddStage}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSaveStage}
                  disabled={saving || !stageForm.name || (!isAddingStage && !selectedStage)}
                  className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      {selectedStage ? 'Update Stage' : 'Create Stage'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingPipeline ? 'Edit Pipeline' : 'Create Pipeline'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pipeline Name</label>
                <input
                  type="text"
                  value={pipelineForm.name}
                  onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                  placeholder="e.g., Sales Pipeline"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={pipelineForm.description}
                  onChange={(e) => setPipelineForm({ ...pipelineForm, description: e.target.value })}
                  placeholder="Brief description"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={pipelineForm.isDefault}
                  onChange={(e) => setPipelineForm({ ...pipelineForm, isDefault: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="isDefault" className="text-sm text-slate-700">Set as default pipeline</label>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              {/* Delete button (only when editing and not the last pipeline) */}
              {editingPipeline && pipelines.length > 1 ? (
                <button
                  onClick={() => {
                    setShowPipelineModal(false);
                    handleDeletePipeline();
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Delete Pipeline
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPipelineModal(false);
                    setEditingPipeline(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePipeline}
                  disabled={saving || !pipelineForm.name}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingPipeline ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Choose Industry Template</h2>
              <button onClick={() => setShowTemplateSelector(false)}>
                <XMarkIcon className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Select an industry template to quickly set up your pipeline with predefined stages.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {industryTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleCreateFromTemplate(template)}
                  className="border border-slate-200 rounded-lg p-4 hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-all"
                >
                  <h3 className="font-semibold text-slate-900 mb-2">{template.name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {template.stages.slice(0, 4).map((stage, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded text-white"
                        style={{ backgroundColor: stage.color }}
                      >
                        {stage.name}
                      </span>
                    ))}
                    {template.stages.length > 4 && (
                      <span className="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-600">
                        +{template.stages.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
