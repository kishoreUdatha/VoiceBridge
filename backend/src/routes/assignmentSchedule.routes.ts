import { Router } from 'express';
import { assignmentScheduleController } from '../controllers/assignmentSchedule.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get capacity stats (before :id routes to avoid conflict)
router.get(
  '/capacity',
  authorize(['admin', 'manager', 'owner']),
  assignmentScheduleController.getCapacityStats.bind(assignmentScheduleController)
);

// Create a new assignment schedule
router.post(
  '/',
  authorize(['admin', 'manager', 'owner']),
  assignmentScheduleController.createSchedule.bind(assignmentScheduleController)
);

// Get all schedules for organization
router.get(
  '/',
  authorize(['admin', 'manager', 'owner']),
  assignmentScheduleController.getSchedules.bind(assignmentScheduleController)
);

// Get a single schedule by ID
router.get(
  '/:id',
  authorize(['admin', 'manager', 'owner']),
  assignmentScheduleController.getScheduleById.bind(assignmentScheduleController)
);

// Update a schedule
router.put(
  '/:id',
  authorize(['admin', 'manager', 'owner']),
  assignmentScheduleController.updateSchedule.bind(assignmentScheduleController)
);

// Delete a schedule
router.delete(
  '/:id',
  authorize(['admin', 'manager', 'owner']),
  assignmentScheduleController.deleteSchedule.bind(assignmentScheduleController)
);

// Manually run a schedule
router.post(
  '/:id/run',
  authorize(['admin', 'manager', 'owner']),
  assignmentScheduleController.runSchedule.bind(assignmentScheduleController)
);

// Get run logs for a schedule
router.get(
  '/:id/logs',
  authorize(['admin', 'manager', 'owner']),
  assignmentScheduleController.getRunLogs.bind(assignmentScheduleController)
);

export default router;
