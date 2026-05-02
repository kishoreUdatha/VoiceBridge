/**
 * Call Outcomes Configuration Page
 * Allows tenant admins to manage custom call outcomes for telecaller app
 */

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  PhoneIcon,
  CalendarIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import {
  callOutcomeService,
  CallOutcome,
  CreateCallOutcomeInput,
  UpdateCallOutcomeInput,
} from '../../services/call-outcome.service';

// MaterialCommunityIcons names (used in telecaller app)
const ICON_OPTIONS = [
  { value: 'thumb-up', label: 'Thumbs Up' },
  { value: 'thumb-down', label: 'Thumbs Down' },
  { value: 'phone-return', label: 'Callback' },
  { value: 'check-circle', label: 'Check Circle' },
  { value: 'phone-missed', label: 'Phone Missed' },
  { value: 'phone-lock', label: 'Phone Lock' },
  { value: 'phone-cancel', label: 'Phone Cancel' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'phone-check', label: 'Phone Check' },
  { value: 'calendar-clock', label: 'Calendar Clock' },
  { value: 'clock-outline', label: 'Clock' },
  { value: 'account-check', label: 'Account Check' },
  { value: 'clipboard-text-clock', label: 'Clipboard Clock' },
  { value: 'file-document-outline', label: 'Document' },
  { value: 'school-outline', label: 'School' },
  { value: 'home-city-outline', label: 'Building' },
  { value: 'car-outline', label: 'Car' },
  { value: 'currency-inr', label: 'Rupee' },
  { value: 'hand-wave', label: 'Wave' },
  { value: 'timer-sand', label: 'Hourglass' },
];

const COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#6B7280',
];

interface OutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateCallOutcomeInput | UpdateCallOutcomeInput) => void;
  editingOutcome?: CallOutcome | null;
}

function OutcomeModal({ isOpen, onClose, onSave, editingOutcome }: OutcomeModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('phone-check');
  const [notePrompt, setNotePrompt] = useState('');
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  const [requiresSubOption, setRequiresSubOption] = useState(false);
  const [subOptions, setSubOptions] = useState<string[]>([]);
  const [newSubOption, setNewSubOption] = useState('');

  useEffect(() => {
    if (editingOutcome) {
      setName(editingOutcome.name);
      setColor(editingOutcome.color || '#6366F1');
      setIcon(editingOutcome.icon || 'phone-check');
      setNotePrompt(editingOutcome.notePrompt || '');
      setRequiresFollowUp(editingOutcome.requiresFollowUp);
      setRequiresSubOption(editingOutcome.requiresSubOption);
      setSubOptions(editingOutcome.subOptions || []);
    } else {
      setName('');
      setColor('#6366F1');
      setIcon('phone-check');
      setNotePrompt('');
      setRequiresFollowUp(false);
      setRequiresSubOption(false);
      setSubOptions([]);
    }
    setNewSubOption('');
  }, [editingOutcome, isOpen]);

  const handleAddSubOption = () => {
    if (newSubOption.trim() && !subOptions.includes(newSubOption.trim())) {
      setSubOptions([...subOptions, newSubOption.trim()]);
      setNewSubOption('');
    }
  };

  const handleRemoveSubOption = (option: string) => {
    setSubOptions(subOptions.filter((o) => o !== option));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Outcome name is required');
      return;
    }
    onSave({
      name: name.trim(),
      color,
      icon,
      notePrompt: notePrompt.trim() || undefined,
      requiresFollowUp,
      requiresSubOption,
      subOptions: requiresSubOption ? subOptions : [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingOutcome ? 'Edit Call Outcome' : 'Add Call Outcome'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Outcome Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., After Result, Site Visit Scheduled"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c ? 'border-slate-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Icon</label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes Prompt
            </label>
            <textarea
              value={notePrompt}
              onChange={(e) => setNotePrompt(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Which exam result are they waiting for?"
            />
            <p className="text-xs text-slate-500 mt-1">
              This prompt helps telecallers know what details to capture
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresFollowUp}
                onChange={(e) => setRequiresFollowUp(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">Requires follow-up date</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresSubOption}
                onChange={(e) => setRequiresSubOption(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex items-center gap-2">
                <ListBulletIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">Has sub-options</span>
              </div>
            </label>
          </div>

          {requiresSubOption && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Sub-Options (e.g., NEET, EAMCET, JEE)
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubOption}
                  onChange={(e) => setNewSubOption(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubOption())}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter sub-option name"
                />
                <button
                  type="button"
                  onClick={handleAddSubOption}
                  className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>

              {subOptions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {subOptions.map((option) => (
                    <span
                      key={option}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm"
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubOption(option)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
              {editingOutcome ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CallOutcomesSettingsPage() {
  const [outcomes, setOutcomes] = useState<CallOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOutcome, setEditingOutcome] = useState<CallOutcome | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadOutcomes();
  }, [showInactive]);

  const loadOutcomes = async () => {
    try {
      setLoading(true);
      const data = await callOutcomeService.getAll(showInactive);
      setOutcomes(data);
    } catch (error) {
      toast.error('Failed to load call outcomes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateCallOutcomeInput) => {
    try {
      await callOutcomeService.create(data);
      toast.success('Call outcome created');
      setShowModal(false);
      loadOutcomes();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create outcome');
    }
  };

  const handleUpdate = async (data: UpdateCallOutcomeInput) => {
    if (!editingOutcome) return;
    try {
      await callOutcomeService.update(editingOutcome.id, data);
      toast.success('Call outcome updated');
      setEditingOutcome(null);
      loadOutcomes();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update outcome');
    }
  };

  const handleDelete = async (outcome: CallOutcome) => {
    if (outcome.isSystem) {
      if (!window.confirm(`Deactivate "${outcome.name}"? System outcomes can only be deactivated, not deleted.`)) return;
    } else {
      if (!window.confirm(`Delete "${outcome.name}"? This will deactivate if in use.`)) return;
    }
    try {
      await callOutcomeService.delete(outcome.id);
      toast.success(outcome.isSystem ? 'Outcome deactivated' : 'Outcome deleted');
      loadOutcomes();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete outcome');
    }
  };

  const handleToggleActive = async (outcome: CallOutcome) => {
    try {
      await callOutcomeService.update(outcome.id, { isActive: !outcome.isActive });
      toast.success(outcome.isActive ? 'Outcome deactivated' : 'Outcome activated');
      loadOutcomes();
    } catch (error: any) {
      toast.error('Failed to update outcome');
    }
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
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Call Outcomes</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure outcomes telecallers can select after calls
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show inactive
          </label>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add Outcome
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <PhoneIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Custom Call Outcomes</p>
            <p>
              Create custom outcomes like "After Result", "Site Visit Scheduled", etc.
              These will appear in the telecaller mobile app for selection after each call.
              Enable sub-options for outcomes like exams (NEET, EAMCET, JEE).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Outcome</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Notes Prompt</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Features</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {outcomes.map((outcome) => (
              <tr key={outcome.id} className={!outcome.isActive ? 'bg-slate-50 opacity-60' : ''}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: outcome.color }}
                    >
                      <span className="text-lg">{outcome.icon === 'thumb-up' ? '👍' :
                        outcome.icon === 'thumb-down' ? '👎' :
                        outcome.icon === 'check-circle' ? '✓' :
                        outcome.icon === 'phone-missed' ? '📵' :
                        outcome.icon === 'voicemail' ? '📧' : '📞'}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{outcome.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 font-mono">{outcome.slug}</span>
                        {outcome.isSystem && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">System</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-slate-500 max-w-xs truncate">
                  {outcome.notePrompt || '-'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-2">
                    {outcome.requiresFollowUp && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
                        <CalendarIcon className="w-3 h-3" />
                        Follow-up
                      </span>
                    )}
                    {outcome.requiresSubOption && outcome.subOptions?.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                        <ListBulletIcon className="w-3 h-3" />
                        {outcome.subOptions.length} options
                      </span>
                    )}
                    {!outcome.requiresFollowUp && !outcome.requiresSubOption && (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      outcome.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {outcome.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleActive(outcome)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      title={outcome.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {outcome.isActive ? (
                        <XMarkIcon className="w-4 h-4" />
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingOutcome(outcome)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {!outcome.isSystem && (
                      <button
                        onClick={() => handleDelete(outcome)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {outcomes.length === 0 && (
          <div className="text-center py-12">
            <PhoneIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No call outcomes configured</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <PlusIcon className="w-5 h-5" />
              Add First Outcome
            </button>
          </div>
        )}
      </div>

      <OutcomeModal
        isOpen={showModal || !!editingOutcome}
        onClose={() => {
          setShowModal(false);
          setEditingOutcome(null);
        }}
        onSave={editingOutcome ? handleUpdate : handleCreate}
        editingOutcome={editingOutcome}
      />
    </div>
  );
}
