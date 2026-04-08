/**
 * Video Meetings Page
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
  Avatar,
  AvatarGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  VideoCall as VideoIcon,
  Refresh as RefreshIcon,
  PlayArrow as JoinIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Groups as ParticipantsIcon,
  AccessTime as DurationIcon,
} from '@mui/icons-material';
import { videoMeetingService, VideoMeeting } from '../../services/video-meeting.service';

const VideoMeetingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    provider: 'ZOOM' as const,
    scheduledStart: '',
    duration: 30,
    leadId: '',
    hostId: '',
  });

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const data = await videoMeetingService.getMeetings();
      setMeetings(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    try {
      // Calculate end time based on duration
      const startDate = new Date(newMeeting.scheduledStart);
      const endDate = new Date(startDate.getTime() + newMeeting.duration * 60000);

      await videoMeetingService.createMeeting({
        title: newMeeting.title,
        provider: newMeeting.provider,
        scheduledStart: newMeeting.scheduledStart,
        scheduledEnd: endDate.toISOString(),
        hostId: newMeeting.hostId || 'current-user', // Would get from auth context
        leadId: newMeeting.leadId || undefined,
      });
      setCreateDialogOpen(false);
      setNewMeeting({ title: '', provider: 'ZOOM', scheduledStart: '', duration: 30, leadId: '', hostId: '' });
      loadMeetings();
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting');
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'info';
      case 'IN_PROGRESS': return 'success';
      case 'COMPLETED': return 'default';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'ZOOM': return '#2D8CFF';
      case 'GOOGLE_MEET': return '#00897B';
      case 'MICROSOFT_TEAMS': return '#6264A7';
      default: return '#888';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate stats
  const scheduledMeetings = meetings.filter(m => m.status === 'SCHEDULED').length;
  const completedMeetings = meetings.filter(m => m.status === 'COMPLETED').length;
  const totalDuration = meetings.reduce((acc, m) => acc + (m.actualDuration || m.duration || 0), 0);

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
          <VideoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Video Meetings
        </Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={loadMeetings} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            Schedule Meeting
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
              <ScheduleIcon sx={{ fontSize: 32, color: 'info.main' }} />
              <Typography variant="h4">{scheduledMeetings}</Typography>
              <Typography variant="caption" color="text.secondary">Scheduled</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <VideoIcon sx={{ fontSize: 32, color: 'success.main' }} />
              <Typography variant="h4">{completedMeetings}</Typography>
              <Typography variant="caption" color="text.secondary">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DurationIcon sx={{ fontSize: 32, color: 'warning.main' }} />
              <Typography variant="h4">{Math.round(totalDuration / 60)}h</Typography>
              <Typography variant="caption" color="text.secondary">Total Time</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ParticipantsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4">{meetings.length}</Typography>
              <Typography variant="caption" color="text.secondary">Total Meetings</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Meetings Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Meeting</TableCell>
              <TableCell>Platform</TableCell>
              <TableCell>Scheduled</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Participants</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meetings.map((meeting) => (
              <TableRow key={meeting.id} hover>
                <TableCell>
                  <Typography variant="subtitle2">{meeting.title}</Typography>
                  {meeting.externalMeetingId && (
                    <Typography variant="caption" color="text.secondary">
                      ID: {meeting.externalMeetingId}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={(meeting.provider || meeting.platform || 'ZOOM').replace('_', ' ')}
                    size="small"
                    sx={{
                      bgcolor: getPlatformColor(meeting.provider || meeting.platform || 'ZOOM'),
                      color: 'white',
                    }}
                  />
                </TableCell>
                <TableCell>{formatDate(meeting.scheduledStart || meeting.scheduledAt || '')}</TableCell>
                <TableCell>{meeting.duration} min</TableCell>
                <TableCell>
                  <Chip
                    label={meeting.status}
                    size="small"
                    color={getStatusColor(meeting.status) as any}
                  />
                </TableCell>
                <TableCell>
                  <AvatarGroup max={3} sx={{ justifyContent: 'flex-start' }}>
                    {meeting.participants?.map((p, idx) => (
                      <Avatar key={idx} sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                        {p.email?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                </TableCell>
                <TableCell align="right">
                  {meeting.status === 'SCHEDULED' && meeting.joinUrl && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<JoinIcon />}
                      href={meeting.joinUrl}
                      target="_blank"
                      sx={{ mr: 1 }}
                    >
                      Join
                    </Button>
                  )}
                  {meeting.joinUrl && (
                    <IconButton size="small" onClick={() => handleCopyLink(meeting.joinUrl!)} title="Copy link">
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton size="small" color="error" title="Cancel">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {meetings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <VideoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    No meetings scheduled. Create your first meeting.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Meeting Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule New Meeting</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Meeting Title"
              value={newMeeting.title}
              onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Platform</InputLabel>
              <Select
                value={newMeeting.provider}
                label="Platform"
                onChange={(e) => setNewMeeting({ ...newMeeting, provider: e.target.value as any })}
              >
                <MenuItem value="ZOOM">Zoom</MenuItem>
                <MenuItem value="GOOGLE_MEET">Google Meet</MenuItem>
                <MenuItem value="MICROSOFT_TEAMS">Microsoft Teams</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Date & Time"
              type="datetime-local"
              value={newMeeting.scheduledStart}
              onChange={(e) => setNewMeeting({ ...newMeeting, scheduledStart: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Duration (minutes)"
              type="number"
              value={newMeeting.duration}
              onChange={(e) => setNewMeeting({ ...newMeeting, duration: parseInt(e.target.value) })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateMeeting}>
            Schedule Meeting
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoMeetingsPage;
