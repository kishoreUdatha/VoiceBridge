import { prisma } from '../config/database';

// Default priority levels
const DEFAULT_PRIORITY_LEVELS = [
  { id: 'hot', name: 'Hot', color: '#EF4444', minScore: 80, maxScore: 100, slaHours: 4, autoAssign: true },
  { id: 'warm', name: 'Warm', color: '#F59E0B', minScore: 50, maxScore: 79, slaHours: 24, autoAssign: true },
  { id: 'cold', name: 'Cold', color: '#3B82F6', minScore: 20, maxScore: 49, slaHours: 72, autoAssign: false },
  { id: 'ice', name: 'Ice', color: '#6B7280', minScore: 0, maxScore: 19, slaHours: 168, autoAssign: false },
];

// Default scoring rules
const DEFAULT_SCORING_RULES = [
  { id: '1', name: 'Premium Budget', field: 'budget', operator: 'greaterThan', value: 500000, points: 20, isActive: true, order: 0 },
  { id: '2', name: 'High-Intent Source', field: 'source', operator: 'in', value: ['Google Ads', 'Facebook Ads', 'Direct'], points: 15, isActive: true, order: 1 },
  { id: '3', name: 'Quick Response', field: 'responseTime', operator: 'lessThan', value: 60, points: 10, isActive: true, order: 2 },
  { id: '4', name: 'Multiple Interactions', field: 'interactionCount', operator: 'greaterThan', value: 3, points: 10, isActive: true, order: 3 },
];

// ==================== LEAD PRIORITY SETTINGS ====================

// Get lead priority settings for organization
export const getLeadPrioritySettings = async (organizationId: string) => {
  let settings = await prisma.leadPrioritySettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    return {
      organizationId,
      priorityLevels: DEFAULT_PRIORITY_LEVELS,
      scoringRules: DEFAULT_SCORING_RULES,
      autoScoringEnabled: true,
      recalculateOnUpdate: true,
      escalationEnabled: true,
      escalationThreshold: 24,
    };
  }

  return {
    ...settings,
    priorityLevels: settings.priorityLevels as any[],
    scoringRules: settings.scoringRules as any[],
  };
};

// Update lead priority settings
export const updateLeadPrioritySettings = async (
  organizationId: string,
  data: Partial<{
    priorityLevels: any[];
    scoringRules: any[];
    autoScoringEnabled: boolean;
    recalculateOnUpdate: boolean;
    escalationEnabled: boolean;
    escalationThreshold: number;
  }>
) => {
  return prisma.leadPrioritySettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      priorityLevels: data.priorityLevels || DEFAULT_PRIORITY_LEVELS,
      scoringRules: data.scoringRules || DEFAULT_SCORING_RULES,
      autoScoringEnabled: data.autoScoringEnabled ?? true,
      recalculateOnUpdate: data.recalculateOnUpdate ?? true,
      escalationEnabled: data.escalationEnabled ?? true,
      escalationThreshold: data.escalationThreshold ?? 24,
    },
    update: {
      ...(data.priorityLevels && { priorityLevels: data.priorityLevels }),
      ...(data.scoringRules && { scoringRules: data.scoringRules }),
      ...(data.autoScoringEnabled !== undefined && { autoScoringEnabled: data.autoScoringEnabled }),
      ...(data.recalculateOnUpdate !== undefined && { recalculateOnUpdate: data.recalculateOnUpdate }),
      ...(data.escalationEnabled !== undefined && { escalationEnabled: data.escalationEnabled }),
      ...(data.escalationThreshold !== undefined && { escalationThreshold: data.escalationThreshold }),
    },
  });
};

// ==================== PRIORITY LEVELS ====================

// Get priority levels
export const getPriorityLevels = async (organizationId: string) => {
  const settings = await getLeadPrioritySettings(organizationId);
  return settings.priorityLevels;
};

// Update priority levels
export const updatePriorityLevels = async (
  organizationId: string,
  priorityLevels: Array<{
    id: string;
    name: string;
    color: string;
    minScore: number;
    maxScore: number;
    slaHours: number;
    autoAssign: boolean;
  }>
) => {
  return updateLeadPrioritySettings(organizationId, { priorityLevels });
};

// Add priority level
export const addPriorityLevel = async (
  organizationId: string,
  level: {
    id: string;
    name: string;
    color: string;
    minScore: number;
    maxScore: number;
    slaHours: number;
    autoAssign: boolean;
  }
) => {
  const settings = await getLeadPrioritySettings(organizationId);
  const priorityLevels = [...settings.priorityLevels, level];
  return updatePriorityLevels(organizationId, priorityLevels);
};

// Update single priority level
export const updatePriorityLevel = async (
  organizationId: string,
  levelId: string,
  data: Partial<{
    name: string;
    color: string;
    minScore: number;
    maxScore: number;
    slaHours: number;
    autoAssign: boolean;
  }>
) => {
  const settings = await getLeadPrioritySettings(organizationId);
  const priorityLevels = settings.priorityLevels.map((level: any) =>
    level.id === levelId ? { ...level, ...data } : level
  );
  return updatePriorityLevels(organizationId, priorityLevels);
};

// Delete priority level
export const deletePriorityLevel = async (organizationId: string, levelId: string) => {
  const settings = await getLeadPrioritySettings(organizationId);
  const priorityLevels = settings.priorityLevels.filter((level: any) => level.id !== levelId);
  return updatePriorityLevels(organizationId, priorityLevels);
};

// ==================== SCORING RULES ====================

// Get scoring rules
export const getScoringRules = async (organizationId: string) => {
  const settings = await getLeadPrioritySettings(organizationId);
  return settings.scoringRules;
};

// Update all scoring rules
export const updateScoringRules = async (
  organizationId: string,
  scoringRules: Array<{
    id: string;
    name: string;
    field: string;
    operator: string;
    value: any;
    points: number;
    isActive: boolean;
    order: number;
  }>
) => {
  return updateLeadPrioritySettings(organizationId, { scoringRules });
};

// Add scoring rule
export const addScoringRule = async (
  organizationId: string,
  rule: {
    id: string;
    name: string;
    field: string;
    operator: string;
    value: any;
    points: number;
    isActive?: boolean;
    order?: number;
  }
) => {
  const settings = await getLeadPrioritySettings(organizationId);
  const scoringRules = [
    ...settings.scoringRules,
    { ...rule, isActive: rule.isActive ?? true, order: rule.order ?? settings.scoringRules.length },
  ];
  return updateScoringRules(organizationId, scoringRules);
};

// Update single scoring rule
export const updateScoringRule = async (
  organizationId: string,
  ruleId: string,
  data: Partial<{
    name: string;
    field: string;
    operator: string;
    value: any;
    points: number;
    isActive: boolean;
    order: number;
  }>
) => {
  const settings = await getLeadPrioritySettings(organizationId);
  const scoringRules = settings.scoringRules.map((rule: any) =>
    rule.id === ruleId ? { ...rule, ...data } : rule
  );
  return updateScoringRules(organizationId, scoringRules);
};

// Delete scoring rule
export const deleteScoringRule = async (organizationId: string, ruleId: string) => {
  const settings = await getLeadPrioritySettings(organizationId);
  const scoringRules = settings.scoringRules.filter((rule: any) => rule.id !== ruleId);
  return updateScoringRules(organizationId, scoringRules);
};

// Toggle scoring rule active status
export const toggleScoringRule = async (organizationId: string, ruleId: string) => {
  const settings = await getLeadPrioritySettings(organizationId);
  const scoringRules = settings.scoringRules.map((rule: any) =>
    rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
  );
  return updateScoringRules(organizationId, scoringRules);
};

// ==================== LEAD SCORING CALCULATION ====================

// Calculate lead score based on rules
export const calculateLeadScore = async (
  organizationId: string,
  leadData: Record<string, any>
) => {
  const settings = await getLeadPrioritySettings(organizationId);

  if (!settings.autoScoringEnabled) {
    return { score: 0, matchedRules: [] };
  }

  let totalScore = 0;
  const matchedRules: any[] = [];

  for (const rule of settings.scoringRules.filter((r: any) => r.isActive)) {
    const fieldValue = leadData[rule.field];
    let matches = false;

    switch (rule.operator) {
      case 'equals':
        matches = fieldValue === rule.value;
        break;
      case 'notEquals':
        matches = fieldValue !== rule.value;
        break;
      case 'contains':
        matches = String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
        break;
      case 'greaterThan':
        matches = Number(fieldValue) > Number(rule.value);
        break;
      case 'lessThan':
        matches = Number(fieldValue) < Number(rule.value);
        break;
      case 'greaterThanOrEqual':
        matches = Number(fieldValue) >= Number(rule.value);
        break;
      case 'lessThanOrEqual':
        matches = Number(fieldValue) <= Number(rule.value);
        break;
      case 'in':
        matches = Array.isArray(rule.value) && rule.value.includes(fieldValue);
        break;
      case 'notIn':
        matches = Array.isArray(rule.value) && !rule.value.includes(fieldValue);
        break;
      case 'isEmpty':
        matches = !fieldValue || fieldValue === '';
        break;
      case 'isNotEmpty':
        matches = !!fieldValue && fieldValue !== '';
        break;
      default:
        matches = false;
    }

    if (matches) {
      totalScore += rule.points;
      matchedRules.push(rule);
    }
  }

  // Clamp score between 0 and 100
  totalScore = Math.max(0, Math.min(100, totalScore));

  return { score: totalScore, matchedRules };
};

// Get priority level for a score
export const getPriorityForScore = async (organizationId: string, score: number) => {
  const settings = await getLeadPrioritySettings(organizationId);

  for (const level of settings.priorityLevels) {
    if (score >= level.minScore && score <= level.maxScore) {
      return level;
    }
  }

  // Return lowest priority if no match
  return settings.priorityLevels[settings.priorityLevels.length - 1];
};

// Reset priority settings to defaults
export const resetLeadPrioritySettings = async (organizationId: string) => {
  return prisma.leadPrioritySettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      priorityLevels: DEFAULT_PRIORITY_LEVELS,
      scoringRules: DEFAULT_SCORING_RULES,
      autoScoringEnabled: true,
      recalculateOnUpdate: true,
      escalationEnabled: true,
      escalationThreshold: 24,
    },
    update: {
      priorityLevels: DEFAULT_PRIORITY_LEVELS,
      scoringRules: DEFAULT_SCORING_RULES,
      autoScoringEnabled: true,
      recalculateOnUpdate: true,
      escalationEnabled: true,
      escalationThreshold: 24,
    },
  });
};

export const leadPrioritySettingsService = {
  getLeadPrioritySettings,
  updateLeadPrioritySettings,
  getPriorityLevels,
  updatePriorityLevels,
  addPriorityLevel,
  updatePriorityLevel,
  deletePriorityLevel,
  getScoringRules,
  updateScoringRules,
  addScoringRule,
  updateScoringRule,
  deleteScoringRule,
  toggleScoringRule,
  calculateLeadScore,
  getPriorityForScore,
  resetLeadPrioritySettings,
  DEFAULT_PRIORITY_LEVELS,
  DEFAULT_SCORING_RULES,
};
