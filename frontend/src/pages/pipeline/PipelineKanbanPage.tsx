/**
 * Pipeline Kanban Page
 * Visual drag-drop pipeline management with deal velocity tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Avatar,
  Badge,
  CircularProgress,
  Alert,
  Tooltip,
  Menu,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import pipelineKanbanService, {
  PipelineView,
  PipelineColumn,
  KanbanCard,
  PipelineStats,
  PipelineViewConfig,
  ColumnConfig,
} from '../../services/pipeline-kanban.service';

// Sortable Card Component
const SortableCard = ({ card, columnId }: { card: KanbanCard; columnId: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { columnId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        p: 2,
        mb: 1,
        cursor: 'grab',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Typography variant="subtitle2" fontWeight="medium">
        {card.title}
      </Typography>
      {card.subtitle && (
        <Typography variant="body2" color="textSecondary">
          {card.subtitle}
        </Typography>
      )}
      <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
        {card.assignee && (
          <Tooltip title={`${card.assignee.firstName} ${card.assignee.lastName}`}>
            <Avatar
              sx={{ width: 24, height: 24, fontSize: 12 }}
              src={card.assignee.avatar}
            >
              {card.assignee.firstName?.[0]}
            </Avatar>
          </Tooltip>
        )}
        {card.velocity && (
          <Box display="flex" alignItems="center" gap={0.5}>
            {card.velocity.isStalled && (
              <Tooltip title={`Stalled for ${card.velocity.daysInStage} days`}>
                <WarningIcon color="warning" sx={{ fontSize: 16 }} />
              </Tooltip>
            )}
            <Typography variant="caption" color="textSecondary">
              {card.velocity.daysInStage}d
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// Column Component
const KanbanColumn = ({
  column,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
}: {
  column: PipelineColumn;
  onAddCard: (columnId: string) => void;
  onEditColumn: (column: PipelineColumn) => void;
  onDeleteColumn: (columnId: string) => void;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isOverLimit = column.wipLimit && (column.count || 0) > column.wipLimit;

  return (
    <Box
      sx={{
        width: 300,
        minWidth: 300,
        bgcolor: 'background.default',
        borderRadius: 2,
        p: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          p: 1,
          borderRadius: 1,
          bgcolor: column.color || '#e3f2fd',
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="subtitle1" fontWeight="medium">
            {column.name}
          </Typography>
          <Badge
            badgeContent={column.count || 0}
            color={isOverLimit ? 'error' : 'primary'}
            max={999}
          />
        </Box>
        <Box>
          <IconButton size="small" onClick={() => onAddCard(column.id)}>
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => { onEditColumn(column); setAnchorEl(null); }}>
              <EditIcon sx={{ mr: 1 }} fontSize="small" /> Edit
            </MenuItem>
            <MenuItem onClick={() => { onDeleteColumn(column.id); setAnchorEl(null); }}>
              <DeleteIcon sx={{ mr: 1 }} fontSize="small" /> Delete
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {column.wipLimit && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(((column.count || 0) / column.wipLimit) * 100, 100)}
            color={isOverLimit ? 'error' : 'primary'}
          />
          <Typography variant="caption" color="textSecondary">
            {column.count || 0} / {column.wipLimit} WIP limit
          </Typography>
        </Box>
      )}

      <SortableContext
        items={column.leads?.map((c) => c.id) || []}
        strategy={horizontalListSortingStrategy}
      >
        <Box sx={{ minHeight: 200 }}>
          {column.leads?.map((card) => (
            <SortableCard key={card.id} card={card} columnId={column.id} />
          ))}
          {(!column.leads || column.leads.length === 0) && (
            <Typography
              variant="body2"
              color="textSecondary"
              textAlign="center"
              sx={{ py: 4 }}
            >
              No leads in this stage
            </Typography>
          )}
        </Box>
      </SortableContext>
    </Box>
  );
};

const PipelineKanbanPage: React.FC = () => {
  const { t } = useTranslation();
  const [pipelineViews, setPipelineViews] = useState<PipelineView[]>([]);
  const [selectedView, setSelectedView] = useState<PipelineView | null>(null);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);

  const [createViewDialogOpen, setCreateViewDialogOpen] = useState(false);
  const [createColumnDialogOpen, setCreateColumnDialogOpen] = useState(false);
  const [editColumnDialogOpen, setEditColumnDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<PipelineColumn | null>(null);

  const [viewFormData, setViewFormData] = useState<Partial<PipelineViewConfig>>({
    name: '',
    description: '',
    type: 'KANBAN',
    stageField: 'stage',
    cardFields: [],
  });

  const [columnFormData, setColumnFormData] = useState<Partial<ColumnConfig>>({
    name: '',
    stageValue: '',
    position: 0,
    color: '#e3f2fd',
    wipLimit: undefined,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadPipelineViews();
  }, []);

  useEffect(() => {
    if (selectedView) {
      loadPipelineData(selectedView.id);
    }
  }, [selectedView?.id]);

  const loadPipelineViews = async () => {
    try {
      setLoading(true);
      const views = await pipelineKanbanService.getPipelineViews();
      setPipelineViews(views);
      if (views.length > 0 && !selectedView) {
        setSelectedView(views[0]);
      }
    } catch (error) {
      console.error('Failed to load pipeline views:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPipelineData = async (viewId: string) => {
    try {
      const [viewData, statsData] = await Promise.all([
        pipelineKanbanService.getPipelineView(viewId),
        pipelineKanbanService.getPipelineStats(viewId),
      ]);
      setSelectedView(viewData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load pipeline data:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = selectedView?.columns
      .flatMap((c) => c.leads || [])
      .find((c) => c.id === active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !selectedView) return;

    const activeColumnId = active.data.current?.columnId;
    const overColumnId = over.data.current?.columnId || over.id;

    if (activeColumnId === overColumnId) return;

    const sourceColumn = selectedView.columns.find((c) => c.id === activeColumnId);
    const targetColumn = selectedView.columns.find((c) => c.id === overColumnId);

    if (!sourceColumn || !targetColumn) return;

    try {
      await pipelineKanbanService.moveCard(
        selectedView.id,
        active.id as string,
        sourceColumn.stageValue,
        targetColumn.stageValue
      );
      loadPipelineData(selectedView.id);
    } catch (error) {
      console.error('Failed to move card:', error);
    }
  };

  const handleCreateView = async () => {
    try {
      await pipelineKanbanService.createPipelineView(viewFormData as PipelineViewConfig);
      setCreateViewDialogOpen(false);
      setViewFormData({ name: '', description: '', type: 'KANBAN', stageField: 'stage', cardFields: [] });
      loadPipelineViews();
    } catch (error) {
      console.error('Failed to create view:', error);
    }
  };

  const handleCreateColumn = async () => {
    if (!selectedView) return;
    try {
      await pipelineKanbanService.createColumn(selectedView.id, {
        ...columnFormData,
        position: selectedView.columns.length,
      } as ColumnConfig);
      setCreateColumnDialogOpen(false);
      setColumnFormData({ name: '', stageValue: '', position: 0, color: '#e3f2fd' });
      loadPipelineData(selectedView.id);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const handleEditColumn = (column: PipelineColumn) => {
    setSelectedColumn(column);
    setColumnFormData({
      name: column.name,
      stageValue: column.stageValue,
      color: column.color || '#e3f2fd',
      wipLimit: column.wipLimit,
    });
    setEditColumnDialogOpen(true);
  };

  const handleUpdateColumn = async () => {
    if (!selectedColumn) return;
    try {
      await pipelineKanbanService.updateColumn(selectedColumn.id, columnFormData);
      setEditColumnDialogOpen(false);
      setSelectedColumn(null);
      if (selectedView) {
        loadPipelineData(selectedView.id);
      }
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!window.confirm('Are you sure you want to delete this column?')) return;
    try {
      await pipelineKanbanService.deleteColumn(columnId);
      if (selectedView) {
        loadPipelineData(selectedView.id);
      }
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4">Pipeline</Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={selectedView?.id || ''}
              onChange={(e) => {
                const view = pipelineViews.find((v) => v.id === e.target.value);
                setSelectedView(view || null);
              }}
              displayEmpty
            >
              {pipelineViews.map((view) => (
                <MenuItem key={view.id} value={view.id}>
                  {view.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => selectedView && loadPipelineData(selectedView.id)}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateColumnDialogOpen(true)}
            sx={{ mr: 1 }}
            disabled={!selectedView}
          >
            Add Column
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateViewDialogOpen(true)}
          >
            New View
          </Button>
        </Box>
      </Box>

      {/* Stats Bar */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">{stats.totalLeads}</Typography>
              <Typography variant="body2" color="textSecondary">
                Total Leads
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">
                {stats.totalValue.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pipeline Value
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">
                {stats.avgDaysPerStage?.toFixed(1) || '-'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Avg Days/Stage
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color={stats.stalledDeals > 0 ? 'warning.main' : 'inherit'}>
                {stats.stalledDeals}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Stalled Deals
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Kanban Board */}
      {selectedView ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              pb: 2,
              minHeight: 500,
            }}
          >
            {selectedView.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onAddCard={() => {}}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}
          </Box>
          <DragOverlay>
            {activeCard && (
              <Paper sx={{ p: 2, width: 280 }}>
                <Typography variant="subtitle2">{activeCard.title}</Typography>
              </Paper>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <Alert severity="info">
          No pipeline view selected. Create a new view to get started.
        </Alert>
      )}

      {/* Create View Dialog */}
      <Dialog
        open={createViewDialogOpen}
        onClose={() => setCreateViewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Pipeline View</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="View Name"
                value={viewFormData.name}
                onChange={(e) => setViewFormData({ ...viewFormData, name: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={viewFormData.description}
                onChange={(e) =>
                  setViewFormData({ ...viewFormData, description: e.target.value })
                }
              />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>View Type</InputLabel>
                <Select
                  value={viewFormData.type}
                  label="View Type"
                  onChange={(e) =>
                    setViewFormData({ ...viewFormData, type: e.target.value as any })
                  }
                >
                  <MenuItem value="KANBAN">Kanban Board</MenuItem>
                  <MenuItem value="LIST">List View</MenuItem>
                  <MenuItem value="TIMELINE">Timeline</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Stage Field</InputLabel>
                <Select
                  value={viewFormData.stageField}
                  label="Stage Field"
                  onChange={(e) =>
                    setViewFormData({ ...viewFormData, stageField: e.target.value })
                  }
                >
                  <MenuItem value="stage">Lead Stage</MenuItem>
                  <MenuItem value="status">Status</MenuItem>
                  <MenuItem value="priority">Priority</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateViewDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateView}
            disabled={!viewFormData.name}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Column Dialog */}
      <Dialog
        open={createColumnDialogOpen || editColumnDialogOpen}
        onClose={() => {
          setCreateColumnDialogOpen(false);
          setEditColumnDialogOpen(false);
          setSelectedColumn(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editColumnDialogOpen ? 'Edit Column' : 'Create Column'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Column Name"
                value={columnFormData.name}
                onChange={(e) =>
                  setColumnFormData({ ...columnFormData, name: e.target.value })
                }
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Stage Value"
                value={columnFormData.stageValue}
                onChange={(e) =>
                  setColumnFormData({ ...columnFormData, stageValue: e.target.value })
                }
                helperText="The value that represents this stage (e.g., 'new', 'qualified')"
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Color"
                type="color"
                value={columnFormData.color}
                onChange={(e) =>
                  setColumnFormData({ ...columnFormData, color: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="WIP Limit"
                type="number"
                value={columnFormData.wipLimit || ''}
                onChange={(e) =>
                  setColumnFormData({
                    ...columnFormData,
                    wipLimit: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                helperText="Leave empty for no limit"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateColumnDialogOpen(false);
              setEditColumnDialogOpen(false);
              setSelectedColumn(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editColumnDialogOpen ? handleUpdateColumn : handleCreateColumn}
            disabled={!columnFormData.name || !columnFormData.stageValue}
          >
            {editColumnDialogOpen ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelineKanbanPage;
