/**
 * Telephony Routes Index
 * Unified voice call handling for all providers
 */

import { Router } from 'express';
import voiceRoutes from './voice.routes';

const router = Router();

// Mount voice routes
router.use('/voice', voiceRoutes);

export default router;
