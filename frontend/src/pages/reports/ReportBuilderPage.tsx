/**
 * Report Builder Page
 * Visual interface for creating, scheduling, and managing custom reports
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Description as ReportIcon,
  BarChart as ChartIcon,
  TableChart as TableIcon,
  PieChart as PieIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import reportBuilderService, {
  ReportDefinition,
  ReportSchedule,
  ReportExecution,
  DataSource,
  ReportConfig,
  ColumnDefinition,
  ScheduleConfig,
} from '../../services/report-builder.service';

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

const ReportBuilderPage: React.FC = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [executionResults, setExecutionResults] = useState<any[] | null>(null);
  const [executing, setExecuting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<ReportConfig>>({
    name: '',
    description: '',
    type: 'TABLE',
    dataSource: '',
    columns: [],
  });

  const [scheduleData, setScheduleData] = useState<Partial<ScheduleConfig>>({
    name: '',
    frequency: 'DAILY',
    timeOfDay: '09:00',
    deliveryMethod: 'EMAIL',
    recipients: [],
    format: 'PDF',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, sourcesData] = await Promise.all([
        reportBuilderService.getReportDefinitions(),
        reportBuilderService.getDataSources(),
      ]);
      setReports(reportsData);
      setDataSources(sourcesData);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      if (!formData.name || !formData.dataSource) return;
      await reportBuilderService.createReportDefinition(formData as ReportConfig);
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', type: 'TABLE', dataSource: '', columns: [] });
      loadData();
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await reportBuilderService.deleteReportDefinition(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const handleRunReport = async (report: ReportDefinition) => {
    try {
      setExecuting(true);
      setSelectedReport(report);
      const result = await reportBuilderService.executeReport(report.id);
      setExecutionResults(result.data);
      setTabValue(2);
    } catch (error) {
      console.error('Failed to run report:', error);
    } finally {
      setExecuting(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedReport) return;
    try {
      await reportBuilderService.createSchedule(selectedReport.id, scheduleData as ScheduleConfig);
      setScheduleDialogOpen(false);
      setScheduleData({
        name: '',
        frequency: 'DAILY',
        timeOfDay: '09:00',
        deliveryMethod: 'EMAIL',
        recipients: [],
        format: 'PDF',
      });
      loadData();
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'CHART':
        return <ChartIcon />;
      case 'PIVOT':
        return <PieIcon />;
      case 'DASHBOARD':
        return <TimelineIcon />;
      default:
        return <TableIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'RUNNING':
        return 'info';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
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
        <Typography variant="h4">Report Builder</Typography>
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
            Create Report
          </Button>
        </Box>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="Reports" />
        <Tab label="Schedules" />
        <Tab label="Results" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {reports.map((report) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={report.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    {getReportTypeIcon(report.type)}
                    <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
                      {report.name}
                    </Typography>
                    <Chip
                      label={report.type}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  {report.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {report.description}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Data Source: <strong>{report.dataSource}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Executions: {report._count?.executions || 0}
                  </Typography>
                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Tooltip title="Run Report">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleRunReport(report)}
                        disabled={executing}
                      >
                        <RunIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Schedule">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedReport(report);
                          setScheduleDialogOpen(true);
                        }}
                      >
                        <ScheduleIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {reports.length === 0 && (
            <Grid size={12}>
              <Alert severity="info">
                No reports created yet. Click "Create Report" to get started.
              </Alert>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Report</TableCell>
                <TableCell>Schedule Name</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Next Run</TableCell>
                <TableCell>Delivery</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports
                .filter((r) => r.schedules && r.schedules.length > 0)
                .flatMap((report) =>
                  report.schedules!.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>{report.name}</TableCell>
                      <TableCell>{schedule.name}</TableCell>
                      <TableCell>{schedule.frequency}</TableCell>
                      <TableCell>
                        {schedule.nextRunAt
                          ? new Date(schedule.nextRunAt).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={schedule.deliveryMethod}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={schedule.isActive ? 'Active' : 'Paused'}
                          size="small"
                          color={schedule.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {selectedReport && executionResults && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">{selectedReport.name} - Results</Typography>
              <Button startIcon={<DownloadIcon />} variant="outlined">
                Export
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {executionResults.length > 0 &&
                      Object.keys(executionResults[0]).map((key) => (
                        <TableCell key={key}>{key}</TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {executionResults.slice(0, 100).map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value: any, i) => (
                        <TableCell key={i}>
                          {typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value ?? '-')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Showing {Math.min(100, executionResults.length)} of {executionResults.length} rows
            </Typography>
          </Box>
        )}
        {!executionResults && (
          <Alert severity="info">Run a report to see results here.</Alert>
        )}
      </TabPanel>

      {/* Create Report Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Report Name"
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
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Report Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <MenuItem value="TABLE">Table</MenuItem>
                  <MenuItem value="CHART">Chart</MenuItem>
                  <MenuItem value="PIVOT">Pivot Table</MenuItem>
                  <MenuItem value="SUMMARY">Summary</MenuItem>
                  <MenuItem value="DASHBOARD">Dashboard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Data Source</InputLabel>
                <Select
                  value={formData.dataSource}
                  label="Data Source"
                  onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                >
                  {dataSources.map((source) => (
                    <MenuItem key={source.id} value={source.id}>
                      {source.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formData.dataSource && (
              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Columns
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {dataSources
                    .find((s) => s.id === formData.dataSource)
                    ?.fields.map((field) => (
                      <Chip
                        key={field.field}
                        label={field.label}
                        onClick={() => {
                          const columns = formData.columns || [];
                          const exists = columns.some((c) => c.field === field.field);
                          if (exists) {
                            setFormData({
                              ...formData,
                              columns: columns.filter((c) => c.field !== field.field),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              columns: [
                                ...columns,
                                { field: field.field, label: field.label, type: field.type as any },
                              ],
                            });
                          }
                        }}
                        color={
                          formData.columns?.some((c) => c.field === field.field)
                            ? 'primary'
                            : 'default'
                        }
                        variant={
                          formData.columns?.some((c) => c.field === field.field)
                            ? 'filled'
                            : 'outlined'
                        }
                      />
                    ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateReport}
            disabled={!formData.name || !formData.dataSource}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schedule Report: {selectedReport?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Schedule Name"
                value={scheduleData.name}
                onChange={(e) => setScheduleData({ ...scheduleData, name: e.target.value })}
              />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={scheduleData.frequency}
                  label="Frequency"
                  onChange={(e) =>
                    setScheduleData({ ...scheduleData, frequency: e.target.value as any })
                  }
                >
                  <MenuItem value="HOURLY">Hourly</MenuItem>
                  <MenuItem value="DAILY">Daily</MenuItem>
                  <MenuItem value="WEEKLY">Weekly</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                  <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label="Time of Day"
                type="time"
                value={scheduleData.timeOfDay}
                onChange={(e) => setScheduleData({ ...scheduleData, timeOfDay: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Delivery Method</InputLabel>
                <Select
                  value={scheduleData.deliveryMethod}
                  label="Delivery Method"
                  onChange={(e) =>
                    setScheduleData({ ...scheduleData, deliveryMethod: e.target.value as any })
                  }
                >
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="SLACK">Slack</MenuItem>
                  <MenuItem value="WEBHOOK">Webhook</MenuItem>
                  <MenuItem value="DOWNLOAD">Download Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={scheduleData.format}
                  label="Format"
                  onChange={(e) =>
                    setScheduleData({ ...scheduleData, format: e.target.value as any })
                  }
                >
                  <MenuItem value="PDF">PDF</MenuItem>
                  <MenuItem value="EXCEL">Excel</MenuItem>
                  <MenuItem value="CSV">CSV</MenuItem>
                  <MenuItem value="JSON">JSON</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Recipients (comma-separated emails)"
                value={scheduleData.recipients?.join(', ')}
                onChange={(e) =>
                  setScheduleData({
                    ...scheduleData,
                    recipients: e.target.value.split(',').map((r) => r.trim()),
                  })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSchedule}
            disabled={!scheduleData.name}
          >
            Create Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportBuilderPage;
