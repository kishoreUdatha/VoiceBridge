/**
 * Territories Management Page
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Map as MapIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { territoryService, Territory } from '../../services/territory.service';

const TerritoriesPage: React.FC = () => {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: 'GEOGRAPHIC' | 'ACCOUNT_BASED' | 'INDUSTRY' | 'HYBRID';
    description: string;
    countries: string;
    states: string;
    cities: string;
  }>({
    name: '',
    type: 'GEOGRAPHIC',
    description: '',
    countries: '',
    states: '',
    cities: '',
  });

  useEffect(() => {
    loadTerritories();
  }, []);

  const loadTerritories = async () => {
    try {
      setLoading(true);
      const data = await territoryService.getTerritories();
      setTerritories(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load territories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (territory?: Territory) => {
    if (territory) {
      setEditingTerritory(territory);
      setFormData({
        name: territory.name,
        type: territory.type,
        description: territory.description || '',
        countries: territory.countries?.join(', ') || '',
        states: territory.states?.join(', ') || '',
        cities: territory.cities?.join(', ') || '',
      });
    } else {
      setEditingTerritory(null);
      setFormData({
        name: '',
        type: 'GEOGRAPHIC',
        description: '',
        countries: '',
        states: '',
        cities: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTerritory(null);
  };

  const handleSave = async () => {
    try {
      const data = {
        name: formData.name,
        type: formData.type,
        description: formData.description || undefined,
        countries: formData.countries ? formData.countries.split(',').map(s => s.trim()) : undefined,
        states: formData.states ? formData.states.split(',').map(s => s.trim()) : undefined,
        cities: formData.cities ? formData.cities.split(',').map(s => s.trim()) : undefined,
      };

      if (editingTerritory) {
        await territoryService.updateTerritory(editingTerritory.id, data);
      } else {
        await territoryService.createTerritory(data);
      }

      handleCloseDialog();
      loadTerritories();
    } catch (err: any) {
      setError(err.message || 'Failed to save territory');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this territory?')) return;

    try {
      await territoryService.deleteTerritory(id);
      loadTerritories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete territory');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'GEOGRAPHIC': return 'primary';
      case 'ACCOUNT_BASED': return 'secondary';
      case 'INDUSTRY': return 'info';
      case 'HYBRID': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <MapIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Territory Management
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadTerritories}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Territory
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Coverage</TableCell>
                <TableCell align="center">Leads</TableCell>
                <TableCell align="center">Accounts</TableCell>
                <TableCell align="center">Users</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {territories.map((territory) => (
                <TableRow key={territory.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{territory.name}</Typography>
                    {territory.description && (
                      <Typography variant="caption" color="text.secondary">
                        {territory.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={territory.type.replace('_', ' ')}
                      size="small"
                      color={getTypeColor(territory.type) as any}
                    />
                  </TableCell>
                  <TableCell>
                    {territory.countries?.length ? (
                      <Typography variant="body2">{territory.countries.join(', ')}</Typography>
                    ) : territory.states?.length ? (
                      <Typography variant="body2">{territory.states.join(', ')}</Typography>
                    ) : territory.cities?.length ? (
                      <Typography variant="body2">{territory.cities.join(', ')}</Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No coverage defined</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{territory._count?.leads || 0}</TableCell>
                  <TableCell align="center">{territory._count?.accounts || 0}</TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={<PeopleIcon />}
                      label={territory._count?.assignments || 0}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={territory.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={territory.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(territory)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(territory.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {territories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No territories found. Create your first territory to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTerritory ? 'Edit Territory' : 'Create Territory'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Territory Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <MenuItem value="GEOGRAPHIC">Geographic</MenuItem>
                  <MenuItem value="ACCOUNT_BASED">Account Based</MenuItem>
                  <MenuItem value="INDUSTRY">Industry</MenuItem>
                  <MenuItem value="HYBRID">Hybrid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Countries (comma separated)"
                value={formData.countries}
                onChange={(e) => setFormData({ ...formData, countries: e.target.value })}
                placeholder="India, USA, UK"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="States (comma separated)"
                value={formData.states}
                onChange={(e) => setFormData({ ...formData, states: e.target.value })}
                placeholder="Maharashtra, Karnataka, Delhi"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Cities (comma separated)"
                value={formData.cities}
                onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                placeholder="Mumbai, Bangalore, Delhi"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
            {editingTerritory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TerritoriesPage;
