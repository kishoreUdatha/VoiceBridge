import { useState, useEffect, useCallback } from 'react';
import { voiceAgentService } from '../services';
import api from '../../../services/api';
import type {
  AgentFormData,
  AgentFunction,
  FAQItem,
  ConversationExample,
  IntegrationsState,
  CallFlowOption,
  LLMSettings,
  SelectedLLM,
  Template,
} from '../types/voiceAgent.types';
import {
  defaultFormData,
  defaultIntegrations,
  defaultFunctions,
  voiceOptions,
  languageOptions,
  industryDetails,
} from '../constants/voiceAgent.constants';

interface UseVoiceAgentFormOptions {
  agentId?: string;
  isEditMode: boolean;
}

export function useVoiceAgentForm({ agentId, isEditMode }: UseVoiceAgentFormOptions) {
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Functions state
  const [functions, setFunctions] = useState<AgentFunction[]>(defaultFunctions);

  // Knowledge base state
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [conversationExamples, setConversationExamples] = useState<ConversationExample[]>([]);

  // Integrations state
  const [integrations, setIntegrations] = useState<IntegrationsState>(defaultIntegrations);

  // Call flows
  const [callFlows, setCallFlows] = useState<CallFlowOption[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);

  // LLM settings
  const [selectedLLM, setSelectedLLM] = useState<SelectedLLM>({
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast & efficient',
    provider: 'Google',
  });
  const [llmSettings, setLLMSettings] = useState<LLMSettings>({
    backupConfig: 'default',
    temperature: 0.1,
    thinkingBudgetEnabled: true,
    thinkingBudget: 1,
    tokenLimit: -1,
  });

  // Fetch agent data in edit mode
  useEffect(() => {
    if (isEditMode && agentId) {
      const fetchAgent = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/voice-ai/agents/${agentId}`);
          const agent = response.data.data;

          setFormData({
            name: agent.name || '',
            voiceId: agent.voiceId || 'sarvam-priya',
            voiceName: agent.voiceName || voiceOptions.find(v => v.id === agent.voiceId)?.name || 'Priya',
            language: agent.language || 'hi-IN',
            widgetColor: agent.widgetColor || '#3B82F6',
            widgetTitle: agent.widgetTitle || '',
            widgetSubtitle: agent.widgetSubtitle || '',
            greeting: agent.greeting || '',
            systemPrompt: agent.systemPrompt || '',
            questions: agent.questions || [],
            documents: agent.documents || [],
            useCustomVoice: agent.useCustomVoice || false,
            customVoiceName: agent.customVoiceName || '',
            personality: agent.personality || 'professional',
            responseSpeed: agent.responseSpeed || 'normal',
            creativity: agent.temperature || 0.7,
            interruptHandling: agent.interruptHandling || 'polite',
            workingHoursEnabled: agent.workingHoursEnabled || false,
            workingHoursStart: agent.workingHoursStart || '09:00',
            workingHoursEnd: agent.workingHoursEnd || '18:00',
            workingDays: agent.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            afterHoursMessage: agent.afterHoursMessage || defaultFormData.afterHoursMessage,
            maxCallDuration: agent.maxCallDuration || 10,
            silenceTimeout: agent.silenceTimeout || 30,
            recordCalls: agent.recordCalls !== false,
            autoCreateLeads: agent.autoCreateLeads !== false,
            deduplicateByPhone: agent.deduplicateByPhone !== false,
            defaultStageId: agent.defaultStageId || '',
            defaultAssigneeId: agent.defaultAssigneeId || '',
            appointmentEnabled: agent.appointmentEnabled || false,
            appointmentType: agent.appointmentType || 'consultation',
            appointmentDuration: agent.appointmentDuration || 30,
            crmIntegration: agent.crmIntegration || 'internal',
            triggerWebhookOnLead: agent.triggerWebhookOnLead !== false,
            callFlowId: agent.callFlowId || '',
          });

          setSelectedIndustry(agent.industry || null);
          setError(null);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch agent');
        } finally {
          setLoading(false);
        }
      };
      fetchAgent();
    }
  }, [isEditMode, agentId]);

  // Fetch available call flows
  useEffect(() => {
    const fetchCallFlows = async () => {
      try {
        setLoadingFlows(true);
        const response = await api.get('/call-flows');
        setCallFlows(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch call flows:', error);
      } finally {
        setLoadingFlows(false);
      }
    };
    fetchCallFlows();
  }, []);

  const updateFormData = useCallback((updates: Partial<AgentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleFunction = useCallback((functionId: string) => {
    setFunctions(prev =>
      prev.map(f =>
        f.id === functionId ? { ...f, enabled: !f.enabled } : f
      )
    );
  }, []);

  const addFaq = useCallback((question: string, answer: string) => {
    const newFaq: FAQItem = {
      id: Date.now().toString(),
      question,
      answer,
    };
    setFaqs(prev => [...prev, newFaq]);
  }, []);

  const removeFaq = useCallback((id: string) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
  }, []);

  const updateIntegration = useCallback(<K extends keyof IntegrationsState>(
    key: K,
    updates: Partial<IntegrationsState[K]>
  ) => {
    setIntegrations(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  }, []);

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesData = await voiceAgentService.getTemplates();
        setTemplates(templatesData);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, []);

  // Fetch template details when industry changes
  const fetchTemplateDetails = useCallback(async (industry: string) => {
    try {
      const template = await voiceAgentService.getTemplateByIndustry(industry);
      const langOption = languageOptions.find(l => l.id === formData.language);
      const languageGreeting = langOption?.greetingTemplate || template.greeting;

      setFormData(prev => ({
        ...prev,
        name: template.name,
        greeting: languageGreeting,
        systemPrompt: template.systemPrompt,
        questions: template.questions,
        widgetColor: industryDetails[industry]?.color || '#3B82F6',
      }));
    } catch (err) {
      console.error('Failed to fetch template details:', err);
    }
  }, [formData.language]);

  // Create agent using service
  const createAgent = useCallback(async (): Promise<string | null> => {
    if (!selectedIndustry || !formData.name) {
      setError('Please fill in all required fields');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Create the agent
      const { id: agentId } = await voiceAgentService.createAgent({
        name: formData.name,
        industry: selectedIndustry,
        customPrompt: formData.systemPrompt,
        customQuestions: formData.questions,
      });

      // Update with additional settings
      const updatePayload = voiceAgentService.buildUpdatePayload(formData);
      await voiceAgentService.updateAgent(agentId, updatePayload);

      return agentId;
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedIndustry, formData]);

  // Test voice using service
  const testVoice = useCallback(async (voiceId: string) => {
    try {
      const isSarvam = voiceId.startsWith('sarvam-');
      const voice = voiceOptions.find(v => v.id === voiceId);

      let testText = 'Hello! I am your AI voice assistant. How can I help you today?';
      if (isSarvam && voice?.testText) {
        testText = voice.testText;
      }

      const actualVoice = isSarvam ? voiceId.replace('sarvam-', '') : voiceId;
      const language = isSarvam && voice?.language ? voice.language : 'en-US';

      const audioData = await voiceAgentService.testTTS({
        text: testText,
        voice: actualVoice,
        provider: isSarvam ? 'sarvam' : 'openai',
        language,
      });

      const mimeType = isSarvam ? 'audio/wav' : 'audio/mpeg';
      const audioBlob = new Blob([audioData], { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error('Failed to test voice:', err);
    }
  }, []);

  return {
    formData,
    setFormData,
    updateFormData,
    selectedIndustry,
    setSelectedIndustry,
    loading,
    setLoading,
    error,
    setError,
    functions,
    setFunctions,
    toggleFunction,
    faqs,
    setFaqs,
    addFaq,
    removeFaq,
    conversationExamples,
    setConversationExamples,
    integrations,
    setIntegrations,
    updateIntegration,
    callFlows,
    loadingFlows,
    selectedLLM,
    setSelectedLLM,
    llmSettings,
    setLLMSettings,
    // New additions
    templates,
    fetchTemplateDetails,
    createAgent,
    testVoice,
  };
}
