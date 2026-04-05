/**
 * Industry Settings Page
 * Configure organization's industry for lead stage customization
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  HeartIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { IndustrySelector, IndustryPreview } from '../../components/IndustrySelector';
import {
  OrganizationIndustry,
  getIndustryConfig,
} from '../leads/industry-stages.constants';
import api from '../../services/api';

interface IndustryTemplate {
  label: string;
  description: string;
  icon: string;
  color: string;
  stages: Array<{ name: string; slug: string; color: string }>;
  lostStage: { name: string; slug: string; color: string };
}

// Icon mapping for industries
const industryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  AcademicCapIcon,
  BuildingOffice2Icon,
  HeartIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
  BuildingOfficeIcon,
};

function getIndustryIcon(industry: OrganizationIndustry) {
  const config = getIndustryConfig(industry);
  return industryIconMap[config.icon] || BuildingOfficeIcon;
}

export default function IndustrySettingsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Current state
  const [currentIndustry, setCurrentIndustry] = useState<OrganizationIndustry>('GENERAL');
  const [selectedIndustry, setSelectedIndustry] = useState<OrganizationIndustry>('GENERAL');
  const [hasChanges, setHasChanges] = useState(false);

  // Preview template
  const [previewTemplate, setPreviewTemplate] = useState<IndustryTemplate | null>(null);

  // Load current industry setting
  useEffect(() => {
    loadCurrentIndustry();
  }, []);

  // Check for changes
  useEffect(() => {
    setHasChanges(currentIndustry !== selectedIndustry);
  }, [currentIndustry, selectedIndustry]);

  // Load preview when selection changes
  useEffect(() => {
    loadPreviewTemplate(selectedIndustry);
  }, [selectedIndustry]);

  const loadCurrentIndustry = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/lead-stages/industry');
      const industry = response.data.data?.industry || 'GENERAL';
      setCurrentIndustry(industry);
      setSelectedIndustry(industry);
    } catch (error) {
      console.error('Failed to load industry setting:', error);
      toast.error('Failed to load industry setting');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreviewTemplate = async (industry: OrganizationIndustry) => {
    try {
      const response = await api.get(`/lead-stages/templates/${industry}`);
      setPreviewTemplate(response.data.data);
    } catch (error) {
      console.error('Failed to load template preview:', error);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setIsSaving(true);
      await api.put('/lead-stages/industry', {
        industry: selectedIndustry,
        resetStages: true, // Always reset stages when changing industry
      });

      setCurrentIndustry(selectedIndustry);
      setHasChanges(false);
      toast.success(`Industry changed to ${getIndustryConfig(selectedIndustry).label}`);
    } catch (error) {
      console.error('Failed to update industry:', error);
      toast.error('Failed to update industry setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);
      await api.post('/lead-stages/reset');
      toast.success('Lead stages reset to template defaults');
      await loadPreviewTemplate(currentIndustry);
    } catch (error) {
      console.error('Failed to reset stages:', error);
      toast.error('Failed to reset lead stages');
    } finally {
      setIsResetting(false);
    }
  };

  const config = getIndustryConfig(selectedIndustry);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Industry Settings</h1>
            <p className="text-sm text-slate-500">
              Select your industry to customize lead stages
            </p>
          </div>
        </div>

        {/* Save/Cancel Buttons - Only show when there are changes */}
        {hasChanges && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIndustry(currentIndustry)}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              {isSaving ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Industry Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-2">Select Industry</h3>
          <p className="text-sm text-slate-500 mb-5">
            Choose the industry that best matches your business
          </p>

          <IndustrySelector
            value={selectedIndustry}
            onChange={setSelectedIndustry}
            disabled={isSaving}
          />

          {/* Warning when changing */}
          {hasChanges && (
            <div className="flex items-start gap-2 px-3 py-3 mt-5 bg-amber-50 border border-amber-200 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Industry Change</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Changing from <strong>{getIndustryConfig(currentIndustry).label}</strong> to <strong>{config.label}</strong> will reset all lead stages.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stage Preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-slate-900">
              {config.journeyTitle}
            </h3>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-5">
            Lead stages for {config.label.toLowerCase()} workflow
          </p>

          {previewTemplate && (
            <IndustryPreview
              industry={selectedIndustry}
              stages={previewTemplate.stages}
              lostStage={previewTemplate.lostStage}
            />
          )}
        </div>
      </div>

      {/* Info Box - Compact */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
        <span className="text-slate-400">💡</span>
        <span>
          Each industry has customized stages. The "Lost" stage varies: <em>Dropped</em> (Education), <em>Lost</em> (Real Estate), <em>Rejected</em> (Insurance), etc.
        </span>
      </div>
    </div>
  );
}
