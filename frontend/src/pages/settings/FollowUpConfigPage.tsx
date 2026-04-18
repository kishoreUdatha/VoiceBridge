/**
 * Follow-up Configuration Page
 * Allows tenant admins to manage follow-up rules and settings
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  ClockIcon,
  BellIcon,
  ArrowPathIcon,
  XMarkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import {
  followUpConfigService,
  FollowUpConfig,
  Manager,
  Stage,
  CreateFollowUpConfigInput,
  UpdateFollowUpConfigInput,
} from '../../services/follow-up-config.service';

const COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
];

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateFollowUpConfigInput | UpdateFollowUpConfigInput) => void;
  editingConfig?: FollowUpConfig | null;
  managers: Manager[];
  stages: Stage[];
}

function ConfigModal({ isOpen, onClose, onSave, editingConfig, managers, stages }: ConfigModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#F59E0B');
  const [defaultIntervalHours, setDefaultIntervalHours] = useState(24);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [escalationAfterHours, setEscalationAfterHours] = useState<number | ''>('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderBeforeMinutes, setReminderBeforeMinutes] = useState(30);
  const [autoMoveToStageId, setAutoMoveToStageId] = useState('');
  const [autoAssignToManagerId, setAutoAssignToManagerId] = useState('');
  const [priorityAfterAttempts, setPriorityAfterAttempts] = useState<number | ''>('');

  useEffect(() => {
    if (editingConfig) {
      setName(editingConfig.name);
      setDescription(editingConfig.description || '');
      setColor(editingConfig.color || '#F59E0B');
      setDefaultIntervalHours(editingConfig.defaultIntervalHours);
      setMaxAttempts(editingConfig.maxAttempts);
      setEscalationAfterHours(editingConfig.escalationAfterHours || '');
      setReminderEnabled(editingConfig.reminderEnabled);
      setReminderBeforeMinutes(editingConfig.reminderBeforeMinutes);
      setAutoMoveToStageId(editingConfig.autoMoveToStageId || '');
      setAutoAssignToManagerId(editingConfig.autoAssignToManagerId || '');
      setPriorityAfterAttempts(editingConfig.priorityAfterAttempts || '');
    } else {
      setName('');
      setDescription('');
      setColor('#F59E0B');
      setDefaultIntervalHours(24);
      setMaxAttempts(5);
      setEscalationAfterHours('');
      setReminderEnabled(true);
      setReminderBeforeMinutes(30);
      setAutoMoveToStageId('');
      setAutoAssignToManagerId('');
      setPriorityAfterAttempts('');
    }
  }, [editingConfig, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Configuration name is required');
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      defaultIntervalHours,
      maxAttempts,
      escalationAfterHours: escalationAfterHours || null,
      reminderEnabled,
      reminderBeforeMinutes,
      autoMoveToStageId: autoMoveToStageId || null,
      autoAssignToManagerId: autoAssignToManagerId || null,
      priorityAfterAttempts: priorityAfterAttempts || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingConfig ? 'Edit Follow-up Configuration' : 'Create Follow-up Configuration'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Hot Lead Follow-up"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      color === c ? 'border-slate-900' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Optional description"
            />
          </div>

          {/* Timing Settings */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <ClockIcon className="w-4 h-4" /> Timing Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Follow-up Interval (hours)
                </label>
                <input
                  type="number"
                  value={defaultIntervalHours}
                  onChange={(e) => setDefaultIntervalHours(parseInt(e.target.value) || 24)}
                  min={1}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Attempts
                </label>
                <input
                  type="number"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 5)}
                  min={1}
                  max={20}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Reminder Settings */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <BellIcon className="w-4 h-4" /> Reminder Settings
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Enable reminders</span>
              </label>
              {reminderEnabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={reminderBeforeMinutes}
                    onChange={(e) => setReminderBeforeMinutes(parseInt(e.target.value) || 30)}
                    min={5}
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-500">minutes before</span>
                </div>
              )}
            </div>
          </div>

          {/* Escalation Settings */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4" /> Escalation & Automation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Escalate after (hours)
                </label>
                <input
                  type="number"
                  value={escalationAfterHours}
                  onChange={(e) => setEscalationAfterHours(e.target.value ? parseInt(e.target.value) : '')}
                  min={1}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Escalate to Manager
                </label>
                <select
                  value={autoAssignToManagerId}
                  onChange={(e) => setAutoAssignToManagerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No escalation</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.role.name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Move to stage after max attempts
                </label>
                <select
                  value={autoMoveToStageId}
                  onChange={(e) => setAutoMoveToStageId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No auto-move</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Increase priority after attempts
                </label>
                <input
                  type="number"
                  value={priorityAfterAttempts}
                  onChange={(e) => setPriorityAfterAttempts(e.target.value ? parseInt(e.target.value) : '')}
                  min={1}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {editingConfig ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FollowUpConfigPage() {
  const [configs, setConfigs] = useState<FollowUpConfig[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<FollowUpConfig | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsData, managersData, stagesData] = await Promise.all([
        followUpConfigService.getAll(true),
        followUpConfigService.getAvailableManagers(),
        followUpConfigService.getAvailableStages(),
      ]);
      setConfigs(configsData);
      setManagers(managersData);
      setStages(stagesData);
    } catch (error) {
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateFollowUpConfigInput) => {
    try {
      await followUpConfigService.create(data);
      toast.success('Configuration created');
      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create configuration');
    }
  };

  const handleUpdate = async (data: UpdateFollowUpConfigInput) => {
    if (!editingConfig) return;
    try {
      await followUpConfigService.update(editingConfig.id, data);
      toast.success('Configuration updated');
      setEditingConfig(null);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update configuration');
    }
  };

  const handleDelete = async (config: FollowUpConfig) => {
    if (config.isDefault) {
      toast.error('Cannot delete the default configuration');
      return;
    }
    if (!window.confirm(`Delete "${config.name}"?`)) return;
    try {
      await followUpConfigService.delete(config.id);
      toast.success('Configuration deleted');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete configuration');
    }
  };

  const handleSetDefault = async (config: FollowUpConfig) => {
    try {
      await followUpConfigService.setDefault(config.id);
      toast.success('Default configuration updated');
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to set default');
    }
  };

  const formatInterval = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    if (hours === 24) return '1 day';
    if (hours % 24 === 0) return `${hours / 24} days`;
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Follow-up Configuration</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-12">
            Define follow-up rules, reminders, and escalation policies
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="w-5 h-5" />
          Add Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map((config) => (
          <div
            key={config.id}
            className={`bg-white rounded-xl border shadow-sm p-5 ${
              !config.isActive ? 'opacity-60' : ''
            }`}
            style={{ borderLeftWidth: '4px', borderLeftColor: config.color }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  {config.name}
                  {config.isDefault && (
                    <StarSolidIcon className="w-4 h-4 text-amber-500" />
                  )}
                </h3>
                <p className="text-xs text-slate-500">{config.slug}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  config.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {config.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {config.description && (
              <p className="text-sm text-slate-600 mb-3">{config.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="flex items-center gap-1 text-slate-500">
                <ClockIcon className="w-4 h-4" />
                {formatInterval(config.defaultIntervalHours)}
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <ArrowPathIcon className="w-4 h-4" />
                {config.maxAttempts} attempts
              </div>
              {config.reminderEnabled && (
                <div className="flex items-center gap-1 text-slate-500">
                  <BellIcon className="w-4 h-4" />
                  {config.reminderBeforeMinutes}m reminder
                </div>
              )}
              {config.escalationAfterHours && (
                <div className="flex items-center gap-1 text-slate-500">
                  Escalate: {config.escalationAfterHours}h
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {!config.isDefault && (
                <button
                  onClick={() => handleSetDefault(config)}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                  title="Set as default"
                >
                  <StarIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setEditingConfig(config)}
                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                title="Edit"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              {!config.isDefault && (
                <button
                  onClick={() => handleDelete(config)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 mb-4">No follow-up configurations found</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-5 h-5" />
            Create First Configuration
          </button>
        </div>
      )}

      <ConfigModal
        isOpen={showModal || !!editingConfig}
        onClose={() => {
          setShowModal(false);
          setEditingConfig(null);
        }}
        onSave={editingConfig ? handleUpdate : handleCreate}
        editingConfig={editingConfig}
        managers={managers}
        stages={stages}
      />
    </div>
  );
}
