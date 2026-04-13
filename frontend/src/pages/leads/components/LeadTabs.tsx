/**
 * Lead Detail Tab Components - Extracted tab content
 */

import { useState, useRef } from 'react';
import {
  PhoneIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  PencilIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  ChatBubbleOvalLeftIcon,
  PaperClipIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  PlayIcon,
  CurrencyRupeeIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  LeadNote,
  LeadTask,
  FollowUp,
  LeadAttachment,
  LeadQuery,
  LeadApplication,
  LeadActivity,
  Interest,
  CallLog,
  LeadPayment,
  LeadDocument,
} from '../../../services/leadDetails.service';

// Re-export for convenience
export type { LeadPayment, LeadDocument };
import {
  priorityColors,
  taskStatusColors,
  followUpStatusColors,
  queryStatusColors,
  applicationStatusColors,
  getActivityIcon,
} from '../lead-detail.constants';
import { formatDateTime, formatDate, formatFileSize, getCustomField } from '../lead-detail.utils';
import { CustomFieldsDisplay } from '../../../components/CustomFieldsRenderer';

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="text-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
  </div>
);

// Empty State Component
const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
  <div className="text-center py-8 text-slate-500">
    <Icon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
    <p>{message}</p>
  </div>
);

// Overview Tab
interface OverviewTabProps {
  lead: any;
  onEdit?: () => void;
}

export function OverviewTab({ lead, onEdit }: OverviewTabProps) {
  // Check if any extended contact fields have values
  const hasExtendedContactInfo = lead.fatherName || lead.motherName || lead.fatherPhone ||
    lead.motherPhone || lead.whatsapp || lead.occupation || lead.budget ||
    lead.preferredContactMethod || lead.preferredContactTime;

  // Format currency
  const formatCurrency = (value: any) => {
    if (!value) return '--';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '--' : `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-600">Personal Information</h3>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div><label className="block text-sm text-slate-500 mb-1">Gender</label><p className="text-sm text-slate-900">{lead.gender || getCustomField(lead.customFields, 'gender') || '--'}</p></div>
            <div><label className="block text-sm text-slate-500 mb-1">Date of Birth</label><p className="text-sm text-slate-900">{formatDate(lead.dateOfBirth || getCustomField(lead.customFields, 'dateOfBirth')) || '--'}</p></div>
            <div><label className="block text-sm text-slate-500 mb-1">Alternate Email</label><p className="text-sm text-slate-900">{lead.alternateEmail || '--'}</p></div>
            <div><label className="block text-sm text-slate-500 mb-1">Alternate Phone</label><p className="text-sm text-slate-900">{lead.alternatePhone || '--'}</p></div>
            <div><label className="block text-sm text-slate-500 mb-1">City</label><p className="text-sm text-slate-900">{lead.city || '--'}</p></div>
            <div><label className="block text-sm text-slate-500 mb-1">State</label><p className="text-sm text-slate-900">{lead.state || '--'}</p></div>
            <div><label className="block text-sm text-slate-500 mb-1">Occupation</label><p className="text-sm text-slate-900">{lead.occupation || getCustomField(lead.customFields, 'occupation') || '--'}</p></div>
            <div><label className="block text-sm text-slate-500 mb-1">Budget</label><p className="text-sm text-slate-900">{formatCurrency(lead.budget || getCustomField(lead.customFields, 'budget'))}</p></div>
          </div>
        </div>
      </div>

      {/* Family & Contact Details - Only show if any values exist */}
      {hasExtendedContactInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary-600">Family & Contact Details</h3>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {(lead.fatherName || getCustomField(lead.customFields, 'fatherName') || getCustomField(lead.customFields, 'father_name')) && (
                <div><label className="block text-sm text-slate-500 mb-1">Father's Name</label><p className="text-sm text-slate-900">{lead.fatherName || getCustomField(lead.customFields, 'fatherName') || getCustomField(lead.customFields, 'father_name')}</p></div>
              )}
              {(lead.fatherPhone || getCustomField(lead.customFields, 'fatherPhone') || getCustomField(lead.customFields, 'father_phone')) && (
                <div><label className="block text-sm text-slate-500 mb-1">Father's Phone</label><p className="text-sm text-slate-900">{lead.fatherPhone || getCustomField(lead.customFields, 'fatherPhone') || getCustomField(lead.customFields, 'father_phone')}</p></div>
              )}
              {(lead.motherName || getCustomField(lead.customFields, 'motherName') || getCustomField(lead.customFields, 'mother_name')) && (
                <div><label className="block text-sm text-slate-500 mb-1">Mother's Name</label><p className="text-sm text-slate-900">{lead.motherName || getCustomField(lead.customFields, 'motherName') || getCustomField(lead.customFields, 'mother_name')}</p></div>
              )}
              {(lead.motherPhone || getCustomField(lead.customFields, 'motherPhone') || getCustomField(lead.customFields, 'mother_phone')) && (
                <div><label className="block text-sm text-slate-500 mb-1">Mother's Phone</label><p className="text-sm text-slate-900">{lead.motherPhone || getCustomField(lead.customFields, 'motherPhone') || getCustomField(lead.customFields, 'mother_phone')}</p></div>
              )}
              {(lead.whatsapp || getCustomField(lead.customFields, 'whatsapp')) && (
                <div><label className="block text-sm text-slate-500 mb-1">WhatsApp</label><p className="text-sm text-slate-900">{lead.whatsapp || getCustomField(lead.customFields, 'whatsapp')}</p></div>
              )}
              {(lead.preferredContactMethod || getCustomField(lead.customFields, 'preferredContactMethod') || getCustomField(lead.customFields, 'preferred_contact_method')) && (
                <div><label className="block text-sm text-slate-500 mb-1">Preferred Contact</label><p className="text-sm text-slate-900 capitalize">{lead.preferredContactMethod || getCustomField(lead.customFields, 'preferredContactMethod') || getCustomField(lead.customFields, 'preferred_contact_method')}</p></div>
              )}
              {(lead.preferredContactTime || getCustomField(lead.customFields, 'preferredContactTime') || getCustomField(lead.customFields, 'preferred_contact_time')) && (
                <div><label className="block text-sm text-slate-500 mb-1">Preferred Time</label><p className="text-sm text-slate-900 capitalize">{lead.preferredContactTime || getCustomField(lead.customFields, 'preferredContactTime') || getCustomField(lead.customFields, 'preferred_contact_time')}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Fields (from Settings > Custom Contact Property) */}
      {lead.customFields && Object.keys(lead.customFields).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary-600">Additional Fields</h3>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>
          <div className="p-6">
            <CustomFieldsDisplay values={lead.customFields} />
          </div>
        </div>
      )}
    </div>
  );
}

// Notes Tab
interface NotesTabProps {
  notes: LeadNote[];
  loading: boolean;
  onAdd: (content: string) => void;
  onUpdate: (noteId: string, content: string) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (note: LeadNote) => void;
}

export function NotesTab({ notes, loading, onAdd, onUpdate, onDelete, onTogglePin }: NotesTabProps) {
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = () => {
    if (newNote.trim()) {
      onAdd(newNote);
      setNewNote('');
    }
  };

  const handleUpdate = (noteId: string) => {
    if (editContent.trim()) {
      onUpdate(noteId, editContent);
      setEditingNote(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100">
        <div className="flex gap-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 p-3 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
          />
          <button onClick={handleAdd} disabled={!newNote.trim()} className="btn btn-primary self-end disabled:opacity-50">
            Add Note
          </button>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : notes.length === 0 ? (
          <EmptyState icon={ChatBubbleOvalLeftIcon} message="No notes yet" />
        ) : (
          <div className="space-y-4">
            {notes.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((note) => (
              <div key={note.id} className={`p-4 rounded-lg ${note.isPinned ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'}`}>
                {editingNote === note.id ? (
                  <div className="flex gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1 p-2 border border-slate-200 rounded-lg resize-none"
                      rows={2}
                    />
                    <div className="flex flex-col gap-1">
                      <button onClick={() => handleUpdate(note.id)} className="p-2 text-green-600 hover:bg-green-50 rounded">
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingNote(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-700">{note.content}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-slate-400">
                        {note.user?.firstName} {note.user?.lastName} • {formatDateTime(note.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onTogglePin(note)} className={`p-1.5 rounded ${note.isPinned ? 'text-yellow-600' : 'text-slate-400 hover:text-slate-600'}`}>
                          📌
                        </button>
                        <button onClick={() => { setEditingNote(note.id); setEditContent(note.content); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDelete(note.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tasks Tab
interface TasksTabProps {
  tasks: LeadTask[];
  loading: boolean;
  onAddClick: () => void;
  onUpdateStatus: (taskId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => void;
  onDelete: (taskId: string) => void;
}

export function TasksTab({ tasks, loading, onAddClick, onUpdateStatus, onDelete }: TasksTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-medium text-slate-900">Tasks</h3>
        <button onClick={onAddClick} className="btn btn-primary btn-sm">
          <PlusIcon className="h-4 w-4 mr-1" /> Add Task
        </button>
      </div>
      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : tasks.length === 0 ? (
          <EmptyState icon={ClipboardDocumentListIcon} message="No tasks assigned" />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={task.status === 'COMPLETED'}
                  onChange={(e) => onUpdateStatus(task.id, e.target.checked ? 'COMPLETED' : 'PENDING')}
                  className="h-5 w-5 rounded border-slate-300 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {task.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${taskStatusColors[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  {task.description && <p className="text-sm text-slate-600 mt-1">{task.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                    <span>Assigned to: {task.assignee?.firstName} {task.assignee?.lastName}</span>
                  </div>
                </div>
                <button onClick={() => onDelete(task.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Follow-ups Tab
interface FollowUpsTabProps {
  followUps: FollowUp[];
  loading: boolean;
  onAddClick: () => void;
  onUpdateStatus: (followUpId: string, status: 'UPCOMING' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED') => void;
  onDelete: (followUpId: string) => void;
  onReschedule?: (followUpId: string, newDate: string) => void;
}

export function FollowUpsTab({ followUps, loading, onAddClick, onUpdateStatus, onDelete, onReschedule }: FollowUpsTabProps) {
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');

  const handleReschedule = (followUpId: string) => {
    if (rescheduleDate && onReschedule) {
      const dateTime = `${rescheduleDate}T${rescheduleTime}:00`;
      onReschedule(followUpId, dateTime);
      setRescheduleId(null);
      setRescheduleDate('');
      setRescheduleTime('10:00');
    }
  };
  // Helper to check if follow-up is overdue
  const isOverdue = (scheduledAt: string, status: string) => {
    return status === 'UPCOMING' && new Date(scheduledAt) < new Date();
  };

  // Helper to check if follow-up is today
  const isToday = (scheduledAt: string) => {
    const today = new Date();
    const scheduled = new Date(scheduledAt);
    return today.toDateString() === scheduled.toDateString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <CalendarIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Follow-ups</h3>
            <p className="text-xs text-slate-500">{followUps.length} scheduled</p>
          </div>
        </div>
        <button onClick={onAddClick} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all">
          <PlusIcon className="h-4 w-4" /> Schedule Follow-up
        </button>
      </div>
      <div className="p-5">
        {loading ? (
          <LoadingSpinner />
        ) : followUps.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No follow-ups scheduled</p>
            <p className="text-sm text-slate-400 mt-1">Schedule a follow-up to stay connected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followUps.map((followUp) => {
              const overdue = isOverdue(followUp.scheduledAt, followUp.status);
              const today = isToday(followUp.scheduledAt);

              return (
                <div
                  key={followUp.id}
                  className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                    followUp.status === 'COMPLETED'
                      ? 'bg-green-50 border-l-green-500'
                      : overdue
                        ? 'bg-red-50 border-l-red-500'
                        : today
                          ? 'bg-orange-50 border-l-orange-500'
                          : 'bg-blue-50 border-l-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      {/* Calendar Icon with Date */}
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm ${
                        followUp.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : overdue
                            ? 'bg-red-100 text-red-700'
                            : today
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                      }`}>
                        <span className="text-[10px] font-semibold uppercase">
                          {new Date(followUp.scheduledAt).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {new Date(followUp.scheduledAt).getDate()}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            followUp.status === 'COMPLETED'
                              ? 'bg-green-200 text-green-800'
                              : followUp.status === 'MISSED'
                                ? 'bg-red-200 text-red-800'
                                : overdue
                                  ? 'bg-red-200 text-red-800'
                                  : today
                                    ? 'bg-orange-200 text-orange-800'
                                    : 'bg-blue-200 text-blue-800'
                          }`}>
                            {overdue && followUp.status === 'UPCOMING' ? 'OVERDUE' : followUp.status}
                          </span>
                          {today && followUp.status === 'UPCOMING' && !overdue && (
                            <span className="px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full text-xs font-medium">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-slate-700">
                          <ClockIcon className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">
                            {new Date(followUp.scheduledAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-sm text-slate-500">
                            {new Date(followUp.scheduledAt).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>

                        {followUp.message && (
                          <p className="text-sm text-slate-600 mt-2 bg-white/50 rounded-lg p-2">
                            {followUp.message}
                          </p>
                        )}
                        {followUp.notes && (
                          <p className="text-sm text-slate-500 mt-1 italic">
                            Note: {followUp.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {followUp.assignee?.firstName?.charAt(0) || 'U'}
                          </div>
                          <span className="text-xs text-slate-500">
                            Assigned to <span className="font-medium text-slate-700">{followUp.assignee?.firstName} {followUp.assignee?.lastName}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      {followUp.status === 'UPCOMING' && (
                        <>
                          <button
                            onClick={() => onUpdateStatus(followUp.id, 'COMPLETED')}
                            className="p-2.5 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                            title="Mark Complete"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setRescheduleId(rescheduleId === followUp.id ? null : followUp.id)}
                            className="p-2.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                            title="Reschedule"
                          >
                            <ClockIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onDelete(followUp.id)}
                        className="p-2.5 bg-red-100 text-red-500 hover:bg-red-200 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reschedule Form */}
                  {rescheduleId === followUp.id && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                        <p className="font-medium text-slate-800">Reschedule Follow-up</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Date</label>
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Time</label>
                          <input
                            type="time"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <button
                            onClick={() => handleReschedule(followUp.id)}
                            disabled={!rescheduleDate}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setRescheduleId(null); setRescheduleDate(''); }}
                            className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Calls Tab
interface CallsTabProps {
  callLogs: CallLog[];
  loading: boolean;
  phone: string;
  onLogCallClick: () => void;
}

export function CallsTab({ callLogs, loading, phone, onLogCallClick }: CallsTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-medium text-slate-900">Call History</h3>
        <div className="flex gap-2">
          <a href={`tel:${phone}`} className="btn btn-primary btn-sm">
            <PhoneIcon className="h-4 w-4 mr-1" /> Make Call
          </a>
          <button onClick={onLogCallClick} className="btn btn-secondary btn-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Log Call
          </button>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : callLogs.length === 0 ? (
          <EmptyState icon={PhoneIcon} message="No calls recorded yet" />
        ) : (
          <div className="space-y-4">
            {callLogs.map((call) => {
              const anyCall = call as any;
              const englishTranscript = anyCall.qualification?.englishTranscript;
              return (
                <div key={call.id} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      call.status === 'COMPLETED' ? 'bg-green-100' :
                      call.status === 'MISSED' || call.status === 'NO_ANSWER' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <PhoneIcon className={`h-5 w-5 ${
                        call.status === 'COMPLETED' ? 'text-green-600' :
                        call.status === 'MISSED' || call.status === 'NO_ANSWER' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {call.direction} Call - {call.status}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(call.createdAt)} • Duration: {call.duration || 0}s
                      </p>
                      {call.notes && <p className="text-sm text-slate-600 mt-1">{call.notes}</p>}
                    </div>
                    {call.recordingUrl && (
                      <button className="p-2 hover:bg-slate-200 rounded-lg">
                        <PlayIcon className="h-5 w-5 text-slate-600" />
                      </button>
                    )}
                  </div>
                  {anyCall.summary && (
                    <div className="bg-white border border-slate-200 rounded-md p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Summary</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{anyCall.summary}</p>
                    </div>
                  )}
                  {call.transcript && (
                    <div className="bg-white border border-slate-200 rounded-md p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Transcript</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{call.transcript}</p>
                    </div>
                  )}
                  {englishTranscript && (
                    <div className="bg-white border border-slate-200 rounded-md p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-1">English Translation</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{englishTranscript}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Interests Tab
interface InterestsTabProps {
  interests: Interest[];
  loading: boolean;
  onAddClick: () => void;
  onDelete: (index: number) => void;
}

export function InterestsTab({ interests, loading, onAddClick, onDelete }: InterestsTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-medium text-slate-900">Interests</h3>
        <button onClick={onAddClick} className="btn btn-primary btn-sm">
          <PlusIcon className="h-4 w-4 mr-1" /> Add Interest
        </button>
      </div>
      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : interests.length === 0 ? (
          <EmptyState icon={ClipboardDocumentListIcon} message="No interests recorded yet" />
        ) : (
          <div className="space-y-3">
            {interests.map((interest, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{interest.name}</p>
                  {interest.category && <p className="text-sm text-slate-500">{interest.category}</p>}
                  {interest.notes && <p className="text-sm text-slate-600 mt-1">{interest.notes}</p>}
                </div>
                <button onClick={() => onDelete(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Timeline Tab
interface TimelineTabProps {
  activities: LeadActivity[];
  loading: boolean;
}

// Get color classes based on activity type
const getActivityColors = (type: string): { bg: string; icon: string; border: string } => {
  switch (type) {
    case 'LEAD_CREATED':
      return { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-400' };
    case 'STAGE_CHANGED':
      return { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-400' };
    case 'LEAD_DATA_UPDATED':
      return { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-400' };
    case 'NOTE_ADDED':
      return { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-400' };
    case 'CALL_MADE':
      return { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-green-400' };
    case 'TASK_CREATED':
    case 'TASK_COMPLETED':
      return { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-400' };
    case 'FOLLOWUP_SCHEDULED':
    case 'FOLLOWUP_COMPLETED':
      return { bg: 'bg-cyan-100', icon: 'text-cyan-600', border: 'border-cyan-400' };
    case 'DOCUMENT_UPLOADED':
      return { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-400' };
    case 'PAYMENT_RECEIVED':
      return { bg: 'bg-teal-100', icon: 'text-teal-600', border: 'border-teal-400' };
    default:
      return { bg: 'bg-slate-100', icon: 'text-slate-600', border: 'border-slate-400' };
  }
};

// Format relative time
const getRelativeTime = (date: string): string => {
  const now = new Date();
  const activityDate = new Date(date);
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDateTime(date);
};

// Group activities by date
const groupActivitiesByDate = (activities: LeadActivity[]): Record<string, LeadActivity[]> => {
  const groups: Record<string, LeadActivity[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  activities.forEach(activity => {
    const activityDate = new Date(activity.createdAt).toDateString();
    let groupKey: string;

    if (activityDate === today) {
      groupKey = 'Today';
    } else if (activityDate === yesterday) {
      groupKey = 'Yesterday';
    } else {
      groupKey = new Date(activity.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(activity);
  });

  return groups;
};

export function TimelineTab({ activities, loading }: TimelineTabProps) {
  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">Activity Timeline</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
            {activities.length} activities
          </span>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <ClockIcon className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">No activity recorded yet</p>
            <p className="text-sm text-slate-400 mt-1">Activities will appear here as you interact with this lead</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedActivities).map(([dateGroup, groupActivities]) => (
              <div key={dateGroup}>
                {/* Date Group Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-semibold text-slate-700">{dateGroup}</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                {/* Activities in this group */}
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent"></div>

                  <div className="space-y-1">
                    {groupActivities.map((activity, index) => {
                      const Icon = getActivityIcon(activity.type);
                      const colors = getActivityColors(activity.type);
                      const isLast = index === groupActivities.length - 1;

                      return (
                        <div
                          key={activity.id}
                          className="relative flex gap-4 group"
                        >
                          {/* Icon with ring */}
                          <div className="relative z-10 flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center ring-4 ring-white shadow-sm group-hover:scale-110 transition-transform`}>
                              <Icon className={`h-4 w-4 ${colors.icon}`} />
                            </div>
                          </div>

                          {/* Content Card */}
                          <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                            <div className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                                  {activity.description && (
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{activity.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2">
                                    {activity.user && (
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                                          <span className="text-[10px] font-medium text-primary-700">
                                            {activity.user.firstName?.[0]}{activity.user.lastName?.[0]}
                                          </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                          {activity.user.firstName} {activity.user.lastName}
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-xs text-slate-400">•</span>
                                    <span className="text-xs text-slate-400">{getRelativeTime(activity.createdAt)}</span>
                                  </div>
                                </div>
                                {/* Activity type badge */}
                                <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${colors.bg} ${colors.icon} whitespace-nowrap`}>
                                  {activity.type.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Attachments Tab
interface AttachmentsTabProps {
  attachments: LeadAttachment[];
  loading: boolean;
  onUpload: (file: File) => void;
  onDelete: (attachmentId: string) => void;
}

export function AttachmentsTab({ attachments, loading, onUpload, onDelete }: AttachmentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-medium text-slate-900">Attachments</h3>
        <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm">
          <PlusIcon className="h-4 w-4 mr-1" /> Upload File
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : attachments.length === 0 ? (
          <EmptyState icon={PaperClipIcon} message="No attachments uploaded" />
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <PaperClipIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-slate-900 hover:text-primary-600">
                    {attachment.fileName}
                  </a>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(attachment.fileSize)} • {formatDateTime(attachment.uploadedAt)}
                  </p>
                </div>
                <button onClick={() => onDelete(attachment.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Queries Tab
interface QueriesTabProps {
  queries: LeadQuery[];
  loading: boolean;
  onAddClick: () => void;
  onUpdate: (queryId: string, data: { response?: string; status?: string }) => void;
  onDelete: (queryId: string) => void;
}

export function QueriesTab({ queries, loading, onAddClick, onUpdate, onDelete }: QueriesTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-medium text-slate-900">Queries</h3>
        <button onClick={onAddClick} className="btn btn-primary btn-sm">
          <PlusIcon className="h-4 w-4 mr-1" /> Add Query
        </button>
      </div>
      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : queries.length === 0 ? (
          <EmptyState icon={QuestionMarkCircleIcon} message="No queries recorded" />
        ) : (
          <div className="space-y-4">
            {queries.map((query) => (
              <div key={query.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${queryStatusColors[query.status]}`}>
                        {query.status}
                      </span>
                      <span className="text-xs text-slate-400">{formatDateTime(query.createdAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-2">Q: {query.query}</p>
                    {query.response ? (
                      <p className="text-sm text-slate-600">A: {query.response}</p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add response..."
                          className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onUpdate(query.id, { response: e.currentTarget.value, status: 'RESOLVED' });
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {query.status !== 'CLOSED' && (
                      <select
                        value={query.status}
                        onChange={(e) => onUpdate(query.id, { status: e.target.value })}
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    )}
                    <button onClick={() => onDelete(query.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Applications Tab
interface ApplicationsTabProps {
  applications: LeadApplication[];
  loading: boolean;
  onAddClick: () => void;
  onUpdateStatus: (appId: string, status: LeadApplication['status']) => void;
  onDelete: (appId: string) => void;
}

export function ApplicationsTab({ applications, loading, onAddClick, onUpdateStatus, onDelete }: ApplicationsTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-medium text-slate-900">Applications</h3>
        <button onClick={onAddClick} className="btn btn-primary btn-sm">
          <PlusIcon className="h-4 w-4 mr-1" /> New Application
        </button>
      </div>
      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : applications.length === 0 ? (
          <EmptyState icon={DocumentTextIcon} message="No applications submitted" />
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-900">{app.applicationNo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${applicationStatusColors[app.status]}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </div>
                    {app.programName && <p className="text-sm text-slate-600">{app.programName}</p>}
                    <p className="text-xs text-slate-400 mt-2">Created: {formatDateTime(app.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      value={app.status}
                      onChange={(e) => onUpdateStatus(app.id, e.target.value as LeadApplication['status'])}
                      className="text-xs border border-slate-200 rounded px-2 py-1"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="ENROLLED">Enrolled</option>
                    </select>
                    <button onClick={() => onDelete(app.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Payment status colors
const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
};

// Payment type labels
const paymentTypeLabels: Record<string, string> = {
  REGISTRATION: 'Registration Fee',
  TUITION: 'Tuition Fee',
  EXAM: 'Exam Fee',
  HOSTEL: 'Hostel Fee',
  OTHER: 'Other',
};

// Document status colors
const documentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  VERIFIED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

// Document type labels
const documentTypeLabels: Record<string, string> = {
  ID_PROOF: 'ID Proof',
  ADDRESS_PROOF: 'Address Proof',
  PHOTO: 'Photo',
  CERTIFICATE: 'Certificate',
  MARKSHEET: 'Marksheet',
  OTHER: 'Other',
};

// Payments Tab
interface PaymentsTabProps {
  payments: LeadPayment[];
  loading: boolean;
  onAddClick: () => void;
  onUpdateStatus: (paymentId: string, status: LeadPayment['status']) => void;
  onDelete: (paymentId: string) => void;
}

export function PaymentsTab({ payments, loading, onAddClick, onUpdateStatus, onDelete }: PaymentsTabProps) {
  // Calculate totals
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Amount</p>
          <p className="text-xl font-semibold text-slate-900">₹{totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Paid</p>
          <p className="text-xl font-semibold text-green-600">₹{paidAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Pending</p>
          <p className="text-xl font-semibold text-yellow-600">₹{pendingAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-medium text-slate-900">Payment History</h3>
          <button onClick={onAddClick} className="btn btn-primary btn-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Add Payment
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <LoadingSpinner />
          ) : payments.length === 0 ? (
            <EmptyState icon={CurrencyRupeeIcon} message="No payments recorded" />
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        payment.status === 'COMPLETED' ? 'bg-green-100' :
                        payment.status === 'PENDING' ? 'bg-yellow-100' :
                        payment.status === 'FAILED' ? 'bg-red-100' : 'bg-slate-100'
                      }`}>
                        <CurrencyRupeeIcon className={`h-5 w-5 ${
                          payment.status === 'COMPLETED' ? 'text-green-600' :
                          payment.status === 'PENDING' ? 'text-yellow-600' :
                          payment.status === 'FAILED' ? 'text-red-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-semibold text-slate-900">₹{payment.amount.toLocaleString()}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[payment.status]}`}>
                            {payment.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{paymentTypeLabels[payment.paymentType] || payment.paymentType}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span>Method: {payment.paymentMethod}</span>
                          {payment.transactionId && <span>Txn: {payment.transactionId}</span>}
                          {payment.receiptNo && <span>Receipt: {payment.receiptNo}</span>}
                        </div>
                        {payment.paidAt && (
                          <p className="text-xs text-slate-400 mt-1">Paid on: {formatDateTime(payment.paidAt)}</p>
                        )}
                        {payment.dueDate && payment.status === 'PENDING' && (
                          <p className="text-xs text-orange-500 mt-1">Due: {formatDate(payment.dueDate)}</p>
                        )}
                        {payment.notes && <p className="text-sm text-slate-500 mt-2">{payment.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={payment.status}
                        onChange={(e) => onUpdateStatus(payment.id, e.target.value as LeadPayment['status'])}
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                        <option value="PARTIAL">Partial</option>
                      </select>
                      <button onClick={() => onDelete(payment.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Documents Tab
interface DocumentsTabProps {
  documents: LeadDocument[];
  loading: boolean;
  onAddClick: () => void;
  onUpdateStatus: (docId: string, status: LeadDocument['status'], rejectionReason?: string) => void;
  onDelete: (docId: string) => void;
  onDownload: (doc: LeadDocument) => void;
}

export function DocumentsTab({ documents, loading, onAddClick, onUpdateStatus, onDelete, onDownload }: DocumentsTabProps) {
  // Group documents by type
  const documentsByType = documents.reduce((acc, doc) => {
    const type = doc.documentType || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, LeadDocument[]>);

  // Count by status
  const verifiedCount = documents.filter(d => d.status === 'VERIFIED').length;
  const pendingCount = documents.filter(d => d.status === 'PENDING').length;
  const rejectedCount = documents.filter(d => d.status === 'REJECTED').length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Documents</p>
          <p className="text-xl font-semibold text-slate-900">{documents.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Verified</p>
          <p className="text-xl font-semibold text-green-600">{verifiedCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Pending</p>
          <p className="text-xl font-semibold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Rejected</p>
          <p className="text-xl font-semibold text-red-600">{rejectedCount}</p>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-medium text-slate-900">Documents</h3>
          <button onClick={onAddClick} className="btn btn-primary btn-sm">
            <PlusIcon className="h-4 w-4 mr-1" /> Upload Document
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <LoadingSpinner />
          ) : documents.length === 0 ? (
            <EmptyState icon={FolderIcon} message="No documents uploaded" />
          ) : (
            <div className="space-y-6">
              {Object.entries(documentsByType).map(([type, docs]) => (
                <div key={type}>
                  <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <DocumentDuplicateIcon className="h-4 w-4" />
                    {documentTypeLabels[type] || type}
                    <span className="text-xs text-slate-400">({docs.length})</span>
                  </h4>
                  <div className="space-y-3">
                    {docs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          doc.status === 'VERIFIED' ? 'bg-green-100' :
                          doc.status === 'PENDING' ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          <FolderIcon className={`h-5 w-5 ${
                            doc.status === 'VERIFIED' ? 'text-green-600' :
                            doc.status === 'PENDING' ? 'text-yellow-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900">{doc.documentName || doc.fileName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${documentStatusColors[doc.status]}`}>
                              {doc.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(doc.fileSize)} • Uploaded {formatDateTime(doc.uploadedAt)}
                          </p>
                          {doc.status === 'REJECTED' && doc.rejectionReason && (
                            <p className="text-xs text-red-500 mt-1">Reason: {doc.rejectionReason}</p>
                          )}
                          {doc.status === 'VERIFIED' && doc.verifiedAt && (
                            <p className="text-xs text-green-600 mt-1">Verified on {formatDateTime(doc.verifiedAt)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => onDownload(doc)}
                            className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          {doc.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => onUpdateStatus(doc.id, 'VERIFIED')}
                                className="p-2 text-green-500 hover:bg-green-50 rounded-lg"
                                title="Verify"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (reason) onUpdateStatus(doc.id, 'REJECTED', reason);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                title="Reject"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button onClick={() => onDelete(doc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
