import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { userManagementController } from '../controllers/user-management.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// ================== LOGIN HISTORY ==================

// Get all login history (admin/manager)
router.get(
  '/login-history',
  authorize('admin', 'manager'),
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('userId').optional().isUUID(),
  ]),
  userManagementController.getLoginHistory.bind(userManagementController)
);

// Get login history for specific user
router.get(
  '/users/:id/login-history',
  authorize('admin', 'manager'),
  validate([
    param('id').isUUID().withMessage('Invalid user ID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  userManagementController.getUserLoginHistory.bind(userManagementController)
);

// ================== SESSION MANAGEMENT ==================

// Get all active sessions (admin only)
router.get(
  '/sessions',
  authorize('admin'),
  userManagementController.getAllActiveSessions.bind(userManagementController)
);

// Get sessions for specific user
router.get(
  '/users/:id/sessions',
  authorize('admin'),
  validate([param('id').isUUID().withMessage('Invalid user ID')]),
  userManagementController.getUserSessions.bind(userManagementController)
);

// Revoke a specific session
router.delete(
  '/sessions/:sessionId',
  authorize('admin'),
  validate([param('sessionId').isUUID().withMessage('Invalid session ID')]),
  userManagementController.revokeSession.bind(userManagementController)
);

// Revoke all sessions for a user
router.post(
  '/users/:id/revoke-sessions',
  authorize('admin'),
  validate([
    param('id').isUUID().withMessage('Invalid user ID'),
    body('exceptCurrentSession').optional().isBoolean(),
    body('currentToken').optional().isString(),
  ]),
  userManagementController.revokeAllUserSessions.bind(userManagementController)
);

// ================== BULK OPERATIONS ==================

// Bulk update users (role, manager, status)
router.post(
  '/bulk/update',
  authorize('admin'),
  validate([
    body('userIds').isArray({ min: 1 }).withMessage('User IDs required'),
    body('userIds.*').isUUID().withMessage('Invalid user ID'),
    body('roleId').optional().isUUID().withMessage('Invalid role ID'),
    body('managerId').optional({ nullable: true }).isUUID().withMessage('Invalid manager ID'),
    body('isActive').optional().isBoolean(),
  ]),
  userManagementController.bulkUpdateUsers.bind(userManagementController)
);

// Bulk delete users
router.post(
  '/bulk/delete',
  authorize('admin'),
  validate([
    body('userIds').isArray({ min: 1 }).withMessage('User IDs required'),
    body('userIds.*').isUUID().withMessage('Invalid user ID'),
  ]),
  userManagementController.bulkDeleteUsers.bind(userManagementController)
);

// ================== CSV IMPORT ==================

// Import users from CSV
router.post(
  '/import',
  authorize('admin'),
  validate([
    body('users').isArray({ min: 1 }).withMessage('Users array required'),
    body('users.*.email').isEmail().withMessage('Valid email required'),
    body('users.*.firstName').trim().notEmpty().withMessage('First name required'),
    body('users.*.lastName').trim().notEmpty().withMessage('Last name required'),
    body('users.*.roleSlug').trim().notEmpty().withMessage('Role slug required'),
    body('users.*.phone').optional().trim(),
    body('users.*.managerEmail').optional().isEmail(),
    body('users.*.password').optional().isLength({ min: 8 }),
  ]),
  userManagementController.importUsers.bind(userManagementController)
);

// ================== USER ANALYTICS ==================

// Get analytics for specific user
router.get(
  '/users/:id/analytics',
  authorize('admin', 'manager'),
  validate([param('id').isUUID().withMessage('Invalid user ID')]),
  userManagementController.getUserAnalytics.bind(userManagementController)
);

// Get bulk analytics for multiple users
router.get(
  '/analytics/bulk',
  authorize('admin', 'manager'),
  validate([query('userIds').isString().notEmpty().withMessage('User IDs required')]),
  userManagementController.getBulkUserAnalytics.bind(userManagementController)
);

// ================== 2FA MANAGEMENT ==================

// Toggle 2FA for a user
router.post(
  '/users/:id/2fa',
  authorize('admin'),
  validate([
    param('id').isUUID().withMessage('Invalid user ID'),
    body('enabled').isBoolean().withMessage('Enabled status required'),
  ]),
  userManagementController.toggle2FA.bind(userManagementController)
);

export default router;
