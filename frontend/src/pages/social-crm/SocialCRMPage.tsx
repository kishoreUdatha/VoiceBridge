/**
 * Social CRM & Monitoring Page
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
  Avatar,
  TextField,
  InputAdornment,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Language as SocialIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  ThumbUp as PositiveIcon,
  ThumbDown as NegativeIcon,
  SentimentNeutral as NeutralIcon,
  Reply as ReplyIcon,
  Flag as FlagIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';

// Interfaces
interface SocialMention {
  id: string;
  platform: 'FACEBOOK' | 'TWITTER' | 'LINKEDIN' | 'INSTAGRAM';
  content: string;
  author: string;
  authorProfileUrl?: string;
  postUrl?: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  engagementScore: number;
  likes: number;
  shares: number;
  comments: number;
  mentionedAt: string;
  isResponded: boolean;
  leadId?: string;
}

interface SocialProfile {
  id: string;
  platform: string;
  profileUrl: string;
  followers: number;
  isVerified: boolean;
  lastActivity?: string;
}

const SocialCRMPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mentions, setMentions] = useState<SocialMention[]>([]);
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockMentions: SocialMention[] = [
        {
          id: '1',
          platform: 'TWITTER',
          content: 'Amazing experience with @YourBrand customer support! Resolved my issue in minutes.',
          author: 'John Doe',
          authorProfileUrl: 'https://twitter.com/johndoe',
          postUrl: 'https://twitter.com/johndoe/status/123',
          sentiment: 'POSITIVE',
          engagementScore: 85,
          likes: 45,
          shares: 12,
          comments: 8,
          mentionedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isResponded: true,
        },
        {
          id: '2',
          platform: 'FACEBOOK',
          content: 'Been waiting for my order for 2 weeks now. Not happy with the service.',
          author: 'Jane Smith',
          sentiment: 'NEGATIVE',
          engagementScore: 62,
          likes: 3,
          shares: 0,
          comments: 5,
          mentionedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          isResponded: false,
        },
        {
          id: '3',
          platform: 'LINKEDIN',
          content: 'Just completed a great partnership meeting with the team. Looking forward to collaboration!',
          author: 'Tech Corp',
          sentiment: 'POSITIVE',
          engagementScore: 90,
          likes: 156,
          shares: 23,
          comments: 18,
          mentionedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          isResponded: true,
        },
        {
          id: '4',
          platform: 'INSTAGRAM',
          content: 'Check out this new product launch! What do you think? #newproduct #launch',
          author: 'Brand Ambassador',
          sentiment: 'NEUTRAL',
          engagementScore: 75,
          likes: 234,
          shares: 45,
          comments: 67,
          mentionedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          isResponded: false,
        },
      ];
      setMentions(mockMentions);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'FACEBOOK': return <FacebookIcon />;
      case 'TWITTER': return <TwitterIcon />;
      case 'LINKEDIN': return <LinkedInIcon />;
      case 'INSTAGRAM': return <InstagramIcon />;
      default: return <SocialIcon />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'FACEBOOK': return '#1877F2';
      case 'TWITTER': return '#1DA1F2';
      case 'LINKEDIN': return '#0A66C2';
      case 'INSTAGRAM': return '#E4405F';
      default: return '#888';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': return <PositiveIcon sx={{ color: 'success.main' }} />;
      case 'NEGATIVE': return <NegativeIcon sx={{ color: 'error.main' }} />;
      default: return <NeutralIcon sx={{ color: 'warning.main' }} />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': return 'success';
      case 'NEGATIVE': return 'error';
      default: return 'warning';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  // Filter mentions
  const filteredMentions = mentions.filter(m => {
    if (searchTerm && !m.content.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !m.author.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (sentimentFilter && m.sentiment !== sentimentFilter) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const positiveMentions = mentions.filter(m => m.sentiment === 'POSITIVE').length;
  const negativeMentions = mentions.filter(m => m.sentiment === 'NEGATIVE').length;
  const responseRate = mentions.length ? Math.round((mentions.filter(m => m.isResponded).length / mentions.length) * 100) : 0;
  const avgEngagement = mentions.length ? Math.round(mentions.reduce((acc, m) => acc + m.engagementScore, 0) / mentions.length) : 0;

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
          <SocialIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Social CRM
        </Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={loadData} sx={{ mr: 1 }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            Add Profile
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
              <TrendingIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4">{mentions.length}</Typography>
              <Typography variant="caption" color="text.secondary">Total Mentions</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PositiveIcon sx={{ fontSize: 32, color: 'success.dark' }} />
              <Typography variant="h4" color="success.dark">{positiveMentions}</Typography>
              <Typography variant="caption" color="success.dark">Positive</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <NegativeIcon sx={{ fontSize: 32, color: 'error.dark' }} />
              <Typography variant="h4" color="error.dark">{negativeMentions}</Typography>
              <Typography variant="caption" color="error.dark">Negative</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ReplyIcon sx={{ fontSize: 32, color: 'info.main' }} />
              <Typography variant="h4" color="info.main">{responseRate}%</Typography>
              <Typography variant="caption" color="text.secondary">Response Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search mentions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="All"
            onClick={() => setSentimentFilter('')}
            color={!sentimentFilter ? 'primary' : 'default'}
            variant={!sentimentFilter ? 'filled' : 'outlined'}
          />
          <Chip
            label="Positive"
            icon={<PositiveIcon />}
            onClick={() => setSentimentFilter('POSITIVE')}
            color={sentimentFilter === 'POSITIVE' ? 'success' : 'default'}
            variant={sentimentFilter === 'POSITIVE' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Negative"
            icon={<NegativeIcon />}
            onClick={() => setSentimentFilter('NEGATIVE')}
            color={sentimentFilter === 'NEGATIVE' ? 'error' : 'default'}
            variant={sentimentFilter === 'NEGATIVE' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Neutral"
            icon={<NeutralIcon />}
            onClick={() => setSentimentFilter('NEUTRAL')}
            color={sentimentFilter === 'NEUTRAL' ? 'warning' : 'default'}
            variant={sentimentFilter === 'NEUTRAL' ? 'filled' : 'outlined'}
          />
        </Box>
      </Box>

      {/* Mentions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Platform</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Sentiment</TableCell>
              <TableCell align="center">Engagement</TableCell>
              <TableCell>Time</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMentions.map((mention) => (
              <TableRow key={mention.id} hover>
                <TableCell>
                  <Avatar sx={{ bgcolor: getPlatformColor(mention.platform), width: 32, height: 32 }}>
                    {getPlatformIcon(mention.platform)}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2">{mention.author}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Typography variant="body2" noWrap>
                    {mention.content}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getSentimentIcon(mention.sentiment)}
                    <Chip
                      label={mention.sentiment}
                      size="small"
                      color={getSentimentColor(mention.sentiment) as any}
                      variant="outlined"
                    />
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ minWidth: 100 }}>
                    <Typography variant="body2">{mention.engagementScore}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={mention.engagementScore}
                      color={mention.engagementScore > 70 ? 'success' : mention.engagementScore > 40 ? 'warning' : 'error'}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {mention.likes} likes • {mention.shares} shares
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{formatDate(mention.mentionedAt)}</TableCell>
                <TableCell align="right">
                  {!mention.isResponded && (
                    <Button size="small" startIcon={<ReplyIcon />} sx={{ mr: 1 }}>
                      Reply
                    </Button>
                  )}
                  {mention.isResponded && (
                    <Chip label="Responded" size="small" color="success" variant="outlined" />
                  )}
                  <IconButton size="small" title="Flag">
                    <FlagIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredMentions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <SocialIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    No mentions found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SocialCRMPage;
