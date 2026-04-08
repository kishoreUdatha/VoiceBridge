/**
 * Data Enrichment Page
 * Configure and manage data enrichment providers (Clearbit, Hunter.io, Apollo, etc.)
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoFixHigh as EnrichIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  PlayArrow as TestIcon,
  History as HistoryIcon,
  Email as EmailIcon,
  Business as CompanyIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { dataEnrichmentService, EnrichmentProvider, EnrichmentResult } from '../../services/data-enrichment.service';

const DataEnrichmentPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [providers, setProviders] = useState<EnrichmentProvider[]>([]);
  const [history, setHistory] = useState<EnrichmentResult[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [providersData, historyData, statsData] = await Promise.all([
        dataEnrichmentService.getProviders(),
        dataEnrichmentService.getEnrichmentHistory({ limit: 50 }),
        dataEnrichmentService.getEnrichmentStats(),
      ]);
      setProviders(providersData);
      setHistory(historyData);
      setStats(statsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureProvider = async () => {
    try {
      await dataEnrichmentService.configureProvider(selectedProvider, { apiKey });
      setConfigDialogOpen(false);
      setApiKey('');
      setSelectedProvider('');
      setSuccess('Provider configured successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to configure provider');
    }
  };

  const handleTestEnrichment = async () => {
    try {
      setTesting(true);
      const result = await dataEnrichmentService.enrichByEmail(testEmail);
      setTestResult(result);
    } catch (err: any) {
      setError(err.message || 'Enrichment failed');
    } finally {
      setTesting(false);
    }
  };

  const handleToggleProvider = async (providerId: string, isActive: boolean) => {
    try {
      await dataEnrichmentService.updateProvider(providerId, { isActive });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update provider');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'success';
      case 'PARTIAL': return 'warning';
      case 'FAILED': return 'error';
      case 'NOT_FOUND': return 'default';
      default: return 'info';
    }
  };

  const getProviderLogo = (type: string) => {
    const logos: Record<string, { color: string; letter: string }> = {
      CLEARBIT: { color: '#3B82F6', letter: 'C' },
      HUNTER: { color: '#FF6B00', letter: 'H' },
      APOLLO: { color: '#6366F1', letter: 'A' },
      ZOOMINFO: { color: '#00A4BD', letter: 'Z' },
      LUSHA: { color: '#7C3AED', letter: 'L' },
    };
    return logos[type] || { color: '#888', letter: '?' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Available providers to configure
  const availableProviders = [
    { type: 'CLEARBIT', name: 'Clearbit', description: 'Company & contact enrichment' },
    { type: 'HUNTER', name: 'Hunter.io', description: 'Email finder & verification' },
    { type: 'APOLLO', name: 'Apollo.io', description: 'B2B contact database' },
    { type: 'ZOOMINFO', name: 'ZoomInfo', description: 'Enterprise data enrichment' },
    { type: 'LUSHA', name: 'Lusha', description: 'Contact information' },
  ];

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
          <EnrichIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Data Enrichment
        </Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setConfigDialogOpen(true)}
          >
            Add Provider
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <EnrichIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h4">{stats.totalEnrichments}</Typography>
                <Typography variant="caption" color="text.secondary">Total Enrichments</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SuccessIcon sx={{ fontSize: 32, color: 'success.main' }} />
                <Typography variant="h4">{Math.round(stats.successRate)}%</Typography>
                <Typography variant="caption" color="text.secondary">Success Rate</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">{stats.creditsUsedThisMonth}</Typography>
                <Typography variant="caption" color="text.secondary">Credits Used (Month)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">{providers.filter(p => p.isActive).length}</Typography>
                <Typography variant="caption" color="text.secondary">Active Providers</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<SettingsIcon />} label="Providers" />
        <Tab icon={<HistoryIcon />} label="History" />
        <Tab icon={<TestIcon />} label="Test Enrichment" />
      </Tabs>

      {/* Providers Tab */}
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {/* Configured Providers */}
          {providers.length > 0 && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Configured Providers</Typography>
              <Grid container spacing={2}>
                {providers.map((provider) => {
                  const logo = getProviderLogo(provider.type);
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={provider.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                bgcolor: logo.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '1.5rem',
                              }}
                            >
                              {logo.letter}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {provider.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {provider.type}
                              </Typography>
                            </Box>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={provider.isActive}
                                  onChange={(e) => handleToggleProvider(provider.id, e.target.checked)}
                                />
                              }
                              label=""
                            />
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">Credits Used</Typography>
                            <Typography variant="body2">{provider.creditsUsed}</Typography>
                          </Box>

                          {provider.creditsRemaining !== undefined && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" color="text.secondary">Remaining</Typography>
                              <Typography variant="body2" color="success.main">
                                {provider.creditsRemaining}
                              </Typography>
                            </Box>
                          )}

                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                            <Button size="small" startIcon={<SettingsIcon />}>
                              Configure
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          )}

          {/* Available Providers */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Available Integrations</Typography>
            <Grid container spacing={2}>
              {availableProviders
                .filter((ap) => !providers.some((p) => p.type === ap.type))
                .map((provider) => {
                  const logo = getProviderLogo(provider.type);
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={provider.type}>
                      <Card variant="outlined" sx={{ opacity: 0.8 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                bgcolor: logo.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '1.5rem',
                              }}
                            >
                              {logo.letter}
                            </Box>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {provider.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {provider.description}
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setSelectedProvider(provider.type);
                              setConfigDialogOpen(true);
                            }}
                          >
                            Connect
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* History Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Entity</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Credits</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.leadId && <PersonIcon fontSize="small" />}
                      {item.accountId && <CompanyIcon fontSize="small" />}
                      <Typography variant="body2">
                        {item.leadId || item.contactId || item.accountId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.provider} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      size="small"
                      color={getStatusColor(item.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={item.confidence}
                        sx={{ width: 60 }}
                      />
                      <Typography variant="caption">{item.confidence}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{item.creditsUsed}</TableCell>
                  <TableCell>{formatDate(item.enrichedAt)}</TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No enrichment history yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Test Enrichment Tab */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>Test Email Enrichment</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Email Address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="john@company.com"
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                startIcon={testing ? <CircularProgress size={20} /> : <EnrichIcon />}
                onClick={handleTestEnrichment}
                disabled={!testEmail || testing}
              >
                Enrich
              </Button>
            </Box>

            {testResult && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Enrichment Result
                  </Typography>
                  <Grid container spacing={2}>
                    {testResult.email && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary">Email</Typography>
                        <Typography>{testResult.email}</Typography>
                      </Grid>
                    )}
                    {testResult.title && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary">Title</Typography>
                        <Typography>{testResult.title}</Typography>
                      </Grid>
                    )}
                    {testResult.company?.name && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary">Company</Typography>
                        <Typography>{testResult.company.name}</Typography>
                      </Grid>
                    )}
                    {testResult.company?.industry && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary">Industry</Typography>
                        <Typography>{testResult.company.industry}</Typography>
                      </Grid>
                    )}
                    {testResult.linkedinUrl && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary">LinkedIn</Typography>
                        <Typography>{testResult.linkedinUrl}</Typography>
                      </Grid>
                    )}
                    {testResult.location && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary">Location</Typography>
                        <Typography>{testResult.location}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configure Provider Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Provider</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Provider</InputLabel>
              <Select
                value={selectedProvider}
                label="Provider"
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                {availableProviders.map((p) => (
                  <MenuItem key={p.type} value={p.type}>
                    {p.name} - {p.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              fullWidth
              helperText="Enter your API key from the provider's dashboard"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfigureProvider}
            disabled={!selectedProvider || !apiKey}
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataEnrichmentPage;
