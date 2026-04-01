import { Request, Response, NextFunction } from 'express';
import { dealService } from '../../services/fieldSales';
import { BadRequestError } from '../../utils/errors';

export class DealController {
  /**
   * Create a new deal
   * POST /api/field-sales/deals
   */
  async createDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      const {
        collegeId,
        dealName,
        description,
        products,
        dealValue,
        stage,
        expectedCloseDate,
      } = req.body;

      if (!collegeId) {
        throw new BadRequestError('College ID is required');
      }

      const deal = await dealService.createDeal({
        organizationId,
        ownerId: req.body.ownerId || userId,
        collegeId,
        dealName,
        description,
        products,
        dealValue,
        stage,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      });

      res.status(201).json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all deals
   * GET /api/field-sales/deals
   */
  async getDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filter: any = {
        organizationId,
        stage: req.query.stage as any,
        minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
        maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
      };

      // If not admin/manager, only show own deals
      if (!['admin', 'manager', 'owner'].includes(userRole)) {
        filter.ownerId = userId;
      } else if (req.query.ownerId) {
        filter.ownerId = req.query.ownerId as string;
      }

      const { deals, total } = await dealService.getDeals(filter, page, limit);

      res.json({
        success: true,
        data: deals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get deal by ID
   * GET /api/field-sales/deals/:id
   */
  async getDealById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const deal = await dealService.getDealById(id, organizationId);

      res.json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get deal by college ID
   * GET /api/field-sales/deals/college/:collegeId
   */
  async getDealByCollegeId(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { collegeId } = req.params;

      const deal = await dealService.getDealByCollegeId(collegeId, organizationId);

      res.json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update deal
   * PUT /api/field-sales/deals/:id
   */
  async updateDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const deal = await dealService.updateDeal(id, organizationId, req.body);

      res.json({
        success: true,
        data: deal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update deal stage
   * POST /api/field-sales/deals/:id/stage
   */
  async updateStage(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const { id } = req.params;
      const { stage, reason } = req.body;

      if (!stage) {
        throw new BadRequestError('New stage is required');
      }

      const deal = await dealService.updateStage(id, organizationId, stage, userId, reason);

      res.json({
        success: true,
        data: deal,
        message: `Deal moved to ${stage}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete deal
   * DELETE /api/field-sales/deals/:id
   */
  async deleteDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      await dealService.deleteDeal(id, organizationId);

      res.json({
        success: true,
        message: 'Deal deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get deal pipeline view
   * GET /api/field-sales/deals/pipeline
   */
  async getPipeline(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const ownerId = ['admin', 'manager', 'owner'].includes(userRole)
        ? (req.query.ownerId as string) || undefined
        : userId;

      const pipeline = await dealService.getPipeline(organizationId, ownerId);

      res.json({
        success: true,
        data: pipeline,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get deal statistics
   * GET /api/field-sales/deals/stats
   */
  async getDealStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const ownerId = ['admin', 'manager', 'owner'].includes(userRole)
        ? (req.query.ownerId as string) || undefined
        : userId;

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const stats = await dealService.getDealStats(organizationId, ownerId, startDate, endDate);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent wins
   * GET /api/field-sales/deals/recent-wins
   */
  async getRecentWins(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const limit = parseInt(req.query.limit as string) || 5;

      const wins = await dealService.getRecentWins(organizationId, limit);

      res.json({
        success: true,
        data: wins,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dealController = new DealController();
