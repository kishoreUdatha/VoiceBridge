/**
 * Sales Playbook Service
 * Handles guided sales processes, battle cards, and objection handling
 */

import { PrismaClient, PlaybookStatus, PlaybookStepStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface PlaybookStep {
  name: string;
  description?: string;
  order: number;
  type: 'call' | 'email' | 'meeting' | 'task' | 'approval';
  content?: Record<string, any>;
  scripts?: string[];
  objectionHandlers?: { objection: string; response: string }[];
  requiredFields?: string[];
  skipConditions?: Record<string, any>;
  autoActions?: Record<string, any>;
}

interface PlaybookConfig {
  name: string;
  description?: string;
  type: string;
  stages?: string[];
  steps: PlaybookStep[];
  targetCriteria?: Record<string, any>;
  battleCards?: { title: string; content: string; tags?: string[] }[];
  winThemes?: string[];
  competitorInfo?: Record<string, any>;
}

export const salesPlaybookService = {
  // Get all playbooks
  async getPlaybooks(organizationId: string, filters?: any) {
    const where: any = { organizationId, isActive: true };
    if (filters?.type) where.type = filters.type;
    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    return prisma.salesPlaybook.findMany({
      where,
      include: {
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Get single playbook
  async getPlaybook(id: string) {
    return prisma.salesPlaybook.findUnique({
      where: { id },
    });
  },

  // Create playbook
  async createPlaybook(organizationId: string, createdById: string, config: PlaybookConfig) {
    return prisma.salesPlaybook.create({
      data: {
        organizationId,
        name: config.name,
        description: config.description,
        type: config.type,
        stages: config.stages as any,
        steps: config.steps as any,
        targetCriteria: config.targetCriteria as any,
        battleCards: config.battleCards as any,
        winThemes: config.winThemes as any,
        competitorInfo: config.competitorInfo as any,
        createdById,
      },
    });
  },

  // Update playbook
  async updatePlaybook(id: string, updates: Partial<PlaybookConfig>) {
    return prisma.salesPlaybook.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        type: updates.type,
        stages: updates.stages as any,
        steps: updates.steps as any,
        targetCriteria: updates.targetCriteria as any,
        battleCards: updates.battleCards as any,
        winThemes: updates.winThemes as any,
        competitorInfo: updates.competitorInfo as any,
      },
    });
  },

  // Clone playbook
  async clonePlaybook(id: string, newName: string, userId: string) {
    const original = await prisma.salesPlaybook.findUnique({ where: { id } });
    if (!original) throw new Error('Playbook not found');

    return prisma.salesPlaybook.create({
      data: {
        organizationId: original.organizationId,
        name: newName,
        description: original.description,
        type: original.type,
        stages: original.stages,
        steps: original.steps,
        targetCriteria: original.targetCriteria,
        battleCards: original.battleCards,
        winThemes: original.winThemes,
        competitorInfo: original.competitorInfo,
        createdById: userId,
      },
    });
  },

  // Deactivate playbook
  async deactivatePlaybook(id: string) {
    return prisma.salesPlaybook.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // Get all executions
  async getExecutions(organizationId: string, filters?: any) {
    const where: any = { playbook: { organizationId } };

    if (filters?.playbookId) where.playbookId = filters.playbookId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.status) where.status = filters.status;

    return prisma.playbookExecution.findMany({
      where,
      include: {
        playbook: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: filters?.limit || 50,
    });
  },

  // Get single execution
  async getExecution(id: string) {
    return prisma.playbookExecution.findUnique({
      where: { id },
      include: { playbook: true },
    });
  },

  // Start playbook execution
  async startExecution(
    playbookId: string,
    userId: string,
    data: { leadId?: string; opportunityId?: string; accountId?: string }
  ) {
    const playbook = await prisma.salesPlaybook.findUnique({ where: { id: playbookId } });
    if (!playbook) throw new Error('Playbook not found');

    const steps = playbook.steps as PlaybookStep[];
    const firstStep = steps.find((s) => s.order === 0) || steps[0];

    const stepStatus: Record<string, PlaybookStepStatus> = {};
    steps.forEach((step) => {
      stepStatus[step.name] = step.order === 0 ? 'IN_PROGRESS' : 'PENDING';
    });

    return prisma.playbookExecution.create({
      data: {
        playbookId,
        userId,
        leadId: data.leadId,
        opportunityId: data.opportunityId,
        accountId: data.accountId,
        currentStep: firstStep?.name || 'Start',
        stepStatus: stepStatus as any,
        startedAt: new Date(),
      },
    });
  },

  // Complete a step
  async completeStep(executionId: string, stepName: string, notes?: string, outcome?: string) {
    const execution = await this.getExecution(executionId);
    if (!execution || !execution.playbook) throw new Error('Execution not found');

    const steps = execution.playbook.steps as PlaybookStep[];
    const currentIndex = steps.findIndex((s) => s.name === stepName);
    const nextStep = steps[currentIndex + 1];

    const stepStatus = execution.stepStatus as Record<string, PlaybookStepStatus>;
    stepStatus[stepName] = 'COMPLETED';

    const stepNotes = (execution.stepNotes as Record<string, string>) || {};
    if (notes) stepNotes[stepName] = notes;

    const stepOutcomes = (execution.stepOutcomes as Record<string, string>) || {};
    if (outcome) stepOutcomes[stepName] = outcome;

    const data: any = {
      stepStatus: stepStatus as any,
      stepNotes: stepNotes as any,
      stepOutcomes: stepOutcomes as any,
      completedSteps: { increment: 1 },
    };

    if (nextStep) {
      data.currentStep = nextStep.name;
      stepStatus[nextStep.name] = 'IN_PROGRESS';
    } else {
      data.status = 'COMPLETED';
      data.completedAt = new Date();
    }

    return prisma.playbookExecution.update({
      where: { id: executionId },
      data,
    });
  },

  // Skip a step
  async skipStep(executionId: string, stepName: string, reason: string) {
    const execution = await this.getExecution(executionId);
    if (!execution || !execution.playbook) throw new Error('Execution not found');

    const steps = execution.playbook.steps as PlaybookStep[];
    const currentIndex = steps.findIndex((s) => s.name === stepName);
    const nextStep = steps[currentIndex + 1];

    const stepStatus = execution.stepStatus as Record<string, PlaybookStepStatus>;
    stepStatus[stepName] = 'SKIPPED';

    const stepNotes = (execution.stepNotes as Record<string, string>) || {};
    stepNotes[stepName] = `Skipped: ${reason}`;

    const data: any = {
      stepStatus: stepStatus as any,
      stepNotes: stepNotes as any,
      skippedSteps: { increment: 1 },
    };

    if (nextStep) {
      data.currentStep = nextStep.name;
      stepStatus[nextStep.name] = 'IN_PROGRESS';
    } else {
      data.status = 'COMPLETED';
      data.completedAt = new Date();
    }

    return prisma.playbookExecution.update({
      where: { id: executionId },
      data,
    });
  },

  // Pause execution
  async pauseExecution(executionId: string) {
    return prisma.playbookExecution.update({
      where: { id: executionId },
      data: { status: 'PAUSED' },
    });
  },

  // Resume execution
  async resumeExecution(executionId: string) {
    return prisma.playbookExecution.update({
      where: { id: executionId },
      data: { status: 'IN_PROGRESS' },
    });
  },

  // Abandon execution
  async abandonExecution(executionId: string, reason: string) {
    const stepNotes = { _abandonReason: reason };
    return prisma.playbookExecution.update({
      where: { id: executionId },
      data: {
        status: 'ABANDONED',
        completedAt: new Date(),
        stepNotes: stepNotes as any,
      },
    });
  },

  // Get playbook analytics
  async getPlaybookAnalytics(playbookId: string) {
    const playbook = await prisma.salesPlaybook.findUnique({ where: { id: playbookId } });
    if (!playbook) return null;

    const executions = await prisma.playbookExecution.findMany({
      where: { playbookId },
    });

    const total = executions.length;
    const completed = executions.filter((e) => e.status === 'COMPLETED').length;
    const abandoned = executions.filter((e) => e.status === 'ABANDONED').length;
    const inProgress = executions.filter((e) => e.status === 'IN_PROGRESS').length;

    // Calculate step completion rates
    const steps = playbook.steps as PlaybookStep[];
    const stepStats: Record<string, { completed: number; skipped: number; total: number }> = {};

    steps.forEach((step) => {
      stepStats[step.name] = { completed: 0, skipped: 0, total: 0 };
    });

    executions.forEach((exec) => {
      const status = exec.stepStatus as Record<string, PlaybookStepStatus>;
      Object.entries(status).forEach(([stepName, stepStatus]) => {
        if (stepStats[stepName]) {
          stepStats[stepName].total++;
          if (stepStatus === 'COMPLETED') stepStats[stepName].completed++;
          if (stepStatus === 'SKIPPED') stepStats[stepName].skipped++;
        }
      });
    });

    // Calculate average completion time
    const completedExecutions = executions.filter((e) => e.completedAt && e.startedAt);
    let avgCompletionDays = 0;
    if (completedExecutions.length > 0) {
      const totalDays = completedExecutions.reduce((sum, e) => {
        return sum + (e.completedAt!.getTime() - e.startedAt.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgCompletionDays = totalDays / completedExecutions.length;
    }

    return {
      playbookId,
      playbookName: playbook.name,
      total,
      completed,
      abandoned,
      inProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      abandonmentRate: total > 0 ? (abandoned / total) * 100 : 0,
      avgCompletionDays,
      stepStats,
    };
  },

  // Get recommended playbook for lead
  async getRecommendedPlaybook(organizationId: string, leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { customFields: true },
    });

    if (!lead) return null;

    const playbooks = await prisma.salesPlaybook.findMany({
      where: { organizationId, isActive: true },
    });

    // Score each playbook based on target criteria match
    const scored = playbooks
      .map((playbook) => {
        const criteria = playbook.targetCriteria as Record<string, any>;
        if (!criteria) return { playbook, score: 0 };

        let score = 0;

        // Check stage match
        if (criteria.stages && criteria.stages.includes(lead.stage)) {
          score += 10;
        }

        // Check source match
        if (criteria.sources && criteria.sources.includes(lead.source)) {
          score += 5;
        }

        // Check custom field matches
        if (criteria.customFields && lead.customFields) {
          const fields = lead.customFields as Record<string, any>;
          Object.entries(criteria.customFields).forEach(([key, value]) => {
            if (fields[key] === value) score += 3;
          });
        }

        return { playbook, score };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored[0]?.playbook || null;
  },

  // Get objection handlers for a step
  async getObjectionHandlers(playbookId: string, stepName: string) {
    const playbook = await prisma.salesPlaybook.findUnique({ where: { id: playbookId } });
    if (!playbook) return [];

    const steps = playbook.steps as PlaybookStep[];
    const step = steps.find((s) => s.name === stepName);

    return step?.objectionHandlers || [];
  },

  // Get battle cards
  async getBattleCards(playbookId: string, tags?: string[]) {
    const playbook = await prisma.salesPlaybook.findUnique({ where: { id: playbookId } });
    if (!playbook) return [];

    let cards = (playbook.battleCards as { title: string; content: string; tags?: string[] }[]) || [];

    if (tags && tags.length > 0) {
      cards = cards.filter((card) => card.tags?.some((t) => tags.includes(t)));
    }

    return cards;
  },
};
