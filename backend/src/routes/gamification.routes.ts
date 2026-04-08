/**
 * Gamification Routes
 */

import { Router, Request, Response } from 'express';
import { gamificationService } from '../services/gamification.service';

const router = Router();

// ==================== Achievements ====================

// Get all achievements
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { type } = req.query;
    const achievements = await gamificationService.getAchievements(organizationId, type as any);
    res.json(achievements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create achievement
router.post('/achievements', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const achievement = await gamificationService.createAchievement(organizationId, req.body);
    res.status(201).json(achievement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update achievement
router.put('/achievements/:id', async (req: Request, res: Response) => {
  try {
    const achievement = await gamificationService.updateAchievement(req.params.id, req.body);
    res.json(achievement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user achievements
router.get('/users/:userId/achievements', async (req: Request, res: Response) => {
  try {
    const achievements = await gamificationService.getUserAchievements(req.params.userId);
    res.json(achievements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Award achievement
router.post('/users/:userId/achievements/:achievementId', async (req: Request, res: Response) => {
  try {
    const achievement = await gamificationService.awardAchievement(
      req.params.userId,
      req.params.achievementId
    );
    res.status(201).json(achievement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check achievements for activity
router.post('/users/:userId/check-achievements', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { activityType, value } = req.body;
    const achievements = await gamificationService.checkAchievements(
      req.params.userId,
      organizationId,
      activityType,
      value
    );
    res.json(achievements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Scores & Leaderboard ====================

// Get user score
router.get('/users/:userId/score', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const score = await gamificationService.getUserScore(organizationId, req.params.userId);
    res.json(score);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user score
router.post('/users/:userId/score', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { points, source } = req.body;
    const score = await gamificationService.updateUserScore(
      req.params.userId,
      organizationId,
      points,
      source
    );
    res.json(score);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update streak
router.post('/users/:userId/streak', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const score = await gamificationService.updateStreak(
      organizationId,
      req.params.userId,
      new Date()
    );
    res.json(score);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { period, limit } = req.query;
    const leaderboard = await gamificationService.getLeaderboard(
      organizationId,
      period as any,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset periodic scores (admin/cron)
router.post('/scores/reset', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { period } = req.body;
    await gamificationService.resetPeriodicScores(organizationId, period);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Challenges ====================

// Get challenges
router.get('/challenges', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { status } = req.query;
    const challenges = await gamificationService.getChallenges(organizationId, status as any);
    res.json(challenges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single challenge
router.get('/challenges/:id', async (req: Request, res: Response) => {
  try {
    const challenge = await gamificationService.getChallenge(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    res.json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create challenge
router.post('/challenges', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const challenge = await gamificationService.createChallenge(organizationId, userId, req.body);
    res.status(201).json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Join challenge
router.post('/challenges/:id/join', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { teamId } = req.body;
    const participant = await gamificationService.joinChallenge(req.params.id, userId, teamId);
    res.status(201).json(participant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Leave challenge
router.post('/challenges/:id/leave', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    await gamificationService.leaveChallenge(req.params.id, userId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update challenge progress
router.post('/challenges/:id/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { progressKey, value } = req.body;
    const participant = await gamificationService.updateChallengeProgress(
      req.params.id,
      userId,
      progressKey,
      value
    );
    res.json(participant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start challenge (admin)
router.post('/challenges/:id/start', async (req: Request, res: Response) => {
  try {
    const challenge = await gamificationService.startChallenge(req.params.id);
    res.json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// End challenge (admin)
router.post('/challenges/:id/end', async (req: Request, res: Response) => {
  try {
    const challenge = await gamificationService.endChallenge(req.params.id);
    res.json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's challenges
router.get('/users/:userId/challenges', async (req: Request, res: Response) => {
  try {
    const challenges = await gamificationService.getUserChallenges(req.params.userId);
    res.json(challenges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
