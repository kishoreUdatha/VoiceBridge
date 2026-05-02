/**
 * Commission Settings Page
 * Admin configures fixed commission amounts per admission type per role
 */

import React, { useState, useEffect } from 'react';
import {
  CurrencyRupeeIcon,
  ArrowPathIcon,
  CheckIcon,
  AcademicCapIcon,
  UserIcon,
  UsersIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  commissionConfigService,
  CommissionConfig,
  AdmissionType,
} from '../../services/commission-config.service';

const ADMISSION_TYPE_LABELS: Record<AdmissionType, { label: string; description: string; icon: React.ElementType }> = {
  DONATION: {
    label: 'Donation',
    description: 'Management quota admissions with higher fees',
    icon: CurrencyRupeeIcon,
  },
  NON_DONATION: {
    label: 'Non-Donation',
    description: 'Merit-based admissions with regular fees',
    icon: AcademicCapIcon,
  },
  NRI: {
    label: 'Overseas (NRI)',
    description: 'NRI quota admissions',
    icon: BriefcaseIcon,
  },
  SCHOLARSHIP: {
    label: 'Scholarship',
    description: 'Scholarship-based admissions',
    icon: AcademicCapIcon,
  },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CommissionSettingsPage() {
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfigs, setEditedConfigs] = useState<Record<string, {
    telecallerAmount: number;
    teamLeadAmount: number;
    managerAmount: number;
  }>>({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      let data = await commissionConfigService.getAll();

      // If no configs exist, initialize defaults
      if (data.length === 0) {
        data = await commissionConfigService.initialize();
      }

      setConfigs(data);

      // Initialize edited configs
      const edited: typeof editedConfigs = {};
      data.forEach(config => {
        edited[config.admissionType] = {
          telecallerAmount: Number(config.telecallerAmount) || 0,
          teamLeadAmount: Number(config.teamLeadAmount) || 0,
          managerAmount: Number(config.managerAmount) || 0,
        };
      });
      setEditedConfigs(edited);
    } catch (error: any) {
      toast.error('Failed to load commission configs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (
    admissionType: AdmissionType,
    role: 'telecallerAmount' | 'teamLeadAmount' | 'managerAmount',
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setEditedConfigs(prev => ({
      ...prev,
      [admissionType]: {
        ...prev[admissionType],
        [role]: numValue,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const configsToUpdate = Object.entries(editedConfigs).map(([admissionType, amounts]) => ({
        admissionType: admissionType as AdmissionType,
        ...amounts,
      }));

      await commissionConfigService.bulkUpdate(configsToUpdate);
      toast.success('Commission settings saved successfully');
      setIsEditing(false);
      loadConfigs();
    } catch (error: any) {
      toast.error('Failed to save commission settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    const edited: typeof editedConfigs = {};
    configs.forEach(config => {
      edited[config.admissionType] = {
        telecallerAmount: Number(config.telecallerAmount) || 0,
        teamLeadAmount: Number(config.teamLeadAmount) || 0,
        managerAmount: Number(config.managerAmount) || 0,
      };
    });
    setEditedConfigs(edited);
    setIsEditing(false);
  };

  const getTotalCommission = (admissionType: AdmissionType) => {
    const config = editedConfigs[admissionType];
    if (!config) return 0;
    return config.telecallerAmount + config.teamLeadAmount + config.managerAmount;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CurrencyRupeeIcon className="h-7 w-7 text-green-600" />
            Commission Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure fixed commission amounts for each admission type
          </p>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <CheckIcon className="h-5 w-5" />
              )}
              Save Changes
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Settings
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">How Commission Distribution Works</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- When an admission is created, commissions are automatically assigned based on role hierarchy</li>
          <li>- <strong>Telecaller/Counselor</strong> who closes the deal gets telecaller commission</li>
          <li>- Their <strong>Team Lead</strong> (direct manager) gets team lead commission</li>
          <li>- The <strong>Manager</strong> (team lead's manager) gets manager commission</li>
        </ul>
      </div>

      {/* Commission Configs Grid */}
      <div className="space-y-6">
        {(['DONATION', 'NON_DONATION', 'NRI', 'SCHOLARSHIP'] as AdmissionType[]).map(admissionType => {
          const typeInfo = ADMISSION_TYPE_LABELS[admissionType];
          const TypeIcon = typeInfo.icon;
          const config = editedConfigs[admissionType] || { telecallerAmount: 0, teamLeadAmount: 0, managerAmount: 0 };

          return (
            <div
              key={admissionType}
              className="bg-white border border-gray-200 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TypeIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{typeInfo.label}</h3>
                    <p className="text-sm text-gray-500">{typeInfo.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total per admission</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(getTotalCommission(admissionType))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Telecaller */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-700">Telecaller / Counselor</span>
                  </div>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        value={config.telecallerAmount || ''}
                        onChange={e => handleAmountChange(admissionType, 'telecallerAmount', e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(config.telecallerAmount || 0)}
                    </p>
                  )}
                </div>

                {/* Team Lead */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UsersIcon className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-gray-700">Team Lead</span>
                  </div>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        value={config.teamLeadAmount || ''}
                        onChange={e => handleAmountChange(admissionType, 'teamLeadAmount', e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(config.teamLeadAmount || 0)}
                    </p>
                  )}
                </div>

                {/* Manager */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BriefcaseIcon className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-gray-700">Manager</span>
                  </div>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        value={config.managerAmount || ''}
                        onChange={e => handleAmountChange(admissionType, 'managerAmount', e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  ) : (
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(config.managerAmount || 0)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
