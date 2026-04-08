/**
 * Quotation Management Routes
 * API endpoints for quotes/proposals, e-signature, and payments
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as quotationService from '../services/quotation.service';

const router = Router();

// ==========================================
// QUOTATION ENDPOINTS (Protected)
// ==========================================

// List quotations
router.get('/', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { status, leadId, search, page, limit, sortBy, sortOrder } = req.query;

    const result = await quotationService.listQuotations(organizationId, {
      status: status as any,
      leadId: leadId as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get quotation statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const stats = await quotationService.getQuotationStats(organizationId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create quotation
router.post('/', authenticate, async (req, res) => {
  try {
    const { organizationId, id: userId } = req.user!;
    const quotation = await quotationService.createQuotation(
      organizationId,
      req.body,
      userId
    );
    res.status(201).json({ success: true, data: quotation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get quotation by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const quotation = await quotationService.getQuotation(req.params.id, organizationId);
    res.json({ success: true, data: quotation });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Update quotation
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { organizationId, id: userId } = req.user!;
    const quotation = await quotationService.updateQuotation(
      req.params.id,
      organizationId,
      req.body,
      userId
    );
    res.json({ success: true, data: quotation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete quotation
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    await quotationService.deleteQuotation(req.params.id, organizationId);
    res.json({ success: true, message: 'Quotation deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Duplicate quotation
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const { organizationId, id: userId } = req.user!;
    const quotation = await quotationService.duplicateQuotation(
      req.params.id,
      organizationId,
      userId
    );
    res.status(201).json({ success: true, data: quotation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Send quotation
router.post('/:id/send', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { sendVia, message } = req.body;
    const result = await quotationService.sendQuotation(req.params.id, organizationId, {
      sendVia: sendVia || ['email'],
      message,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Create payment link
router.post('/:id/payment-link', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { amount, description } = req.body;
    const result = await quotationService.createPaymentLink(
      req.params.id,
      organizationId,
      { amount, description }
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Record payment
router.post('/:id/payments', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const payment = await quotationService.recordPayment(
      req.params.id,
      organizationId,
      req.body
    );
    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// PUBLIC ENDPOINTS (For client viewing/signing)
// ==========================================

// Get quotation by number (public)
router.get('/public/:quotationNumber', async (req, res) => {
  try {
    const quotation = await quotationService.getQuotationByNumber(req.params.quotationNumber);
    res.json({ success: true, data: quotation });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Accept quotation (public)
router.post('/public/:quotationNumber/accept', async (req, res) => {
  try {
    const { signedByName, signedByEmail, signatureUrl } = req.body;
    const quotation = await quotationService.acceptQuotation(
      req.params.quotationNumber,
      {
        signedByName,
        signedByEmail,
        signatureUrl,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );
    res.json({ success: true, data: quotation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Reject quotation (public)
router.post('/public/:quotationNumber/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const quotation = await quotationService.rejectQuotation(
      req.params.quotationNumber,
      reason
    );
    res.json({ success: true, data: quotation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// PRODUCT CATALOG ENDPOINTS
// ==========================================

// List products
router.get('/products/catalog', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { search, category, isActive } = req.query;

    const products = await quotationService.listProducts(organizationId, {
      search: search as string,
      category: category as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({ success: true, data: products });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create product
router.post('/products/catalog', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const product = await quotationService.createProduct(organizationId, req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update product
router.put('/products/catalog/:id', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const product = await quotationService.updateProduct(
      req.params.id,
      organizationId,
      req.body
    );
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete product
router.delete('/products/catalog/:id', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user!;
    await quotationService.deleteProduct(req.params.id, organizationId);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
