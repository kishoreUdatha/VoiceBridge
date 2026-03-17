/**
 * Enhanced Industry Selection Step Component
 * Step 1 of the agent creation wizard with improved styling
 */

import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { industryDetails } from '../constants/voiceAgent.constants';
import type { Template } from '../types/voiceAgent.types';

interface IndustrySelectionStepEnhancedProps {
  templates: Template[];
  selectedIndustry: string | null;
  onSelectIndustry: (industry: string) => void;
  onNext: () => void;
}

export const IndustrySelectionStepEnhanced: React.FC<IndustrySelectionStepEnhancedProps> = ({
  templates,
  selectedIndustry,
  onSelectIndustry,
  onNext,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Industry</h2>
        <p className="text-gray-600">Select the industry that best matches your use case for a pre-configured template</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(industryDetails).map(([key, value]) => (
          <button
            key={key}
            onClick={() => onSelectIndustry(key)}
            className={`group relative p-5 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-lg ${
              selectedIndustry === key
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {selectedIndustry === key && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center text-2xl mb-3 shadow-sm`}>
              {value.icon}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {templates.find(t => t.industry === key)?.name || key.replace('_', ' ')}
            </h3>
            <p className="text-sm text-gray-500">{value.description}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={onNext}
          disabled={!selectedIndustry}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm"
        >
          Continue
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
