/**
 * Real-time Alerts Page
 * Manage alert rules and view notifications
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Badge,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationIcon,
  NotificationsActive as ActiveIcon,
  NotificationsOff as InactiveIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Webhook as WebhookIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  MarkEmailRead as MarkReadIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import realtimeAlertsService, {
  AlertRule,
  Alert as AlertType,
  AlertRuleConfig,
  AlertCondition,
  AlertTriggerEvent,
  AlertSeverity,
  AlertChannel,
  TriggerEventInfo,
  UserAlert,
  NotificationPreference,
} from '../../services/realtime-alerts.service';

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

const AlertsPage: React.FC = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [userAlerts, setUserAlerts] = useState<UserAlert[]>([]);
  const [triggerEvents, setTriggerEvents] = useState<TriggerEventInfo[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<AlertRuleConfig>>({
    name: '',
    description: '',
    triggerEvent: 'LEAD_CREATED',
    conditions: [],
    severity: 'INFO',
    channels: ['IN_APP'],
    recipients: [],
  });

  useEffect(() => {
    loadData();
    // Set up real-time subscription
    const eventSource = realtimeAlertsService.subscribeToAlerts((alert) => {
      setUserAlerts((prev) => [
        { id: '', alert, channel: 'IN_APP', isRead: false },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesData, alertsData, eventsData, prefsData, count] = await Promise.all([
        realtimeAlertsService.getAlertRules(),
        realtimeAlertsService.getUserAlerts(),
        realtimeAlertsService.getTriggerEvents(),
        realtimeAlertsService.getNotificationPreferences(),
        realtimeAlertsService.getUnreadCount(),
      ]);
      setRules(rulesData);
      setUserAlerts(alertsData);
      setTriggerEvents(eventsData);
      setPreferences(prefsData);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load alerts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      await realtimeAlertsService.createAlertRule(formData as AlertRuleConfig);
      setCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        triggerEvent: 'LEAD_CREATED',
        conditions: [],
        severity: 'INFO',
        channels: ['IN_APP'],
        recipients: [],
      });
      loadData();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      await realtimeAlertsService.updateAlertRule(rule.id, { isActive: !rule.isActive });
      loadData();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      await realtimeAlertsService.deleteAlertRule(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleMarkRead = async (alertId: string) => {
    try {
      await realtimeAlertsService.markAlertRead(alertId);
      setUserAlerts((prev) =>
        prev.map((a) => (a.alert.id === alertId ? { ...a, isRead: true } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error('Failed to mark alert read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await realtimeAlertsService.markAllAlertsRead();
      setUserAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all alerts read:', error);
    }
  };

  const handleSavePreferences = async () => {
    try {
      await realtimeAlertsService.updateNotificationPreferences(
        preferences.map((p) => ({
          channel: p.channel,
          isEnabled: p.isEnabled,
          settings: p.settings,
        }))
      );
      setPreferencesDialogOpen(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'URGENT':
      case 'CRITICAL':
        return <ErrorIcon color="error" />;
      case 'WARNING':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'URGENT':
      case 'CRITICAL':
        return 'error';
      case 'WARNING':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getChannelIcon = (channel: AlertChannel) => {
    switch (channel) {
      case 'EMAIL':
        return <EmailIcon />;
      case 'SMS':
        return <SmsIcon />;
      case 'WEBHOOK':
        return <WebhookIcon />;
      default:
        return <NotificationIcon />;
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
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h4">Alerts & Notifications</Typography>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationIcon />
          </Badge>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setPreferencesDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Preferences
          </Button>
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
            New Rule
          </Button>
        </Box>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab
          label={
            <Badge badgeContent={unreadCount} color="error">
              Notifications
            </Badge>
          }
        />
        <Tab label="Alert Rules" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button startIcon={<MarkReadIcon />} onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            Mark All Read
          </Button>
        </Box>
        <List>
          {userAlerts.map((userAlert) => (
            <React.Fragment key={userAlert.id || userAlert.alert.id}>
              <ListItem
                sx={{
                  bgcolor: userAlert.isRead ? 'transparent' : 'action.hover',
                  borderRadius: 1,
                }}
              >
                <ListItemIcon>{getSeverityIcon(userAlert.alert.severity)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={userAlert.isRead ? 'normal' : 'bold'}
                      >
                        {userAlert.alert.title}
                      </Typography>
                      <Chip
                        label={userAlert.alert.severity}
                        size="small"
                        color={getSeverityColor(userAlert.alert.severity) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2">{userAlert.alert.message}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(userAlert.alert.createdAt).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  {!userAlert.isRead && (
                    <Tooltip title="Mark as read">
                      <IconButton
                        edge="end"
                        onClick={() => handleMarkRead(userAlert.alert.id)}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
          {userAlerts.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No notifications yet. Configure alert rules to start receiving notifications.
            </Alert>
          )}
        </List>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {rules.map((rule) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={rule.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {rule.isActive ? (
                        <ActiveIcon color="success" />
                      ) : (
                        <InactiveIcon color="disabled" />
                      )}
                      <Typography variant="h6">{rule.name}</Typography>
                    </Box>
                    <Switch
                      checked={rule.isActive}
                      onChange={() => handleToggleRule(rule)}
                      size="small"
                    />
                  </Box>
                  {rule.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {rule.description}
                    </Typography>
                  )}
                  <Box mb={2}>
                    <Chip
                      label={rule.triggerEvent.replace('_', ' ')}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={rule.severity}
                      size="small"
                      color={getSeverityColor(rule.severity) as any}
                    />
                  </Box>
                  <Box display="flex" gap={0.5} mb={2}>
                    {rule.channels.map((channel) => (
                      <Tooltip key={channel} title={channel}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.light' }}>
                          {getChannelIcon(channel)}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Triggered {rule.triggeredCount} times
                    {rule.lastTriggeredAt &&
                      ` | Last: ${new Date(rule.lastTriggeredAt).toLocaleDateString()}`}
                  </Typography>
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {rules.length === 0 && (
            <Grid size={12}>
              <Alert severity="info">
                No alert rules configured. Create a new rule to start receiving alerts.
              </Alert>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Create Rule Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Alert Rule</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Rule Name"
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
                <InputLabel>Trigger Event</InputLabel>
                <Select
                  value={formData.triggerEvent}
                  label="Trigger Event"
                  onChange={(e) =>
                    setFormData({ ...formData, triggerEvent: e.target.value as AlertTriggerEvent })
                  }
                >
                  {triggerEvents.map((event) => (
                    <MenuItem key={event.event} value={event.event}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={formData.severity}
                  label="Severity"
                  onChange={(e) =>
                    setFormData({ ...formData, severity: e.target.value as AlertSeverity })
                  }
                >
                  <MenuItem value="INFO">Info</MenuItem>
                  <MenuItem value="WARNING">Warning</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Notification Channels
              </Typography>
              <Box display="flex" gap={1}>
                {(['IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK'] as AlertChannel[]).map(
                  (channel) => (
                    <Chip
                      key={channel}
                      label={channel}
                      icon={getChannelIcon(channel)}
                      onClick={() => {
                        const channels = formData.channels || [];
                        if (channels.includes(channel)) {
                          setFormData({
                            ...formData,
                            channels: channels.filter((c) => c !== channel),
                          });
                        } else {
                          setFormData({ ...formData, channels: [...channels, channel] });
                        }
                      }}
                      color={formData.channels?.includes(channel) ? 'primary' : 'default'}
                      variant={formData.channels?.includes(channel) ? 'filled' : 'outlined'}
                    />
                  )
                )}
              </Box>
            </Grid>
            {formData.channels?.includes('EMAIL') && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Email Recipients (comma-separated)"
                  value={formData.recipients?.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recipients: e.target.value.split(',').map((r) => r.trim()),
                    })
                  }
                />
              </Grid>
            )}
            {formData.channels?.includes('WEBHOOK') && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Webhook URL"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                />
              </Grid>
            )}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Custom Message Template"
                multiline
                rows={2}
                value={formData.messageTemplate}
                onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                helperText="Use {{field}} for dynamic values"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateRule}
            disabled={!formData.name || !formData.triggerEvent}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog
        open={preferencesDialogOpen}
        onClose={() => setPreferencesDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Notification Preferences</DialogTitle>
        <DialogContent>
          <List>
            {(['IN_APP', 'EMAIL', 'SMS', 'PUSH'] as AlertChannel[]).map((channel) => {
              const pref = preferences.find((p) => p.channel === channel);
              return (
                <ListItem key={channel}>
                  <ListItemIcon>{getChannelIcon(channel)}</ListItemIcon>
                  <ListItemText
                    primary={channel.replace('_', ' ')}
                    secondary={`Receive ${channel.toLowerCase()} notifications`}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={pref?.isEnabled ?? true}
                      onChange={(e) => {
                        setPreferences((prev) => {
                          const existing = prev.find((p) => p.channel === channel);
                          if (existing) {
                            return prev.map((p) =>
                              p.channel === channel
                                ? { ...p, isEnabled: e.target.checked }
                                : p
                            );
                          }
                          return [
                            ...prev,
                            {
                              id: '',
                              userId: '',
                              channel,
                              isEnabled: e.target.checked,
                            },
                          ];
                        });
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreferencesDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePreferences}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertsPage;
