/**
 * Industry Journey Tracker Component
 * Generic journey tracker that adapts to organization's industry
 */

import { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
  HeartIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import {
  OrganizationIndustry,
  LeadStage,
  getIndustryConfig,
  separateStages,
  isLostStage,
} from '../industry-stages.constants';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  AcademicCapIcon,
  BuildingOffice2Icon,
  HeartIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
  BuildingOfficeIcon,
};

interface IndustryJourneyTrackerProps {
  industry: OrganizationIndustry;
  stages: LeadStage[];
  currentStageId: string | null;
  onStageChange: (stageId: string) => Promise<void>;
  onMarkLost?: () => void;
  isConverted?: boolean;
  closedAt?: string | null;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export function IndustryJourneyTracker({
  industry,
  stages,
  currentStageId,
  onStageChange,
  onMarkLost,
  isConverted,
  closedAt,
  showCloseButton = false,
  onClose,
}: IndustryJourneyTrackerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const config = getIndustryConfig(industry);
  const { progressStages, lostStage } = separateStages(stages);

  // Get current stage info
  const currentStage = stages.find((s) => s.id === currentStageId);
  const currentStep = currentStage
    ? progressStages.findIndex((s) => s.id === currentStage.id) + 1
    : 0;
  const isCurrentlyLost = currentStage && isLostStage(currentStage);

  // Get industry icon
  const IndustryIcon = iconMap[config.icon] || BuildingOfficeIcon;

  const handleStageClick = async (stage: LeadStage) => {
    if (isUpdating || stage.id === currentStageId) return;

    // Calculate the target step
    const targetStep = progressStages.findIndex((s) => s.id === stage.id) + 1;

    // Prevent going backwards from won stages
    if (currentStage?.autoSyncStatus === 'WON' && targetStep < currentStep) {
      toast.error(`Cannot move back from ${config.wonLabel} status`);
      return;
    }

    setIsUpdating(true);
    try {
      await onStageChange(stage.id);
      toast.success(`Stage updated to ${stage.name}`);
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkLost = async () => {
    if (!lostStage || isUpdating) return;

    setIsUpdating(true);
    try {
      await onStageChange(lostStage.id);
      toast.success(`Marked as ${config.lostLabel}`);
      onMarkLost?.();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IndustryIcon className="h-5 w-5" style={{ color: config.color }} />
          <h3 className="text-sm font-semibold text-slate-900">{config.journeyTitle}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isCurrentlyLost ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              {config.lostLabel}
            </span>
          ) : currentStage ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${currentStage.color}20`,
                color: currentStage.color,
              }}
            >
              {currentStage.name}
            </span>
          ) : null}
          {closedAt && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <CheckCircleSolidIcon className="h-3.5 w-3.5" />
              Closed
            </span>
          )}
        </div>
      </div>

      {/* Progress Tracker */}
      {!isCurrentlyLost && (
        <div className="relative">
          <div className="flex items-center justify-between">
            {progressStages.map((stage, index) => {
              const isCompleted = index + 1 < currentStep;
              const isCurrent = stage.id === currentStageId;
              const isClickable = !isUpdating && index + 1 <= currentStep + 1;
              const isWon = stage.autoSyncStatus === 'WON';

              return (
                <div key={stage.id} className="flex items-center flex-1">
                  <button
                    onClick={() => handleStageClick(stage)}
                    disabled={!isClickable}
                    className={`relative flex flex-col items-center group ${
                      isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                    title={stage.name}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'text-white ring-4'
                          : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
                      }`}
                      style={
                        isCurrent
                          ? {
                              backgroundColor: stage.color,
                              boxShadow: `0 0 0 4px ${stage.color}30`,
                            }
                          : undefined
                      }
                    >
                      {isCompleted ? (
                        <CheckCircleSolidIcon className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={`mt-1.5 text-[10px] font-medium text-center max-w-[60px] leading-tight ${
                        isCurrent
                          ? 'text-slate-900'
                          : isCompleted
                          ? 'text-green-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {stage.name}
                    </span>
                    {isWon && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="w-2 h-2 text-white" />
                      </span>
                    )}
                  </button>
                  {index < progressStages.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 ${
                        index + 1 < currentStep ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lost State Display */}
      {isCurrentlyLost && lostStage && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-700">
              This lead was marked as {config.lostLabel}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {!isCurrentlyLost && lostStage && currentStage?.autoSyncStatus !== 'WON' && (
            <button
              onClick={handleMarkLost}
              disabled={isUpdating}
              className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
            >
              Mark as {config.lostLabel}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showCloseButton && onClose && currentStage?.autoSyncStatus === 'WON' && !closedAt && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
            >
              <IndustryIcon className="h-4 w-4" />
              Close {config.journeyTitle.split(' ')[0]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default IndustryJourneyTracker;
