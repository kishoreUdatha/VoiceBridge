/**
 * Conversational AI Agent Detail Page
 *
 * Displays agent configuration with tabs for Agent, Workflow, Knowledge Base, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Settings,
  Volume2,
  Loader2,
  ChevronRight,
  Plus,
  ExternalLink,
  Wand2,
  Globe,
  Maximize2,
  Users,
  Wifi,
  WifiOff,
  Upload,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Node, Edge } from 'reactflow';
import api from '../../../services/api';
import { callFlowService } from '../../../services/call-flow.service';
import { ConversationalAIAgent, Voice, TabId, TABS, DEFAULT_VOICES, CONVERSATIONAL_AI_LANGUAGES, CallFlow, PublishStatusType } from './types';
import { VoiceSelectionPanel } from './components/VoiceSelectionPanel';
import { LanguageSelectionPanel } from './components/LanguageSelectionPanel';
import { VoiceSettingsPanel } from './components/VoiceSettingsPanel';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { AnalysisTab } from './components/AnalysisTab';
import { TestsTab } from './components/TestsTab';
import { useAgentRealtime } from '../../../hooks/useAgentRealtime';
import { useAgentAnalytics } from '../../../hooks/useAgentAnalytics';
import { RealtimeVoiceWidget } from '../../../components/RealtimeVoiceWidget';

export function ConversationalAIAgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<ConversationalAIAgent | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('agent');

  // Voice and Language panels
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [voicePanelMode, setVoicePanelMode] = useState<'primary' | 'additional'>('primary');
  const [isLanguagePanelOpen, setIsLanguagePanelOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);

  // Editable fields
  const [systemPrompt, setSystemPrompt] = useState('');
  const [greeting, setGreeting] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [additionalVoices, setAdditionalVoices] = useState<Voice[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en-US']);
  const [primaryLanguage, setPrimaryLanguage] = useState('en-US');
  const [defaultPersonality, setDefaultPersonality] = useState(true);
  const [interruptible, setInterruptible] = useState(true);

  // Knowledge Base state
  const [knowledgeUrl, setKnowledgeUrl] = useState('');
  const [knowledgeSources, setKnowledgeSources] = useState<{id: string; type: string; name: string}[]>([]);
  const [isRagPanelOpen, setIsRagPanelOpen] = useState(false);
  const [ragSettings, setRagSettings] = useState({
    chunkSize: 1000,
    chunkOverlap: 200,
    topK: 5,
    similarityThreshold: 0.7,
    embeddingModel: 'text-embedding-ada-002',
    searchType: 'semantic' as 'semantic' | 'keyword' | 'hybrid',
  });

  // Hide body scroll when RAG panel is open
  useEffect(() => {
    if (isRagPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isRagPanelOpen]);

  // Workflow state (workflowSteps used via setWorkflowSteps, state managed by context)
  const [, setWorkflowSteps] = useState([
    { id: '1', name: 'Greeting', description: 'Initial welcome message', color: 'green' },
    { id: '2', name: 'Qualification', description: 'Gather user information', color: 'blue' },
    { id: '3', name: 'Response', description: 'Provide answers and assistance', color: 'purple' },
  ]);

  // Call Flow workflow state (persisted to database)
  const [callFlow, setCallFlow] = useState<CallFlow | null>(null);
  const [workflowNodes, setWorkflowNodes] = useState<Node[]>([]);
  const [workflowEdges, setWorkflowEdges] = useState<Edge[]>([]);
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [workflowLoaded, setWorkflowLoaded] = useState(false);

  // Branches state
  const [branches, setBranches] = useState([
    { id: '1', name: 'main', description: 'Current production version', active: true },
    { id: '2', name: 'development', description: 'Testing new features', active: false },
  ]);
  const [activeBranch, setActiveBranch] = useState('main');

  // Analysis state
  const [searchQuery, setSearchQuery] = useState('');

  // Tools state
  const [connectedTools, setConnectedTools] = useState<string[]>([]);
  const [toolConfigModal, setToolConfigModal] = useState<{ open: boolean; tool: { id: string; name: string; icon: string } | null }>({ open: false, tool: null });
  const [toolCredentials, setToolCredentials] = useState<Record<string, Record<string, string>>>({});

  // Tests state
  const [testCases, setTestCases] = useState<Array<{ id: string; name: string; description: string; status: 'passed' | 'pending' | 'failed'; lastRun?: string }>>([
    { id: '1', name: 'Greeting Test', description: 'Tests initial greeting', status: 'passed' },
    { id: '2', name: 'FAQ Response', description: 'Tests common questions', status: 'pending' },
  ]);

  // Security state
  const [authRequired, setAuthRequired] = useState(false);
  const [rateLimiting, setRateLimiting] = useState(true);
  const [contentFiltering, setContentFiltering] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [rateLimitRequests, setRateLimitRequests] = useState(60);
  const [rateLimitBurst, setRateLimitBurst] = useState(10);
  const [dataRetentionDays, setDataRetentionDays] = useState(90);
  const [anonymizeUserData, setAnonymizeUserData] = useState(true);
  const [gdprComplianceEnabled, setGdprComplianceEnabled] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([]);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [contentFilterCategories, setContentFilterCategories] = useState<string[]>(['profanity', 'violence', 'adult', 'hate_speech']);

  // Pre-chat form state
  const [preChatFormEnabled, setPreChatFormEnabled] = useState(false);
  const [preChatFormTitle, setPreChatFormTitle] = useState('Before we start');
  const [preChatFormSubtitle, setPreChatFormSubtitle] = useState('Please provide your details');
  const [, setCreateLeadFromForm] = useState(true);
  const [preChatFormFields, setPreChatFormFields] = useState<Array<{ name: string; label: string; type: string; required: boolean }>>([
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: false },
  ]);

  // WhatsApp follow-up state
  const [whatsappFollowupEnabled, setWhatsappFollowupEnabled] = useState(false);
  const [whatsappFollowupMessage, setWhatsappFollowupMessage] = useState('Hi {{name}}, thank you for your call! Here\'s a summary of our conversation:\n\n{{summary}}\n\nCall duration: {{duration}}');
  const [whatsappFollowupDelay, setWhatsappFollowupDelay] = useState(0);

  // Advanced state
  const [llmProvider, setLlmProvider] = useState('openai');
  const [llmModel, setLlmModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(70);
  const [maxResponseLength, setMaxResponseLength] = useState(500);
  const [timeoutValue, setTimeoutValue] = useState(30);
  const [topP, setTopP] = useState(90);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [speechRate, setSpeechRate] = useState(100);
  const [voicePitch, setVoicePitch] = useState(0);
  const [silenceDetection, setSilenceDetection] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [logLevel, setLogLevel] = useState('info');
  const [logConversations, setLogConversations] = useState(true);

  // Publish state
  const [publishStatus, setPublishStatus] = useState<PublishStatusType>('DRAFT');
  const [, setPublishedAt] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);

  // Widget preview state
  const [isWidgetPreviewOpen, setIsWidgetPreviewOpen] = useState(false);
  const [isAddDomainModalOpen, setIsAddDomainModalOpen] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isWidgetDocsModalOpen, setIsWidgetDocsModalOpen] = useState(false);

  // Widget configuration state
  const [widgetColor, setWidgetColor] = useState('#111827');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');
  const [widgetSize, setWidgetSize] = useState('medium');
  const [embedCodeType, setEmbedCodeType] = useState<'Script' | 'React' | 'iFrame'>('Script');

  // Real-time field update handler
  const handleRealtimeFieldUpdate = useCallback((field: string, value: any, _updatedBy: string) => {
    // Update local state based on field name
    const fieldUpdaters: Record<string, (val: any) => void> = {
      systemPrompt: setSystemPrompt,
      greeting: setGreeting,
      temperature: (v) => setTemperature(v * 100),
      topP: (v) => setTopP(v * 100),
      maxResponseLength: setMaxResponseLength,
      speechRate: setSpeechRate,
      voicePitch: setVoicePitch,
      silenceDetection: setSilenceDetection,
      debugMode: setDebugMode,
      logLevel: setLogLevel,
      logConversations: setLogConversations,
      authenticationRequired: setAuthRequired,
      rateLimitingEnabled: setRateLimiting,
      contentFilteringEnabled: setContentFiltering,
      sessionTimeoutMinutes: setSessionTimeout,
      rateLimitRequests: setRateLimitRequests,
      rateLimitBurst: setRateLimitBurst,
      dataRetentionDays: setDataRetentionDays,
      anonymizeUserData: setAnonymizeUserData,
      gdprComplianceEnabled: setGdprComplianceEnabled,
      ipWhitelist: setIpWhitelist,
      allowedDomains: setAllowedDomains,
      contentFilterCategories: setContentFilterCategories,
      preChatFormEnabled: setPreChatFormEnabled,
      preChatFormTitle: setPreChatFormTitle,
      preChatFormSubtitle: setPreChatFormSubtitle,
      createLeadFromForm: setCreateLeadFromForm,
      preChatFormFields: setPreChatFormFields,
      whatsappFollowupEnabled: setWhatsappFollowupEnabled,
      whatsappFollowupMessage: setWhatsappFollowupMessage,
      whatsappFollowupDelay: setWhatsappFollowupDelay,
      workflowSteps: setWorkflowSteps,
      branches: setBranches,
      activeBranch: setActiveBranch,
      testCases: setTestCases,
      ragSettings: setRagSettings,
      connectedTools: setConnectedTools,
      voiceId: (v) => {
        const voiceId = v?.replace('voice-', '');
        const matchedVoice = DEFAULT_VOICES.find((voice) => voice.id === voiceId);
        if (matchedVoice) setSelectedVoice(matchedVoice);
      },
      language: (v) => {
        // Normalize short codes to full locale codes for Indian languages
        const indianLangMap: Record<string, string> = {
          'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
          'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
          'pa': 'pa-IN', 'or': 'or-IN', 'as': 'as-IN', 'ur': 'ur-IN',
          'en': 'en-US',
        };
        const normalizedLang = indianLangMap[v] || v;
        setPrimaryLanguage(normalizedLang);
        setSelectedLanguages([normalizedLang]);
      },
    };

    const updater = fieldUpdaters[field];
    if (updater) {
      updater(value);
    }
  }, []);

  // Real-time sync hook - Disabled due to socket connection causing page redirect issues
  // TODO: Fix useAgentRealtime hook's socket initialization to not interfere with page rendering
  // The hook's socket.connectAsync() was causing the page to redirect to dashboard
  const isRealtimeConnected = false;
  const viewerCount = 0;
  const broadcastUpdate = (_field: string, _value: any) => {};

  // Agent analytics hook - fetch real analytics data
  const {
    analytics,
    analyticsLoading,
    refreshAnalytics,
    conversations,
    conversationsLoading,
    totalConversations,
    currentPage,
    totalPages,
    fetchConversations,
    exportToCSV,
    exportLoading,
    selectedConversation,
    selectConversation,
  } = useAgentAnalytics({
    agentId: agentId || '',
    autoFetch: activeTab === 'analysis', // Only fetch when Analysis tab is active
  });

  // Refetch analytics when switching to analysis tab
  useEffect(() => {
    if (activeTab === 'analysis' && agentId) {
      refreshAnalytics();
      fetchConversations(1);
    }
  }, [activeTab, agentId]);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  // Fetch tool connection status
  const fetchToolConnectionStatus = useCallback(async () => {
    if (!agentId) return;
    try {
      // Check calendar connection
      const calendarRes = await api.get(`/integrations/google/status?tool=calendar&agentId=${agentId}`);
      if (calendarRes.data?.data?.connected) {
        setConnectedTools(prev => prev.includes('calendar') ? prev : [...prev, 'calendar']);
      }
      // Check sheets connection
      const sheetsRes = await api.get(`/integrations/google/status?tool=sheets&agentId=${agentId}`);
      if (sheetsRes.data?.data?.connected) {
        setConnectedTools(prev => prev.includes('sheets') ? prev : [...prev, 'sheets']);
      }
    } catch (error) {
      console.error('Failed to fetch tool connection status:', error);
    }
  }, [agentId]);

  // Check for tool_connected URL param after OAuth redirect
  useEffect(() => {
    const toolConnected = searchParams.get('tool_connected');
    const tab = searchParams.get('tab');

    if (toolConnected) {
      // Tool was just connected via OAuth - refresh status and show success
      fetchToolConnectionStatus();
      toast.success(`${toolConnected.charAt(0).toUpperCase() + toolConnected.slice(1)} connected successfully!`);
      // Clear the URL params
      setSearchParams({});
    }
    if (tab) {
      setActiveTab(tab as TabId);
    }
  }, [searchParams, fetchToolConnectionStatus, setSearchParams]);

  // Fetch tool status on mount
  useEffect(() => {
    fetchToolConnectionStatus();
  }, [fetchToolConnectionStatus]);

  // Listen for OAuth popup postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_success') {
        fetchToolConnectionStatus();
        toast.success(`${event.data.tool?.charAt(0).toUpperCase() + event.data.tool?.slice(1)} connected successfully!`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchToolConnectionStatus]);

  const loadAgent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/voice-ai/agents/${agentId}`);
      const agentData = response.data.data || response.data;
      setAgent(agentData);

      // Agent tab
      setSystemPrompt(agentData.systemPrompt || '');
      setGreeting(agentData.greeting || '');

      // Find matching voice
      const voiceId = agentData.voiceId?.replace('voice-', '');
      const matchedVoice = DEFAULT_VOICES.find((v) => v.id === voiceId);
      if (matchedVoice) {
        setSelectedVoice(matchedVoice);
      }

      // Set language - normalize short codes to full locale codes for Indian languages
      if (agentData.language) {
        let normalizedLang = agentData.language;
        // Map short Indian language codes to full locale codes
        const indianLangMap: Record<string, string> = {
          'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
          'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
          'pa': 'pa-IN', 'or': 'or-IN', 'as': 'as-IN', 'ur': 'ur-IN',
          'en': 'en-US',
        };
        if (indianLangMap[normalizedLang]) {
          normalizedLang = indianLangMap[normalizedLang];
        }
        setPrimaryLanguage(normalizedLang);
        setSelectedLanguages([normalizedLang]);
      }

      // Workflow tab
      if (agentData.workflowSteps && Array.isArray(agentData.workflowSteps) && agentData.workflowSteps.length > 0) {
        setWorkflowSteps(agentData.workflowSteps);
      }

      // Branches tab
      if (agentData.branches && Array.isArray(agentData.branches) && agentData.branches.length > 0) {
        setBranches(agentData.branches);
      }
      if (agentData.activeBranch) {
        setActiveBranch(agentData.activeBranch);
      }

      // Knowledge Base tab
      if (agentData.documents && Array.isArray(agentData.documents)) {
        setKnowledgeSources(agentData.documents);
      }
      if (agentData.ragSettings) {
        setRagSettings({ ...ragSettings, ...agentData.ragSettings });
      }

      // Tests tab
      if (agentData.testCases && Array.isArray(agentData.testCases)) {
        setTestCases(agentData.testCases);
      }

      // Security tab
      if (agentData.authenticationRequired !== undefined) setAuthRequired(agentData.authenticationRequired);
      if (agentData.rateLimitingEnabled !== undefined) setRateLimiting(agentData.rateLimitingEnabled);
      if (agentData.contentFilteringEnabled !== undefined) setContentFiltering(agentData.contentFilteringEnabled);
      if (agentData.sessionTimeoutMinutes !== undefined) setSessionTimeout(agentData.sessionTimeoutMinutes);
      if (agentData.rateLimitRequests !== undefined) setRateLimitRequests(agentData.rateLimitRequests);
      if (agentData.rateLimitBurst !== undefined) setRateLimitBurst(agentData.rateLimitBurst);
      if (agentData.dataRetentionDays !== undefined) setDataRetentionDays(agentData.dataRetentionDays);
      if (agentData.anonymizeUserData !== undefined) setAnonymizeUserData(agentData.anonymizeUserData);
      if (agentData.gdprComplianceEnabled !== undefined) setGdprComplianceEnabled(agentData.gdprComplianceEnabled);
      if (agentData.ipWhitelist) setIpWhitelist(agentData.ipWhitelist);
      if (agentData.allowedDomains) setAllowedDomains(agentData.allowedDomains);
      if (agentData.contentFilterCategories) setContentFilterCategories(agentData.contentFilterCategories);

      // Pre-chat form settings
      if (agentData.preChatFormEnabled !== undefined) setPreChatFormEnabled(agentData.preChatFormEnabled);
      if (agentData.preChatFormTitle) setPreChatFormTitle(agentData.preChatFormTitle);
      if (agentData.preChatFormSubtitle) setPreChatFormSubtitle(agentData.preChatFormSubtitle);
      if (agentData.createLeadFromForm !== undefined) setCreateLeadFromForm(agentData.createLeadFromForm);
      if (agentData.preChatFormFields) setPreChatFormFields(agentData.preChatFormFields);

      // WhatsApp follow-up settings
      if (agentData.whatsappFollowupEnabled !== undefined) setWhatsappFollowupEnabled(agentData.whatsappFollowupEnabled);
      if (agentData.whatsappFollowupMessage) setWhatsappFollowupMessage(agentData.whatsappFollowupMessage);
      if (agentData.whatsappFollowupDelay !== undefined) setWhatsappFollowupDelay(agentData.whatsappFollowupDelay);

      // Advanced tab - LLM Configuration
      if (agentData.llmProvider) setLlmProvider(agentData.llmProvider);
      if (agentData.llmModel) setLlmModel(agentData.llmModel);
      if (agentData.temperature !== undefined) setTemperature(Math.round(agentData.temperature * 100));
      if (agentData.maxResponseTokens !== undefined) setMaxResponseLength(agentData.maxResponseTokens);
      if (agentData.silenceTimeout !== undefined) setTimeoutValue(agentData.silenceTimeout);
      if (agentData.topP !== undefined) setTopP(Math.round(agentData.topP * 100));
      if (agentData.frequencyPenalty !== undefined) setFrequencyPenalty(Math.round(agentData.frequencyPenalty * 100));
      if (agentData.speechRate !== undefined) setSpeechRate(Math.round(agentData.speechRate * 100));
      if (agentData.voicePitch !== undefined) setVoicePitch(Math.round(agentData.voicePitch * 100));
      if (agentData.silenceDetection !== undefined) setSilenceDetection(agentData.silenceDetection);
      if (agentData.debugMode !== undefined) setDebugMode(agentData.debugMode);
      if (agentData.logLevel !== undefined) setLogLevel(agentData.logLevel);
      if (agentData.logConversations !== undefined) setLogConversations(agentData.logConversations);

      // Publish status
      if (agentData.status) setPublishStatus(agentData.status);
      if (agentData.publishedAt) setPublishedAt(agentData.publishedAt);
      if (agentData.versionNumber) setVersionNumber(agentData.versionNumber);

      // Widget settings
      if (agentData.widgetColor) setWidgetColor(agentData.widgetColor);
      if (agentData.widgetPosition) setWidgetPosition(agentData.widgetPosition);

    } catch (error) {
      console.error('Failed to load agent:', error);
      toast.error('Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  // Save agent configuration to backend and broadcast to other users
  const saveAgentConfig = async (updates: Record<string, any>, broadcast = true) => {
    if (!agentId) return;

    try {
      await api.put(`/voice-ai/agents/${agentId}`, updates);
      toast.success('Changes saved');

      // Broadcast each field update to other users via WebSocket
      if (broadcast) {
        Object.entries(updates).forEach(([field, value]) => {
          broadcastUpdate(field, value);
        });
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
      toast.error('Failed to save changes');
    }
  };

  // Debounced save for text inputs (with broadcast)
  const saveWithDebounce = React.useCallback(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (updates: Record<string, any>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => saveAgentConfig(updates, true), 1000);
      };
    })(),
    [agentId, broadcastUpdate]
  );

  // Publish agent - makes it live
  const handlePublish = async () => {
    if (!agentId) return;

    setIsPublishing(true);
    try {
      const response = await api.post(`/voice-ai/agents/${agentId}/publish`, {
        description: `Version ${versionNumber + 1}`,
      });

      const result = response.data.data || response.data;
      setPublishStatus('PUBLISHED');
      setPublishedAt(result.publishedAt || new Date().toISOString());
      setVersionNumber(result.versionNumber || versionNumber + 1);

      toast.success('Agent published successfully! It is now live.');
    } catch (error: any) {
      console.error('Failed to publish agent:', error);
      toast.error(error.response?.data?.message || 'Failed to publish agent');
    } finally {
      setIsPublishing(false);
    }
  };

  // Unpublish agent - returns to draft mode
  const handleUnpublish = async () => {
    if (!agentId) return;

    setIsPublishing(true);
    try {
      await api.post(`/voice-ai/agents/${agentId}/unpublish`);

      setPublishStatus('DRAFT');
      toast.success('Agent unpublished. It is now in draft mode.');
    } catch (error: any) {
      console.error('Failed to unpublish agent:', error);
      toast.error(error.response?.data?.message || 'Failed to unpublish agent');
    } finally {
      setIsPublishing(false);
    }
  };

  const getLanguageInfo = (code: string) => {
    return CONVERSATIONAL_AI_LANGUAGES.find((l) => l.code === code);
  };

  // Node type mapping: n8n-style nodes to CallFlow node types
  const mapN8NNodeToCallFlowNode = (node: Node): any => {
    const typeMapping: Record<string, string> = {
      trigger: 'START',
      chat: 'START',
      webhook: 'START',
      ai: 'AI_RESPONSE',
      openai: 'AI_RESPONSE',
      message: 'AI_RESPONSE',
      condition: 'CONDITION',
      switch: 'CONDITION',
      http: 'ACTION',
      email: 'ACTION',
      wait: 'ACTION',
      set: 'ACTION',
      code: 'ACTION',
      function: 'ACTION',
      respond: 'AI_RESPONSE',
      end: 'END',
      noOp: 'ACTION',
    };

    return {
      id: node.id,
      type: typeMapping[node.data?.type as string] || 'AI_RESPONSE',
      position: node.position,
      data: {
        label: node.data?.label || '',
        message: node.data?.subtitle || node.data?.message || '',
        // Preserve the original n8n node type for UI rendering
        _n8nType: node.data?.type,
        ...node.data,
      },
    };
  };

  // Map CallFlow nodes back to n8n-style nodes for React Flow
  const mapCallFlowNodeToN8NNode = (node: any): Node => {
    return {
      id: node.id,
      type: 'n8n',
      position: node.position,
      data: {
        type: node.data?._n8nType || node.data?.type?.toLowerCase() || 'message',
        label: node.data?.label || '',
        subtitle: node.data?.message || '',
        ...node.data,
      },
    };
  };

  // Load workflow from call flow
  const loadWorkflow = useCallback(async () => {
    if (!agentId || !agent) return;

    try {
      // Check if agent has a callFlowId
      const agentCallFlowId = (agent as any).callFlowId;

      if (agentCallFlowId) {
        // Load existing call flow
        const flow = await callFlowService.getCallFlow(agentCallFlowId);
        setCallFlow(flow);

        // Map to React Flow nodes/edges
        const mappedNodes = flow.nodes.map(mapCallFlowNodeToN8NNode);
        const mappedEdges = flow.edges.map(edge => ({
          ...edge,
          type: 'n8n',
        }));

        setWorkflowNodes(mappedNodes);
        setWorkflowEdges(mappedEdges);
      }
      setWorkflowLoaded(true);
    } catch (error) {
      console.error('Failed to load workflow:', error);
      setWorkflowLoaded(true); // Still mark as loaded so user can start fresh
    }
  }, [agentId, agent]);

  // Load workflow when agent is loaded and we switch to workflow tab
  useEffect(() => {
    if (activeTab === 'workflow' && agent && !workflowLoaded) {
      loadWorkflow();
    }
  }, [activeTab, agent, workflowLoaded, loadWorkflow]);

  // Handle workflow changes (save to backend)
  const handleWorkflowChange = useCallback(async (nodes: Node[], edges: Edge[]) => {
    if (!agentId) return;

    setIsSavingWorkflow(true);

    try {
      // Map n8n nodes to CallFlow nodes
      const mappedNodes = nodes.map(mapN8NNodeToCallFlowNode);
      const mappedEdges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
        label: typeof edge.label === 'string' ? edge.label : undefined,
      }));

      if (callFlow) {
        // Update existing call flow
        const updatedFlow = await callFlowService.updateCallFlow(callFlow.id, {
          nodes: mappedNodes,
          edges: mappedEdges,
        });
        setCallFlow(updatedFlow);
        // Don't show toast for auto-save to avoid spam
      } else {
        // Create new call flow and assign to agent
        const newFlow = await callFlowService.createCallFlow({
          name: `${agent?.name || 'Agent'} Workflow`,
          description: `Call flow for ${agent?.name || 'agent'}`,
          industry: agent?.industry,
          nodes: mappedNodes,
          edges: mappedEdges,
        });
        setCallFlow(newFlow);

        // Assign the call flow to the agent
        await callFlowService.assignToAgent(newFlow.id, agentId);
        toast.success('Workflow created and linked to agent');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSavingWorkflow(false);
    }
  }, [agentId, agent, callFlow]);

  // Knowledge Base handlers
  const handleAddUrl = () => {
    if (knowledgeUrl.trim()) {
      const newSources = [...knowledgeSources, { id: Date.now().toString(), type: 'url', name: knowledgeUrl.trim() }];
      setKnowledgeSources(newSources);
      setKnowledgeUrl('');
      saveAgentConfig({ documents: newSources });
      toast.success('URL added successfully');
    }
  };

  const handleSaveRagSettings = (settings: typeof ragSettings) => {
    setRagSettings(settings);
    saveAgentConfig({ ragSettings: settings });
    toast.success('RAG settings saved');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const uploadedSources = [];

      for (const file of Array.from(files)) {
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('agentId', agentId || '');

        // Upload file to backend
        const response = await api.post('/voice-ai/agents/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data?.data?.document) {
          uploadedSources.push(response.data.data.document);
        } else {
          // Fallback: save metadata if upload endpoint not available
          uploadedSources.push({
            id: Date.now().toString() + file.name,
            type: 'file',
            name: file.name,
            size: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString()
          });
        }
      }

      const newSources = [...knowledgeSources, ...uploadedSources];
      setKnowledgeSources(newSources);

      // Save documents to agent config
      await saveAgentConfig({ documents: newSources });
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('File upload failed:', error);
      // Fallback: still save metadata locally if upload fails
      const newSources = Array.from(files).map(file => ({
        id: Date.now().toString() + file.name,
        type: 'file',
        name: file.name,
        size: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString()
      }));
      const allSources = [...knowledgeSources, ...newSources];
      setKnowledgeSources(allSources);
      await saveAgentConfig({ documents: allSources });
      toast('Files added (metadata only - upload service unavailable)', { icon: '⚠️' });
    }
  };

  const handleRemoveSource = async (id: string) => {
    const newSources = knowledgeSources.filter(s => s.id !== id);
    setKnowledgeSources(newSources);
    await saveAgentConfig({ documents: newSources });
    toast.success('Document removed');
  };


  // Branch handlers
  const handleCreateBranch = () => {
    const branchName = `branch-${branches.length + 1}`;
    const newBranch = { id: Date.now().toString(), name: branchName, description: 'New branch', active: false, createdAt: new Date().toISOString() };
    const newBranches = [...branches, newBranch];
    setBranches(newBranches);
    saveAgentConfig({ branches: newBranches });
    toast.success(`Branch "${branchName}" created`);
  };

  const handleSwitchBranch = (name: string) => {
    setActiveBranch(name);
    const newBranches = branches.map(b => ({ ...b, active: b.name === name }));
    setBranches(newBranches);
    saveAgentConfig({ activeBranch: name, branches: newBranches });
    toast.success(`Switched to branch "${name}"`);
  };


  // Tools handlers
  const handleConnectTool = (tool: { id: string; name: string; icon: string }) => {
    if (connectedTools.includes(tool.id)) {
      // Disconnect tool
      setConnectedTools(connectedTools.filter(t => t !== tool.id));
      const newCreds = { ...toolCredentials };
      delete newCreds[tool.id];
      setToolCredentials(newCreds);
      toast.success(`${tool.name} disconnected`);
    } else {
      // Open configuration modal
      setToolConfigModal({ open: true, tool });
    }
  };

  const handleToolConfigSave = () => {
    const tool = toolConfigModal.tool;
    if (!tool) return;

    const creds = toolCredentials[tool.id] || {};
    const requiredFields = getToolRequiredFields(tool.id);

    // Validate required fields
    const missingFields = requiredFields.filter(field => !creds[field.key]?.trim());
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    // Mark as connected
    setConnectedTools([...connectedTools, tool.id]);
    setToolConfigModal({ open: false, tool: null });
    toast.success(`${tool.name} connected successfully`);
  };

  const getToolRequiredFields = (toolId: string): { key: string; label: string; type: string; placeholder: string; helpText?: string }[] => {
    const fieldMap: Record<string, { key: string; label: string; type: string; placeholder: string; helpText?: string }[]> = {
      calendar: [
        { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'xxxxx.apps.googleusercontent.com', helpText: 'From Google Cloud Console > APIs & Services > Credentials' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-xxxxx', helpText: 'OAuth 2.0 Client Secret' },
        { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: '1//xxxxx', helpText: 'Generated after OAuth authorization' },
        { key: 'calendarId', label: 'Calendar ID', type: 'text', placeholder: 'primary or your@email.com', helpText: 'Use "primary" for main calendar' },
        { key: 'timezone', label: 'Timezone', type: 'text', placeholder: 'Asia/Kolkata', helpText: 'IANA timezone for meetings' },
        { key: 'defaultDuration', label: 'Default Meeting Duration (mins)', type: 'number', placeholder: '30', helpText: 'Default duration for scheduled meetings' },
      ],
      payment: [
        { key: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
        { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
      ],
      email: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'SG.xxxxx...' },
        { key: 'fromEmail', label: 'From Email', type: 'email', placeholder: 'noreply@yourcompany.com' },
      ],
      crm: [
        { key: 'instanceUrl', label: 'Instance URL', type: 'url', placeholder: 'https://yourcompany.salesforce.com' },
        { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Salesforce Access Token' },
      ],
      sms: [
        { key: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'ACxxxxx...' },
        { key: 'authToken', label: 'Auth Token', type: 'password', placeholder: 'Twilio Auth Token' },
        { key: 'phoneNumber', label: 'From Phone', type: 'tel', placeholder: '+1234567890' },
      ],
      sheets: [
        { key: 'serviceAccountKey', label: 'Service Account JSON', type: 'textarea', placeholder: '{"type": "service_account", ...}' },
        { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
      ],
      hubspot: [
        { key: 'apiKey', label: 'Private App Token', type: 'password', placeholder: 'pat-xxx-xxx...' },
      ],
      slack: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/...' },
        { key: 'channel', label: 'Default Channel', type: 'text', placeholder: '#general' },
      ],
      zapier: [
        { key: 'webhookUrl', label: 'Zap Webhook URL', type: 'url', placeholder: 'https://hooks.zapier.com/...' },
      ],
    };
    return fieldMap[toolId] || [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API Key' }];
  };


  // Widget handler
  const handleCopyWidgetCode = () => {
    let code = '';
    if (embedCodeType === 'Script') {
      code = `<!-- VoiceBridge Widget -->
<script
  src="${window.location.origin}/widget.js"
  data-agent-id="${agent?.id || 'your-agent-id'}"
  data-position="${widgetPosition}"
  data-color="${widgetColor}"
  data-size="${widgetSize}"
></script>`;
    } else if (embedCodeType === 'React') {
      code = `import { VoiceBridgeWidget } from '@voicebridge/react';

<VoiceBridgeWidget
  agentId="${agent?.id || 'your-agent-id'}"
  position="${widgetPosition}"
  color="${widgetColor}"
  size="${widgetSize}"
/>`;
    } else {
      code = `<!-- VoiceBridge Widget iFrame -->
<iframe
  src="${window.location.origin}/widget/${agent?.id || 'your-agent-id'}?position=${widgetPosition}&color=${encodeURIComponent(widgetColor)}&size=${widgetSize}"
  style="position: fixed; ${widgetPosition.includes('bottom') ? 'bottom: 20px' : 'top: 20px'}; ${widgetPosition.includes('right') ? 'right: 20px' : 'left: 20px'}; border: none; width: 400px; height: 600px; z-index: 9999;"
  allow="microphone"
></iframe>`;
    }
    navigator.clipboard.writeText(code);
    toast.success('Embed code copied to clipboard');
  };

  // Advanced handler
  const handleCopyAgentId = () => {
    if (agent?.id) {
      navigator.clipboard.writeText(agent.id);
      toast.success('Agent ID copied to clipboard');
    }
  };

  // Security handlers
  const handleToggleAuth = () => {
    const newValue = !authRequired;
    setAuthRequired(newValue);
    saveAgentConfig({ authenticationRequired: newValue });
  };

  const handleToggleRateLimiting = () => {
    const newValue = !rateLimiting;
    setRateLimiting(newValue);
    saveAgentConfig({ rateLimitingEnabled: newValue });
  };

  const handleToggleContentFiltering = () => {
    const newValue = !contentFiltering;
    setContentFiltering(newValue);
    saveAgentConfig({ contentFilteringEnabled: newValue });
  };

  // Save system prompt with debounce
  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    saveWithDebounce({ systemPrompt: value });
  };

  // Save greeting with debounce
  const handleGreetingChange = (value: string) => {
    setGreeting(value);
    saveWithDebounce({ greeting: value });
  };

  // Save temperature
  const handleTemperatureChange = (value: number) => {
    setTemperature(value);
    saveWithDebounce({ temperature: value / 100 });
  };

  // Save max response length
  const handleMaxResponseChange = (value: number) => {
    setMaxResponseLength(value);
    saveWithDebounce({ maxResponseTokens: value });
  };

  // Save timeout
  const handleTimeoutChange = (value: number) => {
    setTimeoutValue(value);
    saveWithDebounce({ silenceTimeout: value });
  };

  // Save top P
  const handleTopPChange = (value: number) => {
    setTopP(value);
    saveWithDebounce({ topP: value / 100 });
  };

  // Save frequency penalty
  const handleFrequencyPenaltyChange = (value: number) => {
    setFrequencyPenalty(value);
    saveWithDebounce({ frequencyPenalty: value / 100 });
  };

  // Save speech rate
  const handleSpeechRateChange = (value: number) => {
    setSpeechRate(value);
    saveWithDebounce({ speechRate: value / 100 });
  };

  // Save voice pitch
  const handleVoicePitchChange = (value: number) => {
    setVoicePitch(value);
    saveWithDebounce({ voicePitch: value / 100 });
  };

  // Toggle silence detection
  const handleToggleSilenceDetection = () => {
    const newValue = !silenceDetection;
    setSilenceDetection(newValue);
    saveAgentConfig({ silenceDetection: newValue });
  };

  // Toggle debug mode
  const handleToggleDebugMode = () => {
    const newValue = !debugMode;
    setDebugMode(newValue);
    saveAgentConfig({ debugMode: newValue });
  };

  // Save log level
  const handleLogLevelChange = (value: string) => {
    setLogLevel(value);
    saveAgentConfig({ logLevel: value });
  };

  // Toggle log conversations
  const handleToggleLogConversations = () => {
    const newValue = !logConversations;
    setLogConversations(newValue);
    saveAgentConfig({ logConversations: newValue });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Agent not found</h2>
          <button
            onClick={() => navigate('/voice-ai')}
            className="text-xs text-gray-600 hover:text-gray-900"
          >
            Back to Agents
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-white overflow-y-auto scrollbar-hide">
      {/* Header with Agent Name and Real-Time Status */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-900">{agent.name}</h1>
          {/* Call Direction Badge */}
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            agent.callDirection === 'INBOUND' ? 'bg-green-100 text-green-700' :
            agent.callDirection === 'OUTBOUND' ? 'bg-blue-100 text-blue-700' :
            'bg-purple-100 text-purple-700'
          }`}>
            {agent.callDirection || 'HYBRID'}
          </span>
          {/* Publish Status Badge */}
          <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
            publishStatus === 'PUBLISHED'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {publishStatus === 'PUBLISHED' ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Published v{versionNumber}</span>
              </>
            ) : (
              <>
                <FileEdit className="w-3 h-3" />
                <span>Draft</span>
              </>
            )}
          </span>
        </div>

        {/* Real-Time Sync Status & Publish Button */}
        <div className="flex items-center gap-3">
          {viewerCount > 1 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
              <Users className="w-3 h-3" />
              <span>{viewerCount} viewing</span>
            </div>
          )}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
              isRealtimeConnected
                ? 'bg-green-50 text-green-600'
                : 'bg-gray-100 text-gray-500'
            }`}
            title={isRealtimeConnected ? 'Real-time sync active' : 'Connecting...'}
          >
            {isRealtimeConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Publish/Unpublish Button */}
          {publishStatus === 'PUBLISHED' ? (
            <button
              onClick={handleUnpublish}
              disabled={isPublishing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isPublishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileEdit className="w-3.5 h-3.5" />
              )}
              <span>Unpublish</span>
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isPublishing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Publish</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center gap-5 px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-5">
        <div className={`grid grid-cols-1 ${activeTab === 'agent' ? 'lg:grid-cols-3' : ''} gap-8`}>
          {/* Main Content - Left Side */}
          <div className={`${activeTab === 'agent' ? 'lg:col-span-2' : ''}`}>
            {activeTab === 'agent' && (
              <>
                {/* Agent Header */}
                <div className="mb-5">
                  <h1 className="text-sm font-semibold text-gray-900">Agent</h1>
                </div>

                {/* System Prompt Section */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs font-medium text-gray-900 underline underline-offset-2 decoration-gray-300">
                        System prompt
                      </h2>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <Wand2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>

                  <div className="relative border border-gray-200 rounded-lg">
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button className="p-0.5 hover:bg-gray-100 rounded">
                        <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => handleSystemPromptChange(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2.5 pr-8 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-sm text-gray-900"
                      placeholder="### Personality&#10;You are..."
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50">
                      <span className="text-sm text-gray-500">
                        Type <code className="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">{'{{'}</code> to add variables
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <button
                            onClick={() => setDefaultPersonality(!defaultPersonality)}
                            className={`relative w-8 h-4 rounded-full transition-colors ${
                              defaultPersonality ? 'bg-cyan-500' : 'bg-gray-300'
                            }`}
                          >
                            <div
                              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                                defaultPersonality ? 'right-0.5' : 'left-0.5'
                              }`}
                            />
                          </button>
                          <span className="text-sm text-gray-600">Default personality</span>
                        </label>
                        <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                          <Globe className="w-3.5 h-3.5" />
                          <span>Set timezone</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* First Message Section */}
                <div className="mb-5">
                  <h2 className="text-xs font-medium text-gray-900 mb-1">First message</h2>
                  <p className="text-sm text-gray-500 mb-2">
                    The first message the agent will say. If empty, the agent will wait for the user to start the conversation.{' '}
                    <a href="#" className="text-gray-900 underline underline-offset-2 inline-flex items-center gap-0.5">
                      Disclosure Requirements
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>

                  <div className="relative border border-gray-200 rounded-lg">
                    <div className="absolute top-2 right-2">
                      <button className="p-0.5 hover:bg-gray-100 rounded">
                        <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                    <textarea
                      value={greeting}
                      onChange={(e) => handleGreetingChange(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2.5 pr-8 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-sm text-gray-900"
                      placeholder="[warmly] Hello! I'm your assistant. How can I help you today?"
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50">
                      <span className="text-sm text-gray-500">
                        Type <code className="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">{'{{'}</code> to add variables
                      </span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <button
                          onClick={() => setInterruptible(!interruptible)}
                          className={`relative w-8 h-4 rounded-full transition-colors ${
                            interruptible ? 'bg-gray-900' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                              interruptible ? 'right-0.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                        <span className="text-sm text-gray-600">Interruptible</span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'knowledge-base' && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Agent Knowledge Base</h2>
                    <p className="text-sm text-gray-500 mt-1">Add documents and URLs to enhance your agent's knowledge.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsRagPanelOpen(true)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Configure RAG
                    </button>
                    <label className="px-4 py-2 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer">
                      Add document
                      <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>

                {/* Add URL */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-900 mb-2 block">Add URL</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={knowledgeUrl}
                        onChange={(e) => setKnowledgeUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                        placeholder="https://example.com/docs"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                      />
                    </div>
                    <button
                      onClick={handleAddUrl}
                      disabled={!knowledgeUrl.trim()}
                      className="px-4 py-2.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add URL
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Add website URLs to scrape and include in the knowledge base.</p>
                </div>

                {/* RAG Settings Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">RAG Configuration</h3>
                    <button
                      onClick={() => setIsRagPanelOpen(true)}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Chunk Size</span>
                      <p className="font-medium text-gray-900">{ragSettings.chunkSize} tokens</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Top K Results</span>
                      <p className="font-medium text-gray-900">{ragSettings.topK}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Search Type</span>
                      <p className="font-medium text-gray-900 capitalize">{ragSettings.searchType}</p>
                    </div>
                  </div>
                </div>

                {/* Filter Tags */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">Filter:</span>
                  <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                    All
                  </button>
                  <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                    Documents
                  </button>
                  <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                    URLs
                  </button>
                </div>

                {/* Documents List or Empty State */}
                {knowledgeSources.length === 0 ? (
                  <div className="border border-gray-200 rounded-xl p-12 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No documents found</h3>
                    <p className="text-sm text-gray-500 mb-4">This agent has no attached documents yet.</p>
                    <label className="inline-block px-5 py-2.5 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer">
                      Add document
                      <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {knowledgeSources.map((source) => (
                      <div key={source.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          {source.type === 'url' ? (
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{source.name}</div>
                          <div className="text-xs text-gray-500">{source.type === 'url' ? 'URL' : 'Document'}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveSource(source.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'workflow' && (
              <div>
                {/* Workflow Builder */}
                <WorkflowBuilder
                  initialNodes={workflowNodes}
                  initialEdges={workflowEdges}
                  agentId={agentId}
                  isSaving={isSavingWorkflow}
                  onChange={handleWorkflowChange}
                />
              </div>
            )}

            {activeTab === 'branches' && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Version Control</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage different versions and branches of your agent configuration.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                      Compare
                    </button>
                    <button
                      onClick={handleCreateBranch}
                      className="px-4 py-2 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                    >
                      New Branch
                    </button>
                  </div>
                </div>

                {/* Current Branch Info */}
                <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{activeBranch}</h3>
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">Active</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {branches.find(b => b.name === activeBranch)?.description || 'Current production version'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Last updated</div>
                      <div className="text-sm font-medium text-gray-700">2 hours ago</div>
                    </div>
                  </div>
                </div>

                {/* Branch List */}
                {branches.length === 0 ? (
                  <div className="border border-gray-200 rounded-xl p-12 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No branches yet</h3>
                    <p className="text-sm text-gray-500 mb-4">Create your first branch to start versioning your agent.</p>
                    <button
                      onClick={handleCreateBranch}
                      className="inline-block px-5 py-2.5 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                    >
                      Create first branch
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">All Branches ({branches.length})</h4>
                      <div className="flex items-center gap-2">
                        <button className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                          Sort by date
                        </button>
                      </div>
                    </div>

                    {branches.map((branch, index) => (
                      <div
                        key={branch.id}
                        className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                          branch.active
                            ? 'border-green-300 bg-green-50/50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSwitchBranch(branch.name)}
                      >
                        {/* Branch Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          branch.active ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <svg className={`w-5 h-5 ${branch.active ? 'text-green-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>

                        {/* Branch Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm font-semibold ${branch.active ? 'text-green-700' : 'text-gray-900'}`}>
                              {branch.name}
                            </span>
                            {branch.name === 'main' && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                                default
                              </span>
                            )}
                            {branch.active && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded font-medium">
                                current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{branch.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">
                              Updated {index === 0 ? '2 hours ago' : index === 1 ? 'yesterday' : '3 days ago'}
                            </span>
                            <span className="text-xs text-gray-300">|</span>
                            <span className="text-xs text-gray-400">
                              {index === 0 ? '12' : index === 1 ? '8' : '5'} commits
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!branch.active && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSwitchBranch(branch.name);
                                }}
                                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Switch
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.success(`Merging ${branch.name} into ${activeBranch}`);
                                }}
                                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Merge
                              </button>
                            </>
                          )}
                          {branch.name !== 'main' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBranches(branches.filter(b => b.id !== branch.id));
                                toast.success(`Branch "${branch.name}" deleted`);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Active indicator */}
                        {branch.active && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Branch Button */}
                    <button
                      onClick={handleCreateBranch}
                      className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create new branch
                    </button>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="mt-8">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h4>
                  <div className="space-y-3">
                    {[
                      { action: 'Branch created', branch: 'development', time: 'yesterday', user: 'You' },
                      { action: 'Merged into', branch: 'main', time: '2 days ago', user: 'You' },
                      { action: 'Configuration updated', branch: 'main', time: '3 days ago', user: 'You' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">{activity.user}</span>{' '}
                            {activity.action}{' '}
                            <span className="font-medium text-blue-600">{activity.branch}</span>
                          </div>
                          <div className="text-xs text-gray-500">{activity.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <AnalysisTab
                analytics={analytics}
                analyticsLoading={analyticsLoading}
                conversations={conversations}
                conversationsLoading={conversationsLoading}
                totalConversations={totalConversations}
                currentPage={currentPage}
                totalPages={totalPages}
                selectedConversation={selectedConversation}
                exportLoading={exportLoading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                fetchConversations={fetchConversations}
                selectConversation={selectConversation}
                exportToCSV={exportToCSV}
                refreshAnalytics={refreshAnalytics}
              />
            )}

            {activeTab === 'tools' && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Agent Tools</h2>
                    <p className="text-sm text-gray-500 mt-1">Connect external tools and APIs to extend your agent's capabilities.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                      Browse Marketplace
                    </button>
                    <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors">
                      Add Custom Tool
                    </button>
                  </div>
                </div>

                {/* Connected Tools Section */}
                {connectedTools.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Connected Tools ({connectedTools.length})</h3>
                      <span className="text-xs text-green-600 font-medium">All active</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { id: 'calendar', icon: '📅', name: 'Google Calendar', description: 'Book and manage appointments', category: 'Scheduling', color: 'blue' },
                        { id: 'payment', icon: '💳', name: 'Stripe', description: 'Process payments and transactions', category: 'Payments', color: 'purple' },
                        { id: 'email', icon: '📧', name: 'SendGrid', description: 'Send email notifications', category: 'Communication', color: 'green' },
                        { id: 'crm', icon: '👥', name: 'Salesforce', description: 'Sync customer data', category: 'CRM', color: 'blue' },
                        { id: 'sms', icon: '💬', name: 'Twilio', description: 'Send SMS messages', category: 'Communication', color: 'red' },
                        { id: 'sheets', icon: '📊', name: 'Google Sheets', description: 'Read and write spreadsheet data', category: 'Data', color: 'green' },
                      ].filter(tool => connectedTools.includes(tool.id)).map((tool) => (
                        <div key={tool.id} className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl group">
                          <div className={`w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm`}>
                            <span className="text-lg">{tool.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-gray-900">{tool.name}</span>
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{tool.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs bg-white text-gray-600 rounded-full">{tool.category}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleConnectTool({ id: tool.id, name: tool.name, icon: tool.icon })}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Integrations */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Available Integrations</h3>
                    <div className="flex items-center gap-2">
                      <button className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                        All
                      </button>
                      <button className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                        Scheduling
                      </button>
                      <button className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                        Payments
                      </button>
                      <button className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                        CRM
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { id: 'calendar', icon: '📅', name: 'Google Calendar', description: 'Book and manage appointments automatically', category: 'Scheduling', popular: true },
                      { id: 'payment', icon: '💳', name: 'Stripe', description: 'Process payments securely during calls', category: 'Payments', popular: true },
                      { id: 'email', icon: '📧', name: 'SendGrid', description: 'Send follow-up emails and confirmations', category: 'Communication', popular: false },
                      { id: 'crm', icon: '👥', name: 'Salesforce', description: 'Sync leads and customer data', category: 'CRM', popular: true },
                      { id: 'sms', icon: '💬', name: 'Twilio', description: 'Send SMS confirmations and reminders', category: 'Communication', popular: false },
                      { id: 'sheets', icon: '📊', name: 'Google Sheets', description: 'Log data to spreadsheets', category: 'Data', popular: false },
                      { id: 'hubspot', icon: '🔶', name: 'HubSpot', description: 'Marketing and sales automation', category: 'CRM', popular: true },
                      { id: 'slack', icon: '💼', name: 'Slack', description: 'Send notifications to channels', category: 'Communication', popular: false },
                      { id: 'zapier', icon: '⚡', name: 'Zapier', description: 'Connect to 5000+ apps', category: 'Automation', popular: true },
                    ].map((tool) => {
                      const isConnected = connectedTools.includes(tool.id);
                      return (
                        <div
                          key={tool.id}
                          className={`relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer group ${
                            isConnected
                              ? 'border-green-300 bg-green-50/50'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                          onClick={() => handleConnectTool({ id: tool.id, name: tool.name, icon: tool.icon })}
                        >
                          {tool.popular && !isConnected && (
                            <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-medium">
                              Popular
                            </span>
                          )}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-lg">{tool.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">{tool.name}</span>
                                {isConnected && (
                                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{tool.category}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-3 flex-1">{tool.description}</p>
                          <button
                            className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${
                              isConnected
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 group-hover:bg-gray-900 group-hover:text-white'
                            }`}
                          >
                            {isConnected ? 'Connected' : 'Connect'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Tools Section */}
                <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Build Custom Tools</h4>
                      <p className="text-xs text-gray-600">Create custom API integrations using webhooks or our SDK to connect any service.</p>
                    </div>
                    <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                      Create Tool
                    </button>
                  </div>
                </div>

                {/* API Documentation Link */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Need help? Check out the</span>
                  <a href="#" className="text-gray-900 underline underline-offset-2 hover:text-gray-700">Tools API documentation</a>
                </div>
              </div>
            )}

            {activeTab === 'tests' && (
              <TestsTab
                testCases={testCases}
                setTestCases={setTestCases}
                agentName={agent?.name}
                agentId={agentId}
                greeting={greeting}
                systemPrompt={systemPrompt}
                voiceId={selectedVoice?.id || 'alloy'}
                language={primaryLanguage}
              />
            )}

            {activeTab === 'widget' && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Widget Embed</h2>
                    <p className="text-sm text-gray-500 mt-1">Customize and embed your voice agent widget on any website.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsWidgetPreviewOpen(true)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      Preview Live
                    </button>
                    <button
                      onClick={handleCopyWidgetCode}
                      className="px-4 py-2 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                    >
                      Copy Embed Code
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Side - Preview */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Live Preview</h3>
                    <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 min-h-[400px]">
                      {/* Browser Mockup */}
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {/* Browser Header */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          </div>
                          <div className="flex-1 mx-4">
                            <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-500 border border-gray-200">
                              https://yourwebsite.com
                            </div>
                          </div>
                        </div>
                        {/* Browser Content */}
                        <div className="relative h-64 bg-gray-50 p-4">
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            <div className="h-20 bg-gray-200 rounded w-full mt-4"></div>
                          </div>
                          {/* Widget Button - Position based on selection */}
                          <div className={`absolute ${
                            widgetPosition.includes('bottom') ? 'bottom-4' : 'top-4'
                          } ${
                            widgetPosition.includes('right') ? 'right-4' : 'left-4'
                          }`}>
                            <div
                              className={`rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform ${
                                widgetSize === 'small' ? 'w-10 h-10' : widgetSize === 'large' ? 'w-16 h-16' : 'w-14 h-14'
                              }`}
                              style={{ backgroundColor: widgetColor }}
                            >
                              <Volume2 className={`text-white ${
                                widgetSize === 'small' ? 'w-4 h-4' : widgetSize === 'large' ? 'w-7 h-7' : 'w-6 h-6'
                              }`} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Widget Expanded Preview */}
                      <div className={`absolute w-72 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 ${
                        widgetPosition.includes('bottom') ? 'bottom-8' : 'top-8'
                      } ${
                        widgetPosition.includes('right') ? 'right-8' : 'left-8'
                      }`}>
                        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: widgetColor }}>
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <Volume2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{agent?.name || 'Voice Agent'}</div>
                            <div className="text-xs text-white/60">Online</div>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: widgetColor }}></div>
                            <div className="bg-gray-100 rounded-lg rounded-tl-none px-3 py-2 text-xs text-gray-700">
                              {greeting || 'Hello! How can I help you today?'}
                            </div>
                          </div>
                        </div>
                        <div className="px-4 pb-4">
                          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-full">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: widgetColor }}>
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                              </svg>
                            </div>
                            <span className="flex-1 text-xs text-gray-400">Press to speak...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Configuration */}
                  <div className="space-y-6">
                    {/* Appearance */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Appearance</h3>
                      <div className="space-y-4">
                        {/* Primary Color */}
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-2 block">Primary Color</label>
                          <div className="flex items-center gap-2">
                            {['#111827', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B'].map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  setWidgetColor(color);
                                  saveAgentConfig({ widgetColor: color });
                                }}
                                className={`w-8 h-8 rounded-full border-2 shadow-sm hover:scale-110 transition-transform ${
                                  widgetColor === color ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400' : 'border-white'
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            <input
                              type="color"
                              value={widgetColor}
                              onChange={(e) => {
                                setWidgetColor(e.target.value);
                                saveAgentConfig({ widgetColor: e.target.value });
                              }}
                              className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 cursor-pointer"
                              title="Custom color"
                            />
                          </div>
                        </div>

                        {/* Position */}
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-2 block">Widget Position</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Bottom Right', value: 'bottom-right' },
                              { label: 'Bottom Left', value: 'bottom-left' },
                              { label: 'Top Right', value: 'top-right' },
                              { label: 'Top Left', value: 'top-left' },
                            ].map((pos) => (
                              <button
                                key={pos.value}
                                onClick={() => {
                                  setWidgetPosition(pos.value);
                                  saveAgentConfig({ widgetPosition: pos.value });
                                }}
                                className={`px-3 py-2 text-xs border rounded-lg transition-colors ${
                                  widgetPosition === pos.value
                                    ? 'border-gray-900 bg-gray-50 text-gray-900'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Size */}
                        <div>
                          <label className="text-xs font-medium text-gray-700 mb-2 block">Button Size</label>
                          <div className="flex items-center gap-2">
                            {['small', 'medium', 'large'].map((size) => (
                              <button
                                key={size}
                                onClick={() => setWidgetSize(size)}
                                className={`flex-1 px-3 py-2 text-xs border rounded-lg transition-colors capitalize ${
                                  widgetSize === size
                                    ? 'border-gray-900 bg-gray-50 text-gray-900'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Embed Code */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Embed Code</h3>
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                          {(['Script', 'React', 'iFrame'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => setEmbedCodeType(type)}
                              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                                embedCodeType === type
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <div className="p-4 bg-gray-900 rounded-xl overflow-x-auto">
                          <pre className="text-xs text-green-400 whitespace-pre-wrap break-all">
{embedCodeType === 'Script' ? `<!-- VoiceBridge Widget -->
<script
  src="${window.location.origin}/widget.js"
  data-agent-id="${agent?.id || 'your-agent-id'}"
  data-position="${widgetPosition}"
  data-color="${widgetColor}"
  data-size="${widgetSize}"
></script>` : embedCodeType === 'React' ? `import { VoiceBridgeWidget } from '@voicebridge/react';

<VoiceBridgeWidget
  agentId="${agent?.id || 'your-agent-id'}"
  position="${widgetPosition}"
  color="${widgetColor}"
  size="${widgetSize}"
/>` : `<!-- VoiceBridge Widget iFrame -->
<iframe
  src="${window.location.origin}/widget/${agent?.id || 'your-agent-id'}?position=${widgetPosition}&color=${encodeURIComponent(widgetColor)}&size=${widgetSize}"
  style="position: fixed; ${widgetPosition.includes('bottom') ? 'bottom: 20px' : 'top: 20px'}; ${widgetPosition.includes('right') ? 'right: 20px' : 'left: 20px'}; border: none; width: 400px; height: 600px; z-index: 9999;"
  allow="microphone"
></iframe>`}
                          </pre>
                        </div>
                        <button
                          onClick={handleCopyWidgetCode}
                          className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Allowed Domains */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Allowed Domains</h3>
                      <p className="text-xs text-gray-500 mb-3">Restrict where your widget can be embedded for security.</p>
                      <div className="space-y-2">
                        {allowedDomains.length === 0 ? (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                            <p className="text-xs text-gray-500">No domain restrictions configured.</p>
                            <p className="text-xs text-gray-400 mt-1">Widget can be embedded on any website.</p>
                          </div>
                        ) : (
                          allowedDomains.map((domain, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="flex-1 text-sm text-gray-700 font-mono">{domain}</span>
                              <button
                                onClick={() => {
                                  const newList = allowedDomains.filter((_, i) => i !== idx);
                                  setAllowedDomains(newList);
                                  saveAgentConfig({ allowedDomains: newList });
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))
                        )}
                        <button
                          onClick={() => {
                            setNewDomainInput('');
                            setIsAddDomainModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 p-2.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add domain
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Installation Guide */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Quick Installation Guide</h4>
                      <p className="text-xs text-gray-600 mb-3">Follow these steps to add the widget to your website:</p>
                      <ol className="space-y-2 text-xs text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                          <span>Copy the embed code above</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                          <span>Paste it before the closing <code className="px-1 py-0.5 bg-blue-100 rounded text-blue-700">&lt;/body&gt;</code> tag</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                          <span>The widget will appear automatically on your page</span>
                        </li>
                      </ol>
                    </div>
                    <button
                      onClick={() => setIsWidgetDocsModalOpen(true)}
                      className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Full Docs
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Configure security, access control, and privacy settings for your agent.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                      View Audit Log
                    </button>
                    <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Security Score Card */}
                {(() => {
                  // Calculate security score dynamically
                  let score = 0;
                  if (authRequired) score += 20;
                  if (rateLimiting) score += 20;
                  if (contentFiltering) score += 20;
                  if (gdprComplianceEnabled) score += 15;
                  if (anonymizeUserData) score += 10;
                  if (ipWhitelist.length > 0 || allowedDomains.length > 0) score += 10;
                  if (dataRetentionDays <= 90) score += 5;

                  const scoreLabel = score >= 70 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Improvement';
                  const scoreColor = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
                  const scoreMessage = score >= 70
                    ? 'Your agent has strong security settings enabled.'
                    : score >= 40
                    ? 'Consider enabling more security features for better protection.'
                    : 'Enable security features to protect your agent and users.';

                  return (
                    <div className={`mb-6 p-5 bg-gradient-to-r ${scoreColor === 'green' ? 'from-green-50 to-emerald-50 border-green-200' : scoreColor === 'yellow' ? 'from-yellow-50 to-amber-50 border-yellow-200' : 'from-red-50 to-rose-50 border-red-200'} border rounded-xl`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 ${scoreColor === 'green' ? 'bg-green-100' : scoreColor === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                          <svg className={`w-7 h-7 ${scoreColor === 'green' ? 'text-green-600' : scoreColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">Security Score</h3>
                            <span className={`px-2 py-0.5 text-xs ${scoreColor === 'green' ? 'bg-green-100 text-green-700' : scoreColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} rounded-full font-medium`}>{scoreLabel}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{scoreMessage}</p>
                          <div className="flex items-center gap-3">
                            <div className={`flex-1 h-2 ${scoreColor === 'green' ? 'bg-green-200' : scoreColor === 'yellow' ? 'bg-yellow-200' : 'bg-red-200'} rounded-full overflow-hidden`}>
                              <div className={`h-full ${scoreColor === 'green' ? 'bg-green-500' : scoreColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'} rounded-full transition-all`} style={{ width: `${score}%` }}></div>
                            </div>
                            <span className={`text-sm font-semibold ${scoreColor === 'green' ? 'text-green-600' : scoreColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{score}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Access Control */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Access Control</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Authentication Required */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-gray-900">Authentication Required</span>
                              {authRequired && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                            </div>
                            <p className="text-xs text-gray-500">Users must authenticate before interacting with the agent.</p>
                          </div>
                          <button
                            onClick={handleToggleAuth}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${authRequired ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${authRequired ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {/* Pre-chat Form Settings */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-medium text-gray-900">Pre-chat Form</span>
                                {preChatFormEnabled && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                              </div>
                              <p className="text-xs text-gray-500">Collect user details before starting conversation (lead capture).</p>
                            </div>
                            <button
                              onClick={() => {
                                const newValue = !preChatFormEnabled;
                                setPreChatFormEnabled(newValue);
                                saveAgentConfig({ preChatFormEnabled: newValue });
                              }}
                              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${preChatFormEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${preChatFormEnabled ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                          </div>

                          {/* Pre-chat Form Configuration (shown when enabled) */}
                          {preChatFormEnabled && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                              {/* Form Title */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Form Title</label>
                                <input
                                  type="text"
                                  value={preChatFormTitle}
                                  onChange={(e) => {
                                    setPreChatFormTitle(e.target.value);
                                    saveAgentConfig({ preChatFormTitle: e.target.value });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Before we start"
                                />
                              </div>

                              {/* Form Subtitle */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Form Subtitle</label>
                                <input
                                  type="text"
                                  value={preChatFormSubtitle}
                                  onChange={(e) => {
                                    setPreChatFormSubtitle(e.target.value);
                                    saveAgentConfig({ preChatFormSubtitle: e.target.value });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Please provide your details"
                                />
                              </div>

                              {/* Form Fields */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-xs font-medium text-gray-700">Form Fields</label>
                                  <button
                                    onClick={() => {
                                      const fieldName = prompt('Enter field name (e.g., company, message):');
                                      if (fieldName && fieldName.trim()) {
                                        const newField = {
                                          name: fieldName.trim().toLowerCase().replace(/\s+/g, '_'),
                                          label: fieldName.trim().charAt(0).toUpperCase() + fieldName.trim().slice(1),
                                          type: 'text',
                                          required: false,
                                        };
                                        const newFields = [...preChatFormFields, newField];
                                        setPreChatFormFields(newFields);
                                        saveAgentConfig({ preChatFormFields: newFields });
                                      }
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    + Add Field
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {preChatFormFields.map((field, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white rounded-md px-2 py-1.5 border border-gray-200">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-gray-800">{field.label}</span>
                                        <span className="text-xs text-gray-400">({field.type})</span>
                                        {field.required && (
                                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Required</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            const newFields = preChatFormFields.map((f, i) =>
                                              i === idx ? { ...f, required: !f.required } : f
                                            );
                                            setPreChatFormFields(newFields);
                                            saveAgentConfig({ preChatFormFields: newFields });
                                          }}
                                          className="text-xs text-gray-500 hover:text-gray-700"
                                        >
                                          {field.required ? 'Optional' : 'Required'}
                                        </button>
                                        {!['name', 'email', 'phone'].includes(field.name) && (
                                          <button
                                            onClick={() => {
                                              const newFields = preChatFormFields.filter((_, i) => i !== idx);
                                              setPreChatFormFields(newFields);
                                              saveAgentConfig({ preChatFormFields: newFields });
                                            }}
                                            className="text-xs text-red-500 hover:text-red-700"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                          )}
                        </div>

                        {/* WhatsApp Follow-up Settings */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-medium text-gray-900">WhatsApp Follow-up</span>
                                {whatsappFollowupEnabled && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                              </div>
                              <p className="text-xs text-gray-500">Send a WhatsApp message to the lead after the call ends.</p>
                            </div>
                            <button
                              onClick={() => {
                                const newValue = !whatsappFollowupEnabled;
                                setWhatsappFollowupEnabled(newValue);
                                saveAgentConfig({ whatsappFollowupEnabled: newValue });
                              }}
                              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${whatsappFollowupEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${whatsappFollowupEnabled ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                          </div>

                          {/* WhatsApp Follow-up Configuration (shown when enabled) */}
                          {whatsappFollowupEnabled && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                              {/* Message Template */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Message Template</label>
                                <textarea
                                  value={whatsappFollowupMessage}
                                  onChange={(e) => {
                                    setWhatsappFollowupMessage(e.target.value);
                                    saveWithDebounce({ whatsappFollowupMessage: e.target.value });
                                  }}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[80px] resize-y"
                                  placeholder="Enter your follow-up message..."
                                />
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  <span className="text-xs text-gray-400">Available placeholders:</span>
                                  <code className="text-xs bg-gray-200 px-1 rounded">{'{{name}}'}</code>
                                  <code className="text-xs bg-gray-200 px-1 rounded">{'{{summary}}'}</code>
                                  <code className="text-xs bg-gray-200 px-1 rounded">{'{{duration}}'}</code>
                                </div>
                              </div>

                              {/* Send Delay */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-medium text-gray-700">Send Delay</label>
                                  <span className="text-xs text-gray-500">{whatsappFollowupDelay === 0 ? 'Immediate' : `${whatsappFollowupDelay} seconds`}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="300"
                                  step="30"
                                  value={whatsappFollowupDelay}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setWhatsappFollowupDelay(val);
                                    saveAgentConfig({ whatsappFollowupDelay: val });
                                  }}
                                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                  <span>Immediate</span>
                                  <span>5 min</span>
                                </div>
                              </div>

                              {/* Info Note */}
                              <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-md">
                                <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-xs text-blue-700">
                                  Make sure WhatsApp is configured in <a href="/settings/whatsapp" className="underline hover:text-blue-800">Settings → WhatsApp</a> for this to work.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Session Timeout */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">Session Timeout</span>
                            <span className="text-xs text-gray-500">{sessionTimeout} minutes</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="120"
                            value={sessionTimeout}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setSessionTimeout(val);
                              saveAgentConfig({ sessionTimeoutMinutes: val });
                            }}
                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>5 min</span>
                            <span>120 min</span>
                          </div>
                        </div>

                        {/* IP Whitelist */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">IP Whitelist</span>
                            <button
                              onClick={() => {
                                const ip = prompt('Enter IP address (e.g., 192.168.1.1 or 192.168.1.0/24)');
                                if (ip && ip.trim()) {
                                  const newList = [...ipWhitelist, ip.trim()];
                                  setIpWhitelist(newList);
                                  saveAgentConfig({ ipWhitelist: newList });
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              + Add IP
                            </button>
                          </div>
                          {ipWhitelist.length === 0 ? (
                            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                              No IP restrictions configured (all IPs allowed)
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {ipWhitelist.map((ip, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                                  <span className="text-xs font-mono text-gray-700">{ip}</span>
                                  <button
                                    onClick={() => {
                                      const newList = ipWhitelist.filter((_, i) => i !== idx);
                                      setIpWhitelist(newList);
                                      saveAgentConfig({ ipWhitelist: newList });
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Allowed Domains */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">Allowed Domains</span>
                            <button
                              onClick={() => {
                                const domain = prompt('Enter domain (e.g., example.com or *.example.com)');
                                if (domain && domain.trim()) {
                                  const newList = [...allowedDomains, domain.trim()];
                                  setAllowedDomains(newList);
                                  saveAgentConfig({ allowedDomains: newList });
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              + Add Domain
                            </button>
                          </div>
                          {allowedDomains.length === 0 ? (
                            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                              No domain restrictions (widget can be embedded anywhere)
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {allowedDomains.map((domain, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                                  <span className="text-xs font-mono text-gray-700">{domain}</span>
                                  <button
                                    onClick={() => {
                                      const newList = allowedDomains.filter((_, i) => i !== idx);
                                      setAllowedDomains(newList);
                                      saveAgentConfig({ allowedDomains: newList });
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rate Limiting */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Rate Limiting</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Enable Rate Limiting */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-gray-900">Enable Rate Limiting</span>
                              {rateLimiting && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                            </div>
                            <p className="text-xs text-gray-500">Limit the number of requests per user to prevent abuse.</p>
                          </div>
                          <button
                            onClick={handleToggleRateLimiting}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${rateLimiting ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rateLimiting ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {rateLimiting && (
                          <>
                            {/* Requests per minute */}
                            <div className="pt-3 border-t border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">Requests per Minute</span>
                                <input
                                  type="number"
                                  value={rateLimitRequests}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 60;
                                    setRateLimitRequests(val);
                                    saveAgentConfig({ rateLimitRequests: val });
                                  }}
                                  className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg text-right"
                                />
                              </div>
                            </div>

                            {/* Burst limit */}
                            <div className="pt-3 border-t border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">Burst Limit</span>
                                <input
                                  type="number"
                                  value={rateLimitBurst}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 10;
                                    setRateLimitBurst(val);
                                    saveAgentConfig({ rateLimitBurst: val });
                                  }}
                                  className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg text-right"
                                />
                              </div>
                              <p className="text-xs text-gray-500">Maximum requests allowed in a short burst.</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Content Moderation */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Content Moderation</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Content Filtering */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-gray-900">Content Filtering</span>
                              {contentFiltering && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                            </div>
                            <p className="text-xs text-gray-500">Filter harmful, inappropriate, or offensive content.</p>
                          </div>
                          <button
                            onClick={handleToggleContentFiltering}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${contentFiltering ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${contentFiltering ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {/* Filter Categories */}
                        {contentFiltering && (
                          <div className="pt-3 border-t border-gray-100">
                            <span className="text-sm font-medium text-gray-900 mb-2 block">Filter Categories</span>
                            <div className="space-y-2">
                              {[
                                { key: 'profanity', name: 'Profanity' },
                                { key: 'violence', name: 'Violence' },
                                { key: 'adult', name: 'Adult Content' },
                                { key: 'hate_speech', name: 'Hate Speech' },
                                { key: 'personal_info', name: 'Personal Information' },
                              ].map((category) => {
                                const isEnabled = contentFilterCategories.includes(category.key);
                                return (
                                  <div
                                    key={category.key}
                                    onClick={() => {
                                      const newCategories = isEnabled
                                        ? contentFilterCategories.filter(c => c !== category.key)
                                        : [...contentFilterCategories, category.key];
                                      setContentFilterCategories(newCategories);
                                      saveAgentConfig({ contentFilterCategories: newCategories });
                                    }}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                                  >
                                    <span className="text-xs text-gray-700">{category.name}</span>
                                    <div className={`w-4 h-4 rounded flex items-center justify-center ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                                      {isEnabled && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Data Privacy */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Data Privacy</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Data Retention */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">Data Retention</span>
                          </div>
                          <select
                            value={dataRetentionDays}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setDataRetentionDays(val);
                              saveAgentConfig({ dataRetentionDays: val });
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                          >
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={90}>90 days</option>
                            <option value={365}>1 year</option>
                            <option value={-1}>Forever</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">How long to keep conversation logs.</p>
                        </div>

                        {/* Anonymize Data */}
                        <div className="pt-3 border-t border-gray-100 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900 block mb-0.5">Anonymize User Data</span>
                            <p className="text-xs text-gray-500">Remove personally identifiable information from logs.</p>
                          </div>
                          <button
                            onClick={() => {
                              const newValue = !anonymizeUserData;
                              setAnonymizeUserData(newValue);
                              saveAgentConfig({ anonymizeUserData: newValue });
                            }}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${anonymizeUserData ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${anonymizeUserData ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {/* GDPR Compliance */}
                        <div className="pt-3 border-t border-gray-100 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900 block mb-0.5">GDPR Compliance Mode</span>
                            <p className="text-xs text-gray-500">Enable features required for GDPR compliance.</p>
                          </div>
                          <button
                            onClick={() => {
                              const newValue = !gdprComplianceEnabled;
                              setGdprComplianceEnabled(newValue);
                              saveAgentConfig({ gdprComplianceEnabled: newValue });
                            }}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${gdprComplianceEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${gdprComplianceEnabled ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* API Security */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            <h3 className="text-sm font-semibold text-gray-900">API Security</h3>
                          </div>
                          <button className="text-xs text-gray-500 hover:text-gray-700">Regenerate Key</button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-900 block mb-1">API Key</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-xs font-mono text-gray-600 truncate">
                              sk-••••••••••••••••••••••••••••••••
                            </div>
                            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Last rotated 14 days ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Recommendations */}
                <div className="mt-8">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Security Recommendations</h4>
                  <div className="space-y-2">
                    {[
                      { status: 'good', title: 'Content filtering enabled', description: 'Harmful content is being filtered' },
                      { status: 'good', title: 'Rate limiting active', description: 'API abuse prevention is enabled' },
                      { status: 'warning', title: 'Enable IP whitelisting', description: 'Restrict access to known IP addresses' },
                      { status: 'good', title: 'GDPR compliance enabled', description: 'Data handling follows GDPR requirements' },
                    ].map((item, index) => (
                      <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                        item.status === 'good' ? 'bg-green-50' : 'bg-yellow-50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.status === 'good' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {item.status === 'good' ? (
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500">{item.description}</div>
                        </div>
                        {item.status === 'warning' && (
                          <button className="px-3 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors">
                            Enable
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Advanced Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Fine-tune your agent's behavior with advanced configuration options.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
                      Reset to Defaults
                    </button>
                    <button className="px-4 py-2 text-sm bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Call Direction Setting */}
                <div className="mb-6 p-4 border border-gray-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Agent Direction</h3>
                  <p className="text-sm text-gray-500 mb-4">Configure whether this agent handles inbound calls, outbound calls, or both.</p>
                  <div className="flex gap-3">
                    {(['INBOUND', 'OUTBOUND', 'HYBRID'] as const).map((direction) => (
                      <button
                        key={direction}
                        onClick={() => {
                          setAgent({ ...agent, callDirection: direction });
                          saveAgentConfig({ callDirection: direction });
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                          agent.callDirection === direction
                            ? direction === 'INBOUND'
                              ? 'border-green-500 bg-green-50'
                              : direction === 'OUTBOUND'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`text-sm font-semibold ${
                            agent.callDirection === direction
                              ? direction === 'INBOUND'
                                ? 'text-green-700'
                                : direction === 'OUTBOUND'
                                ? 'text-blue-700'
                                : 'text-purple-700'
                              : 'text-gray-700'
                          }`}>
                            {direction}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {direction === 'INBOUND' && 'Receives calls via widget'}
                            {direction === 'OUTBOUND' && 'Makes calls via campaigns'}
                            {direction === 'HYBRID' && 'Both inbound & outbound'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Model Configuration */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Model Configuration</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-5">
                        {/* LLM Provider */}
                        <div>
                          <label className="text-sm font-medium text-gray-900 mb-2 block">AI Provider</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: 'openai', name: 'OpenAI', icon: '🤖' },
                              { id: 'anthropic', name: 'Anthropic', icon: '🧠' },
                              { id: 'google', name: 'Google', icon: '🔮' },
                              { id: 'groq', name: 'Groq', icon: '⚡' },
                            ].map((provider) => (
                              <button
                                key={provider.id}
                                onClick={() => {
                                  setLlmProvider(provider.id);
                                  // Set default model for provider
                                  const defaultModels: Record<string, string> = {
                                    openai: 'gpt-4o-mini',
                                    anthropic: 'claude-3-sonnet-20240229',
                                    google: 'gemini-pro',
                                    groq: 'llama-3.1-70b-versatile',
                                  };
                                  setLlmModel(defaultModels[provider.id]);
                                  saveAgentConfig({ llmProvider: provider.id, llmModel: defaultModels[provider.id] });
                                }}
                                className={`p-3 rounded-xl border-2 transition-all text-center ${
                                  llmProvider === provider.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <span className="text-xl mb-1 block">{provider.icon}</span>
                                <span className="text-xs font-medium text-gray-700">{provider.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* LLM Model */}
                        <div className="pt-4 border-t border-gray-100">
                          <label className="text-sm font-medium text-gray-900 mb-2 block">Model</label>
                          <select
                            value={llmModel}
                            onChange={(e) => {
                              setLlmModel(e.target.value);
                              saveAgentConfig({ llmModel: e.target.value });
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                          >
                            {llmProvider === 'openai' && (
                              <>
                                <option value="gpt-4o">GPT-4o (Best quality)</option>
                                <option value="gpt-4o-mini">GPT-4o Mini (Fast & affordable)</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</option>
                              </>
                            )}
                            {llmProvider === 'anthropic' && (
                              <>
                                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Latest)</option>
                                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                                <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</option>
                                <option value="claude-3-opus-20240229">Claude 3 Opus (Most capable)</option>
                              </>
                            )}
                            {llmProvider === 'google' && (
                              <>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                                <option value="gemini-pro">Gemini Pro</option>
                              </>
                            )}
                            {llmProvider === 'groq' && (
                              <>
                                <option value="llama-3.1-70b-versatile">Llama 3.1 70B (Best)</option>
                                <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fastest)</option>
                                <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                                <option value="gemma2-9b-it">Gemma 2 9B</option>
                              </>
                            )}
                          </select>
                          <p className="text-xs text-gray-500 mt-2">
                            {llmProvider === 'openai' && 'OpenAI models offer excellent general performance.'}
                            {llmProvider === 'anthropic' && 'Claude models excel at nuanced conversations.'}
                            {llmProvider === 'google' && 'Gemini models have strong reasoning capabilities.'}
                            {llmProvider === 'groq' && 'Groq offers ultra-fast inference with open models.'}
                          </p>
                        </div>

                        {/* Temperature */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-900">Temperature</label>
                            <span className="text-sm font-semibold text-gray-700">{temperature / 100}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={temperature}
                            onChange={(e) => handleTemperatureChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Precise (0)</span>
                            <span>Balanced (0.5)</span>
                            <span>Creative (1)</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Controls randomness in responses. Lower values are more deterministic.</p>
                        </div>

                        {/* Top P */}
                        <div className="pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-900">Top P (Nucleus Sampling)</label>
                            <span className="text-sm font-semibold text-gray-700">{(topP / 100).toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={topP}
                            onChange={(e) => handleTopPChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 mt-2">Controls diversity via nucleus sampling.</p>
                        </div>

                        {/* Frequency Penalty */}
                        <div className="pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-900">Frequency Penalty</label>
                            <span className="text-sm font-semibold text-gray-700">{(frequencyPenalty / 100).toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="200"
                            value={frequencyPenalty}
                            onChange={(e) => handleFrequencyPenaltyChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 mt-2">Reduces repetition of frequent tokens.</p>
                        </div>
                      </div>
                    </div>

                    {/* Response Settings */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Response Settings</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Max Response Length */}
                        <div>
                          <label className="text-sm font-medium text-gray-900 mb-2 block">Max Response Length (tokens)</label>
                          <input
                            type="number"
                            value={maxResponseLength}
                            onChange={(e) => handleMaxResponseChange(Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                          />
                          <p className="text-xs text-gray-500 mt-1">Maximum number of tokens in each response.</p>
                        </div>

                        {/* Timeout */}
                        <div className="pt-3 border-t border-gray-100">
                          <label className="text-sm font-medium text-gray-900 mb-2 block">Response Timeout (seconds)</label>
                          <input
                            type="number"
                            value={timeoutValue}
                            onChange={(e) => handleTimeoutChange(Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                          />
                          <p className="text-xs text-gray-500 mt-1">Maximum time to wait for a response.</p>
                        </div>

                        {/* Stop Sequences */}
                        <div className="pt-3 border-t border-gray-100">
                          <label className="text-sm font-medium text-gray-900 mb-2 block">Stop Sequences</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {['[END]', '###', '<|endoftext|>'].map((seq) => (
                              <span key={seq} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                                {seq}
                                <button className="text-gray-400 hover:text-red-500">×</button>
                              </span>
                            ))}
                          </div>
                          <button className="text-xs text-gray-500 hover:text-gray-700">+ Add sequence</button>
                        </div>
                      </div>
                    </div>

                    {/* Voice Settings */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-gray-600" />
                          <h3 className="text-sm font-semibold text-gray-900">Voice Settings</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Speech Rate */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-900">Speech Rate</label>
                            <span className="text-sm font-semibold text-gray-700">{(speechRate / 100).toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="200"
                            value={speechRate}
                            onChange={(e) => handleSpeechRateChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0.5x</span>
                            <span>1.0x</span>
                            <span>2.0x</span>
                          </div>
                        </div>

                        {/* Pitch */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-900">Voice Pitch</label>
                            <span className="text-sm font-semibold text-gray-700">{(voicePitch / 100).toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={voicePitch}
                            onChange={(e) => handleVoicePitchChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Lower</span>
                            <span>Default</span>
                            <span>Higher</span>
                          </div>
                        </div>

                        {/* Silence Detection */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-900 block">Silence Detection</span>
                              <span className="text-xs text-gray-500">Auto-detect end of user speech</span>
                            </div>
                            <button
                              onClick={handleToggleSilenceDetection}
                              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${silenceDetection ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${silenceDetection ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Debug & Logging */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Debug & Logging</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {/* Debug Mode */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900 block">Debug Mode</span>
                            <span className="text-xs text-gray-500">Enable verbose logging for debugging</span>
                          </div>
                          <button
                            onClick={handleToggleDebugMode}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${debugMode ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${debugMode ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {/* Log Level */}
                        <div className="pt-3 border-t border-gray-100">
                          <label className="text-sm font-medium text-gray-900 mb-2 block">Log Level</label>
                          <select
                            value={logLevel}
                            onChange={(e) => handleLogLevelChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                          >
                            <option value="error">Error</option>
                            <option value="warning">Warning</option>
                            <option value="info">Info</option>
                            <option value="debug">Debug</option>
                            <option value="trace">Trace</option>
                          </select>
                        </div>

                        {/* Log Conversations */}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900 block">Log Conversations</span>
                            <span className="text-xs text-gray-500">Store conversation transcripts</span>
                          </div>
                          <button
                            onClick={handleToggleLogConversations}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${logConversations ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${logConversations ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Export & Import */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Export & Import</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-gray-500">Export your agent configuration or import from a file.</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-sm text-gray-700">Export JSON</span>
                          </button>
                          <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span className="text-sm text-gray-700">Import JSON</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Agent Metadata */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-gray-900">Agent Metadata</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Agent ID */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Agent ID</label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-gray-700 truncate">
                              {agent?.id || 'unknown'}
                            </div>
                            <button
                              onClick={handleCopyAgentId}
                              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Created At */}
                        <div className="pt-2 border-t border-gray-100">
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Created</label>
                          <div className="text-sm text-gray-700">
                            {agent?.createdAt ? new Date(agent.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Unknown'}
                          </div>
                        </div>

                        {/* Last Updated */}
                        <div className="pt-2 border-t border-gray-100">
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Last Updated</label>
                          <div className="text-sm text-gray-700">
                            {agent?.updatedAt ? new Date(agent.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Unknown'}
                          </div>
                        </div>

                        {/* Version */}
                        <div className="pt-2 border-t border-gray-100">
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Version</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">v1.0.0</span>
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Latest</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="border border-red-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-red-50 border-b border-red-200">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        {/* Reset Agent */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-gray-900 block">Reset Agent</span>
                            <span className="text-xs text-gray-500">Reset all settings to default values</span>
                          </div>
                          <button className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                            Reset
                          </button>
                        </div>

                        {/* Delete Agent */}
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-red-700 block">Delete Agent</span>
                            <span className="text-xs text-red-500">Permanently delete this agent and all data</span>
                          </div>
                          <button className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="mt-8 p-5 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h4>
                    <button className="text-xs text-gray-500 hover:text-gray-700">View all</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { keys: ['Ctrl', 'S'], action: 'Save changes' },
                      { keys: ['Ctrl', 'Z'], action: 'Undo' },
                      { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
                      { keys: ['Esc'], action: 'Close panel' },
                    ].map((shortcut, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700 shadow-sm">
                              {key}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">{shortcut.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Only for Agent tab */}
          {activeTab === 'agent' && (
            <div className="space-y-5">
              {/* Voices Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-gray-900">Voices</h3>
                  <button
                    onClick={() => setIsVoiceSettingsOpen(true)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Select the voices you want to use for the agent.
                </p>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Primary Voice */}
                  <button
                    onClick={() => {
                      setVoicePanelMode('primary');
                      setIsVoicePanelOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                  >
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Volume2 className="w-2 h-2 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedVoice?.name || 'Eric'} - {selectedVoice?.description || 'Smooth, Trustworthy'}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      Primary
                    </span>
                    <div className="w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  </button>

                  {/* Additional Voices */}
                  {additionalVoices.map((voice) => (
                    <div
                      key={voice.id}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Volume2 className="w-2 h-2 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900">
                          {voice.name} - {voice.description}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded">
                        Additional
                      </span>
                      <button
                        onClick={() => {
                          const newVoices = additionalVoices.filter(v => v.id !== voice.id);
                          setAdditionalVoices(newVoices);
                          saveAgentConfig({ additionalVoices: newVoices.map(v => `voice-${v.id}`) });
                        }}
                        className="p-0.5 hover:bg-red-100 rounded transition-colors"
                        title="Remove voice"
                      >
                        <svg className="w-3 h-3 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {/* Add Additional Voice */}
                  <button
                    onClick={() => {
                      setVoicePanelMode('additional');
                      setIsVoicePanelOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-500">Add additional voice</span>
                  </button>
                </div>
              </div>

              {/* Language Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-1">Language</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Choose the default and additional languages the agent will communicate in.
                </p>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Primary Language */}
                  <button
                    onClick={() => setIsLanguagePanelOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                  >
                    <span className="text-xs">{getLanguageInfo(primaryLanguage)?.flag || '🇺🇸'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">
                        {getLanguageInfo(primaryLanguage)?.name || 'English'}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      Default
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  </button>

                  {/* Additional Languages */}
                  {selectedLanguages.filter(lang => lang !== primaryLanguage).map((langCode) => {
                    const langInfo = getLanguageInfo(langCode);
                    return (
                      <div
                        key={langCode}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <span className="text-xs">{langInfo?.flag || '🌐'}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">
                            {langInfo?.name || langCode}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded">
                          Additional
                        </span>
                        <button
                          onClick={() => {
                            const newLangs = selectedLanguages.filter(l => l !== langCode);
                            setSelectedLanguages(newLangs);
                            saveAgentConfig({ language: primaryLanguage, additionalLanguages: newLangs.filter(l => l !== primaryLanguage) });
                          }}
                          className="p-0.5 hover:bg-red-100 rounded transition-colors"
                          title="Remove language"
                        >
                          <svg className="w-3 h-3 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}

                  {/* Add Additional Languages */}
                  <button
                    onClick={() => setIsLanguagePanelOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-500">Add additional languages</span>
                  </button>
                </div>
              </div>

              {/* LLM Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-1">LLM</h3>
                <p className="text-sm text-gray-500 mb-2">
                  Select which provider and model to use for the LLM.
                </p>

                <button className="w-full flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">Gemini 2.5 Flash</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Voice Selection Panel */}
      <VoiceSelectionPanel
        isOpen={isVoicePanelOpen}
        onClose={() => setIsVoicePanelOpen(false)}
        selectedVoice={selectedVoice}
        onSelectVoice={(voice) => {
          setSelectedVoice(voice);
          saveAgentConfig({ voiceId: `voice-${voice.id}` });
        }}
        additionalVoices={additionalVoices}
        onUpdateAdditionalVoices={(voices) => {
          setAdditionalVoices(voices);
          saveAgentConfig({ additionalVoices: voices.map(v => `voice-${v.id}`) });
        }}
        mode={voicePanelMode}
      />

      {/* Language Selection Panel */}
      <LanguageSelectionPanel
        isOpen={isLanguagePanelOpen}
        onClose={() => setIsLanguagePanelOpen(false)}
        selectedLanguages={selectedLanguages}
        primaryLanguage={primaryLanguage}
        onUpdateLanguages={(langs, primary) => {
          setSelectedLanguages(langs);
          setPrimaryLanguage(primary);
          saveAgentConfig({ language: primary, additionalLanguages: langs.filter(l => l !== primary) });
        }}
        agentLanguage={agent?.language || 'en'}
      />

      {/* Voice Settings Panel */}
      <VoiceSettingsPanel
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
      />
    </div>

      {/* RAG Configuration Panel - Moved outside overflow container to fix z-index stacking */}
      {isRagPanelOpen && (
        <>
          {/* Backdrop - blocks main page interaction */}
          <div
            className="fixed inset-0 bg-black/30 z-[9998]"
            onClick={() => setIsRagPanelOpen(false)}
          />

          {/* Panel - isolated scrolling with flex layout */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[9999] flex flex-col overscroll-contain isolate">
            {/* Header - fixed at top */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-medium text-gray-900">RAG Configuration</h2>
              </div>
              <button
                onClick={() => setIsRagPanelOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - scrollable area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Chunk Settings */}
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Document Chunking</h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-700">Chunk Size (tokens)</label>
                      <span className="text-sm font-medium text-gray-900">{ragSettings.chunkSize}</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="2000"
                      step="100"
                      value={ragSettings.chunkSize}
                      onChange={(e) => setRagSettings({ ...ragSettings, chunkSize: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>200</span>
                      <span>2000</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-700">Chunk Overlap (tokens)</label>
                      <span className="text-sm font-medium text-gray-900">{ragSettings.chunkOverlap}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="50"
                      value={ragSettings.chunkOverlap}
                      onChange={(e) => setRagSettings({ ...ragSettings, chunkOverlap: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span>500</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Retrieval Settings */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Retrieval Settings</h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-700">Top K Results</label>
                      <span className="text-sm font-medium text-gray-900">{ragSettings.topK}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={ragSettings.topK}
                      onChange={(e) => setRagSettings({ ...ragSettings, topK: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of relevant chunks to retrieve per query.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-700">Similarity Threshold</label>
                      <span className="text-sm font-medium text-gray-900">{ragSettings.similarityThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ragSettings.similarityThreshold * 100}
                      onChange={(e) => setRagSettings({ ...ragSettings, similarityThreshold: Number(e.target.value) / 100 })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum similarity score to include a chunk.</p>
                  </div>
                </div>
              </div>

              {/* Search Type */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Search Type</h3>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  {(['semantic', 'keyword', 'hybrid'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setRagSettings({ ...ragSettings, searchType: type })}
                      className={`flex-1 py-2 text-xs font-medium transition-colors capitalize ${
                        ragSettings.searchType === type
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {ragSettings.searchType === 'semantic' && 'Uses embeddings to find semantically similar content.'}
                  {ragSettings.searchType === 'keyword' && 'Uses keyword matching for exact term searches.'}
                  {ragSettings.searchType === 'hybrid' && 'Combines semantic and keyword search for best results.'}
                </p>
              </div>

              {/* Embedding Model */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900 mb-3">Embedding Model</h3>
                <select
                  value={ragSettings.embeddingModel}
                  onChange={(e) => setRagSettings({ ...ragSettings, embeddingModel: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <option value="text-embedding-ada-002">OpenAI Ada 002 (Recommended)</option>
                  <option value="text-embedding-3-small">OpenAI Embedding 3 Small</option>
                  <option value="text-embedding-3-large">OpenAI Embedding 3 Large</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Model used to generate vector embeddings.</p>
              </div>
            </div>

            {/* Footer - fixed at bottom */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsRagPanelOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleSaveRagSettings(ragSettings);
                    setIsRagPanelOpen(false);
                  }}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tool Configuration Modal - Professional Design */}
      {toolConfigModal.open && toolConfigModal.tool && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setToolConfigModal({ open: false, tool: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

              {/* Gradient Header */}
              <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-6">
                <button
                  onClick={() => setToolConfigModal({ open: false, tool: null })}
                  className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                    <span className="text-3xl">{toolConfigModal.tool.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{toolConfigModal.tool.name}</h3>
                    <p className="text-sm text-white/60">Connect to enable scheduling capabilities</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Google OAuth Tools */}
                {['calendar', 'sheets'].includes(toolConfigModal.tool.id) ? (
                  <div className="space-y-6">
                    {/* One-Click Connect */}
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Account</h4>
                      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                        Securely connect your Google account to allow your AI agent to manage calendar events
                      </p>

                      <button
                        onClick={() => {
                          const authUrl = `${window.location.origin}/api/integrations/google/auth?tool=${toolConfigModal.tool!.id}&agentId=${agentId}`;
                          window.open(authUrl, 'google-auth', 'width=500,height=600');
                          toast.success('Complete authorization in the popup window');
                        }}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100 transition-all group"
                      >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span className="text-base font-medium text-gray-700 group-hover:text-gray-900">Continue with Google</span>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                      <div className="text-center p-4">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-gray-900">Check Availability</p>
                        <p className="text-xs text-gray-500 mt-0.5">Real-time calendar sync</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-gray-900">Book Meetings</p>
                        <p className="text-xs text-gray-500 mt-0.5">Auto-create events</p>
                      </div>
                      <div className="text-center p-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-gray-900">Send Invites</p>
                        <p className="text-xs text-gray-500 mt-0.5">Auto email invitations</p>
                      </div>
                    </div>

                    {/* Calendar Settings */}
                    {toolConfigModal.tool.id === 'calendar' && (
                      <div className="bg-gray-50 rounded-2xl p-6">
                        <h5 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Scheduling Preferences
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">Default Duration</label>
                            <select className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              <option value="15">15 minutes</option>
                              <option value="30" selected>30 minutes</option>
                              <option value="45">45 minutes</option>
                              <option value="60">1 hour</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">Buffer Between Meetings</label>
                            <select className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              <option value="0">No buffer</option>
                              <option value="5">5 minutes</option>
                              <option value="10" selected>10 minutes</option>
                              <option value="15">15 minutes</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">Advance Booking</label>
                            <select className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              <option value="7">Up to 1 week</option>
                              <option value="14">Up to 2 weeks</option>
                              <option value="30" selected>Up to 1 month</option>
                              <option value="60">Up to 2 months</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-2">Timezone</label>
                            <select className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              <option value="Asia/Kolkata">India (IST)</option>
                              <option value="America/New_York">Eastern Time (ET)</option>
                              <option value="America/Los_Angeles">Pacific Time (PT)</option>
                              <option value="Europe/London">London (GMT)</option>
                              <option value="auto">Auto-detect</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* API Key Based Tools */
                  <div className="space-y-5">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-900">Where to find your credentials?</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Visit your {toolConfigModal.tool.name} dashboard to generate API keys.
                          <a href="#" className="underline ml-1">View guide →</a>
                        </p>
                      </div>
                    </div>

                    {getToolRequiredFields(toolConfigModal.tool.id).map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={toolCredentials[toolConfigModal.tool!.id]?.[field.key] || ''}
                            onChange={(e) => setToolCredentials({
                              ...toolCredentials,
                              [toolConfigModal.tool!.id]: {
                                ...toolCredentials[toolConfigModal.tool!.id],
                                [field.key]: e.target.value
                              }
                            })}
                            placeholder={field.placeholder}
                            rows={3}
                            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white font-mono transition-colors"
                          />
                        ) : (
                          <input
                            type={field.type}
                            value={toolCredentials[toolConfigModal.tool!.id]?.[field.key] || ''}
                            onChange={(e) => setToolCredentials({
                              ...toolCredentials,
                              [toolConfigModal.tool!.id]: {
                                ...toolCredentials[toolConfigModal.tool!.id],
                                [field.key]: e.target.value
                              }
                            })}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                          />
                        )}
                        {field.helpText && (
                          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                      <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <p className="text-xs text-green-800">
                        Your credentials are encrypted using AES-256 and stored securely.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-8 py-5 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => setToolConfigModal({ open: false, tool: null })}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleToolConfigSave}
                  className="px-6 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/20"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Widget Documentation Modal */}
      {isWidgetDocsModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={() => setIsWidgetDocsModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <FileEdit className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Widget Integration Guide</h2>
                    <p className="text-xs text-gray-500">Complete documentation for embedding the voice widget</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsWidgetDocsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Script Integration */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      Script Integration (Recommended)
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Add this script tag to your website's HTML, just before the closing <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">&lt;/body&gt;</code> tag:
                    </p>
                    <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto">
{`<script
  src="${window.location.origin}/widget.js"
  data-agent-id="${agent?.id || 'your-agent-id'}"
  data-position="${widgetPosition}"
  data-color="${widgetColor}"
  data-size="${widgetSize}"
></script>`}
                    </pre>
                  </div>

                  {/* React Integration */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      React Integration
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Install the npm package and use the component:
                    </p>
                    <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto mb-3">
{`npm install @voicebridge/react`}
                    </pre>
                    <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto">
{`import { VoiceBridgeWidget } from '@voicebridge/react';

function App() {
  return (
    <VoiceBridgeWidget
      agentId="${agent?.id || 'your-agent-id'}"
      position="${widgetPosition}"
      color="${widgetColor}"
      size="${widgetSize}"
    />
  );
}`}
                    </pre>
                  </div>

                  {/* iFrame Integration */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      iFrame Integration
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Embed the widget using an iframe (limited functionality):
                    </p>
                    <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto">
{`<iframe
  src="${window.location.origin}/widget/${agent?.id || 'your-agent-id'}"
  style="position: fixed; bottom: 20px; right: 20px;
         border: none; width: 400px; height: 600px;
         z-index: 9999;"
  allow="microphone"
></iframe>`}
                    </pre>
                  </div>

                  {/* Configuration Options */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                      Configuration Options
                    </h3>
                    <div className="bg-gray-50 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left px-4 py-2 font-semibold text-gray-700">Option</th>
                            <th className="text-left px-4 py-2 font-semibold text-gray-700">Type</th>
                            <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-2 font-mono text-blue-600">agentId</td>
                            <td className="px-4 py-2 text-gray-500">string</td>
                            <td className="px-4 py-2 text-gray-600">Your agent's unique identifier (required)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono text-blue-600">position</td>
                            <td className="px-4 py-2 text-gray-500">string</td>
                            <td className="px-4 py-2 text-gray-600">bottom-right, bottom-left, top-right, top-left</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono text-blue-600">color</td>
                            <td className="px-4 py-2 text-gray-500">string</td>
                            <td className="px-4 py-2 text-gray-600">Primary color in hex format (e.g., #3B82F6)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 font-mono text-blue-600">size</td>
                            <td className="px-4 py-2 text-gray-500">string</td>
                            <td className="px-4 py-2 text-gray-600">small, medium, or large</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Security */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                      Security & Domain Restrictions
                    </h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm text-amber-800 mb-2">
                        <strong>Important:</strong> For security, configure allowed domains in the Widget tab.
                      </p>
                      <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                        <li>Only whitelisted domains can embed your widget</li>
                        <li>Use patterns like <code className="bg-amber-100 px-1 rounded">*.yourdomain.com</code> for subdomains</li>
                        <li>The agent must be <strong>Published</strong> for the widget to work</li>
                      </ul>
                    </div>
                  </div>

                  {/* Troubleshooting */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-xs font-bold">?</span>
                      Troubleshooting
                    </h3>
                    <div className="space-y-2 text-sm">
                      <details className="bg-gray-50 rounded-lg">
                        <summary className="px-4 py-2 cursor-pointer font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                          Widget not appearing?
                        </summary>
                        <div className="px-4 pb-3 text-gray-600 text-xs">
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            <li>Ensure the agent is <strong>Published</strong> (not in Draft mode)</li>
                            <li>Check that your domain is in the allowed domains list</li>
                            <li>Verify the script is placed before <code>&lt;/body&gt;</code></li>
                            <li>Check browser console for errors</li>
                          </ul>
                        </div>
                      </details>
                      <details className="bg-gray-50 rounded-lg">
                        <summary className="px-4 py-2 cursor-pointer font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                          Microphone not working?
                        </summary>
                        <div className="px-4 pb-3 text-gray-600 text-xs">
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            <li>HTTPS is required for microphone access</li>
                            <li>User must grant microphone permission</li>
                            <li>Check browser permissions settings</li>
                          </ul>
                        </div>
                      </details>
                      <details className="bg-gray-50 rounded-lg">
                        <summary className="px-4 py-2 cursor-pointer font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                          Domain blocked error?
                        </summary>
                        <div className="px-4 pb-3 text-gray-600 text-xs">
                          <ul className="list-disc list-inside space-y-1 mt-2">
                            <li>Add your domain to the allowed domains list</li>
                            <li>Use wildcard <code>*.domain.com</code> for all subdomains</li>
                            <li>Changes take effect immediately after saving</li>
                          </ul>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Agent ID: <code className="bg-gray-200 px-1.5 py-0.5 rounded">{agent?.id || 'N/A'}</code>
                </p>
                <button
                  onClick={() => setIsWidgetDocsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Domain Modal */}
      {isAddDomainModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={() => setIsAddDomainModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Add Allowed Domain</h2>
                    <p className="text-xs text-gray-500">Restrict widget embedding to specific domains</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddDomainModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domain Pattern
                    </label>
                    <input
                      type="text"
                      value={newDomainInput}
                      onChange={(e) => setNewDomainInput(e.target.value)}
                      placeholder="e.g., *.mywebsite.com or app.example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newDomainInput.trim()) {
                          const trimmed = newDomainInput.trim().toLowerCase();
                          if (!allowedDomains.includes(trimmed)) {
                            const newList = [...allowedDomains, trimmed];
                            setAllowedDomains(newList);
                            saveAgentConfig({ allowedDomains: newList });
                          }
                          setIsAddDomainModalOpen(false);
                          setNewDomainInput('');
                        }
                      }}
                    />
                  </div>

                  {/* Examples */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Examples:</p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-blue-600 font-mono">*.example.com</code>
                        <span className="text-xs text-gray-500">All subdomains (www, app, blog, etc.)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-blue-600 font-mono">example.com</code>
                        <span className="text-xs text-gray-500">Exact domain match only</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-blue-600 font-mono">app.example.com</code>
                        <span className="text-xs text-gray-500">Specific subdomain only</span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      If no domains are configured, the widget can be embedded on any website.
                      Adding domains will restrict embedding to only those specified.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsAddDomainModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newDomainInput.trim()) {
                      const trimmed = newDomainInput.trim().toLowerCase();
                      if (!allowedDomains.includes(trimmed)) {
                        const newList = [...allowedDomains, trimmed];
                        setAllowedDomains(newList);
                        saveAgentConfig({ allowedDomains: newList });
                        toast.success(`Domain "${trimmed}" added successfully`);
                      } else {
                        toast.error('This domain is already in the list');
                      }
                    }
                    setIsAddDomainModalOpen(false);
                    setNewDomainInput('');
                  }}
                  disabled={!newDomainInput.trim()}
                  className="px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Domain
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Widget Live Preview Modal */}
      {isWidgetPreviewOpen && agentId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={() => setIsWidgetPreviewOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Widget Live Preview</h2>
                  <p className="text-sm text-gray-500">Test your voice agent in real-time</p>
                </div>
                <button
                  onClick={() => setIsWidgetPreviewOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {publishStatus !== 'PUBLISHED' ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileEdit className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Agent Not Published</h3>
                    <p className="text-gray-500 mb-6">
                      You need to publish your agent before testing the live widget.
                      <br />
                      Draft agents cannot handle real conversations.
                    </p>
                    <button
                      onClick={() => {
                        setIsWidgetPreviewOpen(false);
                        handlePublish();
                      }}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Publish Now
                    </button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 min-h-[400px] flex items-center justify-center">
                    <div className="w-full max-w-sm">
                      <RealtimeVoiceWidget
                        agentId={agentId}
                        defaultMode="REALTIME"
                        showModeSelector={false}
                        position={widgetPosition as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'}
                        startExpanded={true}
                        theme={{
                          primaryColor: widgetColor,
                          backgroundColor: '#ffffff',
                          textColor: '#1f2937',
                        }}
                        onSessionEnd={(result) => {
                          console.log('Session ended:', result);
                          toast.success('Test session completed');
                        }}
                        onError={(error) => {
                          console.error('Widget error:', error);
                          toast.error(error.message || 'Widget error occurred');
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-500">
                    Status: <span className={publishStatus === 'PUBLISHED' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                      {publishStatus === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsWidgetPreviewOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default ConversationalAIAgentDetail;
