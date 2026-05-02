/**
 * Lead Priority Page - Define priority levels and scoring rules
 * Connected to real API for persistent storage
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FlagIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowLeftIcon,
  ArrowsUpDownIcon,
  SparklesIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { leadPriorityService } from '../../services/lead-priority.service';

interface PriorityLevel {
  id: string;
  name: string;
  color: string;
  scoreRange: { min: number; max: number };
  description: string;
  autoAssign: boolean;
  slaHours: number;
}

interface ScoringRule {
  id: string;
  field: string;
  condition: string;
  value: string;
  points: number;
  isActive: boolean;
}

export default function LeadPriorityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'levels' | 'scoring'>('levels');
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<PriorityLevel | null>(null);

  const [priorities, setPriorities] = useState<PriorityLevel[]>([]);

  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await leadPriorityService.getLeadPrioritySettings();
        // Transform priority levels
        if (data.priorityLevels && data.priorityLevels.length > 0) {
          setPriorities(data.priorityLevels.map(level => ({
            id: level.id,
            name: level.name,
            color: level.color,
            scoreRange: { min: level.minScore, max: level.maxScore },
            description: '',
            autoAssign: level.autoAssign,
            slaHours: level.slaHours,
          })));
        } else {
          // Default priorities
          setPriorities([
            { id: '1', name: 'Hot', color: '#ef4444', scoreRange: { min: 80, max: 100 }, description: 'High-value leads ready to convert', autoAssign: true, slaHours: 2 },
            { id: '2', name: 'Warm', color: '#f97316', scoreRange: { min: 50, max: 79 }, description: 'Interested leads requiring follow-up', autoAssign: true, slaHours: 8 },
            { id: '3', name: 'Cold', color: '#3b82f6', scoreRange: { min: 20, max: 49 }, description: 'New leads needing nurturing', autoAssign: false, slaHours: 24 },
            { id: '4', name: 'Ice', color: '#6b7280', scoreRange: { min: 0, max: 19 }, description: 'Low priority or unqualified leads', autoAssign: false, slaHours: 48 },
          ]);
        }
        // Transform scoring rules
        if (data.scoringRules && data.scoringRules.length > 0) {
          setScoringRules(data.scoringRules.map(rule => ({
            id: rule.id,
            field: rule.field,
            condition: rule.operator,
            value: rule.value,
            points: rule.points,
            isActive: rule.isActive,
          })));
        } else {
          // Default scoring rules
          setScoringRules([
            { id: '1', field: 'source', condition: 'equals', value: 'Website', points: 20, isActive: true },
            { id: '2', field: 'source', condition: 'equals', value: 'Facebook', points: 15, isActive: true },
            { id: '3', field: 'source', condition: 'equals', value: 'Referral', points: 25, isActive: true },
            { id: '4', field: 'budget', condition: 'greater_than', value: '100000', points: 30, isActive: true },
            { id: '5', field: 'engagement', condition: 'equals', value: 'email_opened', points: 10, isActive: true },
          ]);
        }
      } catch (error) {
        console.error('Failed to load lead priority settings:', error);
        // Set defaults on error
        setPriorities([
          { id: '1', name: 'Hot', color: '#ef4444', scoreRange: { min: 80, max: 100 }, description: 'High-value leads ready to convert', autoAssign: true, slaHours: 2 },
          { id: '2', name: 'Warm', color: '#f97316', scoreRange: { min: 50, max: 79 }, description: 'Interested leads requiring follow-up', autoAssign: true, slaHours: 8 },
          { id: '3', name: 'Cold', color: '#3b82f6', scoreRange: { min: 20, max: 49 }, description: 'New leads needing nurturing', autoAssign: false, slaHours: 24 },
          { id: '4', name: 'Ice', color: '#6b7280', scoreRange: { min: 0, max: 19 }, description: 'Low priority or unqualified leads', autoAssign: false, slaHours: 48 },
        ]);
        setScoringRules([
          { id: '1', field: 'source', condition: 'equals', value: 'Website', points: 20, isActive: true },
          { id: '2', field: 'source', condition: 'equals', value: 'Facebook', points: 15, isActive: true },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    minScore: 0,
    maxScore: 100,
    description: '',
    autoAssign: false,
    slaHours: 24,
  });

  const colorOptions = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#1f2937',
  ];

  const fieldOptions = [
    { value: 'source', label: 'Lead Source' },
    { value: 'budget', label: 'Budget' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'response_time', label: 'Response Time (mins)' },
    { value: 'location', label: 'Location' },
    { value: 'course', label: 'Course Interest' },
    { value: 'age', label: 'Lead Age (days)' },
  ];

  const conditionOptions = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
  ];

  const handleAddLevel = () => {
    setEditingLevel(null);
    setFormData({
      name: '',
      color: '#3b82f6',
      minScore: 0,
      maxScore: 100,
      description: '',
      autoAssign: false,
      slaHours: 24,
    });
    setShowModal(true);
  };

  const handleEditLevel = (level: PriorityLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      color: level.color,
      minScore: level.scoreRange.min,
      maxScore: level.scoreRange.max,
      description: level.description,
      autoAssign: level.autoAssign,
      slaHours: level.slaHours,
    });
    setShowModal(true);
  };

  const handleSaveLevel = () => {
    if (!formData.name) {
      toast.error('Please enter a priority name');
      return;
    }

    const levelData: PriorityLevel = {
      id: editingLevel?.id || Date.now().toString(),
      name: formData.name,
      color: formData.color,
      scoreRange: { min: formData.minScore, max: formData.maxScore },
      description: formData.description,
      autoAssign: formData.autoAssign,
      slaHours: formData.slaHours,
    };

    if (editingLevel) {
      setPriorities(prev => prev.map(p => p.id === editingLevel.id ? levelData : p));
      toast.success('Priority level updated');
    } else {
      setPriorities(prev => [...prev, levelData]);
      toast.success('Priority level added');
    }
    setShowModal(false);
  };

  const handleDeleteLevel = (id: string) => {
    if (window.confirm('Are you sure you want to delete this priority level?')) {
      setPriorities(prev => prev.filter(p => p.id !== id));
      toast.success('Priority level deleted');
    }
  };

  const handleToggleRule = (id: string) => {
    setScoringRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleDeleteRule = (id: string) => {
    setScoringRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Transform and save priority levels
      const apiLevels = priorities.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        minScore: p.scoreRange.min,
        maxScore: p.scoreRange.max,
        slaHours: p.slaHours,
        autoAssign: p.autoAssign,
      }));
      await leadPriorityService.updatePriorityLevels(apiLevels);

      // Transform and save scoring rules
      const apiRules = scoringRules.map((r, index) => ({
        id: r.id,
        name: `Rule ${index + 1}`,
        field: r.field,
        operator: r.condition,
        value: r.value,
        points: r.points,
        isActive: r.isActive,
        order: index,
      }));
      await leadPriorityService.updateScoringRules(apiRules);

      toast.success('Lead priority settings saved');
    } catch (error) {
      toast.error('Failed to save lead priority settings');
      console.error('Failed to save lead priority settings:', error);
    } finally {
      setIsSaving(false);
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
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Lead Priority</h1>
            <p className="text-sm text-slate-500">Configure priority levels and scoring rules</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('levels')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'levels'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FlagIcon className="w-4 h-4" />
          Priority Levels
        </button>
        <button
          onClick={() => setActiveTab('scoring')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'scoring'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          Scoring Rules
        </button>
      </div>

      {/* Priority Levels Tab */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handleAddLevel}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Priority Level
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900">Priority Levels</h2>
              <p className="text-sm text-slate-500">Define priority levels based on lead scores</p>
            </div>
            <div className="divide-y divide-slate-100">
              {priorities.map((priority, index) => (
                <div key={priority.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: priority.color + '20' }}
                      >
                        <FlagIcon className="w-5 h-5" style={{ color: priority.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{priority.name}</span>
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                            style={{ backgroundColor: priority.color }}
                          >
                            {priority.scoreRange.min}-{priority.scoreRange.max}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{priority.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-sm text-slate-500">
                        <span className="block">SLA: {priority.slaHours}h</span>
                        <span className="block text-xs">{priority.autoAssign ? 'Auto-assign' : 'Manual'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditLevel(priority)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLevel(priority.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score Distribution Visual */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-medium text-slate-900 mb-4">Score Distribution</h3>
            <div className="h-8 rounded-lg overflow-hidden flex">
              {priorities.sort((a, b) => b.scoreRange.max - a.scoreRange.max).map((p) => {
                const width = p.scoreRange.max - p.scoreRange.min + 1;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-center text-xs font-medium text-white"
                    style={{ width: `${width}%`, backgroundColor: p.color }}
                  >
                    {p.name}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Rules Tab */}
      {activeTab === 'scoring' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ChartBarIcon className="w-4 h-4" />
              {scoringRules.filter(r => r.isActive).length} active rules
            </div>
            <button
              onClick={() => {
                setScoringRules(prev => [...prev, {
                  id: Date.now().toString(),
                  field: 'source',
                  condition: 'equals',
                  value: '',
                  points: 10,
                  isActive: true,
                }]);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Rule
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900">Lead Scoring Rules</h2>
              <p className="text-sm text-slate-500">Assign points to leads based on criteria</p>
            </div>
            <div className="divide-y divide-slate-100">
              {scoringRules.map((rule) => (
                <div key={rule.id} className={`p-4 ${!rule.isActive ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        rule.isActive ? 'bg-primary-600' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        rule.isActive ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>

                    <select
                      value={rule.field}
                      onChange={(e) => setScoringRules(prev => prev.map(r => r.id === rule.id ? { ...r, field: e.target.value } : r))}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      {fieldOptions.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>

                    <select
                      value={rule.condition}
                      onChange={(e) => setScoringRules(prev => prev.map(r => r.id === rule.id ? { ...r, condition: e.target.value } : r))}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    >
                      {conditionOptions.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => setScoringRules(prev => prev.map(r => r.id === rule.id ? { ...r, value: e.target.value } : r))}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">=</span>
                      <input
                        type="number"
                        value={rule.points}
                        onChange={(e) => setScoringRules(prev => prev.map(r => r.id === rule.id ? { ...r, points: parseInt(e.target.value) || 0 } : r))}
                        className="w-16 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm text-center"
                      />
                      <span className="text-sm text-slate-500">pts</span>
                    </div>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Possible Points */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900">Maximum Possible Score</h3>
                <p className="text-sm text-slate-500">Sum of all active rule points</p>
              </div>
              <div className="text-3xl font-bold text-primary-600">
                {scoringRules.filter(r => r.isActive).reduce((sum, r) => sum + r.points, 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link
          to="/settings"
          className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Add/Edit Level Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingLevel ? 'Edit Priority Level' : 'Add Priority Level'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Hot, Warm, Cold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Min Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.minScore}
                    onChange={(e) => setFormData(prev => ({ ...prev, minScore: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Max Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.maxScore}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxScore: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SLA (hours)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.slaHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, slaHours: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.autoAssign}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoAssign: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Auto-assign leads with this priority</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLevel}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingLevel ? 'Update' : 'Add'} Level
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
