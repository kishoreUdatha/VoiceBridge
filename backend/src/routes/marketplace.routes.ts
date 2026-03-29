import { Router } from 'express';
import { body, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { marketplaceService } from '../services/marketplace.service';
import { authenticate, optionalAuth, authorize } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// Rate limiter for public endpoints
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { success: false, message: 'Too many requests' },
});

// Rate limiter for purchases
const purchaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 purchases per hour
  message: { success: false, message: 'Too many purchase requests' },
});

// Common validation rules
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const templateListValidation = [
  ...paginationValidation,
  query('industry').optional().isIn(['EDUCATION', 'REAL_ESTATE', 'HEALTHCARE', 'ECOMMERCE', 'FINANCE', 'CUSTOM']).withMessage('Invalid industry'),
  query('category').optional().trim().isLength({ max: 50 }).withMessage('Invalid category'),
  query('priceType').optional().isIn(['FREE', 'MONTHLY', 'ONE_TIME']).withMessage('Invalid price type'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search query too long'),
  query('featured').optional().isIn(['true', 'false']).withMessage('Invalid featured value'),
  query('sortBy').optional().isIn(['newest', 'popular', 'rating', 'price_low', 'price_high']).withMessage('Invalid sort option'),
];

const createTemplateValidation = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  body('slug').optional().trim().isLength({ max: 100 }).withMessage('Slug too long')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('shortDescription').optional().trim().isLength({ max: 500 }).withMessage('Short description too long'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
  body('industry').isIn(['EDUCATION', 'REAL_ESTATE', 'HEALTHCARE', 'ECOMMERCE', 'FINANCE', 'CUSTOM']).withMessage('Invalid industry'),
  body('category').optional().trim().isLength({ max: 50 }).withMessage('Invalid category'),
  body('priceType').optional().isIn(['FREE', 'MONTHLY', 'ONE_TIME']).withMessage('Invalid price type'),
  body('monthlyPrice').optional().isFloat({ min: 0, max: 10000 }).withMessage('Invalid monthly price'),
  body('oneTimePrice').optional().isFloat({ min: 0, max: 100000 }).withMessage('Invalid one-time price'),
  body('systemPrompt').optional().trim().isLength({ max: 10000 }).withMessage('System prompt too long'),
  body('greeting').optional().trim().isLength({ max: 1000 }).withMessage('Greeting too long'),
];

// ==================== DEFAULT MARKETPLACE AGENTS ====================

const DEFAULT_MARKETPLACE_AGENTS = [
  {
    id: 'agent_education_counselor',
    name: 'Education Counselor AI',
    slug: 'education-counselor-ai',
    shortDescription: 'AI agent specialized in education counseling, course inquiries, and student admissions',
    industry: 'EDUCATION',
    category: 'Sales & Admissions',
    tags: ['education', 'counseling', 'admissions'],
    priceType: 'FREE',
    monthlyPrice: 0,
    iconUrl: '/assets/agents/education.png',
    isFeatured: true,
    isVerified: true,
    installCount: 156,
    averageRating: 4.8,
    ratingCount: 42,
    creatorType: 'PLATFORM',
  },
  {
    id: 'agent_real_estate',
    name: 'Real Estate Assistant',
    slug: 'real-estate-assistant',
    shortDescription: 'Property inquiries, scheduling viewings, and qualification of leads',
    industry: 'REAL_ESTATE',
    category: 'Lead Qualification',
    tags: ['real-estate', 'property', 'viewings'],
    priceType: 'MONTHLY',
    monthlyPrice: 29,
    iconUrl: '/assets/agents/real-estate.png',
    isFeatured: true,
    isVerified: true,
    installCount: 89,
    averageRating: 4.6,
    ratingCount: 28,
    creatorType: 'PLATFORM',
  },
  {
    id: 'agent_healthcare',
    name: 'Healthcare Appointment Scheduler',
    slug: 'healthcare-scheduler',
    shortDescription: 'Book appointments, answer FAQs, and handle patient inquiries',
    industry: 'HEALTHCARE',
    category: 'Appointment Booking',
    tags: ['healthcare', 'appointments', 'medical'],
    priceType: 'MONTHLY',
    monthlyPrice: 49,
    iconUrl: '/assets/agents/healthcare.png',
    isFeatured: true,
    isVerified: true,
    installCount: 134,
    averageRating: 4.9,
    ratingCount: 56,
    creatorType: 'PLATFORM',
  },
  {
    id: 'agent_ecommerce',
    name: 'E-commerce Support Agent',
    slug: 'ecommerce-support',
    shortDescription: 'Order status, returns, product inquiries, and customer support',
    industry: 'ECOMMERCE',
    category: 'Customer Support',
    tags: ['ecommerce', 'support', 'orders'],
    priceType: 'MONTHLY',
    monthlyPrice: 39,
    iconUrl: '/assets/agents/ecommerce.png',
    isFeatured: false,
    isVerified: true,
    installCount: 67,
    averageRating: 4.5,
    ratingCount: 19,
    creatorType: 'PLATFORM',
  },
  {
    id: 'agent_general_sales',
    name: 'General Sales Agent',
    slug: 'general-sales-agent',
    shortDescription: 'Versatile sales agent for lead qualification and appointment setting',
    industry: 'CUSTOM',
    category: 'Sales',
    tags: ['sales', 'lead-gen', 'appointments'],
    priceType: 'FREE',
    monthlyPrice: 0,
    iconUrl: '/assets/agents/sales.png',
    isFeatured: true,
    isVerified: true,
    installCount: 234,
    averageRating: 4.7,
    ratingCount: 78,
    creatorType: 'PLATFORM',
  },
];

// ==================== PUBLIC ROUTES ====================

// List marketplace agents (alias for templates)
router.get(
  '/agents',
  publicLimiter,
  optionalAuth,
  validate(templateListValidation),
  asyncHandler(async (req, res) => {
    const {
      industry,
      category,
      priceType,
      search,
      featured,
      sortBy,
      page,
      limit,
    } = req.query;

    // Try to get from database first
    const result = await marketplaceService.listTemplates({
      industry: industry as any,
      category: category as string,
      priceType: priceType as any,
      search: search as string,
      featured: featured === 'true',
      sortBy: sortBy as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    // If no agents in database, return defaults
    if (result.templates.length === 0) {
      let filteredAgents = [...DEFAULT_MARKETPLACE_AGENTS];

      if (industry) {
        filteredAgents = filteredAgents.filter(a => a.industry === industry);
      }
      if (featured === 'true') {
        filteredAgents = filteredAgents.filter(a => a.isFeatured);
      }
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredAgents = filteredAgents.filter(a =>
          a.name.toLowerCase().includes(searchLower) ||
          a.shortDescription.toLowerCase().includes(searchLower)
        );
      }

      return res.json({
        success: true,
        data: filteredAgents,
        pagination: {
          page: 1,
          limit: filteredAgents.length,
          total: filteredAgents.length,
          totalPages: 1,
        },
        source: 'defaults',
      });
    }

    res.json({
      success: true,
      data: result.templates,
      pagination: result.pagination,
    });
  })
);

// List marketplace templates
router.get(
  '/templates',
  publicLimiter,
  optionalAuth,
  validate(templateListValidation),
  asyncHandler(async (req, res) => {
    const {
      industry,
      category,
      priceType,
      search,
      featured,
      sortBy,
      page,
      limit,
    } = req.query;

    const result = await marketplaceService.listTemplates({
      industry: industry as any,
      category: category as string,
      priceType: priceType as any,
      search: search as string,
      featured: featured === 'true',
      sortBy: sortBy as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.templates,
      pagination: result.pagination,
    });
  })
);

// Get featured templates
router.get(
  '/featured',
  publicLimiter,
  validate([
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ]),
  asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const templates = await marketplaceService.getFeaturedTemplates(
      limit ? Math.min(parseInt(limit as string), 50) : undefined
    );

    res.json({
      success: true,
      data: templates,
    });
  })
);

// Get categories
router.get(
  '/categories',
  publicLimiter,
  asyncHandler(async (req, res) => {
    const categories = await marketplaceService.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  })
);

// Get marketplace stats
router.get(
  '/stats',
  publicLimiter,
  asyncHandler(async (req, res) => {
    const stats = await marketplaceService.getMarketplaceStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get template by slug
router.get(
  '/templates/:slug',
  publicLimiter,
  optionalAuth,
  validate([
    param('slug').trim().notEmpty().withMessage('Slug is required')
      .isLength({ max: 100 }).withMessage('Invalid slug')
      .matches(/^[a-z0-9-]+$/).withMessage('Invalid slug format'),
  ]),
  asyncHandler(async (req, res) => {
    const template = await marketplaceService.getTemplateBySlug(req.params.slug);

    res.json({
      success: true,
      data: template,
    });
  })
);

// Get template reviews
router.get(
  '/templates/:templateId/reviews',
  publicLimiter,
  validate([
    param('templateId').isUUID().withMessage('Invalid template ID'),
    ...paginationValidation,
  ]),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;

    const result = await marketplaceService.getTemplateReviews(req.params.templateId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.reviews,
      ratingDistribution: result.ratingDistribution,
      pagination: result.pagination,
    });
  })
);

// ==================== AUTHENTICATED ROUTES ====================

// Get my templates (as creator)
router.get(
  '/my-templates',
  authenticate,
  tenantMiddleware,
  validate([
    ...paginationValidation,
    query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'published']).withMessage('Invalid status'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, page, limit } = req.query;

    const result = await marketplaceService.getCreatorTemplates(organizationId, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.templates,
      pagination: result.pagination,
    });
  })
);

// Create template
router.post(
  '/templates',
  authenticate,
  tenantMiddleware,
  validate(createTemplateValidation),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      name, slug, shortDescription, description, industry, category,
      priceType, monthlyPrice, oneTimePrice, systemPrompt, greeting,
    } = req.body;

    const template = await marketplaceService.createTemplate({
      creatorId: organizationId,
      creatorType: 'ORGANIZATION',
      name,
      slug,
      shortDescription,
      description,
      industry,
      category,
      priceType,
      monthlyPrice,
      oneTimePrice,
      systemPrompt,
      greeting,
    });

    res.status(201).json({
      success: true,
      message: 'Template created',
      data: template,
    });
  })
);

// Update template
router.put(
  '/templates/:templateId',
  authenticate,
  tenantMiddleware,
  validate([
    param('templateId').isUUID().withMessage('Invalid template ID'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
      .isLength({ max: 100 }).withMessage('Name too long'),
    body('shortDescription').optional().trim().isLength({ max: 500 }).withMessage('Short description too long'),
    body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description too long'),
    body('priceType').optional().isIn(['FREE', 'MONTHLY', 'ONE_TIME']).withMessage('Invalid price type'),
    body('monthlyPrice').optional().isFloat({ min: 0, max: 10000 }).withMessage('Invalid monthly price'),
    body('systemPrompt').optional().trim().isLength({ max: 10000 }).withMessage('System prompt too long'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { name, shortDescription, description, priceType, monthlyPrice, systemPrompt } = req.body;

    const template = await marketplaceService.updateTemplate(
      req.params.templateId,
      organizationId,
      { name, shortDescription, description, priceType, monthlyPrice, systemPrompt }
    );

    res.json({
      success: true,
      message: 'Template updated',
      data: template,
    });
  })
);

// Submit template for review
router.post(
  '/templates/:templateId/submit',
  authenticate,
  tenantMiddleware,
  validate([
    param('templateId').isUUID().withMessage('Invalid template ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const template = await marketplaceService.submitForReview(
      req.params.templateId,
      organizationId
    );

    res.json({
      success: true,
      message: 'Template submitted for review',
      data: template,
    });
  })
);

// Publish template
router.post(
  '/templates/:templateId/publish',
  authenticate,
  tenantMiddleware,
  validate([
    param('templateId').isUUID().withMessage('Invalid template ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const template = await marketplaceService.publishTemplate(
      req.params.templateId,
      organizationId
    );

    res.json({
      success: true,
      message: 'Template published',
      data: template,
    });
  })
);

// ==================== LICENSE ROUTES ====================

// Get my licenses
router.get(
  '/licenses',
  authenticate,
  tenantMiddleware,
  validate([
    ...paginationValidation,
    query('status').optional().isIn(['active', 'expired', 'cancelled']).withMessage('Invalid status'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, page, limit } = req.query;

    const result = await marketplaceService.getUserLicenses(organizationId, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.licenses,
      pagination: result.pagination,
    });
  })
);

// Purchase agent
router.post(
  '/purchase',
  authenticate,
  tenantMiddleware,
  purchaseLimiter,
  validate([
    body('templateId').isUUID().withMessage('Invalid template ID'),
    body('paymentId').optional().trim().isLength({ max: 100 }).withMessage('Invalid payment ID'),
    body('invoiceId').optional().trim().isLength({ max: 100 }).withMessage('Invalid invoice ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { templateId, paymentId, invoiceId } = req.body;

    const license = await marketplaceService.purchaseAgent({
      templateId,
      organizationId,
      paymentId,
      invoiceId,
    });

    res.status(201).json({
      success: true,
      message: 'Agent purchased successfully',
      data: license,
    });
  })
);

// Install agent from license
router.post(
  '/licenses/:licenseId/install',
  authenticate,
  tenantMiddleware,
  validate([
    param('licenseId').isUUID().withMessage('Invalid license ID'),
    body('name').optional().trim().isLength({ max: 100 }).withMessage('Name too long'),
    body('greeting').optional().trim().isLength({ max: 1000 }).withMessage('Greeting too long'),
    body('knowledgeBase').optional().trim().isLength({ max: 50000 }).withMessage('Knowledge base too large'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { name, greeting, knowledgeBase } = req.body;

    const agent = await marketplaceService.installAgent(
      req.params.licenseId,
      organizationId,
      { name, greeting, knowledgeBase }
    );

    res.status(201).json({
      success: true,
      message: 'Agent installed successfully',
      data: agent,
    });
  })
);

// Add review
router.post(
  '/templates/:templateId/reviews',
  authenticate,
  tenantMiddleware,
  validate([
    param('templateId').isUUID().withMessage('Invalid template ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().trim().isLength({ max: 200 }).withMessage('Title too long'),
    body('content').optional().trim().isLength({ max: 2000 }).withMessage('Review content too long'),
  ]),
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const { rating, title, content } = req.body;

    const review = await marketplaceService.addReview({
      templateId: req.params.templateId,
      organizationId,
      userId,
      rating,
      title,
      content,
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted',
      data: review,
    });
  })
);

// ==================== ADMIN ROUTES ====================

// Approve template (admin)
router.post(
  '/admin/templates/:templateId/approve',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'super_admin'),
  validate([
    param('templateId').isUUID().withMessage('Invalid template ID'),
  ]),
  asyncHandler(async (req, res) => {
    const template = await marketplaceService.approveTemplate(req.params.templateId);

    res.json({
      success: true,
      message: 'Template approved',
      data: template,
    });
  })
);

export default router;
