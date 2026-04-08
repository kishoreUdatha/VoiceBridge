/**
 * ABM Campaigns Page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Campaign as CampaignIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { abmService, ABMCampaign } from '../../services/abm.service';

const ABMCampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<ABMCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter, tierFilter]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await abmService.getCampaigns({
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
      });
      setCampaigns(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'ACTIVE': return 'success';
      case 'PAUSED': return 'warning';
      case 'COMPLETED': return 'info';
      case 'ARCHIVED': return 'default';
      default: return 'default';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ONE_TO_ONE': return 'error';
      case 'ONE_TO_FEW': return 'warning';
      case 'ONE_TO_MANY': return 'info';
      default: return 'default';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'ONE_TO_ONE': return '1:1';
      case 'ONE_TO_FEW': return '1:Few';
      case 'ONE_TO_MANY': return '1:Many';
      default: return tier;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate totals
  const totals = campaigns.reduce(
    (acc, c) => ({
      accounts: acc.accounts + (c.targetAccounts?.length || 0),
      engaged: acc.engaged + c.accountsEngaged,
      meetings: acc.meetings + c.meetingsBooked,
      pipeline: acc.pipeline + c.pipelineGenerated,
      revenue: acc.revenue + c.revenueWon,
    }),
    { accounts: 0, engaged: 0, meetings: 0, pipeline: 0, revenue: 0 }
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <CampaignIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          ABM Campaigns
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadCampaigns}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/abm/new')}
          >
            New Campaign
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
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4">{totals.accounts}</Typography>
              <Typography variant="caption" color="text.secondary">Target Accounts</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 32, color: 'success.main' }} />
              <Typography variant="h4">{totals.engaged}</Typography>
              <Typography variant="caption" color="text.secondary">Engaged</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">{totals.meetings}</Typography>
              <Typography variant="caption" color="text.secondary">Meetings Booked</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="warning.main">{formatCurrency(totals.pipeline)}</Typography>
              <Typography variant="caption" color="text.secondary">Pipeline Generated</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: 'success.dark', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <MoneyIcon sx={{ fontSize: 32 }} />
              <Typography variant="h5">{formatCurrency(totals.revenue)}</Typography>
              <Typography variant="caption">Revenue Won</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="DRAFT">Draft</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="PAUSED">Paused</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Tier</InputLabel>
          <Select
            value={tierFilter}
            label="Tier"
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ONE_TO_ONE">1:1 (Strategic)</MenuItem>
            <MenuItem value="ONE_TO_FEW">1:Few (Cluster)</MenuItem>
            <MenuItem value="ONE_TO_MANY">1:Many (Programmatic)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Campaign</TableCell>
                <TableCell>Tier</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Accounts</TableCell>
                <TableCell align="center">Engaged</TableCell>
                <TableCell align="center">Meetings</TableCell>
                <TableCell align="right">Pipeline</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => {
                const engagementRate = campaign.targetAccounts?.length
                  ? (campaign.accountsEngaged / campaign.targetAccounts.length) * 100
                  : 0;

                return (
                  <TableRow key={campaign.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2">{campaign.name}</Typography>
                      {campaign.description && (
                        <Typography variant="caption" color="text.secondary">
                          {campaign.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTierLabel(campaign.tier)}
                        size="small"
                        color={getTierColor(campaign.tier) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={campaign.status}
                        size="small"
                        color={getStatusColor(campaign.status) as any}
                      />
                    </TableCell>
                    <TableCell align="center">{campaign.targetAccounts?.length || 0}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: 50, mr: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={engagementRate}
                            color="success"
                          />
                        </Box>
                        <Typography variant="body2">{campaign.accountsEngaged}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{campaign.meetingsBooked}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(campaign.pipelineGenerated)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography color="success.main">
                        {formatCurrency(campaign.revenueWon)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(campaign.startDate)}
                      </Typography>
                      {campaign.endDate && (
                        <Typography variant="caption" color="text.secondary">
                          to {formatDate(campaign.endDate)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/abm/${campaign.id}`)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/abm/${campaign.id}/edit`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No ABM campaigns found. Create your first campaign to get started.
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

export default ABMCampaignsPage;
