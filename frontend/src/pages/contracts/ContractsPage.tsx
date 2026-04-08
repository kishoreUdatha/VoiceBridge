/**
 * Contracts Management Page
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
  TextField,
  InputAdornment,
  Grid,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Description as ContractIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Autorenew as RenewalIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { contractService, Contract } from '../../services/contract.service';

const ContractsPage: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [renewals, setRenewals] = useState<Contract[]>([]);

  useEffect(() => {
    loadContracts();
    loadStats();
    loadRenewals();
  }, [statusFilter]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await contractService.getContracts({
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      });
      setContracts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await contractService.getContractStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadRenewals = async () => {
    try {
      const data = await contractService.getContractsForRenewal(30);
      setRenewals(data);
    } catch (err) {
      console.error('Failed to load renewals:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'PENDING_REVIEW': return 'info';
      case 'UNDER_NEGOTIATION': return 'warning';
      case 'SENT_FOR_SIGNATURE': return 'info';
      case 'PARTIALLY_SIGNED': return 'warning';
      case 'SIGNED': return 'success';
      case 'ACTIVE': return 'success';
      case 'EXPIRED': return 'error';
      case 'TERMINATED': return 'error';
      case 'RENEWED': return 'primary';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  const formatCurrency = (value: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <ContractIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Contracts
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadContracts}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/contracts/new')}
          >
            New Contract
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Renewal Alert */}
      {renewals.length > 0 && (
        <Alert severity="warning" icon={<RenewalIcon />} sx={{ mb: 2 }}>
          <Typography variant="subtitle2">
            {renewals.length} contract(s) due for renewal in the next 30 days
          </Typography>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Active Value</Typography>
                <Typography variant="h5" color="success.main">
                  {formatCurrency(stats.activeContractValue || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Active Contracts</Typography>
                <Typography variant="h4">
                  {stats.byStatus?.find((s: any) => s.status === 'ACTIVE')?._count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Pending Signature</Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.byStatus?.find((s: any) => s.status === 'SENT_FOR_SIGNATURE')?._count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Renewals Due</Typography>
                <Typography variant="h4" color="info.main">
                  {stats.renewalsDueIn30Days || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search contracts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && loadContracts()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="DRAFT">Draft</MenuItem>
            <MenuItem value="PENDING_REVIEW">Pending Review</MenuItem>
            <MenuItem value="SENT_FOR_SIGNATURE">Sent for Signature</MenuItem>
            <MenuItem value="SIGNED">Signed</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="EXPIRED">Expired</MenuItem>
            <MenuItem value="TERMINATED">Terminated</MenuItem>
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
                <TableCell>Contract #</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Account</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell align="center">Signatures</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {contract.contractNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">{contract.name}</Typography>
                    {contract.autoRenewal && (
                      <Chip
                        icon={<RenewalIcon />}
                        label="Auto-renew"
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={getTypeLabel(contract.type)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{contract.account?.name || '-'}</TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2">
                      {formatCurrency(contract.totalValue, contract.currency)}
                    </Typography>
                    {contract.billingFrequency && (
                      <Typography variant="caption" color="text.secondary">
                        {contract.billingFrequency.replace('_', ' ')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={contract.status.replace(/_/g, ' ')}
                      size="small"
                      color={getStatusColor(contract.status) as any}
                    />
                  </TableCell>
                  <TableCell>{formatDate(contract.startDate)}</TableCell>
                  <TableCell>{formatDate(contract.endDate)}</TableCell>
                  <TableCell align="center">
                    {contract._count?.signatories || 0}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No contracts found.
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

export default ContractsPage;
