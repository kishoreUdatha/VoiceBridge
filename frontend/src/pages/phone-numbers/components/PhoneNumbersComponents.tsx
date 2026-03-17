/**
 * Phone Numbers Page Components
 * Stats, Filters, Table, and Modals
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PhoneIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  UserMinusIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import phoneNumberService from '../../../services/phone-number.service';
import {
  PhoneNumber,
  PhoneNumberStats,
  Agent,
  PhoneNumberFormData,
  PhoneNumberStatus,
  CreatePhoneNumberInput,
  UpdatePhoneNumberInput,
  PhoneProvider,
  PhoneType,
} from '../phone-numbers.types';
import {
  STATUS_FILTERS,
  PROVIDERS,
  PHONE_TYPES,
  getStatusIcon,
  getStatusBadgeClass,
  createInitialFormData,
} from '../phone-numbers.constants';

// Stats Cards
interface StatsCardsProps {
  stats: PhoneNumberStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard
      icon={<PhoneIcon className="w-5 h-5 text-slate-600" />}
      value={stats.total}
      label="Total Numbers"
      iconBg="bg-slate-100"
      valueColor="text-slate-900"
    />
    <StatCard
      icon={<CheckCircleIcon className="w-5 h-5 text-green-600" />}
      value={stats.available}
      label="Available"
      iconBg="bg-green-100"
      valueColor="text-green-600"
    />
    <StatCard
      icon={<UserPlusIcon className="w-5 h-5 text-blue-600" />}
      value={stats.assigned}
      label="Assigned"
      iconBg="bg-blue-100"
      valueColor="text-blue-600"
    />
    <StatCard
      icon={<PhoneIcon className="w-5 h-5 text-purple-600" />}
      value={stats.monthlyStats.totalMinutes}
      label="Minutes Used"
      iconBg="bg-purple-100"
      valueColor="text-purple-600"
    />
  </div>
);

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  iconBg: string;
  valueColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, iconBg, valueColor }) => (
  <div className="bg-white rounded-xl p-4 border border-slate-200">
    <div className="flex items-center gap-3">
      <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
      <div>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  </div>
);

// Filters Bar
interface FiltersBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: PhoneNumberStatus;
  onStatusChange: (status: PhoneNumberStatus) => void;
  onRefresh: () => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onRefresh,
}) => (
  <div className="bg-white rounded-xl p-4 border border-slate-200">
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by number, name, or agent..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <FunnelIcon className="w-5 h-5 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as PhoneNumberStatus)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onRefresh}
        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <ArrowPathIcon className="w-5 h-5" />
      </button>
    </div>
  </div>
);

// Phone Numbers Table
interface PhoneNumbersTableProps {
  phoneNumbers: PhoneNumber[];
  loading: boolean;
  onEdit: (phoneNumber: PhoneNumber) => void;
  onDelete: (id: string) => void;
  onAssign: (phoneNumber: PhoneNumber) => void;
  onUnassign: (id: string) => void;
  onAddNew: () => void;
}

export const PhoneNumbersTable: React.FC<PhoneNumbersTableProps> = ({
  phoneNumbers,
  loading,
  onEdit,
  onDelete,
  onAssign,
  onUnassign,
  onAddNew,
}) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    {loading ? (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    ) : phoneNumbers.length === 0 ? (
      <EmptyState onAddNew={onAddNew} />
    ) : (
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Phone Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Assigned To
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Provider
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {phoneNumbers.map((pn) => (
            <PhoneNumberRow
              key={pn.id}
              phoneNumber={pn}
              onEdit={() => onEdit(pn)}
              onDelete={() => onDelete(pn.id)}
              onAssign={() => onAssign(pn)}
              onUnassign={() => onUnassign(pn.id)}
            />
          ))}
        </tbody>
      </table>
    )}
  </div>
);

interface PhoneNumberRowProps {
  phoneNumber: PhoneNumber;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onUnassign: () => void;
}

const PhoneNumberRow: React.FC<PhoneNumberRowProps> = ({
  phoneNumber: pn,
  onEdit,
  onDelete,
  onAssign,
  onUnassign,
}) => (
  <tr className="hover:bg-slate-50">
    <td className="px-6 py-4">
      <div>
        <p className="font-medium text-slate-900">
          {pn.displayNumber || phoneNumberService.formatPhoneNumber(pn.number)}
        </p>
        {pn.friendlyName && <p className="text-sm text-slate-500">{pn.friendlyName}</p>}
      </div>
    </td>
    <td className="px-6 py-4">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
          pn.status
        )}`}
      >
        {getStatusIcon(pn.status)}
        {pn.status}
      </span>
    </td>
    <td className="px-6 py-4">
      {pn.assignedAgent ? (
        <Link
          to={`/voice-ai/agents/${pn.assignedAgent.id}`}
          className="text-primary-600 hover:text-primary-700"
        >
          {pn.assignedAgent.name}
        </Link>
      ) : (
        <span className="text-slate-400">Not assigned</span>
      )}
    </td>
    <td className="px-6 py-4 text-sm text-slate-600">
      {phoneNumberService.getProviderName(pn.provider)}
    </td>
    <td className="px-6 py-4 text-sm text-slate-600">{pn.type}</td>
    <td className="px-6 py-4">
      <div className="flex items-center justify-end gap-2">
        {pn.status === 'AVAILABLE' ? (
          <button
            onClick={onAssign}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Assign to Agent"
          >
            <UserPlusIcon className="w-5 h-5" />
          </button>
        ) : pn.status === 'ASSIGNED' ? (
          <button
            onClick={onUnassign}
            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            title="Unassign"
          >
            <UserMinusIcon className="w-5 h-5" />
          </button>
        ) : null}

        <button
          onClick={onEdit}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Edit"
        >
          <PencilIcon className="w-5 h-5" />
        </button>

        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </td>
  </tr>
);

interface EmptyStateProps {
  onAddNew: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAddNew }) => (
  <div className="text-center py-12">
    <PhoneIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-slate-900 mb-1">No phone numbers found</h3>
    <p className="text-slate-500 mb-4">Add your first phone number to get started</p>
    <button onClick={onAddNew} className="btn btn-primary">
      <PlusIcon className="w-5 h-5 mr-2" />
      Add Phone Number
    </button>
  </div>
);

// Add/Edit Phone Number Modal
interface AddPhoneNumberModalProps {
  phoneNumber: PhoneNumber | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddPhoneNumberModal: React.FC<AddPhoneNumberModalProps> = ({
  phoneNumber,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PhoneNumberFormData>(createInitialFormData(phoneNumber));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (phoneNumber) {
        const updateData: UpdatePhoneNumberInput = {
          friendlyName: formData.friendlyName || undefined,
          type: formData.type,
          monthlyRent: formData.monthlyRent,
          perMinuteRate: formData.perMinuteRate,
          region: formData.region || undefined,
          city: formData.city || undefined,
          notes: formData.notes || undefined,
        };
        await phoneNumberService.updatePhoneNumber(phoneNumber.id, updateData);
        toast.success('Phone number updated');
      } else {
        const createData: CreatePhoneNumberInput = {
          number: formData.number,
          friendlyName: formData.friendlyName || undefined,
          provider: formData.provider,
          type: formData.type,
          monthlyRent: formData.monthlyRent,
          perMinuteRate: formData.perMinuteRate,
          region: formData.region || undefined,
          city: formData.city || undefined,
          notes: formData.notes || undefined,
        };
        await phoneNumberService.createPhoneNumber(createData);
        toast.success('Phone number added');
      }
      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save phone number');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof PhoneNumberFormData>(key: K, value: PhoneNumberFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {phoneNumber ? 'Edit Phone Number' : 'Add Phone Number'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => updateField('number', e.target.value)}
              placeholder="+91 98765 43210"
              className="input"
              required
              disabled={!!phoneNumber}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Friendly Name</label>
            <input
              type="text"
              value={formData.friendlyName}
              onChange={(e) => updateField('friendlyName', e.target.value)}
              placeholder="Sales Line, Support, etc."
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => updateField('provider', e.target.value as PhoneProvider)}
                className="input"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => updateField('type', e.target.value as PhoneType)}
                className="input"
              >
                {PHONE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Rent (INR)</label>
              <input
                type="number"
                value={formData.monthlyRent}
                onChange={(e) => updateField('monthlyRent', parseFloat(e.target.value) || 0)}
                className="input"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Per Minute Rate (INR)</label>
              <input
                type="number"
                value={formData.perMinuteRate}
                onChange={(e) => updateField('perMinuteRate', parseFloat(e.target.value) || 0)}
                className="input"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => updateField('region', e.target.value)}
                placeholder="IN, US, etc."
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Mumbai, Delhi, etc."
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes..."
              className="input"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : phoneNumber ? 'Update' : 'Add Phone Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assign Agent Modal
interface AssignAgentModalProps {
  phoneNumber: PhoneNumber;
  agents: Agent[];
  onClose: () => void;
  onAssign: (phoneNumberId: string, agentId: string) => void;
}

export const AssignAgentModal: React.FC<AssignAgentModalProps> = ({
  phoneNumber,
  agents,
  onClose,
  onAssign,
}) => {
  const [selectedAgent, setSelectedAgent] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Assign to Agent</h2>
          <p className="text-sm text-slate-500 mt-1">
            Assign {phoneNumber.displayNumber || phoneNumber.number} to a voice agent
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="input"
            >
              <option value="">Choose an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => onAssign(phoneNumber.id, selectedAgent)}
              disabled={!selectedAgent}
              className="btn btn-primary"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
