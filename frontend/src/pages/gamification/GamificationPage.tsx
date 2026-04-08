/**
 * Gamification Dashboard Page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Button,
  Divider,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Leaderboard as LeaderboardIcon,
  LocalFireDepartment as StreakIcon,
  Star as StarIcon,
  Flag as ChallengeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { gamificationService, Achievement, LeaderboardEntry, Challenge, GamificationScore } from '../../services/gamification.service';
import { authService } from '../../services/auth.service';

const GamificationPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userScore, setUserScore] = useState<GamificationScore | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // User ID will be obtained from context or loaded asynchronously
  const userId = 'current-user'; // Placeholder - should come from auth context

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [leaderboardPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [score, achievementsList, userAch, challengesList] = await Promise.all([
        gamificationService.getUserScore(userId),
        gamificationService.getAchievements(),
        gamificationService.getUserAchievements(userId),
        gamificationService.getChallenges('ACTIVE'),
      ]);

      setUserScore(score);
      setAchievements(achievementsList);
      setUserAchievements(userAch.map(a => a.achievementId));
      setChallenges(challengesList);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await gamificationService.getLeaderboard(leaderboardPeriod, 10);
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BRONZE': return '#CD7F32';
      case 'SILVER': return '#C0C0C0';
      case 'GOLD': return '#FFD700';
      case 'PLATINUM': return '#E5E4E2';
      case 'DIAMOND': return '#B9F2FF';
      default: return '#888';
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return undefined;
    }
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
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        <TrophyIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
        Gamification
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* User Stats */}
      {userScore && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card sx={{ bgcolor: 'primary.dark', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="overline">Total Points</Typography>
                <Typography variant="h3">{userScore.totalPoints.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Level</Typography>
                <Typography variant="h3" color="primary">{userScore.level}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <StreakIcon sx={{ fontSize: 40, color: 'error.main' }} />
                <Typography variant="h4">{userScore.currentStreak}</Typography>
                <Typography variant="caption" color="text.secondary">Day Streak</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>This Week</Typography>
                <Typography variant="h4" color="success.main">+{userScore.weeklyPoints}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>This Month</Typography>
                <Typography variant="h4" color="info.main">+{userScore.monthlyPoints}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<LeaderboardIcon />} label="Leaderboard" />
        <Tab icon={<StarIcon />} label="Achievements" />
        <Tab icon={<ChallengeIcon />} label="Challenges" />
      </Tabs>

      {/* Leaderboard Tab */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <LeaderboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Top Performers
              </Typography>
              <Box>
                {(['weekly', 'monthly', 'allTime'] as const).map((period) => (
                  <Button
                    key={period}
                    size="small"
                    variant={leaderboardPeriod === period ? 'contained' : 'text'}
                    onClick={() => setLeaderboardPeriod(period)}
                    sx={{ ml: 1 }}
                  >
                    {period === 'allTime' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
                  </Button>
                ))}
              </Box>
            </Box>
            <List>
              {leaderboard.map((entry) => (
                <ListItem key={entry.userId} divider>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: getRankColor(entry.rank) || 'grey.300',
                        color: entry.rank <= 3 ? 'black' : 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      {entry.rank}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {entry.userName}
                        {entry.streak > 0 && (
                          <Chip
                            icon={<StreakIcon />}
                            label={`${entry.streak} days`}
                            size="small"
                            color="error"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={`Level ${entry.level}`}
                  />
                  <Typography variant="h6" color="primary">
                    {entry.points.toLocaleString()} pts
                  </Typography>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Achievements Tab */}
      {tabValue === 1 && (
        <Grid container spacing={2}>
          {achievements.map((achievement) => {
            const isEarned = userAchievements.includes(achievement.id);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={achievement.id}>
                <Card
                  sx={{
                    opacity: isEarned ? 1 : 0.6,
                    border: isEarned ? '2px solid' : 'none',
                    borderColor: getTierColor(achievement.tier),
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar
                        sx={{
                          bgcolor: achievement.badgeColor || getTierColor(achievement.tier),
                          width: 48,
                          height: 48,
                          mr: 2,
                        }}
                      >
                        {achievement.badgeIcon || <TrophyIcon />}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {achievement.name}
                          {achievement.isSecret && !isEarned && ' 🔒'}
                        </Typography>
                        <Chip
                          label={achievement.tier}
                          size="small"
                          sx={{ bgcolor: getTierColor(achievement.tier), color: 'black' }}
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {achievement.isSecret && !isEarned ? 'Secret achievement - unlock to reveal' : achievement.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {achievement.earnedCount} earned
                      </Typography>
                      <Chip
                        label={`+${achievement.points} pts`}
                        size="small"
                        color={isEarned ? 'success' : 'default'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Challenges Tab */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          {challenges.map((challenge, idx) => (
            <Grid size={{ xs: 12, md: 6 }} key={challenge.id || idx}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{challenge.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {challenge.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={challenge.status}
                      size="small"
                      color={challenge.status === 'ACTIVE' ? 'success' : 'default'}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Goals:</Typography>
                    {Object.entries(challenge.goals).map(([key, value]) => (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {key.replace(/_/g, ' ')}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ mr: 1 }}>
                        {challenge._count?.participants || 0} participants
                      </Typography>
                      <Button size="small" variant="contained">
                        Join
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {challenges.length === 0 && (
            <Grid size={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <ChallengeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    No active challenges right now. Check back later!
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default GamificationPage;
