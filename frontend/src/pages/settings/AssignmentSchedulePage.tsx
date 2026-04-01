import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  runSchedule,
  fetchCapacityStats,
  fetchRunLogs,
  clearCurrentSchedule,
} from '../../store/slices/assignmentScheduleSlice';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  CpuChipIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  AssignmentSchedule,
  AssignmentRunLog,
  ScheduleType,
  DistributionStrategy,
} from '../../services/assignmentSchedule.service';

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
  scheduleTimes: ['09:00', '13:00', '17:00'],
  timezone: 'Asia/Kolkata',
  assignToTelecallers: true,
  assignToVoiceAgents: false,
  voiceAgentId: '',
  telecallerDailyLimit: 200,
  voiceAgentDailyLimit: 500,
  distributionStrategy: 'CAPACITY_BASED',
  isActive: true,
};

export default function AssignmentSchedulePage() {
  const dispatch = useAppDispatch();
  const { schedules, capacityStats, runLogs, runLogsTotal, isLoading, isRunning, error } =
    useAppSelector((state) => state.assignmentSchedules);

  const [showModal, setShowModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<AssignmentSchedule | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>(initialFormData);
  const [newTime, setNewTime] = useState('09:00');

  useEffect(() => {
    dispatch(fetchSchedules());
    dispatch(fetchCapacityStats());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

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
        toast.success('Schedule updated successfully');
      } else {
        await dispatch(createSchedule(formData)).unwrap();
        toast.success('Schedule created successfully');
      }
      handleCloseModal();
      dispatch(fetchCapacityStats());
    } catch (err) {
      // Error is handled by the slice
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await dispatch(deleteSchedule(id)).unwrap();
      toast.success('Schedule deleted');
    } catch (err) {
      // Error is handled by the slice
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const result = await dispatch(runSchedule(id)).unwrap();
      toast.success(`Assigned ${result.totalRecordsAssigned} records`);
      dispatch(fetchCapacityStats());
      dispatch(fetchSchedules());
    } catch (err) {
      // Error is handled by the slice
    }
  };

  const handleViewLogs = async (scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
    await dispatch(fetchRunLogs({ id: scheduleId, page: 1, limit: 20 }));
    setShowLogsModal(true);
  };

  const handleCloseLogsModal = () => {
    setShowLogsModal(false);
    setSelectedScheduleId(null);
    dispatch(clearCurrentSchedule());
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
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (isLoading && schedules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="spinner spinner-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignment Schedules</h1>
          <p className="text-slate-500 mt-1">
            Automate raw import record assignment to telecallers and AI agents
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" />
          New Schedule
        </button>
      </div>

      {/* Capacity Stats */}
      {capacityStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <ClockIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {capacityStats.pendingRecords}
                </p>
                <p className="text-xs text-slate-500">Pending Records</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100">
                <UserGroupIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {capacityStats.telecallers.length}
                </p>
                <p className="text-xs text-slate-500">Telecallers</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-100">
                <BoltIcon className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {capacityStats.totalTelecallerCapacity}
                </p>
                <p className="text-xs text-slate-500">Telecaller Capacity</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <CpuChipIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {capacityStats.voiceAgents.length}
                </p>
                <p className="text-xs text-slate-500">Voice Agents</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100">
                <BoltIcon className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {capacityStats.totalVoiceAgentCapacity}
                </p>
                <p className="text-xs text-slate-500">Agent Capacity</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telecaller Capacity Details */}
      {capacityStats && capacityStats.telecallers.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <UserGroupIcon className="w-5 h-5 inline mr-2" />
              Telecaller Capacity
            </h3>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Pending</th>
                    <th>Limit</th>
                    <th>Available</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {capacityStats.telecallers.map((tc) => (
                    <tr key={tc.userId}>
                      <td className="font-medium">{tc.userName}</td>
                      <td>{tc.pending}</td>
                      <td>{tc.limit}</td>
                      <td className="font-semibold text-primary-600">{tc.available}</td>
                      <td>
                        {tc.available > 0 ? (
                          <span className="badge badge-success">Available</span>
                        ) : (
                          <span className="badge badge-warning">At Limit</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schedules List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <CalendarIcon className="w-5 h-5 inline mr-2" />
            Active Schedules
          </h3>
        </div>
        <div className="card-body p-0">
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No schedules created yet</p>
              <button
                onClick={() => handleOpenModal()}
                className="btn btn-primary mt-4"
              >
                Create First Schedule
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="p-4 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{schedule.name}</h4>
                      <span
                        className={`badge ${
                          schedule.isActive ? 'badge-success' : 'badge-slate'
                        }`}
                      >
                        {schedule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {schedule.scheduleTimes.join(', ')}
                      </span>
                      {schedule.assignToTelecallers && (
                        <span className="flex items-center gap-1">
                          <UserGroupIcon className="w-4 h-4" />
                          Telecallers ({schedule.telecallerDailyLimit}/day)
                        </span>
                      )}
                      {schedule.assignToVoiceAgents && (
                        <span className="flex items-center gap-1">
                          <CpuChipIcon className="w-4 h-4" />
                          AI Agents ({schedule.voiceAgentDailyLimit}/day)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span>Last run: {formatDateTime(schedule.lastRunAt)}</span>
                      <span>Next run: {formatDateTime(schedule.nextRunAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewLogs(schedule.id)}
                      className="btn btn-ghost btn-sm"
                      title="View Logs"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRunNow(schedule.id)}
                      disabled={isRunning}
                      className="btn btn-primary btn-sm"
                      title="Run Now"
                    >
                      {isRunning ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayIcon className="w-4 h-4" />
                      )}
                      Run
                    </button>
                    <button
                      onClick={() => handleOpenModal(schedule)}
                      className="btn btn-ghost btn-sm"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="btn btn-ghost btn-sm text-danger-600"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal max-w-2xl">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
              </h3>
              <button onClick={handleCloseModal} className="modal-close">
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., Morning Assignment"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Active</p>
                  <p className="text-sm text-slate-500">Enable automated scheduling</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isActive ? 'bg-primary-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Schedule Times */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Schedule Times
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="input"
                  />
                  <button onClick={addScheduleTime} className="btn btn-secondary">
                    <PlusIcon className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.scheduleTimes.map((time) => (
                    <span
                      key={time}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm"
                    >
                      {time}
                      <button
                        onClick={() => removeScheduleTime(time)}
                        className="hover:text-primary-900"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Assignment Targets */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    id="assignTelecallers"
                    checked={formData.assignToTelecallers}
                    onChange={(e) =>
                      setFormData({ ...formData, assignToTelecallers: e.target.checked })
                    }
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                  <label htmlFor="assignTelecallers" className="cursor-pointer">
                    <p className="font-medium text-slate-900">Telecallers</p>
                    <p className="text-xs text-slate-500">Assign to human agents</p>
                  </label>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    id="assignVoiceAgents"
                    checked={formData.assignToVoiceAgents}
                    onChange={(e) =>
                      setFormData({ ...formData, assignToVoiceAgents: e.target.checked })
                    }
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                  <label htmlFor="assignVoiceAgents" className="cursor-pointer">
                    <p className="font-medium text-slate-900">Voice Agents</p>
                    <p className="text-xs text-slate-500">Assign to AI agents</p>
                  </label>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telecaller Daily Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.telecallerDailyLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telecallerDailyLimit: parseInt(e.target.value) || 200,
                      })
                    }
                    className="input w-full"
                    disabled={!formData.assignToTelecallers}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Voice Agent Daily Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={formData.voiceAgentDailyLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        voiceAgentDailyLimit: parseInt(e.target.value) || 500,
                      })
                    }
                    className="input w-full"
                    disabled={!formData.assignToVoiceAgents}
                  />
                </div>
              </div>

              {/* Distribution Strategy */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Distribution Strategy
                </label>
                <select
                  value={formData.distributionStrategy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      distributionStrategy: e.target.value as DistributionStrategy,
                    })
                  }
                  className="input w-full"
                >
                  <option value="CAPACITY_BASED">
                    Capacity-Based (Recommended) - Assign more to those with fewer pending
                  </option>
                  <option value="ROUND_ROBIN">Round Robin - Equal distribution</option>
                  <option value="PRIORITY_BASED">Priority-Based - Senior telecallers first</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleCloseModal} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={isLoading} className="btn btn-primary">
                {isLoading ? (
                  <span className="spinner"></span>
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                {editingSchedule ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Logs Modal */}
      {showLogsModal && (
        <div className="modal-backdrop">
          <div className="modal max-w-3xl">
            <div className="modal-header">
              <h3 className="modal-title">Assignment Run History</h3>
              <button onClick={handleCloseLogsModal} className="modal-close">
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body p-0">
              {runLogs.length === 0 ? (
                <div className="text-center py-12">
                  <ChartBarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No run history yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
                  {runLogs.map((log) => (
                    <div key={log.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-900">
                          {formatDateTime(log.runAt)}
                        </span>
                        <span
                          className={`badge ${
                            log.errors ? 'badge-danger' : 'badge-success'
                          }`}
                        >
                          {log.errors ? 'Error' : 'Success'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Assigned</p>
                          <p className="font-semibold text-primary-600">
                            {log.totalRecordsAssigned}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Skipped</p>
                          <p className="font-semibold">{log.recordsSkipped}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Pending Before</p>
                          <p className="font-semibold">{log.pendingBefore}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Pending After</p>
                          <p className="font-semibold">{log.pendingAfter}</p>
                        </div>
                      </div>
                      {log.telecallerAssignments.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">Telecaller assignments:</p>
                          <div className="flex flex-wrap gap-2">
                            {log.telecallerAssignments.map((a, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded"
                              >
                                {a.userName}: {a.count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.voiceAgentAssignments.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 mb-1">Voice agent assignments:</p>
                          <div className="flex flex-wrap gap-2">
                            {log.voiceAgentAssignments.map((a, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded"
                              >
                                {a.agentName}: {a.count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.errors && (
                        <p className="mt-2 text-xs text-danger-600">{log.errors}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={handleCloseLogsModal} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
