/**
 * Customer Journey Mapping Page
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
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Route as JourneyIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  CheckCircle as CompleteIcon,
  Timeline as TimelineIcon,
  TouchApp as TouchpointIcon,
} from '@mui/icons-material';
import { customerJourneyService, JourneyTemplate, CustomerJourney, JourneyTouchpoint } from '../../services/customer-journey.service';

const CustomerJourneyPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<JourneyTemplate[]>([]);
  const [journeys, setJourneys] = useState<CustomerJourney[]>([]);
  const [pendingTouchpoints, setPendingTouchpoints] = useState<JourneyTouchpoint[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, journeysData, touchpointsData, analyticsData] = await Promise.all([
        customerJourneyService.getTemplates(),
        customerJourneyService.getJourneys({ limit: 50 }),
        customerJourneyService.getPendingTouchpoints(),
        customerJourneyService.getJourneyAnalytics(),
      ]);
      setTemplates(templatesData);
      setJourneys(journeysData);
      setPendingTouchpoints(touchpointsData);
      setAnalytics(analyticsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PAUSED': return 'warning';
      case 'COMPLETED': return 'info';
      case 'EXITED': return 'default';
      default: return 'default';
    }
  };

  const getTouchpointStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'IN_PROGRESS': return 'info';
      case 'COMPLETED': return 'success';
      case 'SKIPPED': return 'default';
      case 'FAILED': return 'error';
      default: return 'default';
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

  // Calculate stats
  const activeJourneys = journeys.filter(j => j.status === 'ACTIVE').length;
  const completedJourneys = journeys.filter(j => j.status === 'COMPLETED').length;
  const completionRate = journeys.length ? Math.round((completedJourneys / journeys.length) * 100) : 0;

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
          <JourneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Customer Journey
        </Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            New Journey Template
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
              <Typography color="text.secondary" gutterBottom>Templates</Typography>
              <Typography variant="h4">{templates.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="success.dark" gutterBottom>Active Journeys</Typography>
              <Typography variant="h4" color="success.dark">{activeJourneys}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom>Pending Touchpoints</Typography>
              <Typography variant="h4" color="warning.main">{pendingTouchpoints.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="text.secondary" gutterBottom>Completion Rate</Typography>
              <Typography variant="h4" color="info.main">{completionRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<TimelineIcon />} label="Templates" />
        <Tab icon={<JourneyIcon />} label="Active Journeys" />
        <Tab icon={<TouchpointIcon />} label="Pending Touchpoints" />
      </Tabs>

      {/* Templates Tab */}
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {templates.map((template) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={template.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{template.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {template.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={template.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={template.isActive ? 'success' : 'default'}
                    />
                  </Box>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Stages ({template.stages.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    {template.stages.map((stage, idx) => (
                      <Chip
                        key={idx}
                        label={stage.name}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton size="small">
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {templates.length === 0 && (
            <Grid size={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <TimelineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    No journey templates found. Create your first template.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Active Journeys Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Journey</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Current Stage</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Started</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {journeys.map((journey) => {
                const template = templates.find(t => t.id === journey.templateId);
                const stageIndex = template?.stages.findIndex(s => s.name === journey.currentStage) || 0;
                const progress = template?.stages.length
                  ? ((stageIndex + 1) / template.stages.length) * 100
                  : 0;

                return (
                  <TableRow key={journey.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {journey.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>{template?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip label={journey.currentStage} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={journey.status}
                        size="small"
                        color={getStatusColor(journey.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{ flex: 1, mr: 1 }}
                        />
                        <Typography variant="caption">{Math.round(progress)}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(journey.startedAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="View">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      {journey.status === 'ACTIVE' && (
                        <IconButton size="small" title="Pause">
                          <PauseIcon fontSize="small" />
                        </IconButton>
                      )}
                      {journey.status === 'PAUSED' && (
                        <IconButton size="small" title="Resume">
                          <PlayIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {journeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No active journeys found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pending Touchpoints Tab */}
      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Touchpoint</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingTouchpoints.map((touchpoint) => (
                <TableRow key={touchpoint.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {touchpoint.id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>{touchpoint.stageName}</TableCell>
                  <TableCell>
                    <Chip label={touchpoint.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{touchpoint.channel || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={touchpoint.status}
                      size="small"
                      color={getTouchpointStatusColor(touchpoint.status) as any}
                    />
                  </TableCell>
                  <TableCell>{formatDate(touchpoint.scheduledAt)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="contained" startIcon={<CompleteIcon />}>
                      Complete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pendingTouchpoints.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No pending touchpoints. All caught up!
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default CustomerJourneyPage;
