import { prisma } from '../config/database';

// Default column configurations for each table
const DEFAULT_COLUMNS: Record<string, Array<{ key: string; label: string; visible: boolean; order: number; width?: number }>> = {
  leads: [
    { key: 'name', label: 'Name', visible: true, order: 0, width: 200 },
    { key: 'email', label: 'Email', visible: true, order: 1, width: 220 },
    { key: 'phone', label: 'Phone', visible: true, order: 2, width: 140 },
    { key: 'source', label: 'Source', visible: true, order: 3, width: 120 },
    { key: 'status', label: 'Status', visible: true, order: 4, width: 120 },
    { key: 'stage', label: 'Stage', visible: true, order: 5, width: 130 },
    { key: 'assignedTo', label: 'Assigned To', visible: true, order: 6, width: 150 },
    { key: 'priority', label: 'Priority', visible: true, order: 7, width: 100 },
    { key: 'score', label: 'Score', visible: false, order: 8, width: 80 },
    { key: 'budget', label: 'Budget', visible: false, order: 9, width: 120 },
    { key: 'location', label: 'Location', visible: false, order: 10, width: 150 },
    { key: 'tags', label: 'Tags', visible: false, order: 11, width: 180 },
    { key: 'lastActivity', label: 'Last Activity', visible: true, order: 12, width: 150 },
    { key: 'createdAt', label: 'Created', visible: true, order: 13, width: 130 },
    { key: 'nextFollowUp', label: 'Next Follow-up', visible: false, order: 14, width: 140 },
  ],
  calls: [
    { key: 'leadName', label: 'Lead Name', visible: true, order: 0, width: 180 },
    { key: 'phone', label: 'Phone', visible: true, order: 1, width: 140 },
    { key: 'caller', label: 'Caller', visible: true, order: 2, width: 150 },
    { key: 'direction', label: 'Direction', visible: true, order: 3, width: 100 },
    { key: 'status', label: 'Status', visible: true, order: 4, width: 110 },
    { key: 'duration', label: 'Duration', visible: true, order: 5, width: 100 },
    { key: 'outcome', label: 'Outcome', visible: true, order: 6, width: 130 },
    { key: 'recording', label: 'Recording', visible: true, order: 7, width: 100 },
    { key: 'notes', label: 'Notes', visible: false, order: 8, width: 200 },
    { key: 'sentiment', label: 'Sentiment', visible: false, order: 9, width: 100 },
    { key: 'callAt', label: 'Call Time', visible: true, order: 10, width: 150 },
  ],
  tasks: [
    { key: 'title', label: 'Title', visible: true, order: 0, width: 250 },
    { key: 'type', label: 'Type', visible: true, order: 1, width: 110 },
    { key: 'priority', label: 'Priority', visible: true, order: 2, width: 100 },
    { key: 'status', label: 'Status', visible: true, order: 3, width: 110 },
    { key: 'assignedTo', label: 'Assigned To', visible: true, order: 4, width: 150 },
    { key: 'relatedTo', label: 'Related To', visible: true, order: 5, width: 180 },
    { key: 'dueDate', label: 'Due Date', visible: true, order: 6, width: 130 },
    { key: 'completedAt', label: 'Completed', visible: false, order: 7, width: 130 },
    { key: 'createdAt', label: 'Created', visible: false, order: 8, width: 130 },
  ],
  users: [
    { key: 'name', label: 'Name', visible: true, order: 0, width: 180 },
    { key: 'email', label: 'Email', visible: true, order: 1, width: 220 },
    { key: 'phone', label: 'Phone', visible: true, order: 2, width: 140 },
    { key: 'role', label: 'Role', visible: true, order: 3, width: 120 },
    { key: 'team', label: 'Team', visible: true, order: 4, width: 130 },
    { key: 'branch', label: 'Branch', visible: true, order: 5, width: 130 },
    { key: 'status', label: 'Status', visible: true, order: 6, width: 100 },
    { key: 'lastLogin', label: 'Last Login', visible: true, order: 7, width: 150 },
    { key: 'createdAt', label: 'Joined', visible: false, order: 8, width: 130 },
  ],
  payments: [
    { key: 'leadName', label: 'Lead Name', visible: true, order: 0, width: 180 },
    { key: 'amount', label: 'Amount', visible: true, order: 1, width: 120 },
    { key: 'category', label: 'Category', visible: true, order: 2, width: 130 },
    { key: 'method', label: 'Method', visible: true, order: 3, width: 120 },
    { key: 'status', label: 'Status', visible: true, order: 4, width: 110 },
    { key: 'reference', label: 'Reference', visible: true, order: 5, width: 150 },
    { key: 'receivedBy', label: 'Received By', visible: true, order: 6, width: 150 },
    { key: 'paymentDate', label: 'Date', visible: true, order: 7, width: 130 },
    { key: 'notes', label: 'Notes', visible: false, order: 8, width: 200 },
  ],
  campaigns: [
    { key: 'name', label: 'Campaign Name', visible: true, order: 0, width: 220 },
    { key: 'type', label: 'Type', visible: true, order: 1, width: 110 },
    { key: 'status', label: 'Status', visible: true, order: 2, width: 100 },
    { key: 'channel', label: 'Channel', visible: true, order: 3, width: 110 },
    { key: 'totalLeads', label: 'Total Leads', visible: true, order: 4, width: 100 },
    { key: 'reached', label: 'Reached', visible: true, order: 5, width: 100 },
    { key: 'converted', label: 'Converted', visible: true, order: 6, width: 100 },
    { key: 'startDate', label: 'Start Date', visible: true, order: 7, width: 130 },
    { key: 'endDate', label: 'End Date', visible: false, order: 8, width: 130 },
  ],
  followups: [
    { key: 'leadName', label: 'Lead Name', visible: true, order: 0, width: 180 },
    { key: 'type', label: 'Type', visible: true, order: 1, width: 100 },
    { key: 'priority', label: 'Priority', visible: true, order: 2, width: 100 },
    { key: 'status', label: 'Status', visible: true, order: 3, width: 110 },
    { key: 'assignedTo', label: 'Assigned To', visible: true, order: 4, width: 150 },
    { key: 'scheduledAt', label: 'Scheduled', visible: true, order: 5, width: 150 },
    { key: 'notes', label: 'Notes', visible: true, order: 6, width: 200 },
    { key: 'outcome', label: 'Outcome', visible: false, order: 7, width: 150 },
  ],
};

// ==================== COLUMN VISIBILITY ====================

// Get column visibility for a specific table
export const getColumnVisibility = async (userId: string, tableName: string) => {
  const visibility = await prisma.columnVisibility.findUnique({
    where: {
      userId_tableName: { userId, tableName },
    },
  });

  if (!visibility) {
    // Return default columns for this table
    return {
      tableName,
      columns: DEFAULT_COLUMNS[tableName] || [],
      sortColumn: null,
      sortDirection: 'asc',
    };
  }

  return visibility;
};

// Get all column visibility settings for a user
export const getAllColumnVisibility = async (userId: string) => {
  const visibilities = await prisma.columnVisibility.findMany({
    where: { userId },
  });

  // Merge with defaults
  const result: Record<string, any> = {};

  Object.keys(DEFAULT_COLUMNS).forEach((tableName) => {
    const existing = visibilities.find((v) => v.tableName === tableName);
    result[tableName] = existing || {
      tableName,
      columns: DEFAULT_COLUMNS[tableName],
      sortColumn: null,
      sortDirection: 'asc',
    };
  });

  return result;
};

// Update column visibility for a table
export const updateColumnVisibility = async (
  userId: string,
  tableName: string,
  data: {
    columns?: Array<{ key: string; label: string; visible: boolean; order: number; width?: number }>;
    sortColumn?: string;
    sortDirection?: string;
  }
) => {
  return prisma.columnVisibility.upsert({
    where: {
      userId_tableName: { userId, tableName },
    },
    create: {
      userId,
      tableName,
      columns: data.columns || DEFAULT_COLUMNS[tableName] || [],
      sortColumn: data.sortColumn,
      sortDirection: data.sortDirection || 'asc',
    },
    update: {
      ...(data.columns && { columns: data.columns }),
      ...(data.sortColumn !== undefined && { sortColumn: data.sortColumn }),
      ...(data.sortDirection && { sortDirection: data.sortDirection }),
    },
  });
};

// Toggle column visibility
export const toggleColumnVisibility = async (
  userId: string,
  tableName: string,
  columnKey: string,
  visible: boolean
) => {
  const current = await getColumnVisibility(userId, tableName);
  const columns = (current.columns as any[]) || DEFAULT_COLUMNS[tableName] || [];

  const updatedColumns = columns.map((col: any) =>
    col.key === columnKey ? { ...col, visible } : col
  );

  return updateColumnVisibility(userId, tableName, { columns: updatedColumns });
};

// Reorder columns
export const reorderColumns = async (
  userId: string,
  tableName: string,
  columnOrders: Array<{ key: string; order: number }>
) => {
  const current = await getColumnVisibility(userId, tableName);
  const columns = (current.columns as any[]) || DEFAULT_COLUMNS[tableName] || [];

  const orderMap = new Map(columnOrders.map((c) => [c.key, c.order]));
  const updatedColumns = columns
    .map((col: any) => ({
      ...col,
      order: orderMap.has(col.key) ? orderMap.get(col.key)! : col.order,
    }))
    .sort((a: any, b: any) => a.order - b.order);

  return updateColumnVisibility(userId, tableName, { columns: updatedColumns });
};

// Reset column visibility to defaults
export const resetColumnVisibility = async (userId: string, tableName: string) => {
  await prisma.columnVisibility.deleteMany({
    where: { userId, tableName },
  });

  return {
    tableName,
    columns: DEFAULT_COLUMNS[tableName] || [],
    sortColumn: null,
    sortDirection: 'asc',
  };
};

// Reset all column visibility to defaults
export const resetAllColumnVisibility = async (userId: string) => {
  await prisma.columnVisibility.deleteMany({
    where: { userId },
  });

  return Object.entries(DEFAULT_COLUMNS).reduce((acc, [tableName, columns]) => {
    acc[tableName] = {
      tableName,
      columns,
      sortColumn: null,
      sortDirection: 'asc',
    };
    return acc;
  }, {} as Record<string, any>);
};

export const columnVisibilityService = {
  getColumnVisibility,
  getAllColumnVisibility,
  updateColumnVisibility,
  toggleColumnVisibility,
  reorderColumns,
  resetColumnVisibility,
  resetAllColumnVisibility,
  DEFAULT_COLUMNS,
};
