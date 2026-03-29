/**
 * Conversational AI Service
 *
 * Creates and manages AI voice agents on voice platform
 */

import axios from 'axios';
import { prisma } from '../config/database';
import { config } from '../config';

const VOICE_API_KEY = config.elevenlabs.apiKey || '';
const VOICE_API_BASE_URL = config.apiUrls.elevenlabs;

// Agent configuration interface
interface ConversationalAgentConfig {
  name: string;
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
        max_tokens: number;
      };
      first_message: string;
      language: string;
    };
    asr?: {
      quality: 'high' | 'low';
      provider: 'elevenlabs' | 'whisper';
    };
    tts: {
      model_id: string;
      voice_id: string;
      agent_output_audio_format?: string;
      optimize_streaming_latency?: number;
      stability?: number;
      similarity_boost?: number;
    };
    turn?: {
      turn_timeout?: number;
      mode?: 'turn_based' | 'freeform';
    };
  };
  platform_settings?: {
    auth?: {
      enable_auth: boolean;
    };
    widget?: {
      variant: string;
      avatar?: {
        type: 'image' | 'orb';
        image_url?: string;
      };
      feedback?: {
        enabled: boolean;
      };
    };
  };
  privacy_settings?: {
    retention_policy?: 'retain_all' | 'delete_after_call' | 'anonymize';
  };
}

interface ConversationalAgent {
  agent_id: string;
  name: string;
  conversation_config: any;
  created_at: string;
}

interface SignedUrlResponse {
  signed_url: string;
}

interface KnowledgeBaseItem {
  type: 'file' | 'url' | 'text';
  name: string;
  content?: string;
  url?: string;
  file?: Buffer;
}

class ConversationalAIService {
  private apiKey: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = VOICE_API_KEY;
    this.isConfigured = !!this.apiKey;

    if (!this.isConfigured) {
      console.warn('[ConversationalAI] API key not configured. Set ELEVENLABS_API_KEY.');
    } else {
      console.log('[ConversationalAI] Service initialized');
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Create a new agent on voice platform
   */
  async createAgent(config: {
    name: string;
    systemPrompt: string;
    firstMessage: string;
    voiceId: string;
    language?: string;
    llmModel?: string;
    temperature?: number;
    knowledgeBase?: string;
  }): Promise<{ agentId: string; agent: ConversationalAgent }> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    // Build full prompt with knowledge base
    let fullPrompt = config.systemPrompt;
    if (config.knowledgeBase) {
      fullPrompt += `\n\n## Knowledge Base\n${config.knowledgeBase}`;
    }

    const agentConfig: ConversationalAgentConfig = {
      name: config.name,
      conversation_config: {
        agent: {
          prompt: {
            prompt: fullPrompt,
            llm: config.llmModel || 'gpt-4o-mini',
            temperature: config.temperature || 0.7,
            max_tokens: 500,
          },
          first_message: config.firstMessage,
          language: config.language || 'en',
        },
        tts: {
          model_id: 'eleven_turbo_v2_5',
          voice_id: config.voiceId.replace('voice-', '').replace('elevenlabs-', ''),
          optimize_streaming_latency: 3,
          stability: 0.5,
          similarity_boost: 0.75,
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs',
        },
        turn: {
          turn_timeout: 10,
          mode: 'turn_based',
        },
      },
      platform_settings: {
        widget: {
          variant: 'full',
          feedback: {
            enabled: true,
          },
        },
      },
    };

    try {
      console.log('[ConversationalAI] Creating agent:', config.name);

      const response = await axios.post(
        `${VOICE_API_BASE_URL}/convai/agents/create`,
        agentConfig,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[ConversationalAI] Agent created:', response.data.agent_id);

      return {
        agentId: response.data.agent_id,
        agent: response.data,
      };
    } catch (error: any) {
      console.error('[ConversationalAI] Create agent error:', error.response?.data || error.message);
      throw new Error(`Failed to create agent: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, config: Partial<{
    name: string;
    systemPrompt: string;
    firstMessage: string;
    voiceId: string;
    language: string;
    knowledgeBase: string;
  }>): Promise<ConversationalAgent> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    const updateData: any = {};

    if (config.name) {
      updateData.name = config.name;
    }

    if (config.systemPrompt || config.firstMessage || config.language) {
      updateData.conversation_config = {
        agent: {},
      };

      if (config.systemPrompt) {
        let fullPrompt = config.systemPrompt;
        if (config.knowledgeBase) {
          fullPrompt += `\n\n## Knowledge Base\n${config.knowledgeBase}`;
        }
        updateData.conversation_config.agent.prompt = {
          prompt: fullPrompt,
        };
      }

      if (config.firstMessage) {
        updateData.conversation_config.agent.first_message = config.firstMessage;
      }

      if (config.language) {
        updateData.conversation_config.agent.language = config.language;
      }
    }

    if (config.voiceId) {
      updateData.conversation_config = updateData.conversation_config || {};
      updateData.conversation_config.tts = {
        voice_id: config.voiceId.replace('voice-', '').replace('elevenlabs-', ''),
      };
    }

    try {
      const response = await axios.patch(
        `${VOICE_API_BASE_URL}/convai/agents/${agentId}`,
        updateData,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[ConversationalAI] Agent updated:', agentId);
      return response.data;
    } catch (error: any) {
      console.error('[ConversationalAI] Update agent error:', error.response?.data || error.message);
      throw new Error(`Failed to update agent: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    try {
      await axios.delete(
        `${VOICE_API_BASE_URL}/convai/agents/${agentId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      console.log('[ConversationalAI] Agent deleted:', agentId);
    } catch (error: any) {
      console.error('[ConversationalAI] Delete agent error:', error.response?.data || error.message);
      throw new Error(`Failed to delete agent: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get agent details
   */
  async getAgent(agentId: string): Promise<ConversationalAgent> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    try {
      const response = await axios.get(
        `${VOICE_API_BASE_URL}/convai/agents/${agentId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ConversationalAI] Get agent error:', error.response?.data || error.message);
      throw new Error(`Failed to get agent: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * List all agents
   */
  async listAgents(): Promise<ConversationalAgent[]> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    try {
      const response = await axios.get(
        `${VOICE_API_BASE_URL}/convai/agents`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      return response.data.agents || [];
    } catch (error: any) {
      console.error('[ConversationalAI] List agents error:', error.response?.data || error.message);
      throw new Error(`Failed to list agents: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get signed URL for WebSocket connection
   * This URL is used to connect to the agent for real-time conversation
   */
  async getSignedUrl(agentId: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    try {
      const response = await axios.get(
        `${VOICE_API_BASE_URL}/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      return response.data.signed_url;
    } catch (error: any) {
      console.error('[ConversationalAI] Get signed URL error:', error.response?.data || error.message);
      throw new Error(`Failed to get signed URL: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Add knowledge base to an agent
   */
  async addKnowledgeBase(agentId: string, items: KnowledgeBaseItem[]): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    const FormData = require('form-data');

    for (const item of items) {
      try {
        if (item.type === 'text') {
          // Add text content as knowledge
          await axios.post(
            `${VOICE_API_BASE_URL}/convai/agents/${agentId}/add-to-knowledge-base`,
            {
              type: 'text',
              name: item.name,
              text: item.content,
            },
            {
              headers: {
                'xi-api-key': this.apiKey,
                'Content-Type': 'application/json',
              },
            }
          );
        } else if (item.type === 'url') {
          // Add URL as knowledge source
          await axios.post(
            `${VOICE_API_BASE_URL}/convai/agents/${agentId}/add-to-knowledge-base`,
            {
              type: 'url',
              name: item.name,
              url: item.url,
            },
            {
              headers: {
                'xi-api-key': this.apiKey,
                'Content-Type': 'application/json',
              },
            }
          );
        } else if (item.type === 'file' && item.file) {
          // Upload file to knowledge base
          const form = new FormData();
          form.append('file', item.file, { filename: item.name });

          await axios.post(
            `${VOICE_API_BASE_URL}/convai/agents/${agentId}/add-to-knowledge-base`,
            form,
            {
              headers: {
                'xi-api-key': this.apiKey,
                ...form.getHeaders(),
              },
            }
          );
        }

        console.log(`[ConversationalAI] Added knowledge base item: ${item.name}`);
      } catch (error: any) {
        console.error(`[ConversationalAI] Failed to add knowledge base item ${item.name}:`, error.response?.data || error.message);
      }
    }
  }

  /**
   * Get conversation history for an agent
   */
  async getConversations(agentId: string, limit: number = 20): Promise<any[]> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    try {
      const response = await axios.get(
        `${VOICE_API_BASE_URL}/convai/conversations?agent_id=${agentId}&page_size=${limit}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      return response.data.conversations || [];
    } catch (error: any) {
      console.error('[ConversationalAI] Get conversations error:', error.response?.data || error.message);
      throw new Error(`Failed to get conversations: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get a specific conversation transcript
   */
  async getConversationTranscript(conversationId: string): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('Conversational AI API key not configured');
    }

    try {
      const response = await axios.get(
        `${VOICE_API_BASE_URL}/convai/conversations/${conversationId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[ConversationalAI] Get conversation error:', error.response?.data || error.message);
      throw new Error(`Failed to get conversation: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Sync a VoiceBridge agent to Conversational AI platform
   */
  async syncAgentToConversationalAI(voiceBridgeAgentId: string): Promise<string> {
    // Get VoiceBridge agent from database
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: voiceBridgeAgentId },
    });

    if (!agent) {
      throw new Error('VoiceBridge agent not found');
    }

    // Check if agent already has a Conversational AI ID
    const metadata = (agent.metadata as any) || {};

    if (metadata.conversationalAIAgentId) {
      // Update existing agent
      await this.updateAgent(metadata.conversationalAIAgentId, {
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        firstMessage: agent.greeting || 'Hello! How can I help you today?',
        voiceId: agent.voiceId,
        language: agent.language,
        knowledgeBase: agent.knowledgeBase || undefined,
      });

      return metadata.conversationalAIAgentId;
    } else {
      // Create new agent
      const result = await this.createAgent({
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        firstMessage: agent.greeting || 'Hello! How can I help you today?',
        voiceId: agent.voiceId,
        language: agent.language,
        knowledgeBase: agent.knowledgeBase || undefined,
      });

      // Save agent ID to VoiceBridge agent
      await prisma.voiceAgent.update({
        where: { id: voiceBridgeAgentId },
        data: {
          metadata: {
            ...metadata,
            conversationalAIAgentId: result.agentId,
            conversationalAISyncedAt: new Date().toISOString(),
          },
        },
      });

      return result.agentId;
    }
  }

  /**
   * Get WebSocket URL for a VoiceBridge agent
   */
  async getAgentWebSocketUrl(voiceBridgeAgentId: string): Promise<string> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: voiceBridgeAgentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const metadata = (agent.metadata as any) || {};

    if (!metadata.conversationalAIAgentId) {
      // Sync to platform first
      const conversationalAIAgentId = await this.syncAgentToConversationalAI(voiceBridgeAgentId);
      return this.getSignedUrl(conversationalAIAgentId);
    }

    return this.getSignedUrl(metadata.conversationalAIAgentId);
  }
}

export const conversationalAIService = new ConversationalAIService();
export default conversationalAIService;
