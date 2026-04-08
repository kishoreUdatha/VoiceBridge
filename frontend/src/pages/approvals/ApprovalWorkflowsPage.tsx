/**
 * Approval Workflows Configuration Page
 * Admin page for creating and managing approval workflows
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  CheckBadgeIcon,
  UserGroupIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  approvalService,
  ApprovalWorkflow,
  ApprovalEntityType,
  ApproverType,
  CreateWorkflowInput,
} from '../../services/approval.service';
import { userService, Role } from '../../services/user.service';

const ENTITY_TYPES: { value: ApprovalEntityType; label: string; description: string }[] = [
  { value: 'LEAD_CONVERSION', label: 'Lead Conversion', description: 'When a lead is marked as converted' },
  { value: 'PAYMENT', label: 'Payment', description: 'Payment approvals above threshold' },
  { value: 'ADMISSION', label: 'Admission', description: 'New admission requests' },
  { value: 'DISCOUNT', label: 'Discount', description: 'Discount approvals' },
  { value: 'REFUND', label: 'Refund', description: 'Refund requests' },
  { value: 'FEE_WAIVER', label: 'Fee Waiver', description: 'Fee waiver requests' },
  { value: 'COMMISSION', label: 'Commission', description: 'Commission payout approvals' },
  { value: 'QUOTATION', label: 'Quotation', description: 'Quotation approvals' },
  { value: 'CUSTOM', label: 'Custom', description: 'Custom approval type' },
];

const APPROVER_TYPES: { value: ApproverType; label: string; description: string }[] = [
  { value: 'ROLE', label: 'By Role', description: 'Any user with specific role' },
  { value: 'MANAGER', label: 'Manager', description: "Submitter's direct manager" },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager', description: "Submitter's branch manager" },
  { value: 'SPECIFIC_USER', label: 'Specific User', description: 'A specific user' },
];

interface StepFormData {
  name: string;
  description: string;
  approverType: ApproverType;
  approverRoleId: string;
  approverUserId: string;
  slaHours: string;
  escalateAfterHours: string;
}

export default function ApprovalWorkflowsPage() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entityType: 'PAYMENT' as ApprovalEntityType,
    isDefault: false,
    amountThreshold: '',
  });
  const [steps, setSteps] = useState<StepFormData[]>([
    {
      name: 'Manager Approval',
      description: '',
      approverType: 'MANAGER',
      approverRoleId: '',
      approverUserId: '',
      slaHours: '24',
      escalateAfterHours: '',
    },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [workflowsData, rolesData] = await Promise.all([
        approvalService.getWorkflows(),
        userService.getRoles(),
      ]);
      setWorkflows(workflowsData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load workflows');
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
      entityType: 'PAYMENT',
      isDefault: false,
      amountThreshold: '',
    });
    setSteps([
      {
        name: 'Manager Approval',
        description: '',
        approverType: 'MANAGER',
        approverRoleId: '',
        approverUserId: '',
        slaHours: '24',
        escalateAfterHours: '',
      },
    ]);
    setEditingWorkflow(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (workflow: ApprovalWorkflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
      entityType: workflow.entityType,
      isDefault: workflow.isDefault,
      amountThreshold: (workflow.conditions as any)?.amountGreaterThan?.toString() || '',
    });
    setSteps(
      workflow.steps.map((step) => ({
        name: step.name,
        description: step.description || '',
        approverType: step.approverType,
        approverRoleId: step.approverRoleId || '',
        approverUserId: step.approverUserId || '',
        slaHours: step.slaHours?.toString() || '',
        escalateAfterHours: step.escalateAfterHours?.toString() || '',
      }))
    );
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Workflow name is required');
      return;
    }

    if (steps.length === 0) {
      toast.error('At least one approval step is required');
      return;
    }

    for (const step of steps) {
      if (!step.name.trim()) {
        toast.error('All steps must have a name');
        return;
      }
      if (step.approverType === 'ROLE' && !step.approverRoleId) {
        toast.error('Please select a role for role-based approval steps');
        return;
      }
    }

    try {
      setSaving(true);

      const input: CreateWorkflowInput = {
        name: formData.name,
        description: formData.description || undefined,
        entityType: formData.entityType,
        isDefault: formData.isDefault,
        conditions: formData.amountThreshold
          ? { amountGreaterThan: parseFloat(formData.amountThreshold) }
          : undefined,
        steps: steps.map((step) => ({
          name: step.name,
          description: step.description || undefined,
          approverType: step.approverType,
          approverRoleId: step.approverType === 'ROLE' ? step.approverRoleId : undefined,
          approverUserId: step.approverType === 'SPECIFIC_USER' ? step.approverUserId : undefined,
          slaHours: step.slaHours ? parseInt(step.slaHours) : undefined,
          escalateAfterHours: step.escalateAfterHours ? parseInt(step.escalateAfterHours) : undefined,
          approvalMode: 'ANY' as const,
        })),
      };

      if (editingWorkflow) {
        await approvalService.updateWorkflow(editingWorkflow.id, input);
        toast.success('Workflow updated successfully');
      } else {
        await approvalService.createWorkflow(input);
        toast.success('Workflow created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (workflow: ApprovalWorkflow) => {
    if (!confirm(`Delete workflow "${workflow.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await approvalService.deleteWorkflow(workflow.id);
      toast.success('Workflow deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete workflow');
    }
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        name: `Step ${steps.length + 1}`,
        description: '',
        approverType: 'ROLE',
        approverRoleId: '',
        approverUserId: '',
        slaHours: '24',
        escalateAfterHours: '',
      },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      toast.error('At least one step is required');
      return;
    }
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepFormData, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen -m-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Approval Workflows</h1>
          <p className="text-sm text-slate-500">
            Configure multi-level approval workflows for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-all"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Workflows List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : workflows.length === 0 ? (
          <div className="p-8 text-center">
            <Cog6ToothIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No workflows configured</p>
            <p className="text-sm text-slate-500 mb-4">
              Create your first approval workflow to get started
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-slate-800">
                        {workflow.name}
                      </h3>
                      {workflow.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                          Default
                        </span>
                      )}
                      {!workflow.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      {workflow.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CheckBadgeIcon className="w-4 h-4" />
                        {ENTITY_TYPES.find((t) => t.value === workflow.entityType)?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowsRightLeftIcon className="w-4 h-4" />
                        {workflow.steps.length} step(s)
                      </span>
                      <span className="flex items-center gap-1">
                        <UserGroupIcon className="w-4 h-4" />
                        {workflow._count?.requests || 0} request(s)
                      </span>
                    </div>

                    {/* Steps preview */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {workflow.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-1"
                        >
                          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                            {index + 1}. {step.name}
                          </span>
                          {index < workflow.steps.length - 1 && (
                            <span className="text-slate-300">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(workflow)}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(workflow)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl my-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editingWorkflow ? 'Edit Workflow' : 'Create Approval Workflow'}
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Workflow Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Payment Approval"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Entity Type *
                  </label>
                  <select
                    value={formData.entityType}
                    onChange={(e) =>
                      setFormData({ ...formData, entityType: e.target.value as ApprovalEntityType })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {ENTITY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe when this workflow is used..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount Threshold (Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.amountThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, amountThreshold: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 10000"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Only trigger for amounts greater than this value
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, isDefault: e.target.checked })
                    }
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isDefault" className="text-sm text-slate-700">
                    Set as default workflow for this entity type
                  </label>
                </div>
              </div>

              {/* Approval Steps */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-700">Approval Steps</h3>
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-700">
                          Step {index + 1}
                        </span>
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Step Name
                          </label>
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="e.g., Manager Approval"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Approver Type
                          </label>
                          <select
                            value={step.approverType}
                            onChange={(e) =>
                              updateStep(index, 'approverType', e.target.value)
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {APPROVER_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {step.approverType === 'ROLE' && (
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Select Role
                            </label>
                            <select
                              value={step.approverRoleId}
                              onChange={(e) =>
                                updateStep(index, 'approverRoleId', e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">Select a role...</option>
                              {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            SLA (hours)
                          </label>
                          <input
                            type="number"
                            value={step.slaHours}
                            onChange={(e) => updateStep(index, 'slaHours', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="24"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Escalate after (hours)
                          </label>
                          <input
                            type="number"
                            value={step.escalateAfterHours}
                            onChange={(e) =>
                              updateStep(index, 'escalateAfterHours', e.target.value)
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="48"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
