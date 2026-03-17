import React, { useState } from 'react';
import { GripVertical, Plus, X } from 'lucide-react';

interface Question {
  question: string;
  field: string;
}

interface PromptsTabContentProps {
  systemPrompt: string;
  questions: Question[];
  onUpdateSystemPrompt: (prompt: string) => void;
  onUpdateQuestions: (questions: Question[]) => void;
}

export const PromptsTabContent: React.FC<PromptsTabContentProps> = ({
  systemPrompt,
  questions,
  onUpdateSystemPrompt,
  onUpdateQuestions,
}) => {
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionField, setNewQuestionField] = useState('info');

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      onUpdateQuestions([...questions, { question: newQuestion.trim(), field: newQuestionField }]);
      setNewQuestion('');
      setNewQuestionField('info');
    }
  };

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onUpdateQuestions(newQuestions);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newQuestion.trim()) {
      e.preventDefault();
      handleAddQuestion();
    }
  };

  const fieldOptions = [
    { value: 'info', label: 'General Info' },
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'company', label: 'Company' },
    { value: 'designation', label: 'Designation' },
    { value: 'location', label: 'Location/City' },
    { value: 'budget', label: 'Budget' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'requirements', label: 'Requirements' },
    { value: 'interest', label: 'Interest Level' },
    { value: 'experience', label: 'Experience' },
    { value: 'currentRole', label: 'Current Role' },
    { value: 'availability', label: 'Availability' },
    { value: 'custom', label: 'Custom Field' },
  ];

  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">System Prompt</label>
          <p className="text-xs text-gray-500 mt-0.5">Define your agent's behavior and knowledge.</p>
        </div>
        <div className="flex-1">
          <textarea
            value={systemPrompt}
            onChange={(e) => onUpdateSystemPrompt(e.target.value)}
            rows={8}
            placeholder="You are a helpful voice assistant for our company. Your role is to..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition resize-none font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-2">
            Tip: Be specific about your agent's role, knowledge, and how it should handle different scenarios.
          </p>
        </div>
      </div>

      {/* Questions to Ask */}
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Questions</label>
          <p className="text-xs text-gray-500 mt-0.5">Questions your agent will ask callers to collect information.</p>
        </div>
        <div className="flex-1">
          {/* Existing Questions */}
          <div className="space-y-2 mb-4">
            {questions.map((q, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition"
              >
                <GripVertical size={14} className="text-gray-300 cursor-grab" />
                <span className="text-gray-500 text-sm font-medium w-6">{idx + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{q.question || String(q)}</p>
                  {q.field && (
                    <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded mt-1 inline-block">
                      Collects: {q.field}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveQuestion(idx)}
                  className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} className="text-red-500" />
                </button>
              </div>
            ))}
            {questions.length === 0 && (
              <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
                <p className="text-sm text-gray-400">
                  No questions added yet. Add questions below to collect information from callers.
                </p>
              </div>
            )}
          </div>

          {/* Add New Question Form */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <p className="text-sm font-medium text-gray-700 mb-3">Add New Question</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Question</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g., May I know your name please?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Collect as field</label>
                  <select
                    value={newQuestionField}
                    onChange={(e) => setNewQuestionField(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                  >
                    {fieldOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddQuestion}
                    disabled={!newQuestion.trim()}
                    className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Tip: Questions are asked in order. The AI will naturally weave these into the conversation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PromptsTabContent;
