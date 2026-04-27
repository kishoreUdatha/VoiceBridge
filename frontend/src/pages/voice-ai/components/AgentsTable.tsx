/**
 * Agents Table Component
 * Displays list of voice agents in table format
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EllipsisHorizontalIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  TrashIcon,
  CodeBracketIcon,
  PhoneIcon,
  CheckCircleIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import { VoiceAgent } from '../voice-agents.types';
import { formatDate, industryLabels } from '../voice-agents.constants';

interface AgentsTableProps {
  agents: VoiceAgent[];
  loading: boolean;
  openMenuId: string | null;
  copiedId: string | null;
  onMenuToggle: (id: string | null) => void;
  onToggleAgent: (agentId: string, isActive: boolean) => void;
  onDeleteAgent: (agentId: string, name: string) => void;
  onCopyEmbedCode: (agentId: string) => void;
}

export const AgentsTable: React.FC<AgentsTableProps> = ({
  agents,
  loading,
  openMenuId,
  copiedId,
  onMenuToggle,
  onToggleAgent,
  onDeleteAgent,
  onCopyEmbedCode,
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PhoneIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
        <p className="text-gray-500 mb-6">Create your first AI voice agent to get started</p>
        <button
          onClick={() => navigate('/voice-ai/new')}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
        >
          Create your first agent
        </button>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-3 text-sm font-medium text-gray-500">Name</th>
          <th className="text-left py-3 text-sm font-medium text-gray-500">Status</th>
          <th className="text-left py-3 text-sm font-medium text-gray-500">Industry</th>
          <th className="text-left py-3 text-sm font-medium text-gray-500">Phone Number</th>
          <th className="text-left py-3 text-sm font-medium text-gray-500">Calls</th>
          <th className="text-left py-3 text-sm font-medium text-gray-500">Created by</th>
          <th className="text-left py-3 text-sm font-medium text-gray-500">
            <span className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700">
              Created at
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </th>
          <th className="w-10"></th>
        </tr>
      </thead>
      <tbody>
        {agents.map((agent) => (
          <tr
            key={agent.id}
            className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => {
              navigate(`/voice-ai/agents/${agent.id}`);
            }}
          >
            <td className="py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                {agent.language && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                    {agent.language}
                  </span>
                )}
              </div>
            </td>
            <td className="py-4">
              {agent.status === 'PUBLISHED' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                  <CheckCircleIcon className="w-3 h-3" />
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  <DocumentIcon className="w-3 h-3" />
                  Draft
                </span>
              )}
            </td>
            <td className="py-4">
              <span className="text-sm text-gray-600">
                {industryLabels[agent.industry] || agent.industry}
              </span>
            </td>
            <td className="py-4">
              {agent.phoneNumbers && agent.phoneNumbers.length > 0 ? (
                <div className="flex items-center gap-1">
                  <PhoneIcon className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-sm text-gray-900 font-mono">
                    {agent.phoneNumbers[0].displayNumber || agent.phoneNumbers[0].number}
                  </span>
                  {agent.phoneNumbers.length > 1 && (
                    <span className="text-xs text-gray-400">+{agent.phoneNumbers.length - 1}</span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Not assigned</span>
              )}
            </td>
            <td className="py-4">
              <span className="text-sm text-gray-600">{agent._count?.sessions || 0}</span>
            </td>
            <td className="py-4">
              <span className="text-sm text-gray-600">
                {agent.createdBy ? `${agent.createdBy.firstName} ${agent.createdBy.lastName}` : 'Unknown'}
              </span>
            </td>
            <td className="py-4">
              <span className="text-sm text-gray-600">{formatDate(agent.createdAt)}</span>
            </td>
            <td className="py-4">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuToggle(openMenuId === agent.id ? null : agent.id);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400" />
                </button>

                {openMenuId === agent.id && (
                  <div
                    className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        navigate(`/voice-ai/agents/${agent.id}`);
                        onMenuToggle(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Configure
                    </button>
                    <button
                      onClick={() => {
                        onCopyEmbedCode(agent.id);
                        onMenuToggle(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CodeBracketIcon className="w-4 h-4" />
                      {copiedId === agent.id ? 'Copied!' : 'Copy embed code'}
                    </button>
                    <button
                      onClick={() => {
                        onToggleAgent(agent.id, agent.isActive);
                        onMenuToggle(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      {agent.isActive ? (
                        <>
                          <PauseIcon className="w-4 h-4" />
                          Pause agent
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          Activate agent
                        </>
                      )}
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        onDeleteAgent(agent.id, agent.name);
                        onMenuToggle(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AgentsTable;
