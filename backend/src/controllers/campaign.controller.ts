import { Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class CampaignController {
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.create({
        organizationId: req.organizationId!,
        createdById: req.user!.id,
        ...req.body,
      });

      ApiResponse.created(res, 'Campaign created successfully', campaignService.transformCampaign(campaign));
    } catch (error) {
      next(error);
    }
  }

  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.findById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Campaign retrieved successfully', campaignService.transformCampaign(campaign));
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { campaigns, total } = await campaignService.findAll(
        req.organizationId!,
        page,
        limit
      );

      // Transform campaigns to include flat stats
      const transformedCampaigns = campaigns.map(c => campaignService.transformCampaign(c));

      ApiResponse.paginated(res, 'Campaigns retrieved successfully', transformedCampaigns, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.update(
        req.params.id,
        req.organizationId!,
        req.body
      );
      ApiResponse.success(res, 'Campaign updated successfully', campaignService.transformCampaign(campaign));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await campaignService.delete(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Campaign deleted successfully', { deleted: true });
    } catch (error) {
      next(error);
    }
  }

  async addRecipients(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.addRecipients({
        campaignId: req.params.id,
        recipients: req.body.recipients,
      });

      ApiResponse.success(res, 'Recipients added successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async execute(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.execute(
        req.params.id,
        req.organizationId!,
        req.user!.id
      );

      ApiResponse.success(res, 'Campaign executed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await campaignService.getStats(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Campaign stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  async importFromLeads(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.importFromLeads(
        req.params.id,
        req.organizationId!,
        req.body.leadIds
      );
      ApiResponse.success(res, 'Leads imported successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async getAvailableLeads(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const leads = await campaignService.getAvailableLeads(
        req.params.id,
        req.organizationId!
      );
      ApiResponse.success(res, 'Available leads retrieved', leads);
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
