import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Loader2,
  Sparkles,
  Brain,
  Clock,
  User,
  Building2,
  Camera,
} from 'lucide-react';

// Import constants, types, and components - following SOLID principles
import { industryDetails, languageOptions } from './constants/voiceAgent.constants';
import type { VoiceOption } from './types/voiceAgent.types';
import {
  VoiceSelectorPanel,
  LanguageSelectorPanel,
  VoiceTabContent,
  PromptsTabContent,
  DocumentsTabContent,
  SettingsTabContent,
} from './components';
import { useVoiceAgentForm } from './hooks/useVoiceAgentForm';

export const CreateAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'configure' | 'voice' | 'prompt' | 'documents' | 'settings'>('configure');

  // Panel states for voice and language selectors
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [showLanguagePanel, setShowLanguagePanel] = useState(false);

  // Use the custom hook for form state management - Dependency Inversion Principle
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

  // Fetch template details when industry changes
  useEffect(() => {
    if (selectedIndustry) {
      fetchTemplateDetails(selectedIndustry);
    }
  }, [selectedIndustry, fetchTemplateDetails]);

  const steps = [
    { number: 1, title: 'Industry', icon: Building2 },
    { number: 2, title: 'Configure', icon: Sparkles },
    { number: 3, title: 'Review', icon: Check },
  ];

  // Handle agent creation using service
  const handleCreate = async () => {
    const agentId = await createAgent();
    if (agentId) {
      navigate('/voice-ai');
    }
  };

  // Handle voice selection from VoiceTabContent
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
              {steps.map((s, index) => (
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
                  {index < steps.length - 1 && (
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
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
            <X className="flex-shrink-0" size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Step 1: Select Industry */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Industry</h2>
              <p className="text-gray-600">Select the industry that best matches your use case for a pre-configured template</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(industryDetails).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedIndustry(key)}
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
                onClick={() => setStep(2)}
                disabled={!selectedIndustry}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Agent */}
        {step === 2 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                {[
                  { id: 'configure', label: 'Configure' },
                  { id: 'voice', label: 'Voice' },
                  { id: 'prompt', label: 'Prompt' },
                  { id: 'documents', label: 'Documents' },
                  { id: 'settings', label: 'Settings' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
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
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                          setFormData({
                            ...formData,
                            language: e.target.value,
                            greeting: lang?.greetingTemplate || formData.greeting,
                          });
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
                        onChange={e => setFormData({ ...formData, greeting: e.target.value })}
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
                        onChange={e => setFormData({ ...formData, personality: e.target.value as any })}
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

              {/* Voice Tab - Using extracted component */}
              {activeTab === 'voice' && (
                <VoiceTabContent
                  selectedVoiceId={formData.voiceId}
                  selectedVoiceName={formData.voiceName}
                  selectedLanguage={formData.language}
                  onSelectVoice={handleVoiceSelect}
                  onTestVoice={testVoice}
                  onOpenVoicePanel={() => setShowVoicePanel(true)}
                />
              )}

              {/* Prompt Tab - Using extracted component */}
              {activeTab === 'prompt' && (
                <PromptsTabContent
                  systemPrompt={formData.systemPrompt}
                  questions={formData.questions}
                  onUpdateSystemPrompt={(prompt) => updateFormData({ systemPrompt: prompt })}
                  onUpdateQuestions={(questions) => updateFormData({ questions })}
                />
              )}

              {/* Documents Tab - Using extracted component */}
              {activeTab === 'documents' && (
                <DocumentsTabContent
                  documents={formData.documents}
                  onUpdateDocuments={(documents) => updateFormData({ documents })}
                />
              )}

              {/* Settings Tab - Using extracted component */}
              {activeTab === 'settings' && (
                <SettingsTabContent
                  formData={formData}
                  onUpdateFormData={updateFormData}
                  callFlows={callFlows}
                  loadingFlows={loadingFlows}
                  onError={setError}
                />
              )}
            </div>

            {/* Footer Navigation */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-2.5 text-gray-600 hover:text-gray-900 transition font-medium"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.name}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition font-medium"
              >
                Save & Next
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
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
                    {industryDetails[selectedIndustry!]?.icon}
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl font-bold">{formData.name}</h3>
                    <p className="text-white/80 text-sm">{industryDetails[selectedIndustry!]?.description}</p>
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
                      <span>{languageOptions.find(l => l.id === formData.language)?.flag}</span>
                      {languageOptions.find(l => l.id === formData.language)?.name}
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
                      <p className="font-semibold text-gray-900 capitalize">{formData.interruptHandling === 'wait' ? 'Wait & Listen' : 'Polite Ack'}</p>
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
                        <p className="font-semibold text-gray-900">{formData.workingHoursStart} - {formData.workingHoursEnd}</p>
                      </div>
                    )}
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Max Duration</p>
                      <p className="font-semibold text-gray-900">{formData.maxCallDuration === 0 ? 'Unlimited' : `${formData.maxCallDuration} min`}</p>
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
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={handleCreate}
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
        )}
      </div>

      {/* Voice Selector Panel */}
      <VoiceSelectorPanel
        isOpen={showVoicePanel}
        onClose={() => setShowVoicePanel(false)}
        selectedVoiceId={formData.voiceId}
        onSelectVoice={(voice) => {
          const langOption = languageOptions.find(l => l.id === voice.language);
          setFormData({
            ...formData,
            voiceId: voice.id,
            voiceName: voice.name,
            language: voice.language || formData.language,
            greeting: langOption?.greetingTemplate || formData.greeting,
          });
          setShowVoicePanel(false);
        }}
      />

      {/* Language Selector Panel */}
      <LanguageSelectorPanel
        isOpen={showLanguagePanel}
        onClose={() => setShowLanguagePanel(false)}
        selectedLanguageId={formData.language}
        onSelectLanguage={(language) => {
          setFormData({
            ...formData,
            language: language.id,
            greeting: language.greetingTemplate || formData.greeting,
          });
        }}
      />
    </div>
  );
};

export default CreateAgentPage;
