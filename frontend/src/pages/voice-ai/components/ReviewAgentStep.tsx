/**
 * Review Agent Step Component
 * Step 3 of the agent creation wizard - Final review before creation
 */

import React from 'react';
import {
  ArrowLeft,
  Check,
  Loader2,
  Brain,
  Clock,
} from 'lucide-react';
import { AgentFormData } from '../types/voiceAgent.types';
import { industryDetails, languageOptions } from '../constants/voiceAgent.constants';

interface ReviewAgentStepProps {
  formData: AgentFormData;
  selectedIndustry: string | null;
  loading: boolean;
  onBack: () => void;
  onCreate: () => void;
}

export const ReviewAgentStep: React.FC<ReviewAgentStepProps> = ({
  formData,
  selectedIndustry,
  loading,
  onBack,
  onCreate,
}) => {
  const selectedLanguage = languageOptions.find(l => l.id === formData.language);
  const industryInfo = selectedIndustry ? industryDetails[selectedIndustry] : null;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Agent</h2>
        <p className="text-gray-600">Make sure everything looks good before creating</p>
      </div>

      {/* Agent Preview Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div
          className="h-24 flex items-end px-6 pb-4"
          style={{ background: `linear-gradient(135deg, ${formData.widgetColor}, ${formData.widgetColor}dd)` }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shadow-lg">
              {industryInfo?.icon}
            </div>
            <div className="text-white">
              <h3 className="text-xl font-bold">{formData.name}</h3>
              <p className="text-white/80 text-sm">{industryInfo?.description}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Industry</p>
              <p className="font-semibold text-gray-900">{selectedIndustry?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Voice</p>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                {formData.useCustomVoice ? (
                  <>🎙️ {formData.customVoiceName || 'Custom'}</>
                ) : (
                  <>{formData.voiceName}</>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Language</p>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <span>{selectedLanguage?.flag}</span>
                {selectedLanguage?.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Questions</p>
              <p className="font-semibold text-gray-900">{formData.questions.length} configured</p>
            </div>
          </div>

          <hr className="my-6" />

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Greeting Message</p>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-700 italic">"{formData.greeting}"</p>
            </div>
          </div>

          <hr className="my-6" />

          {/* AI Behavior Settings */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Brain size={14} />
              AI Behavior Settings
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Personality</p>
                <p className="font-semibold text-gray-900 capitalize">{formData.personality}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Response Speed</p>
                <p className="font-semibold text-gray-900 capitalize">{formData.responseSpeed}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Creativity</p>
                <p className="font-semibold text-gray-900">{Math.round(formData.creativity * 100)}%</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Interrupts</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {formData.interruptHandling === 'wait' ? 'Wait & Listen' : 'Polite Ack'}
                </p>
              </div>
            </div>
          </div>

          <hr className="my-6" />

          {/* Call Handling Settings */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Clock size={14} />
              Call Handling Settings
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Working Hours</p>
                <p className="font-semibold text-gray-900">
                  {formData.workingHoursEnabled ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={14} /> Enabled
                    </span>
                  ) : (
                    <span className="text-gray-500">24/7 Available</span>
                  )}
                </p>
              </div>
              {formData.workingHoursEnabled && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Hours</p>
                  <p className="font-semibold text-gray-900">
                    {formData.workingHoursStart} - {formData.workingHoursEnd}
                  </p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Max Duration</p>
                <p className="font-semibold text-gray-900">
                  {formData.maxCallDuration === 0 ? 'Unlimited' : `${formData.maxCallDuration} min`}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Silence Timeout</p>
                <p className="font-semibold text-gray-900">{formData.silenceTimeout} sec</p>
              </div>
            </div>
            {formData.workingHoursEnabled && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Working Days</p>
                <p className="font-semibold text-gray-900">{formData.workingDays.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          onClick={onCreate}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition font-medium shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Creating Agent...
            </>
          ) : (
            <>
              <Check size={18} />
              Create Agent
            </>
          )}
        </button>
      </div>
    </div>
  );
};
