/**
 * Video Meeting Routes
 */

import { Router, Request, Response } from 'express';
import { videoMeetingService } from '../services/video-meeting.service';

const router = Router();

// Get provider configuration
router.get('/providers/:provider', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const config = await videoMeetingService.getProviderConfig(
      organizationId,
      req.params.provider as any
    );
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Configure provider
router.post('/providers/:provider', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const config = await videoMeetingService.configureProvider(
      organizationId,
      req.params.provider as any,
      req.body
    );
    res.status(201).json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all meetings
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { status, hostId, leadId, startDate, endDate, limit } = req.query;

    const meetings = await videoMeetingService.getMeetings(organizationId, {
      status,
      hostId,
      leadId,
      dateRange: startDate && endDate
        ? { start: new Date(startDate as string), end: new Date(endDate as string) }
        : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json(meetings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single meeting
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const meeting = await videoMeetingService.getMeeting(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create meeting
router.post('/', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const meeting = await videoMeetingService.createMeeting(organizationId, req.body);
    res.status(201).json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update meeting
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const meeting = await videoMeetingService.updateMeeting(req.params.id, req.body);
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel meeting
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const meeting = await videoMeetingService.cancelMeeting(req.params.id);
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start meeting
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const meeting = await videoMeetingService.startMeeting(req.params.id);
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// End meeting
router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const meeting = await videoMeetingService.endMeeting(req.params.id);
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Participant joined
router.post('/:id/participants/:email/join', async (req: Request, res: Response) => {
  try {
    const participant = await videoMeetingService.participantJoined(
      req.params.id,
      req.params.email
    );
    res.json(participant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Participant left
router.post('/:id/participants/:email/leave', async (req: Request, res: Response) => {
  try {
    const participant = await videoMeetingService.participantLeft(
      req.params.id,
      req.params.email
    );
    res.json(participant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update recording
router.post('/:id/recording', async (req: Request, res: Response) => {
  try {
    const { recordingUrl, recordingDuration, transcriptUrl } = req.body;
    const meeting = await videoMeetingService.updateRecording(
      req.params.id,
      recordingUrl,
      recordingDuration,
      transcriptUrl
    );
    res.json(meeting);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming meetings for user
router.get('/user/:userId/upcoming', async (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    const meetings = await videoMeetingService.getUpcomingMeetings(
      req.params.userId,
      days ? parseInt(days as string) : undefined
    );
    res.json(meetings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get meeting statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { startDate, endDate } = req.query;
    const dateRange = startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined;
    const stats = await videoMeetingService.getMeetingStats(organizationId, dateRange);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
