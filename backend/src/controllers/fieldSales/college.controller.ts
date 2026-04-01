import { Request, Response, NextFunction } from 'express';
import { collegeService } from '../../services/fieldSales';
import { BadRequestError } from '../../utils/errors';

export class CollegeController {
  /**
   * Create a new college
   * POST /api/field-sales/colleges
   */
  async createCollege(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;

      const college = await collegeService.createCollege({
        organizationId,
        assignedToId: req.body.assignedToId || userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: college,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all colleges
   * GET /api/field-sales/colleges
   */
  async getColleges(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const filter: any = {
        organizationId,
        city: req.query.city as string,
        state: req.query.state as string,
        collegeType: req.query.collegeType as any,
        institutionStatus: req.query.institutionStatus as any,
        category: req.query.category as any,
        status: req.query.status as any,
        search: req.query.search as string,
      };

      // If not admin/manager, only show assigned colleges
      if (!['admin', 'manager', 'owner'].includes(userRole)) {
        filter.assignedToId = userId;
      } else if (req.query.assignedToId) {
        filter.assignedToId = req.query.assignedToId as string;
      }

      const { colleges, total } = await collegeService.getColleges(
        filter,
        page,
        limit,
        sortBy,
        sortOrder
      );

      res.json({
        success: true,
        data: colleges,
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
   * Get college by ID
   * GET /api/field-sales/colleges/:id
   */
  async getCollegeById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const college = await collegeService.getCollegeById(id, organizationId);

      res.json({
        success: true,
        data: college,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update college
   * PUT /api/field-sales/colleges/:id
   */
  async updateCollege(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const college = await collegeService.updateCollege(id, organizationId, req.body);

      res.json({
        success: true,
        data: college,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete college (soft delete)
   * DELETE /api/field-sales/colleges/:id
   */
  async deleteCollege(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      await collegeService.deleteCollege(id, organizationId);

      res.json({
        success: true,
        message: 'College deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reassign college to another user
   * POST /api/field-sales/colleges/:id/reassign
   */
  async reassignCollege(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const { id } = req.params;
      const { newAssigneeId } = req.body;

      if (!newAssigneeId) {
        throw new BadRequestError('New assignee ID is required');
      }

      const college = await collegeService.reassignCollege(
        id,
        organizationId,
        newAssigneeId,
        userId
      );

      res.json({
        success: true,
        data: college,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add contact to college
   * POST /api/field-sales/colleges/:id/contacts
   */
  async addContact(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { id } = req.params;

      const contact = await collegeService.addContact(id, organizationId, req.body);

      res.status(201).json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update contact
   * PUT /api/field-sales/colleges/:collegeId/contacts/:contactId
   */
  async updateContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { collegeId, contactId } = req.params;

      const contact = await collegeService.updateContact(contactId, collegeId, req.body);

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete contact
   * DELETE /api/field-sales/colleges/:collegeId/contacts/:contactId
   */
  async deleteContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { collegeId, contactId } = req.params;

      await collegeService.deleteContact(contactId, collegeId);

      res.json({
        success: true,
        message: 'Contact deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all contacts for a college
   * GET /api/field-sales/colleges/:id/contacts
   */
  async getContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const contacts = await collegeService.getContacts(id);

      res.json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get college statistics
   * GET /api/field-sales/colleges/stats
   */
  async getCollegeStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Only show own stats for non-admin users
      const filterUserId = ['admin', 'manager', 'owner'].includes(userRole)
        ? (req.query.userId as string) || undefined
        : userId;

      const stats = await collegeService.getCollegeStats(organizationId, filterUserId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all cities
   * GET /api/field-sales/colleges/cities
   */
  async getCities(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;

      const cities = await collegeService.getCities(organizationId);

      res.json({
        success: true,
        data: cities,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all states
   * GET /api/field-sales/colleges/states
   */
  async getStates(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;

      const states = await collegeService.getStates(organizationId);

      res.json({
        success: true,
        data: states,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const collegeController = new CollegeController();
