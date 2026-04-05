import { Request, Response, NextFunction } from 'express';
import { visitService } from '../../services/fieldSales';
import { BadRequestError } from '../../utils/errors';

export class VisitController {
  /**
   * Check in to a college visit
   * POST /api/field-sales/visits/check-in
   * Supports two modes:
   * 1. Existing college: { collegeId, purpose, ... }
   * 2. Ad-hoc visit: { collegeName, state, district, city, purpose, ... }
   */
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      const {
        collegeId,
        collegeName,
        state,
        district,
        city,
        purpose,
        checkInLocation,
        latitude,
        longitude,
        address,
      } = req.body;

      if (!purpose) {
        throw new BadRequestError('Purpose is required');
      }

      if (!collegeId && !collegeName) {
        throw new BadRequestError('Either College ID or College Name is required');
      }

      // Extract coordinates from checkInLocation object or direct fields
      const lat = checkInLocation?.latitude || latitude;
      const lng = checkInLocation?.longitude || longitude;

      const visit = await visitService.checkIn({
        organizationId,
        userId,
        collegeId,
        collegeName,
        state,
        district,
        city,
        purpose,
        latitude: lat,
        longitude: lng,
        address,
      });

      res.status(201).json({
        success: true,
        data: visit,
        message: visit.locationVerified
          ? 'Checked in successfully - location verified'
          : 'Checked in successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check out from a college visit
   * POST /api/field-sales/visits/:id/check-out
   */
  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const {
        outcome,
        summary,
        contactsMet,
        contactDetails,
        actionItems,
        nextVisitDate,
        nextAction,
        photos,
        documents,
      } = req.body;

      if (!outcome || !summary) {
        throw new BadRequestError('Outcome and summary are required');
      }

      const visit = await visitService.checkOut({
        visitId: id,
        outcome,
        summary,
        contactsMet,
        contactDetails,
        actionItems,
        nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : undefined,
        nextAction,
        photos,
        documents,
      });

      res.json({
        success: true,
        data: visit,
        message: `Visit completed - Duration: ${visit.duration} minutes`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a visit record manually (for past visits)
   * POST /api/field-sales/visits
   */
  async createVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      const {
        collegeId,
        visitDate,
        purpose,
        summary,
        contactsMet,
        actionItems,
        nextVisitDate,
        nextAction,
      } = req.body;

      if (!collegeId || !visitDate || !purpose || !summary) {
        throw new BadRequestError('College ID, visit date, purpose, and summary are required');
      }

      const visit = await visitService.createVisit({
        organizationId,
        userId,
        collegeId,
        visitDate: new Date(visitDate),
        purpose,
        summary,
        contactsMet,
        actionItems,
        nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : undefined,
        nextAction,
      });

      res.status(201).json({
        success: true,
        data: visit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all visits
   * GET /api/field-sales/visits
   */
  async getVisits(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const filter: any = {
        organizationId,
        collegeId: req.query.collegeId as string,
        purpose: req.query.purpose as any,
        outcome: req.query.outcome as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      // If not admin/manager, only show own visits
      if (!['admin', 'manager', 'owner'].includes(userRole)) {
        filter.userId = userId;
      } else if (req.query.userId) {
        filter.userId = req.query.userId as string;
      }

      const { visits, total } = await visitService.getVisits(filter, page, limit);

      res.json({
        success: true,
        data: visits,
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
   * Get visit by ID
   * GET /api/field-sales/visits/:id
   */
  async getVisitById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const visit = await visitService.getVisitById(id, organizationId);

      res.json({
        success: true,
        data: visit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update visit
   * PUT /api/field-sales/visits/:id
   */
  async updateVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const visit = await visitService.updateVisit(id, organizationId, req.body);

      res.json({
        success: true,
        data: visit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete visit
   * DELETE /api/field-sales/visits/:id
   */
  async deleteVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      await visitService.deleteVisit(id, organizationId);

      res.json({
        success: true,
        message: 'Visit deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current open visit for user
   * GET /api/field-sales/visits/open
   */
  async getOpenVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const visit = await visitService.getOpenVisit(userId);

      res.json({
        success: true,
        data: visit,
        hasOpenVisit: !!visit,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get visit statistics
   * GET /api/field-sales/visits/stats
   */
  async getVisitStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const filterUserId = ['admin', 'manager', 'owner'].includes(userRole)
        ? (req.query.userId as string) || undefined
        : userId;

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const stats = await visitService.getVisitStats(
        organizationId,
        filterUserId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get today's schedule for user
   * GET /api/field-sales/visits/today
   */
  async getTodaySchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      const schedule = await visitService.getTodaySchedule(userId, organizationId);

      res.json({
        success: true,
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const visitController = new VisitController();
