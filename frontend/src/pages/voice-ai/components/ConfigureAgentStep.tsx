/**
 * Configure Agent Step Component
 * Step 2 of the agent creation wizard
 */

import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Camera,
} from 'lucide-react';
import { AgentFormData, VoiceOption } from '../types/voiceAgent.types';
import { languageOptions } from '../constants/voiceAgent.constants';
import {
  VoiceTabContent,
  PromptsTabContent,
  DocumentsTabContent,
  SettingsTabContent,
} from './index';

type TabType = 'configure' | 'voice' | 'prompt' | 'documents' | 'settings';

interface ConfigureAgentStepProps {
  formData: AgentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AgentFormData>>;
  updateFormData: (updates: Partial<AgentFormData>) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  callFlows: Array<{ id: string; name: string }>;
  loadingFlows: boolean;
  onBack: () => void;
  onNext: () => void;
  onTestVoice: (voiceId: string, text?: string) => void;
  onOpenVoicePanel: () => void;
  onError: (error: string | null) => void;
}

const TABS = [
  { id: 'configure', label: 'Configure' },
  { id: 'voice', label: 'Voice' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'documents', label: 'Documents' },
  { id: 'settings', label: 'Settings' },
] as const;

export const ConfigureAgentStep: React.FC<ConfigureAgentStepProps> = ({
  formData,
  setFormData,
  updateFormData,
  activeTab,
  setActiveTab,
  callFlows,
  loadingFlows,
  onBack,
  onNext,
  onTestVoice,
  onOpenVoicePanel,
  onError,
}) => {
  const handleVoiceSelect = (voice: VoiceOption, greetingTemplate?: string) => {
    setFormData(prev => ({
      ...prev,
      voiceId: voice.id,
      voiceName: voice.name,
      language: voice.language || prev.language,
      greeting: greetingTemplate || prev.greeting,
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 bg-teal-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Configure Tab */}
        {activeTab === 'configure' && (
          <div className="space-y-6">
            {/* Agent Name */}
            <div className="flex items-start gap-8">
              <div className="w-48 flex-shrink-0">
                <label className="text-sm font-medium text-gray-900">Agent Name</label>
                <p className="text-xs text-gray-500 mt-0.5">Choose a name for your agent.</p>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Voice Agent"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
                <div className="text-right text-xs text-gray-400 mt-1">{formData.name.length}/50</div>
              </div>
            </div>

            {/* Image/Avatar */}
            <div className="flex items-start gap-8">
              <div className="w-48 flex-shrink-0">
                <label className="text-sm font-medium text-gray-900">Image</label>
                <p className="text-xs text-gray-500 mt-0.5">Select an image for your agent.</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center relative">
                    <User size={32} className="text-teal-600" />
                    <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-teal-600 transition">
                      <Camera size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="flex items-start gap-8">
              <div className="w-48 flex-shrink-0">
                <label className="text-sm font-medium text-gray-900">Language</label>
                <p className="text-xs text-gray-500 mt-0.5">Select the language for your agent.</p>
              </div>
              <div className="flex-1">
                <select
                  value={formData.language}
                  onChange={e => {
                    const lang = languageOptions.find(l => l.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      language: e.target.value,
                      greeting: lang?.greetingTemplate || prev.greeting,
                    }));
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition"
                >
                  {languageOptions.filter(l => l.id !== 'auto').map(lang => (
                    <option key={lang.id} value={lang.id}>{lang.flag} {lang.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Greeting Message */}
            <div className="flex items-start gap-8">
              <div className="w-48 flex-shrink-0">
                <label className="text-sm font-medium text-gray-900">Greeting</label>
                <p className="text-xs text-gray-500 mt-0.5">First message when agent answers.</p>
              </div>
              <div className="flex-1">
                <textarea
                  value={formData.greeting}
                  onChange={e => setFormData(prev => ({ ...prev, greeting: e.target.value }))}
                  rows={3}
                  placeholder="Enter greeting message..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition resize-none"
                />
              </div>
            </div>

            {/* Personality */}
            <div className="flex items-start gap-8">
              <div className="w-48 flex-shrink-0">
                <label className="text-sm font-medium text-gray-900">Personality</label>
                <p className="text-xs text-gray-500 mt-0.5">Select the tone of your agent.</p>
              </div>
              <div className="flex-1">
                <select
                  value={formData.personality}
                  onChange={e => setFormData(prev => ({ ...prev, personality: e.target.value as any }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <VoiceTabContent
            selectedVoiceId={formData.voiceId}
            selectedVoiceName={formData.voiceName}
            selectedLanguage={formData.language}
            onSelectVoice={handleVoiceSelect}
            onTestVoice={onTestVoice}
            onOpenVoicePanel={onOpenVoicePanel}
          />
        )}

        {/* Prompt Tab */}
        {activeTab === 'prompt' && (
          <PromptsTabContent
            systemPrompt={formData.systemPrompt}
            questions={formData.questions}
            onUpdateSystemPrompt={(prompt) => updateFormData({ systemPrompt: prompt })}
            onUpdateQuestions={(questions) => updateFormData({ questions })}
          />
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <DocumentsTabContent
            documents={formData.documents}
            onUpdateDocuments={(documents) => updateFormData({ documents })}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTabContent
            formData={formData}
            onUpdateFormData={updateFormData}
            callFlows={callFlows}
            loadingFlows={loadingFlows}
            onError={onError}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 text-gray-600 hover:text-gray-900 transition font-medium"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!formData.name}
          className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition font-medium"
        >
          Save & Next
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
