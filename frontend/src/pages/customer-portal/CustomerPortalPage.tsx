/**
 * Customer Self-Service Portal Management Page
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
  TextField,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
} from '@mui/material';
import {
  Web as PortalIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  People as UsersIcon,
  Article as ArticleIcon,
  ConfirmationNumber as TicketIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as InviteIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenIcon,
  CheckCircle as ActiveIcon,
  Block as InactiveIcon,
} from '@mui/icons-material';
import { customerPortalService, PortalConfig, PortalUser, KnowledgeArticle, PortalAnalytics } from '../../services/customer-portal.service';

const CustomerPortalPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [analytics, setAnalytics] = useState<PortalAnalytics | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', firstName: '', lastName: '', role: 'USER' });
  const [newArticle, setNewArticle] = useState({ title: '', content: '', category: '', isPublished: false });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configData, usersData, articlesData, analyticsData] = await Promise.all([
        customerPortalService.getPortalConfig(),
        customerPortalService.getPortalUsers(),
        customerPortalService.getArticles(),
        customerPortalService.getPortalAnalytics(),
      ]);
      setConfig(configData);
      setUsers(usersData);
      setArticles(articlesData);
      setAnalytics(analyticsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePortal = async () => {
    try {
      if (config?.isEnabled) {
        await customerPortalService.disablePortal();
      } else {
        await customerPortalService.enablePortal();
      }
      loadData();
      setSuccess(`Portal ${config?.isEnabled ? 'disabled' : 'enabled'} successfully`);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle portal');
    }
  };

  const handleInviteUser = async () => {
    try {
      await customerPortalService.invitePortalUser(inviteData);
      setInviteDialogOpen(false);
      setInviteData({ email: '', firstName: '', lastName: '', role: 'USER' });
      setSuccess('Invitation sent successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    }
  };

  const handleCreateArticle = async () => {
    try {
      await customerPortalService.createArticle(newArticle);
      setArticleDialogOpen(false);
      setNewArticle({ title: '', content: '', category: '', isPublished: false });
      setSuccess('Article created successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create article');
    }
  };

  const handleCopyPortalUrl = () => {
    if (config?.portalUrl) {
      navigator.clipboard.writeText(config.portalUrl);
      setSuccess('Portal URL copied to clipboard');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

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
          <PortalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Customer Portal
        </Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button
            variant="contained"
            color={config?.isEnabled ? 'error' : 'success'}
            onClick={handleTogglePortal}
          >
            {config?.isEnabled ? 'Disable Portal' : 'Enable Portal'}
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

      {/* Portal Status Card */}
      {config && (
        <Card sx={{ mb: 3, bgcolor: config.isEnabled ? 'success.light' : 'grey.100' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {config.isEnabled ? (
                  <ActiveIcon sx={{ fontSize: 48, color: 'success.main' }} />
                ) : (
                  <InactiveIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                )}
                <Box>
                  <Typography variant="h6">
                    Portal is {config.isEnabled ? 'Active' : 'Inactive'}
                  </Typography>
                  {config.isEnabled && config.portalUrl && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {config.portalUrl}
                      </Typography>
                      <IconButton size="small" onClick={handleCopyPortalUrl}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" href={config.portalUrl} target="_blank">
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
              </Box>
              <Button startIcon={<SettingsIcon />} onClick={() => setSettingsDialogOpen(true)}>
                Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {analytics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <UsersIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h4">{analytics.totalUsers}</Typography>
                <Typography variant="caption" color="text.secondary">Portal Users</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TicketIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                <Typography variant="h4">{analytics.ticketsSubmitted}</Typography>
                <Typography variant="caption" color="text.secondary">Tickets Submitted</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ArticleIcon sx={{ fontSize: 32, color: 'info.main' }} />
                <Typography variant="h4">{analytics.articleViews}</Typography>
                <Typography variant="caption" color="text.secondary">Article Views</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">{analytics.satisfactionScore}%</Typography>
                <Typography variant="caption" color="text.secondary">Satisfaction Score</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<UsersIcon />} label="Portal Users" />
        <Tab icon={<ArticleIcon />} label="Knowledge Base" />
        <Tab icon={<SettingsIcon />} label="Features" />
      </Tabs>

      {/* Portal Users Tab */}
      {tabValue === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<InviteIcon />}
              onClick={() => setInviteDialogOpen(true)}
            >
              Invite User
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                          {user.firstName[0]}{user.lastName[0]}
                        </Avatar>
                        <Typography variant="body2">
                          {user.firstName} {user.lastName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={user.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No portal users yet. Invite your first customer.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Knowledge Base Tab */}
      {tabValue === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setArticleDialogOpen(true)}
            >
              New Article
            </Button>
          </Box>
          <Grid container spacing={2}>
            {articles.map((article) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={article.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={article.category} size="small" variant="outlined" />
                      <Chip
                        label={article.isPublished ? 'Published' : 'Draft'}
                        size="small"
                        color={article.isPublished ? 'success' : 'default'}
                      />
                    </Box>
                    <Typography variant="h6" sx={{ mb: 1 }}>{article.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {article.content.substring(0, 100)}...
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {article.viewCount} views • {article.helpfulCount} found helpful
                      </Typography>
                      <Box>
                        <IconButton size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {articles.length === 0 && (
              <Grid size={12}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <ArticleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                      No knowledge base articles yet. Create your first article.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Features Tab */}
      {tabValue === 2 && config && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>Portal Features</Typography>
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={config.features.ticketSubmission} />}
                label="Ticket Submission - Allow customers to submit support tickets"
              />
              <FormControlLabel
                control={<Switch checked={config.features.knowledgeBase} />}
                label="Knowledge Base - Self-service articles and FAQs"
              />
              <FormControlLabel
                control={<Switch checked={config.features.chatSupport} />}
                label="Chat Support - Live chat with support agents"
              />
              <FormControlLabel
                control={<Switch checked={config.features.documentAccess} />}
                label="Document Access - View shared documents"
              />
              <FormControlLabel
                control={<Switch checked={config.features.invoiceAccess} />}
                label="Invoice Access - View and download invoices"
              />
              <FormControlLabel
                control={<Switch checked={config.features.contractView} />}
                label="Contract View - View active contracts"
              />
              <FormControlLabel
                control={<Switch checked={config.features.feedbackForm} />}
                label="Feedback Form - Submit feedback and suggestions"
              />
            </FormGroup>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2 }}>Branding</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Company Name"
                  value={config.branding.companyName || ''}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Primary Color"
                  value={config.branding.primaryColor || '#3B82F6'}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Welcome Message"
                  value={config.branding.welcomeMessage || ''}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="contained">Save Changes</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Portal User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Email"
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                value={inviteData.firstName}
                onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                fullWidth
              />
              <TextField
                label="Last Name"
                value={inviteData.lastName}
                onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInviteUser}>
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Article Dialog */}
      <Dialog open={articleDialogOpen} onClose={() => setArticleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Knowledge Base Article</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={newArticle.title}
              onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Category"
              value={newArticle.category}
              onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
              fullWidth
            />
            <TextField
              label="Content"
              value={newArticle.content}
              onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
              fullWidth
              multiline
              rows={6}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newArticle.isPublished}
                  onChange={(e) => setNewArticle({ ...newArticle, isPublished: e.target.checked })}
                />
              }
              label="Publish immediately"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArticleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateArticle}>
            Create Article
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerPortalPage;
