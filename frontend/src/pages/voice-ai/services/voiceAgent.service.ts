import api from '../../../services/api';
import type { Template, AgentFormData, AgentDocument } from '../types/voiceAgent.types';

// Voice Agent API Service - Dependency Inversion Principle
// All API calls are abstracted into this service layer

export interface CreateAgentPayload {
  name: string;
  industry: string;
  customPrompt: string;
  customQuestions: any[];
}

export interface UpdateAgentPayload {
  voiceId: string;
  voiceProvider: string;
  language: string;
  widgetColor: string;
  widgetTitle: string;
  widgetSubtitle: string;
  greeting: string;
  personality: string;
  responseSpeed: string;
  creativity: number;
  interruptHandling: string;
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  afterHoursMessage: string;
  maxCallDuration: number;
  silenceTimeout: number;
  documents: AgentDocument[];
  autoCreateLeads: boolean;
  deduplicateByPhone: boolean;
  defaultStageId: string | null;
  defaultAssigneeId: string | null;
  appointmentEnabled: boolean;
  appointmentType: string;
  appointmentDuration: number;
  crmIntegration: string;
  triggerWebhookOnLead: boolean;
}

export interface TestCallPayload {
  phoneNumber: string;
  voiceId: string;
  greeting: string;
  language: string;
}

export interface TTSPayload {
  text: string;
  voice: string;
  provider: string;
  language: string;
}

export interface UploadResponse {
  success: boolean;
  file: {
    url: string;
    mimeType: string;
    originalName: string;
  };
}

class VoiceAgentService {
  // Fetch all templates
  async getTemplates(): Promise<Template[]> {
    const response = await api.get('/voice-ai/templates');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to fetch templates');
  }

  // Fetch template details by industry
  async getTemplateByIndustry(industry: string): Promise<any> {
    const response = await api.get(`/voice-ai/templates/${industry}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to fetch template details');
  }

  // Create a new agent
  async createAgent(payload: CreateAgentPayload): Promise<{ id: string }> {
    const response = await api.post('/voice-ai/agents', payload);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create agent');
  }

  // Update an existing agent
  async updateAgent(agentId: string, payload: UpdateAgentPayload): Promise<void> {
    await api.put(`/voice-ai/agents/${agentId}`, payload);
  }

  // Test text-to-speech
  async testTTS(payload: TTSPayload): Promise<ArrayBuffer> {
    const response = await api.post('/voice-ai/tts', payload, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  // Initiate a test call
  async initiateTestCall(payload: TestCallPayload): Promise<void> {
    const response = await api.post('/voice-ai/test-call', payload);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to initiate test call');
    }
  }

  // Upload a file
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse['file']> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'agent-documents');
    formData.append('isPublic', 'true');

    const response = await api.post('/uploads/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    if (response.data.success) {
      return response.data.file;
    }
    throw new Error(response.data.message || 'Failed to upload file');
  }

  // Build update payload from form data
  buildUpdatePayload(formData: AgentFormData): UpdateAgentPayload {
    const isSarvamVoice = formData.voiceId.startsWith('sarvam-');
    const voiceProvider = isSarvamVoice ? 'sarvam' : 'openai';

    return {
      voiceId: formData.voiceId,
      voiceProvider,
      language: formData.language === 'auto' ? '' : formData.language,
      widgetColor: formData.widgetColor,
      widgetTitle: formData.widgetTitle || formData.name,
      widgetSubtitle: formData.widgetSubtitle || 'AI Voice Assistant',
      greeting: formData.greeting,
      personality: formData.personality,
      responseSpeed: formData.responseSpeed,
      creativity: formData.creativity,
      interruptHandling: formData.interruptHandling,
      workingHoursEnabled: formData.workingHoursEnabled,
      workingHoursStart: formData.workingHoursStart,
      workingHoursEnd: formData.workingHoursEnd,
      workingDays: formData.workingDays,
      afterHoursMessage: formData.afterHoursMessage,
      maxCallDuration: formData.maxCallDuration,
      silenceTimeout: formData.silenceTimeout,
      documents: formData.documents,
      autoCreateLeads: formData.autoCreateLeads,
      deduplicateByPhone: formData.deduplicateByPhone,
      defaultStageId: formData.defaultStageId || null,
      defaultAssigneeId: formData.defaultAssigneeId || null,
      appointmentEnabled: formData.appointmentEnabled,
      appointmentType: formData.appointmentType,
      appointmentDuration: formData.appointmentDuration,
      crmIntegration: formData.crmIntegration,
      triggerWebhookOnLead: formData.triggerWebhookOnLead,
    };
  }
}

// Export singleton instance
export const voiceAgentService = new VoiceAgentService();

// Export default for tree-shaking
export default voiceAgentService;
