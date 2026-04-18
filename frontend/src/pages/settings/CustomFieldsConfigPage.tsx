/**
 * Custom Fields Configuration Page
 * Manage organization-specific custom field definitions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Alert,
  Snackbar,
  Divider,
  Avatar,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  DragIndicator as DragIcon,
  BarChart as StatsIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  TextFields as TextIcon,
  Numbers as NumberIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarMonth as CalendarIcon,
  Schedule as TimeIcon,
  ArrowDropDown as DropdownIcon,
  CheckBox as CheckboxIcon,
  RadioButtonChecked as RadioIcon,
  AttachFile as FileIcon,
  Notes as TextAreaIcon,
  Link as UrlIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import {
  customFieldsService,
  CustomField,
  CreateCustomFieldInput,
  FieldType,
  FieldOption,
  FIELD_TYPE_OPTIONS,
  FieldUsageStats,
} from '../../services/custom-fields.service';

const FIELD_TYPE_ICONS: Record<string, React.ReactNode> = {
  TEXT: <TextIcon />,
  TEXTAREA: <TextAreaIcon />,
  NUMBER: <NumberIcon />,
  EMAIL: <EmailIcon />,
  PHONE: <PhoneIcon />,
  DATE: <CalendarIcon />,
  DATETIME: <TimeIcon />,
  SELECT: <DropdownIcon />,
  MULTISELECT: <CheckboxIcon />,
  RADIO: <RadioIcon />,
  CHECKBOX: <CheckboxIcon />,
  FILE: <FileIcon />,
  URL: <UrlIcon />,
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  TEXT: '#3b82f6',
  TEXTAREA: '#6366f1',
  NUMBER: '#8b5cf6',
  EMAIL: '#ec4899',
  PHONE: '#14b8a6',
  DATE: '#f59e0b',
  DATETIME: '#f97316',
  SELECT: '#10b981',
  MULTISELECT: '#06b6d4',
  RADIO: '#84cc16',
  CHECKBOX: '#22c55e',
  FILE: '#64748b',
  URL: '#0ea5e9',
};

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export default function CustomFieldsConfigPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [formData, setFormData] = useState<CreateCustomFieldInput>({
    name: '',
    fieldType: 'TEXT',
    options: [],
    isRequired: false,
  });
  const [optionInput, setOptionInput] = useState({ value: '', label: '' });

  // Usage modal
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageData, setUsageData] = useState<FieldUsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchFields();
  }, [showInactive]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customFieldsService.getAll(showInactive);
      setFields(data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load custom fields' });
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setToast({ type: 'error', message: 'Field name is required' });
      return;
    }

    try {
      if (editingField) {
        await customFieldsService.update(editingField.id, formData);
        setToast({ type: 'success', message: 'Field updated successfully' });
      } else {
        await customFieldsService.create(formData);
        setToast({ type: 'success', message: 'Field created successfully' });
      }
      closeModal();
      fetchFields();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Operation failed' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this custom field? This action cannot be undone.')) return;

    try {
      await customFieldsService.delete(id);
      setToast({ type: 'success', message: 'Field deleted' });
      fetchFields();
    } catch {
      setToast({ type: 'error', message: 'Failed to delete field' });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const field = await customFieldsService.toggleActive(id);
      setToast({ type: 'success', message: field.isActive ? 'Field activated' : 'Field deactivated' });
      fetchFields();
    } catch {
      setToast({ type: 'error', message: 'Failed to toggle field' });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await customFieldsService.duplicate(id);
      setToast({ type: 'success', message: 'Field duplicated' });
      fetchFields();
    } catch {
      setToast({ type: 'error', message: 'Failed to duplicate field' });
    }
  };

  const handleViewUsage = async (field: CustomField) => {
    setShowUsageModal(true);
    setUsageLoading(true);
    try {
      const data = await customFieldsService.getUsage(field.id);
      setUsageData(data);
    } catch {
      setToast({ type: 'error', message: 'Failed to load usage data' });
      setShowUsageModal(false);
    } finally {
      setUsageLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingField(null);
    setFormData({ name: '', fieldType: 'TEXT', options: [], isRequired: false });
    setShowModal(true);
  };

  const openEditModal = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      slug: field.slug,
      fieldType: field.fieldType,
      options: field.options || [],
      isRequired: field.isRequired,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingField(null);
    setFormData({ name: '', fieldType: 'TEXT', options: [], isRequired: false });
    setOptionInput({ value: '', label: '' });
  };

  const addOption = () => {
    if (!optionInput.value.trim() || !optionInput.label.trim()) return;

    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), { ...optionInput }],
    }));
    setOptionInput({ value: '', label: '' });
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index),
    }));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const [draggedField] = newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);
    setFields(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      try {
        await customFieldsService.reorder(fields.map(f => f.id));
      } catch {
        fetchFields(); // Revert on error
      }
    }
    setDraggedIndex(null);
  };

  const needsOptions = (type: FieldType) => ['SELECT', 'MULTISELECT', 'RADIO'].includes(type);

  const getFieldTypeLabel = (type: FieldType) => {
    return FIELD_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
  };

  const activeFields = fields.filter(f => f.isActive);
  const requiredCount = fields.filter(f => f.isRequired).length;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Snackbar Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.type === 'success' ? 'success' : 'error'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Link to="/settings" style={{ textDecoration: 'none' }}>
            <IconButton sx={{ '&:hover': { bgcolor: 'grey.100' } }}>
              <ArrowBackIcon sx={{ color: 'grey.600' }} />
            </IconButton>
          </Link>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <SettingsIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={600}>Custom Fields</Typography>
            <Typography variant="body2" color="text.secondary">
              Define custom fields to capture additional information for your records
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Show inactive</Typography>}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateModal}>
            Add Field
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="primary.main">{fields.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Fields</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.100', color: 'primary.main' }}>
                  <SettingsIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.100' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="success.main">{activeFields.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Fields</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.100', color: 'success.main' }}>
                  <CheckIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.100' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="warning.main">{requiredCount}</Typography>
                  <Typography variant="body2" color="text.secondary">Required Fields</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.100', color: 'warning.main' }}>
                  <WarningIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fields List */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 2, maxWidth: 200, mx: 'auto' }} />
            <Typography color="text.secondary">Loading fields...</Typography>
          </Box>
        ) : fields.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'grey.100', mx: 'auto', mb: 2 }}>
              <SettingsIcon sx={{ fontSize: 32, color: 'grey.400' }} />
            </Avatar>
            <Typography color="text.secondary" gutterBottom>No custom fields defined yet</Typography>
            <Button variant="text" color="primary" onClick={openCreateModal} sx={{ mt: 1 }}>
              Create your first field
            </Button>
          </Box>
        ) : (
          <Box>
            {fields.map((field, index) => (
              <Box
                key={field.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderBottom: index < fields.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  bgcolor: draggedIndex === index ? 'primary.50' : 'transparent',
                  opacity: field.isActive ? 1 : 0.5,
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: draggedIndex === index ? 'primary.50' : 'grey.50' },
                }}
              >
                {/* Drag Handle */}
                <IconButton size="small" sx={{ cursor: 'grab', color: 'grey.400' }}>
                  <DragIcon />
                </IconButton>

                {/* Field Type Icon */}
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: `${FIELD_TYPE_COLORS[field.fieldType]}15`,
                    color: FIELD_TYPE_COLORS[field.fieldType],
                  }}
                >
                  {FIELD_TYPE_ICONS[field.fieldType] || <TextIcon />}
                </Avatar>

                {/* Field Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography fontWeight={600}>{field.name}</Typography>
                    {field.isRequired && (
                      <Chip label="Required" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                    {!field.isActive && (
                      <Chip label="Inactive" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={getFieldTypeLabel(field.fieldType)}
                      size="small"
                      sx={{
                        height: 22,
                        bgcolor: `${FIELD_TYPE_COLORS[field.fieldType]}15`,
                        color: FIELD_TYPE_COLORS[field.fieldType],
                        fontWeight: 500,
                        fontSize: '0.75rem',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 1, py: 0.25, borderRadius: 0.5 }}>
                      {field.slug}
                    </Typography>
                    {needsOptions(field.fieldType) && field.options?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {field.options.length} options
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="View Usage">
                    <IconButton size="small" onClick={() => handleViewUsage(field)} sx={{ color: 'grey.500' }}>
                      <StatsIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEditModal(field)} sx={{ color: 'primary.main' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Duplicate">
                    <IconButton size="small" onClick={() => handleDuplicate(field.id)} sx={{ color: 'secondary.main' }}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={field.isActive ? 'Deactivate' : 'Activate'}>
                    <IconButton size="small" onClick={() => handleToggle(field.id)} sx={{ color: 'warning.main' }}>
                      {field.isActive ? <ViewIcon fontSize="small" /> : <HideIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(field.id)} sx={{ color: 'error.main' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={showModal} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{editingField ? 'Edit Field' : 'Create New Field'}</Typography>
          <IconButton size="small" onClick={closeModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Field Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Preferred Budget, Company Size"
            />

            <FormControl fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select
                value={formData.fieldType}
                label="Field Type"
                onChange={(e) => setFormData(prev => ({ ...prev, fieldType: e.target.value as FieldType }))}
              >
                {FIELD_TYPE_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ color: FIELD_TYPE_COLORS[option.value], display: 'flex' }}>
                        {FIELD_TYPE_ICONS[option.value]}
                      </Box>
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {needsOptions(formData.fieldType) && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Options</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  {formData.options?.map((opt, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{opt.label} <Typography component="span" color="text.secondary">({opt.value})</Typography></Typography>
                      <IconButton size="small" color="error" onClick={() => removeOption(index)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Value"
                    value={optionInput.value}
                    onChange={(e) => setOptionInput(prev => ({ ...prev, value: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    placeholder="Label"
                    value={optionInput.label}
                    onChange={(e) => setOptionInput(prev => ({ ...prev, label: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                  <Button variant="outlined" onClick={addOption} sx={{ minWidth: 'auto', px: 2 }}>
                    <AddIcon />
                  </Button>
                </Box>
              </Box>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                />
              }
              label="Required field"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeModal}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>
            {editingField ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Usage Dialog */}
      <Dialog open={showUsageModal} onClose={() => setShowUsageModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Field Usage</Typography>
          <IconButton size="small" onClick={() => setShowUsageModal(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {usageLoading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <LinearProgress sx={{ mb: 2 }} />
            </Box>
          ) : usageData ? (
            <Box>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.50', mb: 3 }}>
                <Typography variant="h3" fontWeight={700} color="primary.main">{usageData.totalLeadsWithField}</Typography>
                <Typography variant="body2" color="text.secondary">records have this field populated</Typography>
              </Paper>

              {Object.keys(usageData.valueDistribution).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Value Distribution</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {Object.entries(usageData.valueDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([value, count]) => (
                        <Box key={value} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">{value}</Typography>
                          <Typography variant="body2" fontWeight={600}>{count}</Typography>
                        </Box>
                      ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center">No usage data available</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
