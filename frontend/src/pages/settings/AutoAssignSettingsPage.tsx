import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  runSchedule,
  fetchCapacityStats,
} from '../../store/slices/assignmentScheduleSlice';
import api from '../../services/api';
import {
  ClockIcon,
  UserGroupIcon,
  XCircleIcon,
  CalendarIcon,
  PlusIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  AssignmentSchedule,
  ScheduleType,
  DistributionStrategy,
} from '../../services/assignmentSchedule.service';

interface AutoAssignConfig {
  enableAICalling: boolean;
  aiAgentId?: string;
  assignToCounselorId?: string;
  callDelayMinutes: number;
  aiDailyLimit: number;
  aiAssignAll: boolean;
  workingHoursOnly: boolean;
  workingHoursStart: number;
  workingHoursEnd: number;
  sourceTypes: string[];
}

interface Agent {
  id: string;
  name: string;
  industry: string;
}

interface Counselor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ScheduleFormData {
  name: string;
  scheduleType: ScheduleType;
  scheduleTimes: string[];
  timezone: string;
  assignToTelecallers: boolean;
  assignToVoiceAgents: boolean;
  voiceAgentId: string;
  telecallerDailyLimit: number;
  voiceAgentDailyLimit: number;
  distributionStrategy: DistributionStrategy;
  isActive: boolean;
}

const initialFormData: ScheduleFormData = {
  name: '',
  scheduleType: 'DAILY',
  scheduleTimes: ['09:00'],
  timezone: 'Asia/Kolkata',
  assignToTelecallers: true,
  assignToVoiceAgents: false,
  voiceAgentId: '',
  telecallerDailyLimit: 200,
  voiceAgentDailyLimit: 500,
  distributionStrategy: 'CAPACITY_BASED',
  isActive: true,
};

export default function AutoAssignSettingsPage() {
  const dispatch = useAppDispatch();
  const { schedules, capacityStats, isLoading: schedulesLoading, isRunning } =
    useAppSelector((state) => state.assignmentSchedules);

  const [config, setConfig] = useState<AutoAssignConfig | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AssignmentSchedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(initialFormData);
  const [newTime, setNewTime] = useState('09:00');

  useEffect(() => {
    loadData();
    dispatch(fetchSchedules());
    dispatch(fetchCapacityStats());
  }, [dispatch]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [configRes] = await Promise.all([api.get('/auto-assign/config')]);
      const loadedConfig = configRes.data.data.config;
      setConfig({
        ...loadedConfig,
        aiDailyLimit: loadedConfig.aiDailyLimit ?? 0,
        aiAssignAll: loadedConfig.aiAssignAll ?? true,
      });
      setAgents(configRes.data.data.availableAgents || []);
      setCounselors(configRes.data.data.availableCounselors || []);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setIsSaving(true);
      await api.put('/auto-assign/config', config);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenModal = (schedule?: AssignmentSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        name: schedule.name,
        scheduleType: schedule.scheduleType,
        scheduleTimes: schedule.scheduleTimes,
        timezone: schedule.timezone,
        assignToTelecallers: schedule.assignToTelecallers,
        assignToVoiceAgents: schedule.assignToVoiceAgents,
        voiceAgentId: schedule.voiceAgentId || '',
        telecallerDailyLimit: schedule.telecallerDailyLimit,
        voiceAgentDailyLimit: schedule.voiceAgentDailyLimit,
        distributionStrategy: schedule.distributionStrategy,
        isActive: schedule.isActive,
      });
    } else {
      setEditingSchedule(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Schedule name is required');
      return;
    }
    try {
      if (editingSchedule) {
        await dispatch(updateSchedule({ id: editingSchedule.id, data: formData })).unwrap();
        toast.success('Schedule updated');
      } else {
        await dispatch(createSchedule(formData)).unwrap();
        toast.success('Schedule created');
      }
      handleCloseModal();
      dispatch(fetchCapacityStats());
    } catch (err) {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await dispatch(deleteSchedule(id)).unwrap();
      toast.success('Deleted');
    } catch (err) {}
  };

  const handleRunNow = async (id: string) => {
    try {
      const result = await dispatch(runSchedule(id)).unwrap();
      toast.success(`Assigned ${result.totalRecordsAssigned} records`);
      dispatch(fetchCapacityStats());
      dispatch(fetchSchedules());
    } catch (err) {}
  };

  const addScheduleTime = () => {
    if (!formData.scheduleTimes.includes(newTime)) {
      setFormData({
        ...formData,
        scheduleTimes: [...formData.scheduleTimes, newTime].sort(),
      });
    }
  };

  const removeScheduleTime = (time: string) => {
    setFormData({
      ...formData,
      scheduleTimes: formData.scheduleTimes.filter((t) => t !== time),
    });
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="spinner spinner-lg"></span>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Lead Assignment</h1>
          <p className="text-xs text-slate-500">Configure automatic lead distribution</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary btn-sm">
          {isSaving && <span className="spinner spinner-sm mr-1"></span>}
          Save
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Settings */}
        <div className="space-y-4">
          {/* AI Calling Settings */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-violet-100 flex items-center justify-center">
                  <PhoneIcon className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-slate-900">AI Voice Calling</h2>
                  <p className="text-xs text-slate-500">Auto-call new leads with AI</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableAICalling}
                  onChange={() => setConfig({ ...config, enableAICalling: !config.enableAICalling })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {config.enableAICalling && (
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">AI Agent</label>
                    <select
                      value={config.aiAgentId || ''}
                      onChange={(e) => setConfig({ ...config, aiAgentId: e.target.value || undefined })}
                      className="input input-sm w-full"
                    >
                      <option value="">Select</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Fallback Counselor</label>
                    <select
                      value={config.assignToCounselorId || ''}
                      onChange={(e) => setConfig({ ...config, assignToCounselorId: e.target.value || undefined })}
                      className="input input-sm w-full"
                    >
                      <option value="">None</option>
                      {counselors.map((c) => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Daily Limit</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={config.aiAssignAll ? '' : (config.aiDailyLimit || '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig({ ...config, aiDailyLimit: val === '' ? 0 : parseInt(val), aiAssignAll: false });
                        }}
                        className={`input input-sm w-20 ${config.aiAssignAll ? 'opacity-50' : ''}`}
                        placeholder="100"
                        disabled={config.aiAssignAll}
                      />
                      <label className="flex items-center gap-1 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.aiAssignAll}
                          onChange={(e) => setConfig({ ...config, aiAssignAll: e.target.checked })}
                          className="w-3.5 h-3.5 text-violet-600 rounded"
                        />
                        <span className="text-slate-600">Unlimited</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Delay After Lead</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={config.callDelayMinutes}
                        onChange={(e) => setConfig({ ...config, callDelayMinutes: parseInt(e.target.value) || 0 })}
                        className="input input-sm w-20"
                      />
                      <span className="text-xs text-slate-500">min</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Working Hours */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-amber-100 flex items-center justify-center">
                    <ClockIcon className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-slate-900">Working Hours</h2>
                    <p className="text-xs text-slate-500">Restrict to business hours</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.workingHoursOnly}
                    onChange={() => setConfig({ ...config, workingHoursOnly: !config.workingHoursOnly })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
              {config.workingHoursOnly && (
                <div className="flex items-center gap-3 mt-3 pl-9">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Start Time</label>
                    <select
                      value={config.workingHoursStart}
                      onChange={(e) => setConfig({ ...config, workingHoursStart: parseInt(e.target.value) })}
                      className="input input-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-slate-400 mt-5">to</span>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">End Time</label>
                    <select
                      value={config.workingHoursEnd}
                      onChange={(e) => setConfig({ ...config, workingHoursEnd: parseInt(e.target.value) })}
                      className="input input-sm"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Telecaller Schedules */}
        <div className="bg-white rounded-lg border border-slate-200 h-fit">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center">
                <UserGroupIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-slate-900">Telecaller Schedules</h2>
                <p className="text-xs text-slate-500">Batch assign at scheduled times</p>
              </div>
            </div>
            <button onClick={() => handleOpenModal()} className="btn btn-primary btn-xs">
              <PlusIcon className="w-3.5 h-3.5 mr-1" />
              New
            </button>
          </div>

          {/* Stats */}
          {capacityStats && (
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex gap-4 text-xs">
              <span><span className="text-slate-500">Pending:</span> <span className="font-medium text-amber-600">{capacityStats.pendingRecords}</span></span>
              <span><span className="text-slate-500">Telecallers:</span> <span className="font-medium">{capacityStats.telecallers.length}</span></span>
              <span><span className="text-slate-500">Capacity:</span> <span className="font-medium text-green-600">{capacityStats.totalTelecallerCapacity}</span></span>
            </div>
          )}

          {/* Schedule List */}
          <div className="divide-y divide-slate-100">
            {schedulesLoading && schedules.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="spinner spinner-sm"></span>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No schedules yet</p>
              </div>
            ) : (
              schedules.map((schedule) => (
                <div key={schedule.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${schedule.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{schedule.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{schedule.scheduleTimes.join(', ')}</span>
                        <span>•</span>
                        <span>{schedule.telecallerDailyLimit}/person</span>
                        <span>•</span>
                        <span>Next: {formatDateTime(schedule.nextRunAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRunNow(schedule.id)}
                      disabled={isRunning}
                      className="p-1.5 rounded text-blue-600 hover:bg-blue-50"
                      title="Run Now"
                    >
                      {isRunning ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleOpenModal(schedule)} className="p-1.5 rounded text-slate-500 hover:bg-slate-100" title="Edit">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(schedule.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50" title="Delete">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input input-sm w-full"
                  placeholder="Morning Batch"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Run Times</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="input input-sm"
                  />
                  <button onClick={addScheduleTime} className="btn btn-secondary btn-sm">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.scheduleTimes.map((time) => (
                    <span key={time} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {time}
                      <button onClick={() => removeScheduleTime(time)} className="text-blue-400 hover:text-blue-600">
                        <XCircleIcon className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Leads/Telecaller</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.telecallerDailyLimit}
                    onChange={(e) => setFormData({ ...formData, telecallerDailyLimit: parseInt(e.target.value) || 200 })}
                    className="input input-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Distribution</label>
                  <select
                    value={formData.distributionStrategy}
                    onChange={(e) => setFormData({ ...formData, distributionStrategy: e.target.value as DistributionStrategy })}
                    className="input input-sm w-full"
                  >
                    <option value="CAPACITY_BASED">Capacity Based</option>
                    <option value="ROUND_ROBIN">Round Robin</option>
                    <option value="PRIORITY_BASED">Priority Based</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded">
                <span className="text-xs font-medium text-slate-600">Active</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={handleCloseModal} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={schedulesLoading} className="btn btn-primary btn-sm">
                {schedulesLoading && <span className="spinner spinner-sm mr-1"></span>}
                {editingSchedule ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
