/**
 * Industry Selector Component
 * Grid-based industry selection for settings page
 */

import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  HeartIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
  BuildingOfficeIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import {
  OrganizationIndustry,
  IndustryConfig,
  getIndustryOptions,
} from '../pages/leads/industry-stages.constants';

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

interface IndustrySelectorProps {
  value: OrganizationIndustry | null;
  onChange: (industry: OrganizationIndustry) => void;
  disabled?: boolean;
}

export function IndustrySelector({ value, onChange, disabled = false }: IndustrySelectorProps) {
  const industries = getIndustryOptions();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {industries.map((industry) => {
        const Icon = iconMap[industry.icon] || BuildingOfficeIcon;
        const isSelected = value === industry.value;

        return (
          <button
            key={industry.value}
            type="button"
            onClick={() => !disabled && onChange(industry.value)}
            disabled={disabled}
            className={`
              relative p-4 rounded-xl border-2 transition-all text-left
              ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                <CheckIcon className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
              style={{ backgroundColor: `${industry.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: industry.color }} />
            </div>

            {/* Label */}
            <h4 className={`text-sm font-semibold ${isSelected ? 'text-primary-700' : 'text-slate-900'}`}>
              {industry.label}
            </h4>

            {/* Description */}
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{industry.description}</p>
          </button>
        );
      })}
    </div>
  );
}

interface IndustryBadgeProps {
  industry: OrganizationIndustry;
  size?: 'sm' | 'md' | 'lg';
}

export function IndustryBadge({ industry, size = 'md' }: IndustryBadgeProps) {
  const industries = getIndustryOptions();
  const config = industries.find((i) => i.value === industry) || industries[industries.length - 1];
  const Icon = iconMap[config.icon] || BuildingOfficeIcon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}

interface IndustryPreviewProps {
  industry: OrganizationIndustry;
  stages: Array<{ name: string; color: string }>;
  lostStage?: { name: string; color: string };
}

export function IndustryPreview({ industry, stages, lostStage }: IndustryPreviewProps) {
  const industries = getIndustryOptions();
  const config = industries.find((i) => i.value === industry) || industries[industries.length - 1];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-sm font-semibold text-slate-700">{config.journeyTitle} Preview</h4>
        <span className="text-xs text-slate-500">{stages.length} stages</span>
      </div>

      {/* Visual Pipeline */}
      <div className="relative">
        {/* Main Pipeline Flow */}
        <div className="flex items-end overflow-x-auto pb-2 gap-0">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-end flex-shrink-0">
              {/* Stage Node with Label on Top */}
              <div className="relative group flex flex-col items-center">
                {/* Stage Label - On Top */}
                <div className="mb-2 w-max max-w-[80px]">
                  <p
                    className="text-[10px] font-semibold text-center leading-tight truncate"
                    style={{ color: stage.color }}
                    title={stage.name}
                  >
                    {stage.name}
                  </p>
                </div>
                {/* Stage Number */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg transform transition-transform group-hover:scale-110"
                  style={{ backgroundColor: stage.color }}
                >
                  {index + 1}
                </div>
              </div>

              {/* Arrow Connector */}
              {index < stages.length - 1 && (
                <div className="flex items-center mx-0.5 mb-3">
                  <div className="w-4 h-0.5 bg-slate-300"></div>
                  <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-slate-300"></div>
                </div>
              )}
            </div>
          ))}

          {/* Won Badge */}
          <div className="flex items-center flex-shrink-0 ml-0.5 mb-3">
            <div className="w-4 h-0.5 bg-emerald-400"></div>
            <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-emerald-400 mr-1"></div>
            <div className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
              <span className="text-xs font-bold text-white">WON</span>
            </div>
          </div>
        </div>

        {/* Lost Stage - Below Pipeline */}
        {lostStage && (
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-xs">Drop-off at any stage</span>
              </div>
              <div className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow">
                <span className="text-xs font-bold text-white">{lostStage.name.toUpperCase()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500"></div>
          <span>Conversion</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-red-500"></div>
          <span>Drop-off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-slate-300"></div>
          <span>Flow</span>
        </div>
      </div>
    </div>
  );
}

export default IndustrySelector;
