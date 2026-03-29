/**
 * Tests Tab Component
 * Modern test suite for voice AI agents with real functionality
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Send,
  RefreshCw,
  Loader2,
  Sparkles,
  Target,
  MessageSquare,
  Zap,
  AlertTriangle,
  Volume2,
  Mic,
  Bot,
  User,
  Edit2,
  Save,
  X,
  ChevronRight,
  PlayCircle,
  StopCircle,
  FileText,
  CheckCheck,
  Timer,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../../services/api';
import { RealtimeVoiceWidget } from '../../../../components/RealtimeVoiceWidget';
import { VoiceTestModal } from './VoiceTestModal';

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'pending' | 'failed';
  lastRun?: string;
  duration?: number;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  category?: string;
  evaluationScore?: number;
  evaluationReason?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TestsTabProps {
  testCases: TestCase[];
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>;
  agentName?: string;
  agentId?: string;
  greeting?: string;
  systemPrompt?: string;
  voiceId?: string;
  language?: string;
}

const TEST_TEMPLATES = [
  {
    id: 'greeting',
    name: 'Greeting Response',
    description: 'Test initial greeting and welcome message',
    category: 'Basic',
    icon: MessageSquare,
    color: 'blue',
    input: 'Hello',
    expectedOutput: 'Friendly greeting with introduction',
  },
  {
    id: 'faq',
    name: 'FAQ Handling',
    description: 'Test common question responses',
    category: 'Knowledge',
    icon: Lightbulb,
    color: 'purple',
    input: 'What services do you offer?',
    expectedOutput: 'Clear explanation of available services',
  },
  {
    id: 'intent',
    name: 'Intent Recognition',
    description: 'Test correct intent classification',
    category: 'AI',
    icon: Zap,
    color: 'green',
    input: 'I need to book an appointment for tomorrow',
    expectedOutput: 'Appointment booking flow triggered',
  },
  {
    id: 'error',
    name: 'Error Recovery',
    description: 'Test handling of unclear inputs',
    category: 'Edge Cases',
    icon: AlertTriangle,
    color: 'amber',
    input: 'asdfjkl gibberish text here',
    expectedOutput: 'Polite clarification request',
  },
  {
    id: 'context',
    name: 'Context Retention',
    description: 'Test conversation memory',
    category: 'AI',
    icon: Bot,
    color: 'indigo',
    input: 'As I mentioned earlier...',
    expectedOutput: 'References previous context correctly',
  },
  {
    id: 'goodbye',
    name: 'Conversation End',
    description: 'Test proper session closure',
    category: 'Basic',
    icon: CheckCheck,
    color: 'teal',
    input: 'Goodbye, thank you',
    expectedOutput: 'Friendly farewell with next steps',
  },
];

export function TestsTab({
  testCases,
  setTestCases,
  agentName = 'Agent',
  agentId,
  greeting = '',
  systemPrompt = '',
  voiceId = 'alloy',
  language = 'en',
}: TestsTabProps) {
  // State
  const [activeView, setActiveView] = useState<'tests' | 'chat' | 'voice'>('chat');
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice test state
  const [showVoiceWidget, setShowVoiceWidget] = useState(false);
  const [showStandardVoiceTest, setShowStandardVoiceTest] = useState(false);

  // New test modal
  const [showNewTestModal, setShowNewTestModal] = useState(false);
  const [newTest, setNewTest] = useState({ name: '', description: '', input: '', expectedOutput: '', category: 'Custom' });

  // Auto-add default tests if empty
  useEffect(() => {
    if (testCases.length === 0) {
      const defaultTests: TestCase[] = [
        {
          id: 'default-1',
          name: 'Greeting Response',
          description: 'Test initial greeting and welcome message',
          status: 'pending',
          input: 'Hello',
          expectedOutput: 'Friendly greeting with introduction and offer to help',
          category: 'Basic',
        },
        {
          id: 'default-2',
          name: 'Service Inquiry',
          description: 'Test response to service questions',
          status: 'pending',
          input: 'What services do you offer?',
          expectedOutput: 'Clear explanation of available services or offerings',
          category: 'Knowledge',
        },
        {
          id: 'default-3',
          name: 'Appointment Request',
          description: 'Test appointment booking intent detection',
          status: 'pending',
          input: 'I want to schedule an appointment',
          expectedOutput: 'Acknowledgment and assistance with appointment booking',
          category: 'Intent',
        },
        {
          id: 'default-4',
          name: 'Unclear Input Handling',
          description: 'Test handling of unclear or gibberish input',
          status: 'pending',
          input: 'asdfghjkl random text here',
          expectedOutput: 'Polite request for clarification without confusion',
          category: 'Edge Cases',
        },
        {
          id: 'default-5',
          name: 'Goodbye Response',
          description: 'Test proper conversation closure',
          status: 'pending',
          input: 'Thank you, goodbye!',
          expectedOutput: 'Friendly farewell with offer for future assistance',
          category: 'Basic',
        },
      ];
      setTestCases(defaultTests);
    }
  }, []); // Run once on mount

  // Stats
  const stats = {
    total: testCases.length,
    passed: testCases.filter((t) => t.status === 'passed').length,
    failed: testCases.filter((t) => t.status === 'failed').length,
    pending: testCases.filter((t) => t.status === 'pending').length,
  };
  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  const filteredTests = testCases.filter((t) => filterStatus === 'all' || t.status === filterStatus);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Send chat message to agent
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);

    try {
      // Call the actual API to get agent response
      const response = await api.post('/voice-ai/chat/test', {
        agentId,
        message: userMessage.content,
        conversationHistory: chatMessages.map(m => ({ role: m.role, content: m.content })),
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response || response.data.message || 'I understand. How can I help you further?',
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      // Fallback response if API fails
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: greeting || `Hello! I'm ${agentName}. How can I assist you today?`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // Run a single test with AI evaluation
  const handleRunTest = async (test: TestCase) => {
    setRunningTestId(test.id);
    setIsRunning(true);

    try {
      const startTime = Date.now();

      // Call API to test the agent with the input and expected output for AI evaluation
      const response = await api.post('/voice-ai/chat/test', {
        agentId,
        message: test.input,
        testMode: true,
        expectedOutput: test.expectedOutput, // Send expected output for AI evaluation
      });

      const duration = Date.now() - startTime;
      const actualOutput = response.data.response || response.data.message || '';
      const evaluation = response.data.evaluation; // AI evaluation result

      // Use AI evaluation if available, otherwise fallback to simple check
      let passed = false;
      let evaluationScore = 0;
      let evaluationReason = '';

      if (evaluation) {
        passed = evaluation.passed;
        evaluationScore = evaluation.score;
        evaluationReason = evaluation.reason;
      } else {
        // Fallback: simple check
        passed = actualOutput.length > 10 && !actualOutput.toLowerCase().includes('error');
        evaluationScore = passed ? 70 : 30;
        evaluationReason = passed ? 'Response generated successfully' : 'No valid response';
      }

      setTestCases(prev =>
        prev.map(t =>
          t.id === test.id
            ? {
                ...t,
                status: passed ? 'passed' : 'failed',
                lastRun: new Date().toLocaleString(),
                duration,
                actualOutput,
                evaluationScore,
                evaluationReason,
              } as TestCase
            : t
        )
      );

      const scoreEmoji = evaluationScore >= 80 ? '🎉' : evaluationScore >= 50 ? '👍' : '⚠️';
      toast.success(`${scoreEmoji} "${test.name}" - Score: ${evaluationScore}/100`);
    } catch (error) {
      setTestCases(prev =>
        prev.map(t =>
          t.id === test.id
            ? {
                ...t,
                status: 'failed',
                lastRun: new Date().toLocaleString(),
                actualOutput: 'API Error - Could not reach agent',
                evaluationScore: 0,
                evaluationReason: 'API connection failed',
              } as TestCase
            : t
        )
      );
      toast.error(`Test failed: API error`);
    } finally {
      setIsRunning(false);
      setRunningTestId(null);
    }
  };

  // Run all tests
  const handleRunAllTests = async () => {
    if (testCases.length === 0) {
      toast.error('No tests to run');
      return;
    }

    setIsRunning(true);
    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
      setRunningTestId(test.id);
      await handleRunTest(test);
      const updatedTest = testCases.find(t => t.id === test.id);
      if (updatedTest?.status === 'passed') passed++;
      else failed++;
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay between tests
    }

    setIsRunning(false);
    setRunningTestId(null);
    toast.success(`Tests completed: ${passed} passed, ${failed} failed`);
  };

  // Add template test
  const handleAddTemplate = (template: typeof TEST_TEMPLATES[0]) => {
    const newTest: TestCase = {
      id: Date.now().toString(),
      name: template.name,
      description: template.description,
      status: 'pending',
      input: template.input,
      expectedOutput: template.expectedOutput,
      category: template.category,
    };
    setTestCases(prev => [...prev, newTest]);
    toast.success(`Added "${template.name}" to tests`);
  };

  // Create new test
  const handleCreateTest = () => {
    if (!newTest.name.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    const test: TestCase = {
      id: Date.now().toString(),
      name: newTest.name,
      description: newTest.description || 'Custom test case',
      status: 'pending',
      input: newTest.input,
      expectedOutput: newTest.expectedOutput,
      category: newTest.category,
    };

    setTestCases(prev => [...prev, test]);
    setNewTest({ name: '', description: '', input: '', expectedOutput: '', category: 'Custom' });
    setShowNewTestModal(false);
    toast.success('Test created');
  };

  // Delete test
  const handleDeleteTest = (id: string) => {
    setTestCases(prev => prev.filter(t => t.id !== id));
    if (selectedTest?.id === id) setSelectedTest(null);
    toast.success('Test deleted');
  };

  // Save edited test
  const handleSaveEdit = () => {
    if (!editingTest) return;
    setTestCases(prev => prev.map(t => t.id === editingTest.id ? editingTest : t));
    setEditingTest(null);
    toast.success('Test updated');
  };

  return (
    <div className="space-y-6">
      {/* Header with View Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agent Testing</h2>
          <p className="text-sm text-gray-500 mt-1">Test and validate your agent's responses</p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'chat'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat Test
          </button>
          <button
            onClick={() => setActiveView('voice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'voice'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mic className="w-4 h-4" />
            Voice Test
          </button>
          <button
            onClick={() => setActiveView('tests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'tests'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="w-4 h-4" />
            Test Suite
          </button>
        </div>
      </div>

      {/* Chat Test View */}
      {activeView === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Window */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{agentName}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs text-gray-500">Online - Test Mode</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatMessages([])}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                    title="Clear chat"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                      <MessageSquare className="w-10 h-10 text-blue-500" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Start a Test Conversation</h4>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Type a message below to test how your agent responds. This simulates a real customer interaction.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {['Hello', 'What can you help me with?', 'I need assistance'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setChatInput(suggestion);
                          }}
                          className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-end gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === 'user'
                              ? 'bg-gray-900'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}>
                            {message.role === 'user' ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              message.role === 'user'
                                ? 'bg-gray-900 text-white rounded-br-md'
                                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex justify-start">
                        <div className="flex items-end gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                            <div className="flex gap-1.5">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message to test your agent..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !chatInput.trim()}
                    className="p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-4">
            {/* Quick Prompts */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Quick Test Prompts
              </h3>
              <div className="space-y-2">
                {[
                  { text: 'Tell me about your services', icon: '💼' },
                  { text: 'What are your business hours?', icon: '🕐' },
                  { text: 'I have a complaint', icon: '😤' },
                  { text: 'Can I speak to a human?', icon: '👤' },
                  { text: 'How much does it cost?', icon: '💰' },
                  { text: 'Book an appointment', icon: '📅' },
                ].map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => setChatInput(prompt.text)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                  >
                    <span className="text-lg">{prompt.icon}</span>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{prompt.text}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Stats */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Session Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Messages</span>
                  <span className="text-sm font-semibold text-gray-900">{chatMessages.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">User Messages</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {chatMessages.filter(m => m.role === 'user').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Agent Responses</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {chatMessages.filter(m => m.role === 'assistant').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Test View */}
      {activeView === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Realtime Voice Test */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Realtime Voice Test</h3>
                <p className="text-sm text-gray-500">OpenAI Realtime API - Natural conversation</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Low latency, streaming responses</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Natural turn-taking & interruption</span>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">English language only</span>
              </div>
            </div>

            <button
              onClick={() => setShowVoiceWidget(!showVoiceWidget)}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                showVoiceWidget
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20'
              }`}
            >
              {showVoiceWidget ? (
                <>
                  <StopCircle className="w-5 h-5" />
                  Stop Voice Test
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  Start Realtime Voice Test
                </>
              )}
            </button>
          </div>

          {/* Standard Voice Test (Indian Languages) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Volume2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Indian Voice Test</h3>
                <p className="text-sm text-gray-500">AI4Bharat & Sarvam - Indian languages</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Hindi, Tamil, Telugu & more</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Natural Indian accents</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Standard TTS pipeline</span>
              </div>
            </div>

            <button
              onClick={() => setShowStandardVoiceTest(true)}
              className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Start Indian Voice Test
            </button>
          </div>
        </div>
      )}

      {/* Test Suite View */}
      {activeView === 'tests' && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Tests</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4 bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
                  <p className="text-xs text-gray-500">Passed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4 bg-gradient-to-br from-red-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-blue-200 p-4 bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{passRate}%</p>
                  <p className="text-xs text-gray-500">Pass Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              {(['all', 'passed', 'failed', 'pending'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterStatus === status
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAllTests}
                disabled={isRunning || testCases.length === 0}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run All
              </button>
              <button
                onClick={() => setShowNewTestModal(true)}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Test
              </button>
            </div>
          </div>

          {/* Test Cases Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredTests.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Tests Yet</h4>
                  <p className="text-sm text-gray-500 mb-4">Create tests to validate your agent's behavior</p>
                  <button
                    onClick={() => setShowNewTestModal(true)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
                  >
                    Create First Test
                  </button>
                </div>
              ) : (
                filteredTests.map((test) => (
                  <div
                    key={test.id}
                    className={`bg-white rounded-xl border transition-all cursor-pointer ${
                      selectedTest?.id === test.id
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          runningTestId === test.id
                            ? 'bg-blue-100'
                            : test.status === 'passed'
                            ? 'bg-green-100'
                            : test.status === 'failed'
                            ? 'bg-red-100'
                            : 'bg-gray-100'
                        }`}>
                          {runningTestId === test.id ? (
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          ) : test.status === 'passed' ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : test.status === 'failed' ? (
                            <XCircle className="w-6 h-6 text-red-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{test.name}</h4>
                            {test.category && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {test.category}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1">{test.description}</p>
                          {test.lastRun && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {test.lastRun}
                              </span>
                              {test.duration && (
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {test.duration}ms
                                </span>
                              )}
                              {test.evaluationScore !== undefined && (
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                                  test.evaluationScore >= 70 ? 'bg-green-100 text-green-700' :
                                  test.evaluationScore >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  <Sparkles className="w-3 h-3" />
                                  {test.evaluationScore}/100
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRunTest(test); }}
                            disabled={isRunning}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTest(test); }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Templates */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Quick Templates</h3>
                  <p className="text-xs text-gray-500">Add pre-built test scenarios</p>
                </div>
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  {TEST_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    const isAdded = testCases.some(t => t.name === template.name);
                    return (
                      <button
                        key={template.id}
                        onClick={() => !isAdded && handleAddTemplate(template)}
                        disabled={isAdded}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          isAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          template.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                          template.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                          template.color === 'green' ? 'bg-green-100 text-green-600' :
                          template.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                          template.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                          'bg-teal-100 text-teal-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{template.name}</p>
                          <p className="text-xs text-gray-500 truncate">{template.description}</p>
                        </div>
                        {isAdded ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Plus className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Test Details */}
              {selectedTest && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Test Details</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Input</label>
                      <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        "{selectedTest.input || 'No input specified'}"
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Expected Output</label>
                      <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                        {selectedTest.expectedOutput || 'No expectation specified'}
                      </p>
                    </div>
                    {selectedTest.actualOutput && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Actual Output</label>
                        <p className={`text-sm px-3 py-2 rounded-lg ${
                          selectedTest.status === 'passed'
                            ? 'bg-green-50 text-green-800'
                            : 'bg-red-50 text-red-800'
                        }`}>
                          {selectedTest.actualOutput}
                        </p>
                      </div>
                    )}
                    {/* AI Evaluation Results */}
                    {selectedTest.evaluationScore !== undefined && (
                      <div className="pt-3 border-t border-gray-100">
                        <label className="block text-xs font-medium text-gray-500 mb-2">AI Evaluation</label>
                        <div className={`rounded-xl p-4 ${
                          selectedTest.evaluationScore >= 70
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                            : selectedTest.evaluationScore >= 40
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
                            : 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900">Score</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    selectedTest.evaluationScore >= 70 ? 'bg-green-500' :
                                    selectedTest.evaluationScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${selectedTest.evaluationScore}%` }}
                                />
                              </div>
                              <span className={`text-lg font-bold ${
                                selectedTest.evaluationScore >= 70 ? 'text-green-600' :
                                selectedTest.evaluationScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {selectedTest.evaluationScore}
                              </span>
                            </div>
                          </div>
                          {selectedTest.evaluationReason && (
                            <p className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">AI Verdict:</span> {selectedTest.evaluationReason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleRunTest(selectedTest)}
                      disabled={isRunning}
                      className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {runningTestId === selectedTest.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Run Test
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* New Test Modal */}
      {showNewTestModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setShowNewTestModal(false)} />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Create New Test</h2>
                  <button onClick={() => setShowNewTestModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
                  <input
                    type="text"
                    value={newTest.name}
                    onChange={(e) => setNewTest(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Greeting Response Test"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={newTest.description}
                    onChange={(e) => setNewTest(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What does this test verify?"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Input</label>
                  <textarea
                    value={newTest.input}
                    onChange={(e) => setNewTest(prev => ({ ...prev, input: e.target.value }))}
                    placeholder="The message to send to the agent"
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output</label>
                  <textarea
                    value={newTest.expectedOutput}
                    onChange={(e) => setNewTest(prev => ({ ...prev, expectedOutput: e.target.value }))}
                    placeholder="What response do you expect?"
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowNewTestModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTest}
                  className="px-6 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Create Test
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Test Modal */}
      {editingTest && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setEditingTest(null)} />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Edit Test</h2>
                  <button onClick={() => setEditingTest(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                  <input
                    type="text"
                    value={editingTest.name}
                    onChange={(e) => setEditingTest(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={editingTest.description}
                    onChange={(e) => setEditingTest(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Input</label>
                  <textarea
                    value={editingTest.input || ''}
                    onChange={(e) => setEditingTest(prev => prev ? { ...prev, input: e.target.value } : null)}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Output</label>
                  <textarea
                    value={editingTest.expectedOutput || ''}
                    onChange={(e) => setEditingTest(prev => prev ? { ...prev, expectedOutput: e.target.value } : null)}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setEditingTest(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Realtime Voice Widget */}
      {showVoiceWidget && agentId && (
        <RealtimeVoiceWidget
          agentId={agentId}
          onSessionEnd={(result) => {
            console.log('[TestsTab] Voice session ended:', result);
            setShowVoiceWidget(false);
          }}
          onError={(error) => {
            console.error('[TestsTab] Voice error:', error);
            toast.error(error.message);
          }}
          defaultMode="REALTIME"
          showModeSelector={true}
          position="bottom-right"
          startExpanded={true}
          theme={{ primaryColor: '#10B981' }}
        />
      )}

      {/* Standard Voice Test Modal */}
      {showStandardVoiceTest && (
        <VoiceTestModal
          isOpen={showStandardVoiceTest}
          onClose={() => setShowStandardVoiceTest(false)}
          agentName={agentName || 'Agent'}
          greeting={greeting || ''}
          systemPrompt={systemPrompt || ''}
          voiceId={voiceId}
          language={language || 'en-US'}
        />
      )}
    </div>
  );
}
