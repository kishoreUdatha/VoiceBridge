/**
 * Automatic Reports Page - Schedule and configure automated report delivery
 * Connected to real API for persistent storage
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  ChartBarIcon,
  ClockIcon,
  EnvelopeIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CalendarIcon,
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { autoReportsService, AutoReportSchedule } from '../../services/auto-reports.service';

interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: string;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
  lastSent?: string;
  nextRun?: string;
}

const reportTypes = [
  { value: 'user_report', label: 'User Report' },
  { value: 'call_report', label: 'Call Report' },
  { value: 'lead_report', label: 'Lead Report' },
  { value: 'campaign_report', label: 'Campaign Report' },
  { value: 'admission_report', label: 'Admission Report' },
  { value: 'payment_report', label: 'Payment Report' },
  { value: 'followup_report', label: 'Follow-up Report' },
  { value: 'login_report', label: 'Login Report' },
  { value: 'performance_report', label: 'Performance Report' },
];

export default function AutomaticReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [reports, setReports] = useState<ScheduledReport[]>([]);

  // Day of week mapping
  const dayOfWeekMap: Record<number, string> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  const dayOfWeekReverseMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // Load schedules from API
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const data = await autoReportsService.getAutoReportSchedules();
        // Transform API data to component format
        const transformedReports: ScheduledReport[] = data.map((schedule: AutoReportSchedule) => ({
          id: schedule.id,
          name: schedule.name,
          reportType: schedule.reportType,
          frequency: schedule.frequency,
          dayOfWeek: schedule.dayOfWeek !== undefined ? dayOfWeekMap[schedule.dayOfWeek] : undefined,
          dayOfMonth: schedule.dayOfMonth,
          time: schedule.time,
          recipients: schedule.recipients,
          format: schedule.format,
          isActive: schedule.isActive,
          lastSent: schedule.lastSentAt ? new Date(schedule.lastSentAt).toLocaleString() : undefined,
          nextRun: schedule.nextSendAt ? new Date(schedule.nextSendAt).toLocaleString() : undefined,
        }));
        setReports(transformedReports);
      } catch (error) {
        console.error('Failed to load auto report schedules:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedules();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    reportType: 'user_report',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    dayOfWeek: 'monday',
    dayOfMonth: 1,
    time: '09:00',
    recipients: '',
    format: 'pdf' as 'pdf' | 'excel' | 'csv',
  });

  const handleAddReport = () => {
    setEditingReport(null);
    setFormData({
      name: '',
      reportType: 'user_report',
      frequency: 'daily',
      dayOfWeek: 'monday',
      dayOfMonth: 1,
      time: '09:00',
      recipients: '',
      format: 'pdf',
    });
    setShowModal(true);
  };

  const handleEditReport = (report: ScheduledReport) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      dayOfWeek: report.dayOfWeek || 'monday',
      dayOfMonth: report.dayOfMonth || 1,
      time: report.time,
      recipients: report.recipients.join(', '),
      format: report.format,
    });
    setShowModal(true);
  };

  const handleSaveReport = async () => {
    if (!formData.name || !formData.recipients) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const apiData = {
        name: formData.name,
        reportType: formData.reportType,
        frequency: formData.frequency as 'daily' | 'weekly' | 'monthly',
        dayOfWeek: formData.frequency === 'weekly' ? dayOfWeekReverseMap[formData.dayOfWeek] : undefined,
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
        time: formData.time,
        recipients: formData.recipients.split(',').map(e => e.trim()),
        format: formData.format as 'pdf' | 'excel' | 'csv',
      };

      if (editingReport) {
        const updated = await autoReportsService.updateAutoReportSchedule(editingReport.id, apiData);
        setReports(prev => prev.map(r => r.id === editingReport.id ? {
          ...r,
          ...apiData,
          dayOfWeek: apiData.dayOfWeek !== undefined ? dayOfWeekMap[apiData.dayOfWeek] : undefined,
        } : r));
        toast.success('Report schedule updated');
      } else {
        const created = await autoReportsService.createAutoReportSchedule(apiData);
        const newReport: ScheduledReport = {
          id: created.id,
          name: created.name,
          reportType: created.reportType,
          frequency: created.frequency,
          dayOfWeek: created.dayOfWeek !== undefined ? dayOfWeekMap[created.dayOfWeek] : undefined,
          dayOfMonth: created.dayOfMonth,
          time: created.time,
          recipients: created.recipients,
          format: created.format,
          isActive: created.isActive,
          nextRun: created.nextSendAt ? new Date(created.nextSendAt).toLocaleString() : 'Calculating...',
        };
        setReports(prev => [...prev, newReport]);
        toast.success('Report schedule created');
      }
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to save report schedule');
      console.error('Failed to save report schedule:', error);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this scheduled report?')) {
      try {
        await autoReportsService.deleteAutoReportSchedule(id);
        setReports(prev => prev.filter(r => r.id !== id));
        toast.success('Report schedule deleted');
      } catch (error) {
        toast.error('Failed to delete report schedule');
        console.error('Failed to delete report schedule:', error);
      }
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const updated = await autoReportsService.toggleAutoReportSchedule(id);
      setReports(prev => prev.map(r => {
        if (r.id === id) {
          const newActive = updated.isActive;
          toast.success(newActive ? 'Report schedule activated' : 'Report schedule paused');
          return { ...r, isActive: newActive };
        }
        return r;
      }));
    } catch (error) {
      toast.error('Failed to toggle report schedule');
      console.error('Failed to toggle report schedule:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getFrequencyLabel = (report: ScheduledReport) => {
    switch (report.frequency) {
      case 'daily':
        return `Daily at ${report.time}`;
      case 'weekly':
        return `Every ${report.dayOfWeek} at ${report.time}`;
      case 'monthly':
        return `Monthly on day ${report.dayOfMonth} at ${report.time}`;
    }
  };

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
            <h1 className="text-2xl font-bold text-slate-900">Automatic Reports</h1>
            <p className="text-sm text-slate-500">Schedule automated report delivery</p>
          </div>
        </div>
        <button
          onClick={handleAddReport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
              <p className="text-sm text-slate-500">Total Schedules</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <PlayIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{reports.filter(r => r.isActive).length}</p>
              <p className="text-sm text-slate-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PauseIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{reports.filter(r => !r.isActive).length}</p>
              <p className="text-sm text-slate-500">Paused</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-900">Scheduled Reports</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {reports.map((report) => (
            <div key={report.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${report.isActive ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <DocumentArrowDownIcon className={`w-5 h-5 ${report.isActive ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{report.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        report.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {report.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <ChartBarIcon className="w-4 h-4" />
                        {reportTypes.find(t => t.value === report.reportType)?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {getFrequencyLabel(report)}
                      </span>
                      <span className="flex items-center gap-1">
                        <EnvelopeIcon className="w-4 h-4" />
                        {report.recipients.length} recipient(s)
                      </span>
                    </div>
                    {report.lastSent && (
                      <p className="text-xs text-slate-400 mt-2">
                        Last sent: {report.lastSent} | Next run: {report.nextRun}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(report.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      report.isActive
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={report.isActive ? 'Pause' : 'Activate'}
                  >
                    {report.isActive ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleEditReport(report)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="p-8 text-center">
              <ChartBarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No scheduled reports yet</p>
              <button
                onClick={handleAddReport}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700"
              >
                Create your first schedule
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingReport ? 'Edit Schedule' : 'Create Schedule'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Schedule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Daily Sales Summary"
                />
              </div>

              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Report Type
                </label>
                <select
                  value={formData.reportType}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportType: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Frequency
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['daily', 'weekly', 'monthly'].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, frequency: freq as any }))}
                      className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.frequency === freq
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of Week (for weekly) */}
              {formData.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Day of Week
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <option key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Day of Month (for monthly) */}
              {formData.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Day of Month
                  </label>
                  <select
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Recipients <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.recipients}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-slate-500 mt-1">Separate multiple emails with commas</p>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'pdf', label: 'PDF' },
                    { value: 'excel', label: 'Excel' },
                    { value: 'csv', label: 'CSV' },
                  ].map((format) => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, format: format.value as any }))}
                      className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.format === format.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReport}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingReport ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
