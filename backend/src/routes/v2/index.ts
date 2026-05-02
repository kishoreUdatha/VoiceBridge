/**
 * V2 API Routes
 *
 * Unified API layer that provides consistent behavior across mobile and web clients.
 *
 * Features:
 * - Consistent role-based access control
 * - Client type detection via x-client-type header
 * - Standardized response formats
 * - Backward compatible with existing functionality
 *
 * Client Detection:
 * - Set x-client-type header to 'mobile' or 'web'
 * - Responses may be optimized based on client type
 *
 * Role-Based Access Matrix:
 * | Role            | Leads Access           | Pipeline Analytics  | Team Stats      |
 * |-----------------|------------------------|---------------------|-----------------|
 * | Admin/Owner     | All org leads          | All org data        | All telecallers |
 * | Manager         | Branch + hierarchy     | Hierarchy data      | Team members    |
 * | Team Lead       | Team + unassigned      | Team data           | Direct reports  |
 * | Telecaller      | Own assigned leads     | Own data            | Own stats only  |
 */

import { Router } from 'express';
import dashboardRoutes from './dashboard.routes';
import leadsRoutes from './leads.routes';
import callsRoutes from './calls.routes';
import pipelinesRoutes from './pipelines.routes';

const router = Router();

// Mount V2 routes
router.use('/dashboard', dashboardRoutes);
router.use('/leads', leadsRoutes);
router.use('/calls', callsRoutes);
router.use('/pipelines', pipelinesRoutes);

// V2 API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VoiceBridge V2 API',
    version: '2.0.0',
    endpoints: {
      dashboard: {
        'GET /dashboard/stats': 'Get comprehensive dashboard statistics',
        'GET /dashboard/summary': 'Get quick summary counts',
        'GET /dashboard/lead-counts': 'Get lead counts by stage',
        'GET /dashboard/follow-ups': 'Get follow-up statistics',
      },
      leads: {
        'GET /leads': 'List leads with role-based filtering',
        'GET /leads/:id': 'Get single lead',
        'POST /leads': 'Create new lead',
        'PUT /leads/:id': 'Update lead',
        'GET /leads/:id/calls': 'Get lead call history',
        'GET /leads/:id/follow-ups': 'Get lead follow-ups',
      },
      calls: {
        'GET /calls': 'List calls with role-based filtering',
        'GET /calls/stats': 'Get call statistics',
        'POST /calls': 'Log new call',
        'GET /calls/:id': 'Get single call',
        'PUT /calls/:id': 'Update call',
      },
      pipelines: {
        'GET /pipelines': 'List pipelines',
        'GET /pipelines/:id': 'Get pipeline details',
        'GET /pipelines/:id/analytics': 'Get pipeline analytics (role-filtered)',
        'GET /pipelines/:id/stages': 'Get pipeline stages',
        'GET /pipelines/:id/leads': 'Get leads in pipeline (role-filtered)',
        'POST /pipelines/:id/move-lead': 'Move lead to different stage',
      },
    },
    headers: {
      'x-client-type': 'Set to "mobile" or "web" for optimized responses',
      'x-branch-id': 'Admin can filter by specific branch',
      'Authorization': 'Bearer <token>',
    },
  });
});

export default router;
