/**
 * Workflow Builder Page
 * Visual drag-drop interface for creating automation workflows
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Phone as PhoneIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  FilterAlt as FilterIcon,
  PersonAdd as AssignIcon,
  Label as TagIcon,
  Webhook as WebhookIcon,
  Timer as WaitIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import workflowAutomationService, {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  TriggerType,
  WorkflowTemplate,
  WorkflowConfig,
} from '../../services/workflow-automation.service';

// Custom node component
const CustomNode = ({ data }: { data: any }) => {
  const getNodeIcon = () => {
    switch (data.type) {
      case 'condition':
        return <FilterIcon />;
      case 'send_email':
        return <EmailIcon />;
      case 'send_sms':
        return <SmsIcon />;
      case 'send_whatsapp':
        return <PhoneIcon />;
      case 'create_task':
        return <TaskIcon />;
      case 'schedule_call':
        return <ScheduleIcon />;
      case 'assign_user':
        return <AssignIcon />;
      case 'add_tag':
        return <TagIcon />;
      case 'webhook':
        return <WebhookIcon />;
      case 'wait':
        return <WaitIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        minWidth: 150,
        borderRadius: 2,
        borderLeft: `4px solid ${data.color || '#2196f3'}`,
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        {getNodeIcon()}
        <Typography variant="body2" fontWeight="medium">
          {data.label}
        </Typography>
      </Box>
      {data.description && (
        <Typography variant="caption" color="textSecondary">
          {data.description}
        </Typography>
      )}
    </Paper>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const WorkflowBuilderPage: React.FC = () => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [nodeTypesList, setNodeTypesList] = useState<NodeType[]>([]);
  const [triggerTypes, setTriggerTypes] = useState<TriggerType[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Form state
  const [formData, setFormData] = useState<Partial<WorkflowConfig>>({
    name: '',
    description: '',
    triggerType: 'MANUAL',
    nodes: [],
    edges: [],
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [nodeConfigOpen, setNodeConfigOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workflowsData, nodesData, triggersData, templatesData] = await Promise.all([
        workflowAutomationService.getWorkflows(),
        workflowAutomationService.getNodeTypes(),
        workflowAutomationService.getTriggerTypes(),
        workflowAutomationService.getTemplates(),
      ]);
      setWorkflows(workflowsData);
      setNodeTypesList(nodesData);
      setTriggerTypes(triggersData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const nodeType = nodeTypesList.find((n) => n.type === type);
      if (!nodeType) return;

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: nodeType.name,
          type: nodeType.type,
          color: getCategoryColor(nodeType.category),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodeTypesList, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
    setNodeConfigOpen(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'logic':
        return '#9c27b0';
      case 'communication':
        return '#2196f3';
      case 'action':
        return '#4caf50';
      case 'integration':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      if (!formData.name || !formData.triggerType) return;
      const workflow = await workflowAutomationService.createWorkflow({
        ...formData,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      } as WorkflowConfig);
      setCreateDialogOpen(false);
      setIsEditing(false);
      loadData();
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;
    try {
      await workflowAutomationService.updateWorkflow(selectedWorkflow.id, {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      });
      loadData();
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const handleToggleWorkflow = async (workflow: WorkflowDefinition) => {
    try {
      await workflowAutomationService.toggleWorkflow(workflow.id);
      loadData();
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await workflowAutomationService.deleteWorkflow(id);
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
        setIsEditing(false);
        setNodes([]);
        setEdges([]);
      }
      loadData();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleEditWorkflow = (workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setIsEditing(true);
    setNodes(
      workflow.nodes.map((n) => ({
        id: n.id,
        type: 'custom',
        position: n.position,
        data: n.data,
      }))
    );
    setEdges(
      workflow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }))
    );
    setDrawerOpen(false);
  };

  const handleLoadTemplate = (template: WorkflowTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
    });
    setNodes(
      template.nodes.map((n) => ({
        id: n.id,
        type: 'custom',
        position: n.position,
        data: n.data,
      }))
    );
    setEdges(
      template.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }))
    );
    setCreateDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex' }}>
      {/* Node Palette Sidebar */}
      <Box
        sx={{
          width: 250,
          borderRight: 1,
          borderColor: 'divider',
          p: 2,
          overflow: 'auto',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Node Types
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {['logic', 'communication', 'action', 'integration'].map((category) => (
          <Box key={category} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Typography>
            {nodeTypesList
              .filter((n) => n.category === category)
              .map((nodeType) => (
                <Paper
                  key={nodeType.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', nodeType.type);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  sx={{
                    p: 1,
                    mb: 1,
                    cursor: 'grab',
                    borderLeft: `3px solid ${getCategoryColor(category)}`,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Typography variant="body2">{nodeType.name}</Typography>
                </Paper>
              ))}
          </Box>
        ))}
      </Box>

      {/* Main Canvas */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-right">
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => setDrawerOpen(true)}
              >
                Workflows
              </Button>
              {isEditing && selectedWorkflow && (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveWorkflow}
                >
                  Save
                </Button>
              )}
              {!isEditing && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setNodes([]);
                    setEdges([]);
                    setCreateDialogOpen(true);
                  }}
                >
                  New Workflow
                </Button>
              )}
            </Box>
          </Panel>
        </ReactFlow>
      </Box>

      {/* Workflows List Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 400, p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Workflows</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            Templates
          </Typography>
          {templates.map((template) => (
            <Card key={template.id} sx={{ mb: 1 }}>
              <CardContent sx={{ py: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {template.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {template.description}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => handleLoadTemplate(template)}>
                    Use
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}

          <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 3, mb: 1 }}>
            Your Workflows
          </Typography>
          {workflows.map((workflow) => (
            <Card key={workflow.id} sx={{ mb: 1 }}>
              <CardContent sx={{ py: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {workflow.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={workflow.triggerType}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={workflow.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={workflow.isActive ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleEditWorkflow(workflow)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
          {workflows.length === 0 && (
            <Alert severity="info">No workflows created yet.</Alert>
          )}
        </Box>
      </Drawer>

      {/* Create Workflow Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Workflow Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Trigger Type</InputLabel>
                <Select
                  value={formData.triggerType}
                  label="Trigger Type"
                  onChange={(e) =>
                    setFormData({ ...formData, triggerType: e.target.value })
                  }
                >
                  {triggerTypes.map((trigger) => (
                    <MenuItem key={trigger.type} value={trigger.type}>
                      {trigger.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateWorkflow}
            disabled={!formData.name || !formData.triggerType}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Node Config Dialog */}
      <Dialog
        open={nodeConfigOpen}
        onClose={() => setNodeConfigOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configure Node: {selectedNode?.data?.label}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary">
            Configure the settings for this node.
          </Typography>
          {/* Node-specific configuration fields would go here */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeConfigOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => setNodeConfigOpen(false)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowBuilderPage;
