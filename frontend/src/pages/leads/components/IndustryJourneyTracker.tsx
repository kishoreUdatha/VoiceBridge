/**
 * Industry Journey Tracker Component
 * Modern, professional design with smooth animations
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
  isWonStage,
} from '../industry-stages.constants';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
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
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const config = getIndustryConfig(industry);
  const { progressStages, lostStage } = separateStages(stages);

  // Get current stage info
  // For converted leads without a stage ID, assume they are at the final (won) stage
  const wonStage = progressStages.find((s) => isWonStage(s));
  const effectiveStageId = currentStageId || (isConverted && wonStage ? wonStage.id : null);
  const currentStage = stages.find((s) => s.id === effectiveStageId);
  const currentStep = currentStage
    ? progressStages.findIndex((s) => s.id === currentStage.id) + 1
    : (isConverted ? progressStages.length : 0); // Converted leads show full progress
  const isCurrentlyLost = currentStage && isLostStage(currentStage);

  // Calculate progress percentage
  const progressPercentage = progressStages.length > 0
    ? Math.round((currentStep / progressStages.length) * 100)
    : (isConverted ? 100 : 0);

  // Get industry icon
  const IndustryIcon = iconMap[config.icon] || BuildingOfficeIcon;

  const handleStageClick = async (stage: LeadStage) => {
    if (isUpdating || stage.id === effectiveStageId || isConverted) return;

    const targetStep = progressStages.findIndex((s) => s.id === stage.id) + 1;

    // Prevent backward movement in Journey Tracker - only forward allowed
    if (targetStep < currentStep) {
      toast.error('Cannot move backward. Use the dropdown to change to a previous stage.');
      return;
    }

    // Prevent moving back from won status
    if (currentStage && isWonStage(currentStage)) {
      toast.error(`Cannot change stage after ${config.wonLabel}`);
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      {/* Header with gradient accent */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${config.color}15` }}
            >
              <IndustryIcon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{config.journeyTitle}</h3>
              <p className="text-xs text-slate-500">
                {currentStep} of {progressStages.length} stages completed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress Badge */}
            {!isCurrentlyLost && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progressPercentage}%`,
                      background: `linear-gradient(90deg, ${config.color}, ${config.color}CC)`
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600">{progressPercentage}%</span>
              </div>
            )}

            {/* Status Badge */}
            {isCurrentlyLost ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {config.lostLabel}
              </span>
            ) : currentStage ? (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{
                  backgroundColor: `${currentStage.color}10`,
                  color: currentStage.color,
                  borderColor: `${currentStage.color}30`,
                }}
              >
                {currentStage.name}
              </span>
            ) : null}

            {/* Close Button - shown when in won stage and not yet closed */}
            {showCloseButton && onClose && currentStage && isWonStage(currentStage) && !closedAt && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-200 transition-all"
              >
                <CheckCircleSolidIcon className="h-4 w-4" />
                Close {config.journeyTitle.split(' ')[0]}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
      {!isCurrentlyLost && (
        <div className="px-5 py-6">
          <div className="relative">
            {/* Background Track */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-slate-100 rounded-full" />

            {/* Animated Progress Line */}
            <div
              className="absolute top-5 left-0 h-1 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${((currentStep - 1) / (progressStages.length - 1)) * 100}%`,
                background: `linear-gradient(90deg, #10B981, #34D399)`
              }}
            />

            {/* Stage Circles */}
            <div className="relative flex items-start justify-between">
              {progressStages.map((stage, index) => {
                const isCompleted = index + 1 < currentStep || (isConverted && index + 1 <= progressStages.length);
                const isCurrent = stage.id === effectiveStageId;
                // Only allow clicking on forward stages (not current or past) and only if not won
                const isNextStage = index + 1 === currentStep + 1;
                const isClickable = !isUpdating && isNextStage && !(currentStage && isWonStage(currentStage));
                const isWon = isWonStage(stage);
                const isHovered = hoveredStage === stage.id;

                return (
                  <div
                    key={stage.id}
                    className="flex flex-col items-center"
                    style={{ flex: 1 }}
                  >
                    {/* Circle Button */}
                    <button
                      onClick={() => handleStageClick(stage)}
                      onMouseEnter={() => setHoveredStage(stage.id)}
                      onMouseLeave={() => setHoveredStage(null)}
                      disabled={!isClickable}
                      className={`relative z-10 transition-all duration-300 ${
                        isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                      }`}
                      title={stage.name}
                    >
                      {/* Glow Effect for Current */}
                      {isCurrent && (
                        <div
                          className="absolute inset-0 rounded-full animate-ping opacity-30"
                          style={{ backgroundColor: stage.color }}
                        />
                      )}

                      {/* Circle */}
                      <div
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          isCompleted
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200'
                            : isCurrent
                            ? 'text-white shadow-lg transform scale-110'
                            : isHovered && isClickable
                            ? 'bg-slate-200 text-slate-600 scale-105'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                        style={
                          isCurrent
                            ? {
                                background: `linear-gradient(135deg, ${stage.color}, ${stage.color}DD)`,
                                boxShadow: `0 4px 14px ${stage.color}40`,
                              }
                            : undefined
                        }
                      >
                        {isCompleted ? (
                          <CheckCircleSolidIcon className="h-6 w-6" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>

                      {/* Won Indicator */}
                      {isWon && isCurrent && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                          <CheckCircleSolidIcon className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>

                    {/* Stage Label */}
                    <div className="mt-3 text-center">
                      <span
                        className={`text-xs font-medium leading-tight block max-w-[80px] transition-colors duration-200 ${
                          isCurrent
                            ? 'text-slate-900 font-semibold'
                            : isCompleted
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {stage.name}
                      </span>

                      {/* Hover Tooltip */}
                      {isHovered && isClickable && (
                        <div className="absolute mt-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-20">
                          Click to advance to this stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lost State Display */}
      {isCurrentlyLost && lostStage && (
        <div className="px-5 py-8">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm font-medium text-red-700">
              This lead was marked as {config.lostLabel}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              You can reassign to a different stage if needed
            </p>
          </div>
        </div>
      )}

      {/* Action Footer - Mark as Lost button */}
      {!isCurrentlyLost && lostStage && currentStage && !isWonStage(currentStage) && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleMarkLost}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
            Mark as {config.lostLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export default IndustryJourneyTracker;
