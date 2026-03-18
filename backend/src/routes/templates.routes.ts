import { Router } from 'express';
import { templateService } from '../services/template.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @api {get} /templates List Templates
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      type,
      category,
      isActive,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await templateService.getTemplates(organizationId, {
      type: type as any,
      category: category as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * @api {get} /templates/variables Get Available Variables
 */
router.get(
  '/variables',
  asyncHandler(async (req, res) => {
    const variables = templateService.getAvailableVariables();

    res.json({
      success: true,
      data: variables,
    });
  })
);

/**
 * @api {get} /templates/categories Get Template Categories
 */
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const categories = await templateService.getCategories(organizationId);

    res.json({
      success: true,
      data: categories,
    });
  })
);

/**
 * @api {post} /templates Create Template
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const {
      name,
      type,
      category,
      subject,
      content,
      htmlContent,
      variables,
      sampleValues,
      headerType,
      headerContent,
      footerContent,
      buttons,
      whatsappLanguage,
    } = req.body;

    if (!name) {
      throw new AppError('Template name is required', 400);
    }

    if (!type || !['SMS', 'EMAIL', 'WHATSAPP'].includes(type)) {
      throw new AppError('Valid template type is required (SMS, EMAIL, WHATSAPP)', 400);
    }

    if (!content) {
      throw new AppError('Template content is required', 400);
    }

    // Validate template
    const validation = templateService.validateTemplate(content, type);
    if (!validation.valid) {
      throw new AppError(validation.errors.join('; '), 400);
    }

    const template = await templateService.createTemplate({
      organizationId,
      name,
      type,
      category,
      subject,
      content,
      htmlContent,
      variables,
      sampleValues,
      headerType,
      headerContent,
      footerContent,
      buttons,
      whatsappLanguage,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template,
    });
  })
);

/**
 * @api {get} /templates/:id Get Template
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const template = await templateService.getTemplateById(id, organizationId);

    res.json({
      success: true,
      data: template,
    });
  })
);

/**
 * @api {put} /templates/:id Update Template
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const {
      name,
      category,
      subject,
      content,
      htmlContent,
      variables,
      sampleValues,
      headerType,
      headerContent,
      footerContent,
      buttons,
      isActive,
      isDefault,
      whatsappLanguage,
    } = req.body;

    // Validate if content changed
    if (content) {
      const template = await templateService.getTemplateById(id, organizationId);
      const validation = templateService.validateTemplate(content, template.type);
      if (!validation.valid) {
        throw new AppError(validation.errors.join('; '), 400);
      }
    }

    const template = await templateService.updateTemplate(id, organizationId, {
      name,
      category,
      subject,
      content,
      htmlContent,
      variables,
      sampleValues,
      headerType,
      headerContent,
      footerContent,
      buttons,
      isActive,
      isDefault,
      whatsappLanguage,
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  })
);

/**
 * @api {delete} /templates/:id Delete Template
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    await templateService.deleteTemplate(id, organizationId);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  })
);

/**
 * @api {post} /templates/:id/duplicate Duplicate Template
 */
router.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { name } = req.body;

    const template = await templateService.duplicateTemplate(id, organizationId, name);

    res.json({
      success: true,
      message: 'Template duplicated successfully',
      data: template,
    });
  })
);

/**
 * @api {get} /templates/:id/preview Preview Template
 */
router.get(
  '/:id/preview',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const preview = await templateService.previewTemplate(id, organizationId);

    res.json({
      success: true,
      data: preview,
    });
  })
);

/**
 * @api {post} /templates/:id/render Render Template with Variables
 */
router.post(
  '/:id/render',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { variables } = req.body;

    if (!variables || typeof variables !== 'object') {
      throw new AppError('Variables object is required', 400);
    }

    const rendered = await templateService.renderTemplate(id, organizationId, variables);

    res.json({
      success: true,
      data: rendered,
    });
  })
);

/**
 * @api {post} /templates/validate Validate Template Content
 */
router.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const { content, type } = req.body;

    if (!content) {
      throw new AppError('Content is required', 400);
    }

    if (!type || !['SMS', 'EMAIL', 'WHATSAPP'].includes(type)) {
      throw new AppError('Valid type is required (SMS, EMAIL, WHATSAPP)', 400);
    }

    const validation = templateService.validateTemplate(content, type);

    // Add SMS info if SMS type
    let smsInfo = null;
    if (type === 'SMS') {
      smsInfo = templateService.getSmsInfo(content);
    }

    res.json({
      success: true,
      data: {
        ...validation,
        smsInfo,
      },
    });
  })
);

/**
 * @api {post} /templates/sms-info Get SMS Character Info
 */
router.post(
  '/sms-info',
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content) {
      throw new AppError('Content is required', 400);
    }

    const info = templateService.getSmsInfo(content);

    res.json({
      success: true,
      data: info,
    });
  })
);

export default router;
