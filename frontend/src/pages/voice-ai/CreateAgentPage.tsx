/**
 * Create Agent Page
 * Multi-step wizard for creating voice AI agents
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  X,
  Sparkles,
  Building2,
} from 'lucide-react';

import { languageOptions } from './constants/voiceAgent.constants';
import {
  IndustrySelectionStepEnhanced,
  ConfigureAgentStep,
  ReviewAgentStep,
  VoiceSelectorPanel,
  LanguageSelectorPanel,
} from './components';
import { useVoiceAgentForm } from './hooks/useVoiceAgentForm';

const STEPS = [
  { number: 1, title: 'Industry', icon: Building2 },
  { number: 2, title: 'Configure', icon: Sparkles },
  { number: 3, title: 'Review', icon: Check },
];

export const CreateAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'configure' | 'voice' | 'prompt' | 'documents' | 'settings'>('configure');
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [showLanguagePanel, setShowLanguagePanel] = useState(false);

  const {
    formData,
    setFormData,
    updateFormData,
    selectedIndustry,
    setSelectedIndustry,
    loading,
    error,
    setError,
    templates,
    fetchTemplateDetails,
    createAgent,
    testVoice,
    callFlows,
    loadingFlows,
  } = useVoiceAgentForm({ isEditMode: false });

  useEffect(() => {
    if (selectedIndustry) {
      fetchTemplateDetails(selectedIndustry);
    }
  }, [selectedIndustry, fetchTemplateDetails]);

  const handleCreate = async () => {
    const agentId = await createAgent();
    if (agentId) {
      navigate('/voice-ai');
    }
  };

  const handleVoicePanelSelect = (voice: { id: string; name: string; language?: string }) => {
    const langOption = languageOptions.find(l => l.id === voice.language);
    setFormData(prev => ({
      ...prev,
      voiceId: voice.id,
      voiceName: voice.name,
      language: voice.language || prev.language,
      greeting: langOption?.greetingTemplate || prev.greeting,
    }));
    setShowVoicePanel(false);
  };

  const handleLanguageSelect = (language: { id: string; greetingTemplate?: string }) => {
    setFormData(prev => ({
      ...prev,
      language: language.id,
      greeting: language.greetingTemplate || prev.greeting,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/voice-ai')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Create Voice Agent</h1>
                <p className="text-sm text-gray-500">Build your AI-powered voice assistant</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-1">
              {STEPS.map((s, index) => (
                <React.Fragment key={s.number}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        s.number < step
                          ? 'bg-green-500 text-white'
                          : s.number === step
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {s.number < step ? <Check size={14} /> : <s.icon size={14} />}
                    </div>
                    <span className={`text-sm font-medium ${s.number === step ? 'text-blue-600' : 'text-gray-500'}`}>
                      {s.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${s.number < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
            <X className="flex-shrink-0" size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Step 1: Industry Selection */}
        {step === 1 && (
          <IndustrySelectionStepEnhanced
            templates={templates}
            selectedIndustry={selectedIndustry}
            onSelectIndustry={setSelectedIndustry}
            onNext={() => setStep(2)}
          />
        )}

        {/* Step 2: Configure Agent */}
        {step === 2 && (
          <ConfigureAgentStep
            formData={formData}
            setFormData={setFormData}
            updateFormData={updateFormData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            callFlows={callFlows}
            loadingFlows={loadingFlows}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            onTestVoice={testVoice}
            onOpenVoicePanel={() => setShowVoicePanel(true)}
            onError={setError}
          />
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <ReviewAgentStep
            formData={formData}
            selectedIndustry={selectedIndustry}
            loading={loading}
            onBack={() => setStep(2)}
            onCreate={handleCreate}
          />
        )}
      </div>

      {/* Voice Selector Panel */}
      <VoiceSelectorPanel
        isOpen={showVoicePanel}
        onClose={() => setShowVoicePanel(false)}
        selectedVoiceId={formData.voiceId}
        onSelectVoice={handleVoicePanelSelect}
      />

      {/* Language Selector Panel */}
      <LanguageSelectorPanel
        isOpen={showLanguagePanel}
        onClose={() => setShowLanguagePanel(false)}
        selectedLanguageId={formData.language}
        onSelectLanguage={handleLanguageSelect}
      />
    </div>
  );
};

export default CreateAgentPage;
