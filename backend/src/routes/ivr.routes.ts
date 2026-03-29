import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { ivrService } from '../services/ivr.service';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { IvrNodeType } from '@prisma/client';

const router = Router();

// Rate limiter for public webhook endpoints (protection against DoS)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per IP
  message: '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Too many requests. Please try again later.</Say><Hangup/></Response>',
  standardHeaders: false,
  legacyHeaders: false,
});

// Helper function to escape XML special characters (prevent TwiML injection)
function escapeXml(unsafe: string | undefined | null): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to validate and sanitize phone numbers
function sanitizePhoneNumber(phone: string | undefined): string {
  if (!phone) return '';
  // Only allow digits, +, -, (, ), and spaces
  return phone.replace(/[^\d+\-() ]/g, '').substring(0, 20);
}

// ==================== WEBHOOKS (No Auth - Called by Telephony Providers) ====================

// Inbound call webhook - entry point for IVR
router.post('/webhook/inbound', webhookLimiter, async (req: Request, res: Response) => {
  try {
    // Sanitize inputs from telephony provider
    const CallSid = escapeXml(req.body.CallSid)?.substring(0, 100);
    const From = sanitizePhoneNumber(req.body.From);
    const To = sanitizePhoneNumber(req.body.To);

    console.log(`IVR: Incoming call from ${From} to ${To} (SID: ${CallSid})`);

    // Find IVR flow for this phone number
    const flow = await ivrService.getFlowForNumber(To);

    if (!flow) {
      // No IVR configured, return default response
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Thank you for calling. Please hold while we connect you.</Say>
          <Hangup/>
        </Response>`);
      return;
    }

    // Execute the IVR flow
    const context = {
      callSid: CallSid,
      callerNumber: From,
      calledNumber: To,
      variables: {},
      inputs: [],
    };

    const result = await ivrService.executeFlow(flow.id, context);

    // Generate TwiML based on action
    const twiml = generateTwiML(result, flow.id, CallSid);

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('IVR webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, an error occurred. Please try again later.</Say>
        <Hangup/>
      </Response>`);
  }
});

// DTMF input webhook
router.post('/webhook/gather/:flowId/:nodeId', webhookLimiter, async (req: Request, res: Response) => {
  try {
    const { flowId, nodeId } = req.params;

    // Validate flowId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(flowId)) {
      res.set('Content-Type', 'text/xml');
      return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request.</Say><Hangup/></Response>`);
    }

    // Sanitize inputs
    const Digits = escapeXml(req.body.Digits)?.substring(0, 20);
    const CallSid = escapeXml(req.body.CallSid)?.substring(0, 100);
    const From = sanitizePhoneNumber(req.body.From);
    const To = sanitizePhoneNumber(req.body.To);

    console.log(`IVR: DTMF input ${Digits} for flow ${flowId}, node ${nodeId}`);

    const context = {
      callSid: CallSid,
      callerNumber: From,
      calledNumber: To,
      currentNodeId: nodeId,
      variables: {},
      inputs: [],
    };

    const result = await ivrService.handleDtmfInput(flowId, nodeId, Digits, context);

    const twiml = generateTwiML(result, flowId, CallSid);

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('IVR gather webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Invalid input. Please try again.</Say>
        <Redirect>/api/ivr/webhook/inbound</Redirect>
      </Response>`);
  }
});

// Helper function to generate TwiML (with proper XML escaping to prevent injection)
function generateTwiML(
  result: { action: string; data: Record<string, unknown>; nextNodeId?: string },
  flowId: string,
  callSid: string
): string {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

  // Validate flowId is a proper UUID to prevent injection in URLs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const safeFlowId = uuidRegex.test(flowId) ? flowId : '';
  const safeNextNodeId = result.nextNodeId && uuidRegex.test(result.nextNodeId) ? result.nextNodeId : 'next';

  switch (result.action) {
    case 'play':
      if (result.data.audioUrl) {
        // Validate URL format and escape
        const audioUrl = escapeXml(String(result.data.audioUrl));
        if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
          twiml += `<Play>${audioUrl}</Play>`;
        }
      } else if (result.data.text) {
        twiml += `<Say>${escapeXml(String(result.data.text))}</Say>`;
      }
      if (result.nextNodeId && safeFlowId) {
        twiml += `<Redirect>/api/ivr/webhook/gather/${safeFlowId}/${safeNextNodeId}</Redirect>`;
      }
      break;

    case 'gather':
      const numDigits = Math.min(Math.max(Number(result.data.numDigits) || 1, 1), 20);
      const timeout = Math.min(Math.max(Number(result.data.timeout) || 10, 1), 60);
      twiml += `<Gather action="/api/ivr/webhook/gather/${safeFlowId}/${safeNextNodeId}" `;
      twiml += `numDigits="${numDigits}" `;
      twiml += `timeout="${timeout}">`;
      if (result.data.text) {
        twiml += `<Say>${escapeXml(String(result.data.text))}</Say>`;
      }
      twiml += '</Gather>';
      twiml += `<Say>${escapeXml(String(result.data.text)) || 'We did not receive any input. Goodbye.'}</Say>`;
      break;

    case 'queue':
      const queueId = escapeXml(String(result.data.queueId || ''))?.substring(0, 100);
      twiml += `<Enqueue waitUrl="/api/ivr/webhook/hold-music">${queueId}</Enqueue>`;
      break;

    case 'transfer':
      const transferNumber = sanitizePhoneNumber(String(result.data.number));
      if (transferNumber) {
        if (result.data.type === 'warm') {
          twiml += `<Dial timeout="30"><Number>${escapeXml(transferNumber)}</Number></Dial>`;
        } else {
          twiml += `<Dial><Number>${escapeXml(transferNumber)}</Number></Dial>`;
        }
      } else {
        twiml += '<Say>Transfer number not configured.</Say><Hangup/>';
      }
      break;

    case 'voicemail':
      const greeting = escapeXml(String(result.data.greeting)) || 'Please leave a message after the beep.';
      const maxDuration = Math.min(Math.max(Number(result.data.maxDuration) || 120, 1), 300);
      twiml += `<Say>${greeting}</Say>`;
      twiml += `<Record maxLength="${maxDuration}" `;
      twiml += `recordingStatusCallback="/api/voicemail/webhook/recording" />`;
      break;

    case 'hangup':
      if (result.data.message) {
        twiml += `<Say>${escapeXml(String(result.data.message))}</Say>`;
      }
      twiml += '<Hangup/>';
      break;

    case 'replay':
      twiml += `<Say>${escapeXml(String(result.data.message))}</Say>`;
      twiml += `<Redirect>/api/ivr/webhook/inbound</Redirect>`;
      break;

    default:
      twiml += '<Hangup/>';
  }

  twiml += '</Response>';
  return twiml;
}

// ==================== AUTHENTICATED ROUTES ====================

router.use(authenticate);
router.use(tenantMiddleware);

// === IVR Flows ===

// Get all IVR flows
router.get('/flows', validate([
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, isActive, search } = req.query;

    const result = await ivrService.getFlows(
      {
        organizationId: req.organizationId!,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search: search as string,
      },
      Number(page),
      Number(limit)
    );

    return ApiResponse.paginated(res, 'IVR flows retrieved', result.flows, result.page, result.limit, result.total);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Get single IVR flow
router.get('/flows/:id', validate([
  param('id').isUUID().withMessage('Invalid flow ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const flow = await ivrService.getFlowById(req.params.id, req.organizationId!);
    return ApiResponse.success(res, 'IVR flow retrieved', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Create IVR flow
router.post('/flows', validate([
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('welcomeMessage').optional().trim().isLength({ max: 1000 }).withMessage('Welcome message too long'),
  body('timeoutSeconds').optional().isInt({ min: 1, max: 60 }).withMessage('Timeout must be between 1 and 60'),
  body('maxRetries').optional().isInt({ min: 1, max: 10 }).withMessage('Max retries must be between 1 and 10'),
  body('invalidInputMessage').optional().trim().isLength({ max: 500 }).withMessage('Invalid input message too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { name, description, welcomeMessage, timeoutSeconds, maxRetries, invalidInputMessage } = req.body;

    const flow = await ivrService.createFlow({
      organizationId: req.organizationId!,
      name,
      description,
      welcomeMessage,
      timeoutSeconds,
      maxRetries,
      invalidInputMessage,
    });

    return ApiResponse.created(res, 'IVR flow created', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Update IVR flow
router.put('/flows/:id', validate([
  param('id').isUUID().withMessage('Invalid flow ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('welcomeMessage').optional().trim().isLength({ max: 1000 }).withMessage('Welcome message too long'),
  body('timeoutSeconds').optional().isInt({ min: 1, max: 60 }).withMessage('Invalid timeout'),
  body('maxRetries').optional().isInt({ min: 1, max: 10 }).withMessage('Invalid max retries'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { name, description, welcomeMessage, timeoutSeconds, maxRetries, invalidInputMessage, isActive } = req.body;
    const flow = await ivrService.updateFlow(req.params.id, req.organizationId!, {
      name, description, welcomeMessage, timeoutSeconds, maxRetries, invalidInputMessage, isActive
    });
    return ApiResponse.success(res, 'IVR flow updated', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Publish IVR flow
router.post('/flows/:id/publish', validate([
  param('id').isUUID().withMessage('Invalid flow ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const flow = await ivrService.publishFlow(req.params.id, req.organizationId!);
    return ApiResponse.success(res, 'Flow published successfully', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Delete IVR flow
router.delete('/flows/:id', validate([
  param('id').isUUID().withMessage('Invalid flow ID'),
]), async (req: TenantRequest, res: Response) => {
  try {
    await ivrService.deleteFlow(req.params.id, req.organizationId!);
    return ApiResponse.success(res, 'Flow deleted successfully', null);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// === Phone Number Mapping ===

// Assign phone number to flow
router.post('/phone-numbers', validate([
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
  body('flowId').isUUID().withMessage('Invalid flow ID'),
  body('phoneNumberId').optional().trim().isLength({ max: 100 }).withMessage('Phone number ID too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { phoneNumber, flowId, phoneNumberId } = req.body;

    const mapping = await ivrService.assignPhoneNumber(
      req.organizationId!,
      phoneNumber,
      flowId,
      phoneNumberId
    );

    return ApiResponse.created(res, 'Phone number assigned', mapping);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// Unassign phone number
router.delete('/phone-numbers/:phoneNumber', validate([
  param('phoneNumber').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[\d+\-() ]{7,20}$/).withMessage('Invalid phone number format'),
]), async (req: TenantRequest, res: Response) => {
  try {
    await ivrService.unassignPhoneNumber(req.organizationId!, req.params.phoneNumber);
    return ApiResponse.success(res, 'Phone number unassigned', null);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, error.statusCode);
  }
});

// === IVR Menus (Alias for flows with menu structure) ===

// Default IVR menu templates
const DEFAULT_IVR_MENUS = [
  {
    id: 'menu_main',
    name: 'Main Menu',
    description: 'Primary IVR menu for incoming calls',
    welcomeMessage: 'Welcome to our company. Please listen to the following options.',
    options: [
      { digit: '1', label: 'Sales', action: 'transfer', destination: 'sales_queue' },
      { digit: '2', label: 'Support', action: 'transfer', destination: 'support_queue' },
      { digit: '3', label: 'Billing', action: 'transfer', destination: 'billing_queue' },
      { digit: '0', label: 'Speak to Operator', action: 'transfer', destination: 'operator' },
    ],
    timeoutSeconds: 10,
    maxRetries: 3,
    isActive: true,
  },
  {
    id: 'menu_after_hours',
    name: 'After Hours Menu',
    description: 'IVR menu for calls outside business hours',
    welcomeMessage: 'Thank you for calling. Our office is currently closed.',
    options: [
      { digit: '1', label: 'Leave Voicemail', action: 'voicemail', destination: 'general_voicemail' },
      { digit: '2', label: 'Request Callback', action: 'callback', destination: null },
    ],
    timeoutSeconds: 10,
    maxRetries: 2,
    isActive: true,
  },
  {
    id: 'menu_holiday',
    name: 'Holiday Menu',
    description: 'IVR menu for holidays',
    welcomeMessage: 'Thank you for calling. We are closed for the holiday.',
    options: [
      { digit: '1', label: 'Leave Voicemail', action: 'voicemail', destination: 'general_voicemail' },
    ],
    timeoutSeconds: 10,
    maxRetries: 2,
    isActive: false,
  },
];

// Get IVR menus (flows formatted as menus)
router.get('/menus', async (req: TenantRequest, res: Response) => {
  try {
    // Get organization's IVR flows
    const result = await ivrService.getFlows({ organizationId: req.organizationId! });
    const flows = result.flows || [];

    // Transform flows into menu format
    const menus = flows.map((flow: any) => ({
      id: flow.id,
      name: flow.name,
      description: flow.description,
      welcomeMessage: flow.welcomeMessage,
      options: flow.nodes?.filter((n: any) => n.type === 'MENU').flatMap((n: any) => n.data?.options || []) || [],
      timeoutSeconds: flow.timeoutSeconds,
      maxRetries: flow.maxRetries,
      isActive: flow.isActive,
      isPublished: flow.status === 'PUBLISHED',
    }));

    // If no menus configured, return default templates
    if (menus.length === 0) {
      return ApiResponse.success(res, 'IVR menu templates', DEFAULT_IVR_MENUS);
    }

    return ApiResponse.success(res, 'IVR menus retrieved', menus);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Create IVR menu from template
router.post('/menus', validate([
  body('templateId').optional().trim().isLength({ max: 100 }).withMessage('Invalid template ID'),
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name too long'),
  body('welcomeMessage').optional().trim().isLength({ max: 1000 }).withMessage('Welcome message too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { name, welcomeMessage } = req.body;

    // Create flow from menu definition
    const flow = await ivrService.createFlow({
      organizationId: req.organizationId!,
      name: name || 'New IVR Menu',
      description: 'Created from menu template',
      welcomeMessage: welcomeMessage || 'Welcome. Please select an option.',
      timeoutSeconds: 10,
      maxRetries: 3,
    });

    return ApiResponse.created(res, 'IVR menu created', flow);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// === IVR Nodes ===

// Get nodes
router.get('/nodes', validate([
  query('type').optional().isIn(['MENU', 'PLAY', 'GATHER', 'TRANSFER', 'QUEUE', 'VOICEMAIL', 'HANGUP', 'CONDITION', 'API_CALL'])
    .withMessage('Invalid node type'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { type } = req.query;
    const nodes = await ivrService.getNodes(
      req.organizationId!,
      type as IvrNodeType | undefined
    );
    return ApiResponse.success(res, 'IVR nodes retrieved', nodes);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Create node
router.post('/nodes', validate([
  body('flowId').isUUID().withMessage('Invalid flow ID'),
  body('type').isIn(['MENU', 'PLAY', 'GATHER', 'TRANSFER', 'QUEUE', 'VOICEMAIL', 'HANGUP', 'CONDITION', 'API_CALL'])
    .withMessage('Invalid node type'),
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name too long'),
  body('label').optional().trim().isLength({ max: 100 }).withMessage('Label too long'),
  body('position').optional().isObject().withMessage('Position must be an object'),
  body('position.x').optional().isFloat({ min: -10000, max: 10000 }).withMessage('Invalid x position'),
  body('position.y').optional().isFloat({ min: -10000, max: 10000 }).withMessage('Invalid y position'),
  body('data').optional().custom((value) => {
    if (typeof value !== 'object' || value === null) {
      throw new Error('Data must be an object');
    }
    // Limit data size to prevent abuse
    const jsonStr = JSON.stringify(value);
    if (jsonStr.length > 50000) {
      throw new Error('Data object too large');
    }
    return true;
  }),
  body('connections').optional().isArray({ max: 50 }).withMessage('Too many connections'),
  body('connections.*.targetNodeId').optional().isUUID().withMessage('Invalid target node ID'),
  body('connections.*.condition').optional().trim().isLength({ max: 500 }).withMessage('Condition too long'),
]), async (req: TenantRequest, res: Response) => {
  try {
    const { flowId, type, name, label, position, data, connections } = req.body;
    const node = await ivrService.createNode({
      organizationId: req.organizationId!,
      flowId,
      type,
      name,
      label,
      position,
      data,
      connections,
    });
    return ApiResponse.created(res, 'IVR node created', node);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
