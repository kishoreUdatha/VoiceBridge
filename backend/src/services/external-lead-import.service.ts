/**
 * External Lead Import Service
 *
 * Routes all external leads (social media, forms, etc.) through RawImportRecord
 * instead of creating leads directly. This prevents voice agent loop issues
 * and gives admins control over when to trigger AI calling campaigns.
 */

import { prisma } from '../config/database';
import { RawImportRecordStatus } from '@prisma/client';

export interface ExternalLeadData {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  source: 'AD_FACEBOOK' | 'AD_INSTAGRAM' | 'AD_GOOGLE' | 'AD_LINKEDIN' | 'AD_TIKTOK' | 'AD_TWITTER' | 'AD_YOUTUBE' | 'FORM' | 'LANDING_PAGE' | 'WEBSITE' | 'WHATSAPP' | 'API' | 'APIFY' | 'JUSTDIAL' | 'INDIAMART' | 'ACRES_99' | 'MAGICBRICKS' | 'HOUSING' | 'SULEKHA' | 'TAWKTO';
  sourceDetails?: string;
  campaignName?: string;
  customFields?: Record<string, any>;
  // Business/company fields
  companyName?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  industry?: string;
}

export interface ImportResult {
  id?: string;
  rawImportRecord: any;
  bulkImport: any;
  isDuplicate: boolean;
}

class ExternalLeadImportService {
  /**
   * Import an external lead as RawImportRecord (not directly as Lead)
   * This allows admin review before triggering voice agent
   */
  async importExternalLead(
    organizationId: string,
    leadData: ExternalLeadData,
    options?: {
      skipDuplicateCheck?: boolean;
      systemUserId?: string;
    }
  ): Promise<ImportResult> {
    // Check for duplicates by phone
    if (!options?.skipDuplicateCheck && leadData.phone) {
      const existingRecord = await prisma.rawImportRecord.findFirst({
        where: {
          organizationId,
          phone: leadData.phone,
          status: {
            notIn: ['CONVERTED', 'REJECTED', 'NOT_INTERESTED'],
          },
        },
      });

      if (existingRecord) {
        return {
          id: existingRecord.id,
          rawImportRecord: existingRecord,
          bulkImport: null,
          isDuplicate: true,
        };
      }

      // Also check if already a lead
      const existingLead = await prisma.lead.findFirst({
        where: {
          organizationId,
          phone: leadData.phone,
        },
      });

      if (existingLead) {
        return {
          rawImportRecord: null,
          bulkImport: null,
          isDuplicate: true,
        };
      }
    }

    // Find or create a BulkImport for today's external imports
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const importName = `${leadData.source} Import - ${today.toISOString().split('T')[0]}`;

    let bulkImport = await prisma.bulkImport.findFirst({
      where: {
        organizationId,
        fileName: importName,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get system user for import attribution
    const systemUser = await prisma.user.findFirst({
      where: {
        organizationId,
        role: {
          slug: 'admin',
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!bulkImport) {
      bulkImport = await prisma.bulkImport.create({
        data: {
          organizationId,
          uploadedById: options?.systemUserId || systemUser?.id || '',
          fileName: importName,
          fileSize: 0,
          mimeType: 'application/json',
          totalRows: 0,
          validRows: 0,
          status: 'COMPLETED',
        },
      });
    }

    // Create the RawImportRecord
    const rawImportRecord = await prisma.rawImportRecord.create({
      data: {
        bulkImportId: bulkImport.id,
        organizationId,
        firstName: leadData.firstName || 'Unknown',
        lastName: leadData.lastName,
        email: leadData.email,
        phone: leadData.phone,
        alternatePhone: leadData.alternatePhone,
        status: RawImportRecordStatus.PENDING,
        customFields: {
          source: leadData.source,
          sourceDetails: leadData.sourceDetails,
          campaignName: leadData.campaignName,
          ...(leadData.customFields || {}),
        },
      },
    });

    // Update bulk import counts
    await prisma.bulkImport.update({
      where: { id: bulkImport.id },
      data: {
        totalRows: { increment: 1 },
        validRows: { increment: 1 },
      },
    });

    console.log(`[ExternalLeadImport] Created RawImportRecord ${rawImportRecord.id} from ${leadData.source}`);

    return {
      id: rawImportRecord.id,
      rawImportRecord,
      bulkImport,
      isDuplicate: false,
    };
  }

  /**
   * Batch import multiple external leads
   */
  async importExternalLeads(
    organizationId: string,
    leads: ExternalLeadData[],
    options?: {
      skipDuplicateCheck?: boolean;
      systemUserId?: string;
    }
  ): Promise<{
    imported: number;
    duplicates: number;
    total: number;
  }> {
    let imported = 0;
    let duplicates = 0;

    for (const lead of leads) {
      const result = await this.importExternalLead(organizationId, lead, options);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        imported++;
      }
    }

    return {
      imported,
      duplicates,
      total: leads.length,
    };
  }

  /**
   * Get pending imports summary for an organization
   */
  async getPendingImportsSummary(organizationId: string) {
    const summary = await prisma.rawImportRecord.groupBy({
      by: ['status'],
      where: {
        organizationId,
      },
      _count: true,
    });

    const bySource = await prisma.$queryRaw<Array<{ source: string; count: bigint }>>`
      SELECT
        custom_fields->>'source' as source,
        COUNT(*) as count
      FROM raw_import_records
      WHERE organization_id = ${organizationId}
        AND status = 'PENDING'
      GROUP BY custom_fields->>'source'
    `;

    return {
      byStatus: summary.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySource: bySource.reduce((acc, item) => {
        if (item.source) {
          acc[item.source] = Number(item.count);
        }
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const externalLeadImportService = new ExternalLeadImportService();
export default externalLeadImportService;
