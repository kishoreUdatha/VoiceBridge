/**
 * AI Script Builder Page
 * Create and manage AI voice call scripts with conversation flows
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Play,
  Pause,
  X,
  Check,
  AlertCircle,
  Search,
  MessageSquare,
  Phone,
  Clock,
  Mic,
  Volume2,
  Settings,
  Zap,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Calendar,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';
import api from '../../services/api';

interface VoiceTemplate {
  id: string;
  name: string;
  industry?: string;
  category?: string;
  systemPrompt: string;
  greetingMessage: string;
  greetingMessageFormal?: string;
  greetingMessageCasual?: string;
  fallbackMessage: string;
  transferMessage: string;
  endMessage: string;
  afterHoursMessage?: string;
  knowledgeBase?: string;
  faqs?: Array<{ question: string; answer: string }>;
  questionTemplates?: string[];
  voiceId: string;
  language: string;
  temperature: number;
  personalityTraits?: string[];
  responseSpeed?: string;
  maxDuration?: number;
  workingHours?: { start: string; end: string; days: number[] };
  autoCreateLead?: boolean;
  deduplicatePhone?: boolean;
  appointmentBookingEnabled?: boolean;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

const INDUSTRIES = [
  { value: 'EDUCATION', label: 'Education' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'IT_RECRUITMENT', label: 'IT Recruitment' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'ECOMMERCE', label: 'E-Commerce' },
  { value: 'GENERAL', label: 'General' },
];

const VOICE_OPTIONS = [
  { value: 'arvind', label: 'Arvind (Male, Hindi)' },
  { value: 'amol', label: 'Amol (Male, Hindi)' },
  { value: 'maya', label: 'Maya (Female, Hindi)' },
  { value: 'meera', label: 'Meera (Female, Hindi)' },
  { value: 'alloy', label: 'Alloy (Neutral, English)' },
  { value: 'echo', label: 'Echo (Male, English)' },
  { value: 'nova', label: 'Nova (Female, English)' },
  { value: 'shimmer', label: 'Shimmer (Female, English)' },
];

const LANGUAGES = [
  { value: 'hi', label: 'Hindi' },
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'bn', label: 'Bengali' },
  { value: 'mr', label: 'Marathi' },
  { value: 'gu', label: 'Gujarati' },
];

const PERSONALITY_TRAITS = [
  'Professional',
  'Friendly',
  'Empathetic',
  'Confident',
  'Patient',
  'Enthusiastic',
  'Calm',
  'Persuasive',
];

export default function AIScriptBuilderPage() {
  const [templates, setTemplates] = useState<VoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VoiceTemplate | null>(null);
  const [activeSection, setActiveSection] = useState<string>('basic');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    industry: 'GENERAL',
    category: '',
    systemPrompt: '',
    greetingMessage: '',
    greetingMessageFormal: '',
    greetingMessageCasual: '',
    fallbackMessage: "I apologize, I didn't quite catch that. Could you please repeat?",
    transferMessage: "I'll connect you with a human agent who can better assist you.",
    endMessage: 'Thank you for your time. Have a great day!',
    afterHoursMessage: "We're currently closed. Our business hours are Monday to Saturday, 9 AM to 6 PM.",
    knowledgeBase: '',
    faqs: [] as Array<{ question: string; answer: string }>,
    questionTemplates: [] as string[],
    voiceId: 'maya',
    language: 'hi',
    temperature: 0.7,
    personalityTraits: ['Professional', 'Friendly'],
    responseSpeed: 'normal',
    maxDuration: 300,
    workingHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
    autoCreateLead: true,
    deduplicatePhone: true,
    appointmentBookingEnabled: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-templates');
      setTemplates(response.data.data || []);
    } catch {
      setToast({ type: 'error', message: 'Failed to load voice templates' });
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateEditor = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      industry: 'GENERAL',
      category: '',
      systemPrompt: '',
      greetingMessage: '',
      greetingMessageFormal: '',
      greetingMessageCasual: '',
      fallbackMessage: "I apologize, I didn't quite catch that. Could you please repeat?",
      transferMessage: "I'll connect you with a human agent who can better assist you.",
      endMessage: 'Thank you for your time. Have a great day!',
      afterHoursMessage: "We're currently closed. Our business hours are Monday to Saturday, 9 AM to 6 PM.",
      knowledgeBase: '',
      faqs: [],
      questionTemplates: [],
      voiceId: 'maya',
      language: 'hi',
      temperature: 0.7,
      personalityTraits: ['Professional', 'Friendly'],
      responseSpeed: 'normal',
      maxDuration: 300,
      workingHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
      autoCreateLead: true,
      deduplicatePhone: true,
      appointmentBookingEnabled: false,
    });
    setShowEditor(true);
    setActiveSection('basic');
  };

  const openEditEditor = (template: VoiceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      industry: template.industry || 'GENERAL',
      category: template.category || '',
      systemPrompt: template.systemPrompt,
      greetingMessage: template.greetingMessage,
      greetingMessageFormal: template.greetingMessageFormal || '',
      greetingMessageCasual: template.greetingMessageCasual || '',
      fallbackMessage: template.fallbackMessage,
      transferMessage: template.transferMessage,
      endMessage: template.endMessage,
      afterHoursMessage: template.afterHoursMessage || '',
      knowledgeBase: template.knowledgeBase || '',
      faqs: template.faqs || [],
      questionTemplates: template.questionTemplates || [],
      voiceId: template.voiceId,
      language: template.language,
      temperature: template.temperature,
      personalityTraits: template.personalityTraits || [],
      responseSpeed: template.responseSpeed || 'normal',
      maxDuration: template.maxDuration || 300,
      workingHours: template.workingHours || { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6] },
      autoCreateLead: template.autoCreateLead ?? true,
      deduplicatePhone: template.deduplicatePhone ?? true,
      appointmentBookingEnabled: template.appointmentBookingEnabled ?? false,
    });
    setShowEditor(true);
    setActiveSection('basic');
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    setTestMessage('');
    setTestResponse('');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setToast({ type: 'error', message: 'Script name is required' });
      return;
    }
    if (!formData.systemPrompt.trim()) {
      setToast({ type: 'error', message: 'System prompt is required' });
      return;
    }
    if (!formData.greetingMessage.trim()) {
      setToast({ type: 'error', message: 'Greeting message is required' });
      return;
    }

    try {
      setSaving(true);
      if (editingTemplate) {
        await api.put(`/voice-templates/${editingTemplate.id}`, formData);
        setToast({ type: 'success', message: 'Script updated successfully' });
      } else {
        await api.post('/voice-templates', formData);
        setToast({ type: 'success', message: 'Script created successfully' });
      }
      closeEditor();
      fetchTemplates();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save script' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this AI script? This action cannot be undone.')) return;

    try {
      await api.delete(`/voice-templates/${id}`);
      setToast({ type: 'success', message: 'Script deleted' });
      fetchTemplates();
    } catch {
      setToast({ type: 'error', message: 'Failed to delete script' });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/voice-templates/${id}/duplicate`);
      setToast({ type: 'success', message: 'Script duplicated' });
      fetchTemplates();
    } catch {
      setToast({ type: 'error', message: 'Failed to duplicate script' });
    }
  };

  const handleTest = async () => {
    if (!testMessage.trim()) {
      setToast({ type: 'error', message: 'Enter a test message' });
      return;
    }

    try {
      setTesting(true);
      const response = await api.post(`/voice-templates/${editingTemplate?.id}/test`, {
        message: testMessage,
      });
      setTestResponse(response.data.data?.response || 'No response received');
    } catch {
      setToast({ type: 'error', message: 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const addFaq = () => {
    setFormData(prev => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }],
    }));
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) => i === index ? { ...faq, [field]: value } : faq),
    }));
  };

  const removeFaq = (index: number) => {
    setFormData(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  const togglePersonality = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personalityTraits: prev.personalityTraits.includes(trait)
        ? prev.personalityTraits.filter(t => t !== trait)
        : [...prev.personalityTraits, trait],
    }));
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: Settings },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'voice', label: 'Voice Settings', icon: Volume2 },
    { id: 'knowledge', label: 'Knowledge Base', icon: HelpCircle },
    { id: 'advanced', label: 'Advanced', icon: Zap },
  ];

  return (
    <div className="p-6 max-w-6xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {!showEditor ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-4">
                <Link to="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Bot className="w-7 h-7 text-purple-600" />
                  AI Call Scripts
                </h1>
              </div>
              <p className="text-slate-500 mt-1 ml-14">
                Create voice AI scripts with conversation flows and testing
              </p>
            </div>
            <button
              onClick={openCreateEditor}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Script
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scripts..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-2"></div>
                  <div className="h-16 bg-slate-100 rounded"></div>
                </div>
              ))
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl p-8 text-center border border-slate-100">
                <Bot className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No AI scripts found</p>
                <button
                  onClick={openCreateEditor}
                  className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Create your first script
                </button>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-xl p-4 border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Bot className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{template.name}</h3>
                        <p className="text-xs text-slate-500">
                          {INDUSTRIES.find(i => i.value === template.industry)?.label || 'General'}
                        </p>
                      </div>
                    </div>
                    {template.isActive && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {template.greetingMessage}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      {VOICE_OPTIONS.find(v => v.value === template.voiceId)?.label?.split(' ')[0] || template.voiceId}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor((template.maxDuration || 300) / 60)}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {template.usageCount} calls
                    </span>
                  </div>

                  <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openEditEditor(template)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(template.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Editor View */
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Script
              </button>
              <button
                onClick={closeEditor}
                className="w-full py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editingTemplate ? 'Edit Script' : 'Create AI Script'}
            </h2>

            {/* Basic Info */}
            {activeSection === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Script Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Education Inquiry Handler"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {INDUSTRIES.map(ind => (
                        <option key={ind.value} value={ind.value}>{ind.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Inbound, Follow-up"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">System Prompt *</label>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[150px]"
                    placeholder="You are a helpful education counselor at ABC Institute. Your role is to answer queries about courses, fees, and admissions process..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This defines the AI's personality and role. Be specific about the context.
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {activeSection === 'messages' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Greeting Message *</label>
                  <textarea
                    value={formData.greetingMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, greetingMessage: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                    placeholder="Hello! Thank you for calling ABC Institute. I'm Maya, your virtual assistant. How may I help you today?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fallback Message</label>
                  <textarea
                    value={formData.fallbackMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="I apologize, I didn't quite catch that. Could you please repeat?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transfer Message</label>
                  <textarea
                    value={formData.transferMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, transferMessage: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="I'll connect you with a human agent who can better assist you."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Message</label>
                  <textarea
                    value={formData.endMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, endMessage: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Thank you for your time. Have a great day!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">After Hours Message</label>
                  <textarea
                    value={formData.afterHoursMessage}
                    onChange={(e) => setFormData(prev => ({ ...prev, afterHoursMessage: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="We're currently closed. Our business hours are..."
                  />
                </div>
              </div>
            )}

            {/* Voice Settings */}
            {activeSection === 'voice' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
                    <select
                      value={formData.voiceId}
                      onChange={(e) => setFormData(prev => ({ ...prev, voiceId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {VOICE_OPTIONS.map(v => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {LANGUAGES.map(l => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Creativity (Temperature): {formData.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>More Focused</span>
                    <span>More Creative</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Personality Traits</label>
                  <div className="flex flex-wrap gap-2">
                    {PERSONALITY_TRAITS.map(trait => (
                      <button
                        key={trait}
                        onClick={() => togglePersonality(trait)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          formData.personalityTraits.includes(trait)
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Call Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.maxDuration}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDuration: parseInt(e.target.value) || 300 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="60"
                    max="1800"
                  />
                </div>
              </div>
            )}

            {/* Knowledge Base */}
            {activeSection === 'knowledge' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Knowledge Base</label>
                  <textarea
                    value={formData.knowledgeBase}
                    onChange={(e) => setFormData(prev => ({ ...prev, knowledgeBase: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[150px]"
                    placeholder="Add information about your products, services, pricing, etc. The AI will use this to answer queries."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">FAQs</label>
                    <button
                      onClick={addFaq}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      + Add FAQ
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.faqs.map((faq, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) => updateFaq(index, 'question', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                              placeholder="Question"
                            />
                            <textarea
                              value={faq.answer}
                              onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                              placeholder="Answer"
                              rows={2}
                            />
                          </div>
                          <button
                            onClick={() => removeFaq(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {formData.faqs.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No FAQs added yet. Add common questions and answers.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced */}
            {activeSection === 'advanced' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoCreateLead}
                      onChange={(e) => setFormData(prev => ({ ...prev, autoCreateLead: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <div>
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Auto-create Lead
                      </span>
                      <span className="text-xs text-slate-500 block">
                        Automatically create a lead for new callers
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.deduplicatePhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, deduplicatePhone: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <div>
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Deduplication
                      </span>
                      <span className="text-xs text-slate-500 block">
                        Link calls from same phone number to existing lead
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.appointmentBookingEnabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointmentBookingEnabled: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <div>
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Appointment Booking
                      </span>
                      <span className="text-xs text-slate-500 block">
                        Allow AI to schedule appointments during calls
                      </span>
                    </div>
                  </label>
                </div>

                {/* Test Section */}
                {editingTemplate && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Test Conversation
                    </h4>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="Type a test message..."
                      />
                      <button
                        onClick={handleTest}
                        disabled={testing}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {testing ? 'Testing...' : 'Test'}
                      </button>
                    </div>
                    {testResponse && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-800">{testResponse}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
