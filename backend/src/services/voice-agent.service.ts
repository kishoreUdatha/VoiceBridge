/**
 * Voice Agent Service - Single Responsibility Principle
 * Handles CRUD operations for voice agents
 */

import { VoiceAgentIndustry } from '@prisma/client';
import { prisma } from '../config/database';
import { INDUSTRY_TEMPLATES, getIndustryTemplate } from '../config/voice-agent-templates.config';


/**
 * Create a new voice agent
 */
export async function createAgent(data: {
  organizationId: string;
  name: string;
  industry: VoiceAgentIndustry;
  customPrompt?: string;
  customQuestions?: any[];
  createdById?: string;
}) {
  const template = getIndustryTemplate(data.industry);

  return await prisma.voiceAgent.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      industry: data.industry,
      systemPrompt: data.customPrompt || template.systemPrompt,
      questions: data.customQuestions || template.questions,
      greeting: template.greeting,
      faqs: template.faqs,
      fallbackMessage: "I'm sorry, I didn't quite understand that. Could you please rephrase?",
      transferMessage: "Let me connect you with a human agent who can better assist you.",
      endMessage: "Thank you for your time. Have a great day!",
      createdById: data.createdById,
    },
  });
}

/**
 * Get agent by ID with session count
 */
export async function getAgent(agentId: string) {
  return await prisma.voiceAgent.findUnique({
    where: { id: agentId },
    include: {
      _count: {
        select: { sessions: true },
      },
    },
  });
}

/**
 * Get all agents for an organization
 */
export async function getAgents(organizationId: string) {
  return await prisma.voiceAgent.findMany({
    where: { organizationId },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      phoneNumbers: {
        select: {
          id: true,
          number: true,
          displayNumber: true,
        },
        where: {
          status: 'ASSIGNED',
        },
      },
      _count: {
        select: { sessions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update agent configuration
 */
export async function updateAgent(agentId: string, data: any) {
  return await prisma.voiceAgent.update({
    where: { id: agentId },
    data,
  });
}

/**
 * Delete agent
 */
export async function deleteAgent(agentId: string) {
  return await prisma.voiceAgent.delete({
    where: { id: agentId },
  });
}

/**
 * Get agent with organization settings
 */
export async function getAgentWithOrganization(agentId: string) {
  return await prisma.voiceAgent.findUnique({
    where: { id: agentId },
    include: {
      organization: {
        select: { settings: true },
      },
    },
  });
}

/**
 * Get industry template
 */
export function getTemplate(industry: VoiceAgentIndustry) {
  return getIndustryTemplate(industry);
}

/**
 * Get all templates summary
 */
export function getAllTemplates() {
  return Object.entries(INDUSTRY_TEMPLATES).map(([key, value]) => ({
    industry: key,
    name: value.name,
    description: value.systemPrompt.substring(0, 100) + '...',
  }));
}

/**
 * Search agents by name or industry (for global search)
 */
export async function searchAgents(organizationId: string, search: string, limit: number = 5) {
  return await prisma.voiceAgent.findMany({
    where: {
      organizationId,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      industry: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export const voiceAgentService = {
  createAgent,
  getAgent,
  getAgents,
  updateAgent,
  deleteAgent,
  getAgentWithOrganization,
  getTemplate,
  getAllTemplates,
  searchAgents,
};

export default voiceAgentService;
