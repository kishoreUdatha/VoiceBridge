/**
 * Batch Operations Page
 * Bulk operations on leads with audit trail and rollback support
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  PlayArrow as RunIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Undo as UndoIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import batchOperationsService, {
  BatchOperation,
  BatchOperationConfig,
  OperationTypeInfo,
  BatchOperationType,
  SelectionType,
} from '../../services/batch-operations.service';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const BatchOperationsPage: React.FC = () => {
  const { t } = useTranslation();
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [operationTypes, setOperationTypes] = useState<OperationTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BatchOperation | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Form state
  const [formData, setFormData] = useState<Partial<BatchOperationConfig>>({
    name: '',
    type: 'UPDATE_FIELD',
    selectionType: 'SELECTED',
    selectedIds: [],
    operationData: {},
  });

  const steps = ['Select Operation', 'Choose Targets', 'Configure', 'Review'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [operationsData, typesData] = await Promise.all([
        batchOperationsService.getBatchOperations(),
        batchOperationsService.getOperationTypes(),
      ]);
      setOperations(operationsData);
      setOperationTypes(typesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperation = async () => {
    try {
      await batchOperationsService.createBatchOperation(formData as BatchOperationConfig);
      setCreateDialogOpen(false);
      setFormData({
        name: '',
        type: 'UPDATE_FIELD',
        selectionType: 'SELECTED',
        selectedIds: [],
        operationData: {},
      });
      setActiveStep(0);
      loadData();
    } catch (error) {
      console.error('Failed to create operation:', error);
    }
  };

  const handleRollback = async (id: string) => {
    if (!window.confirm('Are you sure you want to rollback this operation? This will restore all affected records to their previous state.')) return;
    try {
      await batchOperationsService.rollbackBatchOperation(id);
      loadData();
    } catch (error) {
      console.error('Failed to rollback:', error);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await batchOperationsService.pauseBatchOperation(id);
      loadData();
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await batchOperationsService.resumeBatchOperation(id);
      loadData();
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this operation?')) return;
    try {
      await batchOperationsService.cancelBatchOperation(id);
      loadData();
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const operation = await batchOperationsService.getBatchOperation(id);
      setSelectedOperation(operation);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Failed to load details:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'RUNNING':
        return 'info';
      case 'FAILED':
      case 'CANCELLED':
        return 'error';
      case 'PAUSED':
        return 'warning';
      case 'ROLLED_BACK':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <SuccessIcon color="success" />;
      case 'RUNNING':
        return <CircularProgress size={20} />;
      case 'FAILED':
        return <ErrorIcon color="error" />;
      case 'PAUSED':
        return <PauseIcon color="warning" />;
      case 'PENDING':
        return <PendingIcon color="action" />;
      default:
        return null;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography variant="subtitle1" gutterBottom>
                Select Operation Type
              </Typography>
              <Grid container spacing={2}>
                {operationTypes.map((type, idx) => (
                  <Grid size={{ xs: 12, md: 6 }} key={idx}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: formData.type === type.type ? 2 : 1,
                        borderColor: formData.type === type.type ? 'primary.main' : 'divider',
                      }}
                      onClick={() => setFormData({ ...formData, type: type.type as BatchOperationType })}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">{type.name}</Typography>
                          {type.canRollback && (
                            <Chip label="Rollback" size="small" color="success" variant="outlined" />
                          )}
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          {type.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography variant="subtitle1" gutterBottom>
                Select Target Records
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={formData.selectionType}
                  onChange={(e) => setFormData({ ...formData, selectionType: e.target.value as SelectionType })}
                >
                  <FormControlLabel
                    value="SELECTED"
                    control={<Radio />}
                    label="Selected records only"
                  />
                  <FormControlLabel
                    value="FILTERED"
                    control={<Radio />}
                    label="All records matching current filter"
                  />
                  <FormControlLabel
                    value="ALL"
                    control={<Radio />}
                    label="All records in organization"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
            {formData.selectionType === 'SELECTED' && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Record IDs (comma-separated)"
                  multiline
                  rows={3}
                  value={formData.selectedIds?.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      selectedIds: e.target.value.split(',').map((id) => id.trim()).filter(Boolean),
                    })
                  }
                  helperText="Enter lead IDs separated by commas"
                />
              </Grid>
            )}
            {(formData.selectionType === 'FILTERED' || formData.selectionType === 'ALL') && (
              <Grid size={12}>
                <Alert severity="warning">
                  This will affect {formData.selectionType === 'ALL' ? 'ALL' : 'filtered'} records.
                  Please review carefully before proceeding.
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography variant="subtitle1" gutterBottom>
                Configure Operation
              </Typography>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Operation Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                helperText="A descriptive name for this batch operation"
              />
            </Grid>
            {formData.type === 'UPDATE_FIELD' && (
              <>
                <Grid size={6}>
                  <FormControl fullWidth>
                    <InputLabel>Field to Update</InputLabel>
                    <Select
                      value={formData.operationData?.field || ''}
                      label="Field to Update"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          operationData: { ...formData.operationData, field: e.target.value },
                        })
                      }
                    >
                      <MenuItem value="source">Source</MenuItem>
                      <MenuItem value="priority">Priority</MenuItem>
                      <MenuItem value="city">City</MenuItem>
                      <MenuItem value="state">State</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    label="New Value"
                    value={formData.operationData?.value || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operationData: { ...formData.operationData, value: e.target.value },
                      })
                    }
                  />
                </Grid>
              </>
            )}
            {formData.type === 'UPDATE_STAGE' && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Stage ID"
                  value={formData.operationData?.stageId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      operationData: { ...formData.operationData, stageId: e.target.value },
                    })
                  }
                />
              </Grid>
            )}
            {formData.type === 'ASSIGN_USER' && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="User ID"
                  value={formData.operationData?.userId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      operationData: { ...formData.operationData, userId: e.target.value },
                    })
                  }
                />
              </Grid>
            )}
            {(formData.type === 'ADD_TAGS' || formData.type === 'REMOVE_TAGS') && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Tag IDs (comma-separated)"
                  value={formData.operationData?.tagIds?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      operationData: {
                        ...formData.operationData,
                        tagIds: e.target.value.split(',').map((id) => id.trim()).filter(Boolean),
                      },
                    })
                  }
                />
              </Grid>
            )}
          </Grid>
        );

      case 3:
        const selectedType = operationTypes.find((t) => t.type === formData.type);
        return (
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography variant="subtitle1" gutterBottom>
                Review Operation
              </Typography>
            </Grid>
            <Grid size={12}>
              <Paper sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="body2" color="textSecondary">
                      Operation Name
                    </Typography>
                    <Typography variant="body1">{formData.name || 'Unnamed'}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="textSecondary">
                      Operation Type
                    </Typography>
                    <Typography variant="body1">{selectedType?.name}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="textSecondary">
                      Selection Type
                    </Typography>
                    <Typography variant="body1">{formData.selectionType}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="textSecondary">
                      Can Rollback
                    </Typography>
                    <Typography variant="body1">
                      {selectedType?.canRollback ? 'Yes' : 'No'}
                    </Typography>
                  </Grid>
                  {formData.selectionType === 'SELECTED' && (
                    <Grid size={12}>
                      <Typography variant="body2" color="textSecondary">
                        Selected Records
                      </Typography>
                      <Typography variant="body1">
                        {formData.selectedIds?.length || 0} records
                      </Typography>
                    </Grid>
                  )}
                  <Grid size={12}>
                    <Typography variant="body2" color="textSecondary">
                      Operation Data
                    </Typography>
                    <Typography variant="body1" component="pre" sx={{ fontSize: 12 }}>
                      {JSON.stringify(formData.operationData, null, 2)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {!selectedType?.canRollback && (
              <Grid size={12}>
                <Alert severity="warning">
                  <WarningIcon sx={{ mr: 1 }} />
                  This operation cannot be rolled back. Please review carefully.
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      default:
        return null;
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Batch Operations</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            New Operation
          </Button>
        </Box>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="All Operations" />
        <Tab label="Running" />
        <Tab label="Completed" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.map((op) => (
                <TableRow key={op.id}>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => handleViewDetails(op.id)}
                    >
                      {op.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={op.type.replace('_', ' ')} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress
                        variant="determinate"
                        value={(op.processedCount / op.totalCount) * 100}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption">
                        {op.processedCount}/{op.totalCount}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {op.successCount} success, {op.failedCount} failed
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(op.status) as any}
                      label={op.status}
                      size="small"
                      color={getStatusColor(op.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(op.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {op.status === 'RUNNING' && (
                      <>
                        <Tooltip title="Pause">
                          <IconButton size="small" onClick={() => handlePause(op.id)}>
                            <PauseIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancel">
                          <IconButton size="small" color="error" onClick={() => handleCancel(op.id)}>
                            <StopIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {op.status === 'PAUSED' && (
                      <Tooltip title="Resume">
                        <IconButton size="small" color="primary" onClick={() => handleResume(op.id)}>
                          <RunIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {op.status === 'COMPLETED' && op.canRollback && !op.rolledBackAt && (
                      <Tooltip title="Rollback">
                        <IconButton size="small" color="warning" onClick={() => handleRollback(op.id)}>
                          <UndoIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {operations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">No batch operations yet</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations
                .filter((op) => op.status === 'RUNNING' || op.status === 'PAUSED')
                .map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{op.name}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={(op.processedCount / op.totalCount) * 100}
                          sx={{ flex: 1 }}
                        />
                        <Typography variant="caption">
                          {Math.round((op.processedCount / op.totalCount) * 100)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {op.startedAt ? new Date(op.startedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {op.status === 'RUNNING' ? (
                        <IconButton size="small" onClick={() => handlePause(op.id)}>
                          <PauseIcon />
                        </IconButton>
                      ) : (
                        <IconButton size="small" onClick={() => handleResume(op.id)}>
                          <RunIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Results</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>Rollback</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations
                .filter((op) => op.status === 'COMPLETED' || op.status === 'ROLLED_BACK')
                .map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{op.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${op.successCount} success`}
                        size="small"
                        color="success"
                        sx={{ mr: 1 }}
                      />
                      {op.failedCount > 0 && (
                        <Chip
                          label={`${op.failedCount} failed`}
                          size="small"
                          color="error"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {op.completedAt ? new Date(op.completedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {op.rolledBackAt ? (
                        <Chip label="Rolled Back" size="small" color="secondary" />
                      ) : op.canRollback ? (
                        <Button size="small" startIcon={<UndoIcon />} onClick={() => handleRollback(op.id)}>
                          Rollback
                        </Button>
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Create Operation Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Batch Operation</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {renderStepContent(activeStep)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
            Back
          </Button>
          {activeStep < steps.length - 1 ? (
            <Button variant="contained" onClick={() => setActiveStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handleCreateOperation}>
              Start Operation
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedOperation?.name}</DialogTitle>
        <DialogContent>
          {selectedOperation && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={3}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip
                    label={selectedOperation.status}
                    color={getStatusColor(selectedOperation.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="textSecondary">Total</Typography>
                  <Typography variant="h6">{selectedOperation.totalCount}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="textSecondary">Success</Typography>
                  <Typography variant="h6" color="success.main">
                    {selectedOperation.successCount}
                  </Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="body2" color="textSecondary">Failed</Typography>
                  <Typography variant="h6" color="error.main">
                    {selectedOperation.failedCount}
                  </Typography>
                </Grid>
              </Grid>

              {selectedOperation.items && selectedOperation.items.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Entity ID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Error</TableCell>
                        <TableCell>Processed At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOperation.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.entityId}</TableCell>
                          <TableCell>
                            <Chip
                              label={item.status}
                              size="small"
                              color={
                                item.status === 'SUCCESS'
                                  ? 'success'
                                  : item.status === 'FAILED'
                                  ? 'error'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{item.errorMessage || '-'}</TableCell>
                          <TableCell>
                            {item.processedAt
                              ? new Date(item.processedAt).toLocaleString()
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BatchOperationsPage;
