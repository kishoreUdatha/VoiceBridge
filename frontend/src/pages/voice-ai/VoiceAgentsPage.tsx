/**
 * Voice Agents Page
 * Main page for managing AI voice agents
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useVoiceAgents, useTemplates } from './hooks';
import { AgentsTable, BrowseTemplatesModal } from './components';
import TemplatePreviewModal from '../voice-templates/TemplatePreviewModal';

export const VoiceAgentsPage: React.FC = () => {
  const navigate = useNavigate();

  // Agents state and actions
  const {
    loading,
    searchQuery,
    openMenuId,
    copiedId,
    filterCreator,
    filterArchived,
    filterStatus,
    filteredAgents,
    setSearchQuery,
    setOpenMenuId,
    setFilterCreator,
    setFilterArchived,
    setFilterStatus,
    toggleAgent,
    deleteAgent,
    copyEmbedCode,
  } = useVoiceAgents();

  // Templates state and actions
  const {
    templates,
    showTemplatesModal,
    templateSearch,
    selectedCategory,
    selectedTemplate,
    previewTemplate,
    previewTab,
    previewLoading,
    filteredTemplates,
    isPlayingGreeting,
    chatMessages,
    chatInput,
    isSendingMessage,
    audioRef,
    chatEndRef,
    setShowTemplatesModal,
    setTemplateSearch,
    setSelectedCategory,
    setSelectedTemplate,
    setPreviewTemplate,
    setPreviewTab,
    setPreviewLoading,
    setChatInput,
    initializeTemplates,
    useTemplate,
    playGreeting,
    sendMessage,
    closeTemplatesModal,
  } = useTemplates();

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Search */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">Agents</h1>

          {/* Search - centered and flexible */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent bg-gray-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600"
            >
              Templates
            </button>
            <button
              onClick={() => navigate('/voice-ai/new')}
              className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-1.5 text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              New agent
            </button>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                filterStatus === 'ALL'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('PUBLISHED')}
              className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${
                filterStatus === 'PUBLISHED'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Published
            </button>
            <button
              onClick={() => setFilterStatus('DRAFT')}
              className={`px-2.5 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${
                filterStatus === 'DRAFT'
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Draft
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200" />

          <button
            onClick={() => setFilterCreator(!filterCreator)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              filterCreator
                ? 'bg-gray-100 border-gray-300 text-gray-900'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            + Creator
          </button>
          <button
            onClick={() => setFilterArchived(!filterArchived)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              filterArchived
                ? 'bg-gray-100 border-gray-300 text-gray-900'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            + Archived
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-4">
        <AgentsTable
          agents={filteredAgents}
          loading={loading}
          openMenuId={openMenuId}
          copiedId={copiedId}
          onMenuToggle={setOpenMenuId}
          onToggleAgent={toggleAgent}
          onDeleteAgent={deleteAgent}
          onCopyEmbedCode={copyEmbedCode}
        />
      </div>

      {/* Browse Templates Modal */}
      {showTemplatesModal && (
        <BrowseTemplatesModal
          templates={templates}
          filteredTemplates={filteredTemplates}
          selectedTemplate={selectedTemplate}
          templateSearch={templateSearch}
          selectedCategory={selectedCategory}
          previewTab={previewTab}
          previewLoading={previewLoading}
          isPlayingGreeting={isPlayingGreeting}
          chatMessages={chatMessages}
          chatInput={chatInput}
          isSendingMessage={isSendingMessage}
          audioRef={audioRef}
          chatEndRef={chatEndRef}
          onClose={closeTemplatesModal}
          onTemplateSearch={setTemplateSearch}
          onCategoryChange={setSelectedCategory}
          onTemplateSelect={(template) => {
            setSelectedTemplate(template);
            setPreviewLoading(true);
            setTimeout(() => setPreviewLoading(false), 300);
          }}
          onPreviewTabChange={setPreviewTab}
          onUseTemplate={useTemplate}
          onViewDetails={setPreviewTemplate}
          onPlayGreeting={playGreeting}
          onChatInputChange={setChatInput}
          onSendMessage={sendMessage}
          onInitializeTemplates={initializeTemplates}
        />
      )}

      {/* Full Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
};

export default VoiceAgentsPage;
