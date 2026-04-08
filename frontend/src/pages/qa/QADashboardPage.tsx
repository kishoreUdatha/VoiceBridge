/**
 * QA Dashboard Page
 * Quality Assurance module for call review and agent coaching
 */

import { useState, useEffect } from 'react';
import {
  ClipboardDocumentCheckIcon,
  PhoneIcon,
  UserIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  ArrowPathIcon,
  PlusIcon,
  StarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  qaService,
  QATemplate,
  QAReview,
  PendingCall,
  QADashboard,
  ScoreCriterion,
  DEFAULT_CRITERIA,
} from '../../services/qa.service';

type TabType = 'dashboard' | 'pending' | 'reviews' | 'templates';

export default function QADashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<QADashboard | null>(null);
  const [pendingCalls, setPendingCalls] = useState<PendingCall[]>([]);
  const [reviews, setReviews] = useState<QAReview[]>([]);
  const [templates, setTemplates] = useState<QATemplate[]>([]);

  // Modals
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<PendingCall | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<QATemplate | null>(null);

  // Review form
  const [reviewForm, setReviewForm] = useState<{
    templateId: string;
    scores: { [key: string]: number };
    notes: { [key: string]: string };
    strengths: string;
    improvements: string;
    coachingNotes: string;
  }>({
    templateId: '',
    scores: {},
    notes: {},
    strengths: '',
    improvements: '',
    coachingNotes: '',
  });

  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    criteria: DEFAULT_CRITERIA,
    passingScore: 70,
    isDefault: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardData, pendingData, reviewsData, templatesData] = await Promise.all([
        qaService.getDashboard(),
        qaService.getPendingCalls({ limit: 20 }),
        qaService.getReviews({ limit: 20 }),
        qaService.getTemplates(),
      ]);

      setDashboard(dashboardData);
      setPendingCalls(pendingData.data);
      setReviews(reviewsData.data);
      setTemplates(templatesData);

      // Set default template
      if (templatesData.length > 0) {
        const defaultTemplate = templatesData.find(t => t.isDefault) || templatesData[0];
        setReviewForm(prev => ({ ...prev, templateId: defaultTemplate.id }));
      }
    } catch (error) {
      console.error('Failed to load QA data:', error);
      toast.error('Failed to load QA data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = (call: PendingCall) => {
    setSelectedCall(call);
    setReviewForm({
      templateId: templates.find(t => t.isDefault)?.id || templates[0]?.id || '',
      scores: {},
      notes: {},
      strengths: '',
      improvements: '',
      coachingNotes: '',
    });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (asDraft: boolean = false) => {
    if (!selectedCall || !reviewForm.templateId) return;

    const template = templates.find(t => t.id === reviewForm.templateId);
    if (!template) return;

    const scores = template.criteria.map(c => ({
      criterionId: c.id,
      score: reviewForm.scores[c.id] || 0,
      notes: reviewForm.notes[c.id] || '',
    }));

    try {
      await qaService.createReview({
        callLogId: selectedCall.id,
        templateId: reviewForm.templateId,
        agentId: selectedCall.user?.id || '',
        scores,
        strengths: reviewForm.strengths,
        improvements: reviewForm.improvements,
        coachingNotes: reviewForm.coachingNotes,
        status: asDraft ? 'DRAFT' : 'SUBMITTED',
      });

      toast.success(asDraft ? 'Review saved as draft' : 'Review submitted successfully');
      setShowReviewModal(false);
      loadData();
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await qaService.createTemplate({
        name: templateForm.name,
        description: templateForm.description,
        criteria: templateForm.criteria,
        passingScore: templateForm.passingScore,
        isDefault: templateForm.isDefault,
      });

      toast.success('Template created successfully');
      setShowTemplateModal(false);
      loadData();
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const currentTemplate = templates.find(t => t.id === reviewForm.templateId);

  const calculateTotalScore = () => {
    if (!currentTemplate) return { score: 0, max: 0, percentage: 0 };
    const score = Object.values(reviewForm.scores).reduce((sum, s) => sum + (s || 0), 0);
    const max = currentTemplate.totalMaxScore;
    return { score, max, percentage: max > 0 ? Math.round((score / max) * 100) : 0 };
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <ArrowPathIcon className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Assurance</h1>
          <p className="text-slate-500 mt-1">Review calls, score agents, and track quality metrics</p>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {[
            { key: 'dashboard', label: 'Overview', icon: ChartBarIcon },
            { key: 'pending', label: 'Review Queue', icon: PhoneIcon },
            { key: 'reviews', label: 'Completed Reviews', icon: ClipboardDocumentCheckIcon },
            { key: 'templates', label: 'Score Templates', icon: DocumentTextIcon },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`py-3 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Reviews</p>
                  <p className="text-xl font-bold text-slate-900">{dashboard.totalReviews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <PhoneIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pending Reviews</p>
                  <p className="text-xl font-bold text-slate-900">{dashboard.pendingReviews}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <StarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Average Score</p>
                  <p className="text-xl font-bold text-slate-900">{dashboard.averageScore}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pass Rate</p>
                  <p className="text-xl font-bold text-slate-900">{dashboard.passRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top & Bottom Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <StarIcon className="w-5 h-5 text-yellow-500" />
                Top Performers
              </h3>
              <div className="space-y-3">
                {dashboard.topPerformers.map((agent, index) => (
                  <div key={agent.agentId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{agent.agentName}</p>
                      <p className="text-xs text-slate-500">{agent.reviewCount} reviews</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{agent.averageScore}%</span>
                  </div>
                ))}
                {dashboard.topPerformers.length === 0 && (
                  <p className="text-slate-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <XCircleIcon className="w-5 h-5 text-red-500" />
                Needs Improvement
              </h3>
              <div className="space-y-3">
                {dashboard.needsImprovement.map((agent) => (
                  <div key={agent.agentId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{agent.agentName}</p>
                      <p className="text-xs text-slate-500">{agent.reviewCount} reviews</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600">{agent.averageScore}%</span>
                  </div>
                ))}
                {dashboard.needsImprovement.length === 0 && (
                  <p className="text-slate-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Calls Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lead</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pendingCalls.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No calls pending review
                    </td>
                  </tr>
                ) : (
                  pendingCalls.map(call => (
                    <tr key={call.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary-700">
                              {call.user?.firstName?.[0]}{call.user?.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {call.user?.firstName} {call.user?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{call.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-900">
                          {call.lead?.firstName} {call.lead?.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{call.lead?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-500">
                        {new Date(call.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {call.recordingUrl && (
                            <button
                              onClick={() => window.open(call.recordingUrl, '_blank')}
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Play recording"
                            >
                              <PlayIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartReview(call)}
                            className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reviewer</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      No reviews yet
                    </td>
                  </tr>
                ) : (
                  reviews.map(review => (
                    <tr key={review.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">
                          {review.agent?.firstName} {review.agent?.lastName}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600">
                          {review.reviewer?.firstName} {review.reviewer?.lastName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${review.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {review.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          review.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {review.passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-slate-900">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                  )}
                </div>
                {template.isDefault && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                    Default
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Criteria:</span>
                  <span className="text-slate-900">{template.criteria.length} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Max Score:</span>
                  <span className="text-slate-900">{template.totalMaxScore} points</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Passing:</span>
                  <span className="text-slate-900">{template.passingScore}%</span>
                </div>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No templates yet. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedCall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Review Call</h2>
              <p className="text-sm text-slate-500">
                Agent: {selectedCall.user?.firstName} {selectedCall.user?.lastName}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Scoring Template
                </label>
                <select
                  value={reviewForm.templateId}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, templateId: e.target.value, scores: {}, notes: {} }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Score Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Total Score</span>
                  <span className={`text-2xl font-bold ${
                    calculateTotalScore().percentage >= (currentTemplate?.passingScore || 70)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {calculateTotalScore().score} / {calculateTotalScore().max} ({calculateTotalScore().percentage}%)
                  </span>
                </div>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      calculateTotalScore().percentage >= (currentTemplate?.passingScore || 70)
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${calculateTotalScore().percentage}%` }}
                  />
                </div>
              </div>

              {/* Criteria Scoring */}
              {currentTemplate && (
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Score Each Criterion</h3>
                  {currentTemplate.criteria.map((criterion: ScoreCriterion) => (
                    <div key={criterion.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-slate-900">{criterion.name}</p>
                          <p className="text-sm text-slate-500">{criterion.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={criterion.maxScore}
                            value={reviewForm.scores[criterion.id] || ''}
                            onChange={(e) => setReviewForm(prev => ({
                              ...prev,
                              scores: { ...prev.scores, [criterion.id]: parseInt(e.target.value) || 0 }
                            }))}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-center"
                          />
                          <span className="text-sm text-slate-500">/ {criterion.maxScore}</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={reviewForm.notes[criterion.id] || ''}
                        onChange={(e) => setReviewForm(prev => ({
                          ...prev,
                          notes: { ...prev.notes, [criterion.id]: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Strengths</label>
                  <textarea
                    value={reviewForm.strengths}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, strengths: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                    placeholder="What did the agent do well?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Areas for Improvement</label>
                  <textarea
                    value={reviewForm.improvements}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, improvements: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                    placeholder="What could be improved?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Coaching Notes</label>
                  <textarea
                    value={reviewForm.coachingNotes}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, coachingNotes: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                    placeholder="Suggestions for the agent"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitReview(true)}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSubmitReview(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Scoring Template</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="e.g., Standard Sales Call"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Passing Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={templateForm.passingScore}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, passingScore: parseInt(e.target.value) || 70 }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={templateForm.isDefault}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="isDefault" className="text-sm text-slate-700">Set as default</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Scoring Criteria</label>
                <p className="text-xs text-slate-500 mb-3">Using default criteria. You can customize this later.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {templateForm.criteria.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm text-slate-700">{c.name}</span>
                      <span className="text-sm text-slate-500">{c.maxScore} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!templateForm.name}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
