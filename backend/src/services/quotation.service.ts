/**
 * Quotation Management Service
 * Create quotes/proposals, e-signature integration, payment collection
 */

import { PrismaClient, Prisma, QuotationStatus } from '@prisma/client';
import Razorpay from 'razorpay';
import { createWhatsAppService } from '../integrations/whatsapp.service';
import { emailSettingsService } from './emailSettings.service';

const prisma = new PrismaClient();

// Initialize Razorpay if credentials are available
let razorpay: Razorpay | null = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

interface QuotationItemInput {
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  hsnSacCode?: string;
}

interface CreateQuotationInput {
  leadId?: string;
  title: string;
  description?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  clientAddress?: string;
  clientGSTIN?: string;
  validUntil?: Date;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  taxType?: 'GST' | 'VAT' | 'none';
  taxPercentage?: number;
  termsConditions?: string;
  notes?: string;
  paymentTerms?: string;
  items: QuotationItemInput[];
  currency?: string;
}

interface UpdateQuotationInput extends Partial<CreateQuotationInput> {
  status?: QuotationStatus;
}

/**
 * Generate a unique quotation number
 */
async function generateQuotationNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Get the count of quotations for this organization in current month
  const count = await prisma.quotation.count({
    where: {
      organizationId,
      createdAt: {
        gte: new Date(`${year}-${month}-01`),
        lt: new Date(`${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`),
      },
    },
  });

  const sequenceNumber = String(count + 1).padStart(4, '0');
  return `QT-${year}${month}-${sequenceNumber}`;
}

/**
 * Calculate quotation totals from items
 */
function calculateTotals(
  items: QuotationItemInput[],
  discountType?: string,
  discountValue?: number,
  taxType?: string,
  taxPercentage?: number
): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  itemsWithTotal: (QuotationItemInput & { totalPrice: number })[];
} {
  // Calculate item totals
  const itemsWithTotal = items.map((item) => {
    let itemTotal = item.quantity * item.unitPrice;

    // Apply item-level discount
    if (item.discountPercent) {
      itemTotal -= itemTotal * (item.discountPercent / 100);
    }

    return {
      ...item,
      totalPrice: itemTotal,
    };
  });

  // Calculate subtotal
  const subtotal = itemsWithTotal.reduce((sum, item) => sum + item.totalPrice, 0);

  // Calculate discount
  let discountAmount = 0;
  if (discountType && discountValue) {
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
  }

  const afterDiscount = subtotal - discountAmount;

  // Calculate tax
  let taxAmount = 0;
  if (taxType && taxType !== 'none' && taxPercentage) {
    taxAmount = afterDiscount * (taxPercentage / 100);
  }

  const totalAmount = afterDiscount + taxAmount;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    itemsWithTotal,
  };
}

/**
 * Create a new quotation
 */
export async function createQuotation(
  organizationId: string,
  data: CreateQuotationInput,
  createdById?: string
) {
  const quotationNumber = await generateQuotationNumber(organizationId);

  const { subtotal, discountAmount, taxAmount, totalAmount, itemsWithTotal } = calculateTotals(
    data.items,
    data.discountType,
    data.discountValue,
    data.taxType,
    data.taxPercentage
  );

  const quotation = await prisma.quotation.create({
    data: {
      organizationId,
      leadId: data.leadId,
      quotationNumber,
      title: data.title,
      description: data.description,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientCompany: data.clientCompany,
      clientAddress: data.clientAddress,
      clientGSTIN: data.clientGSTIN,
      validUntil: data.validUntil,
      subtotal: new Prisma.Decimal(subtotal),
      discountType: data.discountType,
      discountValue: data.discountValue ? new Prisma.Decimal(data.discountValue) : null,
      discountAmount: new Prisma.Decimal(discountAmount),
      taxType: data.taxType,
      taxPercentage: data.taxPercentage ? new Prisma.Decimal(data.taxPercentage) : null,
      taxAmount: new Prisma.Decimal(taxAmount),
      totalAmount: new Prisma.Decimal(totalAmount),
      currency: data.currency || 'INR',
      termsConditions: data.termsConditions,
      notes: data.notes,
      paymentTerms: data.paymentTerms,
      createdById,
      status: 'DRAFT',
      items: {
        create: itemsWithTotal.map((item, index) => ({
          name: item.name,
          description: item.description,
          sku: item.sku,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          discountPercent: item.discountPercent ? new Prisma.Decimal(item.discountPercent) : null,
          taxPercent: item.taxPercent ? new Prisma.Decimal(item.taxPercent) : null,
          totalPrice: new Prisma.Decimal(item.totalPrice),
          hsnSacCode: item.hsnSacCode,
          sortOrder: index,
        })),
      },
    },
    include: {
      items: true,
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // Create initial version
  await createVersion(quotation.id, quotation, 'Initial version', createdById);

  return quotation;
}

/**
 * Update a quotation
 */
export async function updateQuotation(
  quotationId: string,
  organizationId: string,
  data: UpdateQuotationInput,
  updatedById?: string
) {
  const existing = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId },
    include: { items: true },
  });

  if (!existing) {
    throw new Error('Quotation not found');
  }

  // Recalculate totals if items are updated
  let calculatedFields = {};
  if (data.items) {
    const { subtotal, discountAmount, taxAmount, totalAmount, itemsWithTotal } = calculateTotals(
      data.items,
      data.discountType ?? existing.discountType ?? undefined,
      data.discountValue ?? Number(existing.discountValue) ?? undefined,
      data.taxType ?? existing.taxType ?? undefined,
      data.taxPercentage ?? Number(existing.taxPercentage) ?? undefined
    );

    // Delete existing items and create new ones
    await prisma.quotationItem.deleteMany({
      where: { quotationId },
    });

    await prisma.quotationItem.createMany({
      data: itemsWithTotal.map((item, index) => ({
        quotationId,
        name: item.name,
        description: item.description,
        sku: item.sku,
        quantity: new Prisma.Decimal(item.quantity),
        unit: item.unit,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        discountPercent: item.discountPercent ? new Prisma.Decimal(item.discountPercent) : null,
        taxPercent: item.taxPercent ? new Prisma.Decimal(item.taxPercent) : null,
        totalPrice: new Prisma.Decimal(item.totalPrice),
        hsnSacCode: item.hsnSacCode,
        sortOrder: index,
      })),
    });

    calculatedFields = {
      subtotal: new Prisma.Decimal(subtotal),
      discountAmount: new Prisma.Decimal(discountAmount),
      taxAmount: new Prisma.Decimal(taxAmount),
      totalAmount: new Prisma.Decimal(totalAmount),
    };
  }

  // Build update data
  const updateData: any = {
    ...calculatedFields,
    ...(data.title && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.clientName && { clientName: data.clientName }),
    ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail }),
    ...(data.clientPhone !== undefined && { clientPhone: data.clientPhone }),
    ...(data.clientCompany !== undefined && { clientCompany: data.clientCompany }),
    ...(data.clientAddress !== undefined && { clientAddress: data.clientAddress }),
    ...(data.clientGSTIN !== undefined && { clientGSTIN: data.clientGSTIN }),
    ...(data.validUntil !== undefined && { validUntil: data.validUntil }),
    ...(data.discountType !== undefined && { discountType: data.discountType }),
    ...(data.discountValue !== undefined && { discountValue: new Prisma.Decimal(data.discountValue) }),
    ...(data.taxType !== undefined && { taxType: data.taxType }),
    ...(data.taxPercentage !== undefined && { taxPercentage: new Prisma.Decimal(data.taxPercentage) }),
    ...(data.termsConditions !== undefined && { termsConditions: data.termsConditions }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
    ...(data.status && { status: data.status }),
    ...(data.currency && { currency: data.currency }),
  };

  const quotation = await prisma.quotation.update({
    where: { id: quotationId },
    data: updateData,
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // Create new version
  await createVersion(quotation.id, quotation, 'Updated quotation', updatedById);

  return quotation;
}

/**
 * Create a version snapshot
 */
async function createVersion(
  quotationId: string,
  snapshot: any,
  changeNotes?: string,
  changedById?: string
) {
  // Get the latest version number
  const latestVersion = await prisma.quotationVersion.findFirst({
    where: { quotationId },
    orderBy: { versionNumber: 'desc' },
  });

  const versionNumber = (latestVersion?.versionNumber || 0) + 1;

  await prisma.quotationVersion.create({
    data: {
      quotationId,
      versionNumber,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      changeNotes,
      changedById,
    },
  });
}

/**
 * Get quotation by ID
 */
export async function getQuotation(quotationId: string, organizationId: string) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyName: true,
        },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 10,
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  return quotation;
}

/**
 * Get quotation by public token (for client viewing/signing)
 */
export async function getQuotationByNumber(quotationNumber: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { quotationNumber },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      organization: {
        select: {
          name: true,
          logo: true,
          email: true,
          phone: true,
          address: true,
        },
      },
    },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  // Track view
  await prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      viewCount: { increment: 1 },
      viewedAt: new Date(),
      status: quotation.status === 'SENT' ? 'VIEWED' : quotation.status,
    },
  });

  return quotation;
}

/**
 * List quotations with filters
 */
export async function listQuotations(
  organizationId: string,
  options: {
    status?: QuotationStatus;
    leadId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) {
  const { status, leadId, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  const where: Prisma.QuotationWhereInput = {
    organizationId,
    ...(status && { status }),
    ...(leadId && { leadId }),
    ...(search && {
      OR: [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientEmail: { contains: search, mode: 'insensitive' } },
        { clientCompany: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: {
        items: true,
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.quotation.count({ where }),
  ]);

  return {
    quotations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Send quotation to client
 */
export async function sendQuotation(
  quotationId: string,
  organizationId: string,
  options: {
    sendVia: ('email' | 'whatsapp' | 'sms')[];
    message?: string;
  }
) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId },
    include: {
      organization: {
        select: { name: true, email: true, phone: true },
      },
      items: true,
    },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  // Generate quotation URL
  const quotationUrl = `${process.env.FRONTEND_URL}/quotation/${quotation.quotationNumber}`;
  const results: { email?: boolean; whatsapp?: boolean; sms?: boolean; errors: string[] } = { errors: [] };

  // Send via Email
  if (options.sendVia.includes('email') && quotation.clientEmail) {
    try {
      const emailHtml = buildQuotationEmailHtml(quotation, quotationUrl, options.message);
      await emailSettingsService.sendEmail(organizationId, {
        to: quotation.clientEmail,
        subject: `Quotation ${quotation.quotationNumber} from ${quotation.organization?.name || 'Us'}`,
        text: `Please find your quotation at: ${quotationUrl}`,
        html: emailHtml,
      });
      results.email = true;
      console.log(`[Quotation] Email sent to ${quotation.clientEmail}`);
    } catch (error: any) {
      results.errors.push(`Email failed: ${error.message}`);
      console.error('[Quotation] Email send failed:', error);
    }
  }

  // Send via WhatsApp
  if (options.sendVia.includes('whatsapp') && quotation.clientPhone) {
    try {
      const whatsappService = createWhatsAppService(organizationId);
      const isConfigured = await whatsappService.isConfigured();

      if (isConfigured) {
        const whatsappMessage = buildQuotationWhatsAppMessage(quotation, quotationUrl, options.message);
        const result = await whatsappService.sendMessage({
          to: quotation.clientPhone,
          message: whatsappMessage,
        });
        results.whatsapp = result.success;
        if (!result.success) {
          results.errors.push(`WhatsApp failed: ${result.error}`);
        } else {
          console.log(`[Quotation] WhatsApp sent to ${quotation.clientPhone}`);
        }
      } else {
        results.errors.push('WhatsApp not configured for this organization');
      }
    } catch (error: any) {
      results.errors.push(`WhatsApp failed: ${error.message}`);
      console.error('[Quotation] WhatsApp send failed:', error);
    }
  }

  // Update status to SENT if at least one method succeeded
  if (results.email || results.whatsapp) {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  return {
    success: results.email || results.whatsapp || false,
    quotationUrl,
    results,
    message: results.errors.length > 0
      ? `Quotation sent with some errors: ${results.errors.join('; ')}`
      : 'Quotation sent successfully',
  };
}

/**
 * Build HTML email for quotation
 */
function buildQuotationEmailHtml(quotation: any, quotationUrl: string, customMessage?: string): string {
  const itemsHtml = quotation.items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${quotation.currency} ${Number(item.unitPrice).toLocaleString()}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${quotation.currency} ${Number(item.totalPrice).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quotation ${quotation.quotationNumber}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Quotation</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">#${quotation.quotationNumber}</p>
      </div>

      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p>Dear ${quotation.clientName},</p>

        ${customMessage ? `<p>${customMessage}</p>` : `<p>Thank you for your interest. Please find below the details of your quotation.</p>`}

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <h3 style="margin-top: 0; color: #374151;">${quotation.title}</h3>
          ${quotation.description ? `<p style="color: #6b7280;">${quotation.description}</p>` : ''}

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Unit Price</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 2px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span>Subtotal:</span>
              <strong>${quotation.currency} ${Number(quotation.subtotal).toLocaleString()}</strong>
            </div>
            ${Number(quotation.discountAmount) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #059669;">
              <span>Discount:</span>
              <span>-${quotation.currency} ${Number(quotation.discountAmount).toLocaleString()}</span>
            </div>` : ''}
            ${Number(quotation.taxAmount) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span>Tax (${quotation.taxType} ${quotation.taxPercentage}%):</span>
              <span>${quotation.currency} ${Number(quotation.taxAmount).toLocaleString()}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; margin: 15px 0 0 0; padding-top: 10px; border-top: 2px solid #374151; font-size: 18px;">
              <strong>Total:</strong>
              <strong style="color: #059669;">${quotation.currency} ${Number(quotation.totalAmount).toLocaleString()}</strong>
            </div>
          </div>
        </div>

        ${quotation.validUntil ? `<p style="color: #dc2626;"><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString()}</p>` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${quotationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View & Accept Quotation</a>
        </div>

        ${quotation.termsConditions ? `
        <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 6px;">
          <h4 style="margin-top: 0; color: #374151;">Terms & Conditions</h4>
          <p style="color: #6b7280; font-size: 14px; white-space: pre-line;">${quotation.termsConditions}</p>
        </div>` : ''}

        <p style="margin-top: 30px;">Best regards,<br><strong>${quotation.organization?.name || 'Our Team'}</strong></p>
      </div>

      <div style="background: #374151; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 12px;">
          This quotation was generated by ${quotation.organization?.name || 'MyLeadX CRM'}
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Build WhatsApp message for quotation
 */
function buildQuotationWhatsAppMessage(quotation: any, quotationUrl: string, customMessage?: string): string {
  return `*Quotation ${quotation.quotationNumber}*

Dear ${quotation.clientName},

${customMessage || 'Thank you for your interest. Please find your quotation details below.'}

*${quotation.title}*
${quotation.description ? `${quotation.description}\n` : ''}
--------------------
*Total Amount:* ${quotation.currency} ${Number(quotation.totalAmount).toLocaleString()}
${quotation.validUntil ? `*Valid Until:* ${new Date(quotation.validUntil).toLocaleDateString()}` : ''}
--------------------

View and accept your quotation here:
${quotationUrl}

Best regards,
${quotation.organization?.name || 'Our Team'}`;
}

/**
 * Accept quotation (client action)
 */
export async function acceptQuotation(
  quotationNumber: string,
  signatureData: {
    signedByName: string;
    signedByEmail: string;
    signatureUrl?: string;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const quotation = await prisma.quotation.findUnique({
    where: { quotationNumber },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  if (quotation.status === 'ACCEPTED' || quotation.status === 'CONVERTED') {
    throw new Error('Quotation already accepted');
  }

  if (quotation.validUntil && quotation.validUntil < new Date()) {
    // Mark as expired
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Quotation has expired');
  }

  const updated = await prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      status: 'ACCEPTED',
      signatureStatus: 'signed',
      signedAt: new Date(),
      signedByName: signatureData.signedByName,
      signedByEmail: signatureData.signedByEmail,
      signatureUrl: signatureData.signatureUrl,
      signatureData: {
        ipAddress: signatureData.ipAddress,
        userAgent: signatureData.userAgent,
        signedAt: new Date().toISOString(),
      },
    },
  });

  return updated;
}

/**
 * Reject quotation (client action)
 */
export async function rejectQuotation(
  quotationNumber: string,
  reason?: string
) {
  const quotation = await prisma.quotation.findUnique({
    where: { quotationNumber },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  const updated = await prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      status: 'REJECTED',
      signatureStatus: 'declined',
      notes: reason ? `${quotation.notes || ''}\n\nRejection reason: ${reason}`.trim() : quotation.notes,
    },
  });

  return updated;
}

/**
 * Create payment link for quotation
 */
export async function createPaymentLink(
  quotationId: string,
  organizationId: string,
  options?: {
    amount?: number; // Partial payment amount
    description?: string;
  }
) {
  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  const amount = options?.amount || Number(quotation.totalAmount);
  const amountInPaise = Math.round(amount * 100);

  // Create Razorpay payment link
  const paymentLink = await razorpay.paymentLink.create({
    amount: amountInPaise,
    currency: quotation.currency || 'INR',
    accept_partial: true,
    first_min_partial_amount: Math.round(amountInPaise * 0.1), // Min 10%
    description: options?.description || `Payment for ${quotation.title}`,
    customer: {
      name: quotation.clientName,
      email: quotation.clientEmail || undefined,
      contact: quotation.clientPhone || undefined,
    },
    notify: {
      sms: !!quotation.clientPhone,
      email: !!quotation.clientEmail,
    },
    reminder_enable: true,
    notes: {
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      organizationId,
    },
    callback_url: `${process.env.FRONTEND_URL}/quotation/${quotation.quotationNumber}/payment-success`,
    callback_method: 'get',
  } as any);

  // Update quotation with payment link
  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      paymentLinkId: paymentLink.id,
      paymentLinkUrl: paymentLink.short_url,
      paymentStatus: 'pending',
    },
  });

  return {
    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.short_url,
    amount,
  };
}

/**
 * Record payment for quotation
 */
export async function recordPayment(
  quotationId: string,
  organizationId: string,
  data: {
    amount: number;
    method: string;
    reference?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    notes?: string;
  }
) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId },
    include: { payments: true },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  // Create payment record
  const payment = await prisma.quotationPayment.create({
    data: {
      quotationId,
      amount: new Prisma.Decimal(data.amount),
      method: data.method,
      reference: data.reference,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
      notes: data.notes,
      status: 'completed',
      receivedAt: new Date(),
    },
  });

  // Calculate total paid amount
  const totalPaid = quotation.payments.reduce(
    (sum, p) => sum + (p.status === 'completed' ? Number(p.amount) : 0),
    0
  ) + data.amount;

  // Update quotation payment status
  let paymentStatus = 'pending';
  if (totalPaid >= Number(quotation.totalAmount)) {
    paymentStatus = 'paid';
  } else if (totalPaid > 0) {
    paymentStatus = 'partial';
  }

  await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      paidAmount: new Prisma.Decimal(totalPaid),
      paymentStatus,
    },
  });

  return payment;
}

/**
 * Duplicate quotation
 */
export async function duplicateQuotation(
  quotationId: string,
  organizationId: string,
  createdById?: string
) {
  const original = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId },
    include: { items: true },
  });

  if (!original) {
    throw new Error('Quotation not found');
  }

  const items: QuotationItemInput[] = original.items.map((item) => ({
    name: item.name,
    description: item.description || undefined,
    sku: item.sku || undefined,
    quantity: Number(item.quantity),
    unit: item.unit || undefined,
    unitPrice: Number(item.unitPrice),
    discountPercent: item.discountPercent ? Number(item.discountPercent) : undefined,
    taxPercent: item.taxPercent ? Number(item.taxPercent) : undefined,
    hsnSacCode: item.hsnSacCode || undefined,
  }));

  return createQuotation(
    organizationId,
    {
      leadId: original.leadId || undefined,
      title: `${original.title} (Copy)`,
      description: original.description || undefined,
      clientName: original.clientName,
      clientEmail: original.clientEmail || undefined,
      clientPhone: original.clientPhone || undefined,
      clientCompany: original.clientCompany || undefined,
      clientAddress: original.clientAddress || undefined,
      clientGSTIN: original.clientGSTIN || undefined,
      discountType: original.discountType as 'percentage' | 'fixed' | undefined,
      discountValue: original.discountValue ? Number(original.discountValue) : undefined,
      taxType: original.taxType as 'GST' | 'VAT' | 'none' | undefined,
      taxPercentage: original.taxPercentage ? Number(original.taxPercentage) : undefined,
      termsConditions: original.termsConditions || undefined,
      notes: original.notes || undefined,
      paymentTerms: original.paymentTerms || undefined,
      currency: original.currency,
      items,
    },
    createdById
  );
}

/**
 * Delete quotation
 */
export async function deleteQuotation(quotationId: string, organizationId: string) {
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId },
  });

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  if (quotation.status === 'ACCEPTED' || quotation.status === 'CONVERTED') {
    throw new Error('Cannot delete accepted or converted quotation');
  }

  await prisma.quotation.delete({
    where: { id: quotationId },
  });

  return { success: true };
}

/**
 * Get quotation statistics
 */
export async function getQuotationStats(organizationId: string) {
  const [statusCounts, recentQuotations, totalAmount] = await Promise.all([
    prisma.quotation.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    }),
    prisma.quotation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        quotationNumber: true,
        title: true,
        clientName: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.quotation.aggregate({
      where: {
        organizationId,
        status: { in: ['ACCEPTED', 'CONVERTED'] },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const stats = {
    total: 0,
    draft: 0,
    sent: 0,
    viewed: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    converted: 0,
  };

  statusCounts.forEach((item) => {
    const status = item.status.toLowerCase() as keyof typeof stats;
    if (status in stats) {
      stats[status] = item._count;
    }
    stats.total += item._count;
  });

  return {
    stats,
    recentQuotations,
    totalWonAmount: totalAmount._sum.totalAmount || 0,
    conversionRate: stats.total > 0
      ? Math.round(((stats.accepted + stats.converted) / stats.total) * 100)
      : 0,
  };
}

// Product Catalog Functions

/**
 * Create product in catalog
 */
export async function createProduct(
  organizationId: string,
  data: {
    name: string;
    description?: string;
    sku?: string;
    category?: string;
    unitPrice: number;
    unit?: string;
    currency?: string;
    taxable?: boolean;
    hsnSacCode?: string;
    defaultTaxRate?: number;
  }
) {
  return prisma.productCatalog.create({
    data: {
      organizationId,
      name: data.name,
      description: data.description,
      sku: data.sku,
      category: data.category,
      unitPrice: new Prisma.Decimal(data.unitPrice),
      unit: data.unit,
      currency: data.currency || 'INR',
      taxable: data.taxable ?? true,
      hsnSacCode: data.hsnSacCode,
      defaultTaxRate: data.defaultTaxRate ? new Prisma.Decimal(data.defaultTaxRate) : null,
    },
  });
}

/**
 * List products from catalog
 */
export async function listProducts(
  organizationId: string,
  options?: {
    search?: string;
    category?: string;
    isActive?: boolean;
  }
) {
  return prisma.productCatalog.findMany({
    where: {
      organizationId,
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
      ...(options?.category && { category: options.category }),
      ...(options?.search && {
        OR: [
          { name: { contains: options.search, mode: 'insensitive' } },
          { sku: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Update product in catalog
 */
export async function updateProduct(
  productId: string,
  organizationId: string,
  data: Partial<{
    name: string;
    description: string;
    sku: string;
    category: string;
    unitPrice: number;
    unit: string;
    currency: string;
    taxable: boolean;
    hsnSacCode: string;
    defaultTaxRate: number;
    isActive: boolean;
  }>
) {
  const product = await prisma.productCatalog.findFirst({
    where: { id: productId, organizationId },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  return prisma.productCatalog.update({
    where: { id: productId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.unitPrice !== undefined && { unitPrice: new Prisma.Decimal(data.unitPrice) }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.currency && { currency: data.currency }),
      ...(data.taxable !== undefined && { taxable: data.taxable }),
      ...(data.hsnSacCode !== undefined && { hsnSacCode: data.hsnSacCode }),
      ...(data.defaultTaxRate !== undefined && {
        defaultTaxRate: data.defaultTaxRate ? new Prisma.Decimal(data.defaultTaxRate) : null
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

/**
 * Delete product from catalog
 */
export async function deleteProduct(productId: string, organizationId: string) {
  const product = await prisma.productCatalog.findFirst({
    where: { id: productId, organizationId },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  await prisma.productCatalog.delete({
    where: { id: productId },
  });

  return { success: true };
}
