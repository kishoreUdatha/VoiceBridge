/**
 * Export & BI Integration Page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  CloudSync as SyncIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  TableChart as TableIcon,
  BarChart as ChartIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { exportBIService, ExportJob, BIConnector } from '../../services/export-bi.service';

const ExportBIPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exports, setExports] = useState<ExportJob[]>([]);
  const [connectors, setConnectors] = useState<BIConnector[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [connectorDialogOpen, setConnectorDialogOpen] = useState(false);
  const [newExport, setNewExport] = useState({
    name: '',
    entity: 'LEADS' as const,
    format: 'CSV' as const,
    filters: {},
    fields: [] as string[],
    schedule: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [exportsData, connectorsData] = await Promise.all([
        exportBIService.getExportJobs(),
        exportBIService.getBIConnectors(),
      ]);
      setExports(exportsData);
      setConnectors(connectorsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExport = async () => {
    try {
      await exportBIService.createExportJob(newExport as any);
      setExportDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create export');
    }
  };

  const handleRunExport = async (exportId: string) => {
    try {
      await exportBIService.executeExport(exportId);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to run export');
    }
  };

  const handleDownloadExport = async (exportJob: ExportJob) => {
    try {
      if (exportJob.fileUrl) {
        window.open(exportJob.fileUrl, '_blank');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to download export');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'PROCESSING': return 'info';
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'error';
      default: return 'default';
    }
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'GOOGLE_SHEETS': return <TableIcon />;
      case 'POWER_BI': return <ChartIcon />;
      case 'TABLEAU': return <ChartIcon />;
      case 'BIGQUERY': return <StorageIcon />;
      case 'SNOWFLAKE': return <StorageIcon />;
      default: return <SyncIcon />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Stats
  const completedExports = exports.filter(e => e.status === 'COMPLETED').length;
  const scheduledExports = exports.filter(e => e.schedule).length;
  const activeConnectors = connectors.filter(c => c.status === 'CONNECTED').length;
  const totalRecordsExported = exports.reduce((acc, e) => acc + (e.rowCount || 0), 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <DownloadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Export & BI
        </Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setExportDialogOpen(true)}>
            New Export
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DownloadIcon sx={{ fontSize: 32, color: 'success.main' }} />
              <Typography variant="h4">{completedExports}</Typography>
              <Typography variant="caption" color="text.secondary">Completed Exports</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 32, color: 'info.main' }} />
              <Typography variant="h4">{scheduledExports}</Typography>
              <Typography variant="caption" color="text.secondary">Scheduled Exports</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SyncIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4">{activeConnectors}</Typography>
              <Typography variant="caption" color="text.secondary">Active Connectors</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: 32, color: 'warning.main' }} />
              <Typography variant="h4">{totalRecordsExported.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">Records Exported</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<DownloadIcon />} label="Exports" />
        <Tab icon={<SyncIcon />} label="BI Connectors" />
        <Tab icon={<HistoryIcon />} label="History" />
      </Tabs>

      {/* Exports Tab */}
      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Export Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Records</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exports.map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{exp.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={exp.entity} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{exp.format}</TableCell>
                  <TableCell>
                    {exp.schedule ? (
                      <Chip icon={<ScheduleIcon />} label={exp.schedule.frequency} size="small" color="info" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">Manual</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={exp.status}
                      size="small"
                      color={getStatusColor(exp.status) as any}
                    />
                  </TableCell>
                  <TableCell>{exp.rowCount?.toLocaleString() || '-'}</TableCell>
                  <TableCell>{formatFileSize(exp.fileSize)}</TableCell>
                  <TableCell>
                    {exp.completedAt ? formatDate(exp.completedAt) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleRunExport(exp.id)} title="Run now">
                      <RunIcon fontSize="small" />
                    </IconButton>
                    {exp.status === 'COMPLETED' && exp.fileUrl && (
                      <IconButton size="small" onClick={() => handleDownloadExport(exp)} title="Download">
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" color="error" title="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {exports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <DownloadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                      No exports configured. Create your first export.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* BI Connectors Tab */}
      {tabValue === 1 && (
        <Grid container spacing={2}>
          {connectors.map((connector) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={connector.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2 }}>
                      {getConnectorIcon(connector.provider)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {connector.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {connector.provider.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                    <Chip
                      label={connector.status === 'CONNECTED' ? 'Active' : 'Inactive'}
                      size="small"
                      color={connector.status === 'CONNECTED' ? 'success' : 'default'}
                    />
                  </Box>

                  {connector.syncSchedule && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">Sync Schedule</Typography>
                      <Typography variant="body2">{connector.syncSchedule}</Typography>
                    </Box>
                  )}

                  {connector.lastSyncAt && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">Last Sync</Typography>
                      <Typography variant="body2">{formatDate(connector.lastSyncAt)}</Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button size="small" startIcon={<SyncIcon />}>Sync Now</Button>
                    <Button size="small" variant="outlined">Configure</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {connectors.length === 0 && (
            <Grid size={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <SyncIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    No BI connectors configured. Connect your first BI tool.
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }}>
                    Add Connector
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Available Connectors */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Available Integrations</Typography>
            <Grid container spacing={2}>
              {['Google Sheets', 'Power BI', 'Tableau', 'BigQuery', 'Snowflake', 'Looker'].map((name) => (
                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={name}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
                    <ChartIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2">{name}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* History Tab */}
      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Export</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Records</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Completed At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exports.filter(e => e.completedAt).map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>{exp.name}</TableCell>
                  <TableCell>{exp.entity}</TableCell>
                  <TableCell>
                    <Chip label={exp.status} size="small" color={getStatusColor(exp.status) as any} />
                  </TableCell>
                  <TableCell>{exp.rowCount?.toLocaleString()}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{formatDate(exp.completedAt!)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Export</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Export Name"
              value={newExport.name}
              onChange={(e) => setNewExport({ ...newExport, name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Data Type</InputLabel>
              <Select
                value={newExport.entity}
                label="Data Type"
                onChange={(e) => setNewExport({ ...newExport, entity: e.target.value as any })}
              >
                <MenuItem value="LEADS">Leads</MenuItem>
                <MenuItem value="CALLS">Calls</MenuItem>
                <MenuItem value="CAMPAIGNS">Campaigns</MenuItem>
                <MenuItem value="ANALYTICS">Analytics</MenuItem>
                <MenuItem value="CUSTOM">Custom Query</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={newExport.format}
                label="Format"
                onChange={(e) => setNewExport({ ...newExport, format: e.target.value as any })}
              >
                <MenuItem value="CSV">CSV</MenuItem>
                <MenuItem value="EXCEL">Excel</MenuItem>
                <MenuItem value="JSON">JSON</MenuItem>
                <MenuItem value="PARQUET">Parquet</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Schedule (Optional)</InputLabel>
              <Select
                value={newExport.schedule}
                label="Schedule (Optional)"
                onChange={(e) => setNewExport({ ...newExport, schedule: e.target.value })}
              >
                <MenuItem value="">Manual Only</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateExport}>
            Create Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExportBIPage;
