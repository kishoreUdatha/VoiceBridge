/**
 * Email Sequence Builder
 * Visual drag-and-drop email sequence/drip campaign builder
 */

import React, { useState, useCallback } from 'react';
import {
  Mail,
  Clock,
  Users,
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  Settings,
  Save,
  ArrowRight,
  CheckCircle,
  XCircle,
  MousePointer,
  Eye,
  Send,
  Calendar,
  Filter,
  MoreVertical,
  GripVertical,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailStep {
  id: string;
  type: 'email' | 'delay' | 'condition';
  subject?: string;
  content?: string;
  delayDays?: number;
  delayHours?: number;
  condition?: {
    type: 'opened' | 'clicked' | 'replied' | 'not_opened';
    emailId?: string;
  };
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
}

interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  trigger: 'manual' | 'lead_created' | 'stage_changed' | 'tag_added';
  triggerValue?: string;
  steps: EmailStep[];
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
}

const EmailSequenceBuilderPage: React.FC = () => {
  const [sequence, setSequence] = useState<EmailSequence>({
    id: 'new',
    name: 'New Email Sequence',
    description: '',
    status: 'draft',
    trigger: 'manual',
    steps: [],
    enrolledCount: 0,
    completedCount: 0,
    createdAt: new Date().toISOString(),
  });

  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const addStep = (type: EmailStep['type']) => {
    const newStep: EmailStep = {
      id: `step_${Date.now()}`,
      type,
      ...(type === 'email' && { subject: '', content: '' }),
      ...(type === 'delay' && { delayDays: 1, delayHours: 0 }),
      ...(type === 'condition' && { condition: { type: 'opened' } }),
    };

    setSequence((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
    setSelectedStep(newStep.id);
  };

  const updateStep = (stepId: string, updates: Partial<EmailStep>) => {
    setSequence((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    }));
  };

  const deleteStep = (stepId: string) => {
    setSequence((prev) => ({
      ...prev,
      steps: prev.steps.filter((step) => step.id !== stepId),
    }));
    if (selectedStep === stepId) {
      setSelectedStep(null);
    }
  };

  const duplicateStep = (stepId: string) => {
    const stepToDuplicate = sequence.steps.find((s) => s.id === stepId);
    if (stepToDuplicate) {
      const newStep = {
        ...stepToDuplicate,
        id: `step_${Date.now()}`,
      };
      const index = sequence.steps.findIndex((s) => s.id === stepId);
      const newSteps = [...sequence.steps];
      newSteps.splice(index + 1, 0, newStep);
      setSequence((prev) => ({ ...prev, steps: newSteps }));
    }
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const index = sequence.steps.findIndex((s) => s.id === stepId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sequence.steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...sequence.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSequence((prev) => ({ ...prev, steps: newSteps }));
  };

  const handleSave = async () => {
    try {
      // API call would go here
      toast.success('Sequence saved successfully');
    } catch (error) {
      toast.error('Failed to save sequence');
    }
  };

  const handleActivate = async () => {
    if (sequence.steps.length === 0) {
      toast.error('Add at least one step before activating');
      return;
    }

    setSequence((prev) => ({
      ...prev,
      status: prev.status === 'active' ? 'paused' : 'active',
    }));
    toast.success(
      sequence.status === 'active' ? 'Sequence paused' : 'Sequence activated'
    );
  };

  const selectedStepData = sequence.steps.find((s) => s.id === selectedStep);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <input
                type="text"
                value={sequence.name}
                onChange={(e) => setSequence((prev) => ({ ...prev, name: e.target.value }))}
                className="text-lg font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1 -ml-1"
                placeholder="Sequence name"
              />
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  sequence.status === 'active' ? 'bg-green-100 text-green-700' :
                  sequence.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {sequence.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                  {sequence.status.charAt(0).toUpperCase() + sequence.status.slice(1)}
                </span>
                <span>{sequence.steps.length} steps</span>
                <span>{sequence.enrolledCount} enrolled</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleActivate}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                sequence.status === 'active'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {sequence.status === 'active' ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Activate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Steps Panel */}
        <div className="w-96 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="p-4">
            {/* Trigger */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trigger</h3>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <select
                      value={sequence.trigger}
                      onChange={(e) => setSequence((prev) => ({ ...prev, trigger: e.target.value as any }))}
                      className="w-full text-sm font-medium text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0"
                    >
                      <option value="manual">Manual enrollment</option>
                      <option value="lead_created">When lead is created</option>
                      <option value="stage_changed">When stage changes</option>
                      <option value="tag_added">When tag is added</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Steps</h3>
            </div>

            {sequence.steps.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No steps yet</p>
                <p className="text-xs mt-1">Add your first email or delay below</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sequence.steps.map((step, index) => (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStep(step.id)}
                    className={`group relative bg-white border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      selectedStep === step.id
                        ? 'border-primary-500 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-xs font-medium text-slate-600">
                      {index + 1}
                    </div>

                    <div className="flex items-start gap-3 ml-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        step.type === 'email' ? 'bg-blue-100 text-blue-600' :
                        step.type === 'delay' ? 'bg-amber-100 text-amber-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {step.type === 'email' && <Mail className="w-5 h-5" />}
                        {step.type === 'delay' && <Clock className="w-5 h-5" />}
                        {step.type === 'condition' && <Filter className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 text-sm">
                          {step.type === 'email' && (step.subject || 'Untitled Email')}
                          {step.type === 'delay' && `Wait ${step.delayDays || 0}d ${step.delayHours || 0}h`}
                          {step.type === 'condition' && `If ${step.condition?.type.replace('_', ' ')}`}
                        </div>
                        {step.type === 'email' && step.stats && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{step.stats.sent} sent</span>
                            <span>{step.stats.opened} opened</span>
                            <span>{step.stats.clicked} clicked</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStep(step.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {index < sequence.steps.length - 1 && (
                      <div className="absolute left-0 -bottom-2 w-full flex justify-center">
                        <ArrowRight className="w-4 h-4 text-slate-300 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Step Buttons */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => addStep('email')}
                className="flex flex-col items-center gap-1 p-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Mail className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium text-slate-600">Email</span>
              </button>
              <button
                onClick={() => addStep('delay')}
                className="flex flex-col items-center gap-1 p-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-colors"
              >
                <Clock className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-medium text-slate-600">Delay</span>
              </button>
              <button
                onClick={() => addStep('condition')}
                className="flex flex-col items-center gap-1 p-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <Filter className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-medium text-slate-600">Condition</span>
              </button>
            </div>
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedStepData ? (
            <div className="max-w-2xl mx-auto">
              {selectedStepData.type === 'email' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="font-semibold text-slate-900">Email Content</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Subject Line</label>
                      <input
                        type="text"
                        value={selectedStepData.subject || ''}
                        onChange={(e) => updateStep(selectedStepData.id, { subject: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter email subject..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Body</label>
                      <textarea
                        value={selectedStepData.content || ''}
                        onChange={(e) => updateStep(selectedStepData.id, { content: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[300px] font-mono text-sm"
                        placeholder="Write your email content here...

Use variables like:
{{firstName}} - Lead's first name
{{lastName}} - Lead's last name
{{company}} - Company name
{{customField}} - Any custom field"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>Available variables:</span>
                      {['{{firstName}}', '{{lastName}}', '{{email}}', '{{phone}}'].map((v) => (
                        <button
                          key={v}
                          onClick={() => {
                            const content = selectedStepData.content || '';
                            updateStep(selectedStepData.id, { content: content + v });
                          }}
                          className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 font-mono text-xs"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedStepData.type === 'delay' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="font-semibold text-slate-900">Wait Duration</h3>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Days</label>
                        <input
                          type="number"
                          min="0"
                          value={selectedStepData.delayDays || 0}
                          onChange={(e) => updateStep(selectedStepData.id, { delayDays: parseInt(e.target.value) || 0 })}
                          className="w-24 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={selectedStepData.delayHours || 0}
                          onChange={(e) => updateStep(selectedStepData.id, { delayHours: parseInt(e.target.value) || 0 })}
                          className="w-24 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      Wait {selectedStepData.delayDays || 0} day(s) and {selectedStepData.delayHours || 0} hour(s) before the next step.
                    </p>
                  </div>
                </div>
              )}

              {selectedStepData.type === 'condition' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <h3 className="font-semibold text-slate-900">Condition</h3>
                  </div>
                  <div className="p-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">If previous email was...</label>
                      <select
                        value={selectedStepData.condition?.type || 'opened'}
                        onChange={(e) => updateStep(selectedStepData.id, {
                          condition: { ...selectedStepData.condition, type: e.target.value as any }
                        })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="opened">Opened</option>
                        <option value="not_opened">Not opened</option>
                        <option value="clicked">Clicked a link</option>
                        <option value="replied">Replied</option>
                      </select>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      Only proceed to the next step if the condition is met.
                    </p>
                  </div>
                </div>
              )}

              {/* Step Actions */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveStep(selectedStepData.id, 'up')}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Move Up
                  </button>
                  <button
                    onClick={() => moveStep(selectedStepData.id, 'down')}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Move Down
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => duplicateStep(selectedStepData.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => deleteStep(selectedStepData.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">Select a step to edit</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Click on any step from the left panel or add a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSequenceBuilderPage;
