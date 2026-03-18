import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { LeadSource, LeadPriority, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { externalLeadImportService } from './external-lead-import.service';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, unknown>;
}

interface CreateFormInput {
  organizationId: string;
  name: string;
  description?: string;
  fields: FormField[];
  settings?: Record<string, unknown>;
}

interface UpdateFormInput {
  name?: string;
  description?: string;
  fields?: FormField[];
  settings?: Record<string, unknown>;
  isActive?: boolean;
}

export class FormService {
  async create(input: CreateFormInput) {
    const embedCode = this.generateEmbedCode();

    const form = await prisma.customForm.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        fields: input.fields as unknown as Prisma.InputJsonValue,
        settings: (input.settings || {}) as Prisma.InputJsonValue,
        embedCode,
      },
    });

    return form;
  }

  async findById(id: string, organizationId: string) {
    const form = await prisma.customForm.findFirst({
      where: { id, organizationId },
    });

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    return form;
  }

  async findByIdPublic(id: string) {
    const form = await prisma.customForm.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        fields: true,
        settings: true,
      },
    });

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    return form;
  }

  async findAll(organizationId: string) {
    return prisma.customForm.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, organizationId: string, input: UpdateFormInput) {
    const form = await this.findById(id, organizationId);

    return prisma.customForm.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        fields: input.fields ? (input.fields as unknown as Prisma.InputJsonValue) : undefined,
        settings: input.settings ? (input.settings as Prisma.InputJsonValue) : undefined,
        isActive: input.isActive,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await prisma.customForm.delete({ where: { id } });
  }

  async submitForm(formId: string, data: Record<string, unknown>, metadata: { ipAddress?: string; userAgent?: string }) {
    const form = await prisma.customForm.findFirst({
      where: { id: formId, isActive: true },
      include: { organization: true },
    });

    if (!form) {
      throw new NotFoundError('Form not found');
    }

    // Extract lead data from form submission
    const fields = form.fields as unknown as FormField[];
    const leadData = this.extractLeadData(fields, data);

    // Route to RawImportRecord instead of creating Lead directly
    // This prevents voice agent loop and gives admin control
    const result = await externalLeadImportService.importExternalLead(form.organizationId, {
      firstName: leadData.firstName || 'Unknown',
      lastName: leadData.lastName,
      email: leadData.email,
      phone: leadData.phone || 'N/A',
      source: 'FORM',
      sourceDetails: form.name,
      customFields: {
        ...data,
        formId,
        formName: form.name,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });

    // Create form submission record (for tracking)
    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        leadId: null, // No lead created directly, goes through RawImportRecord
        data: data as Prisma.InputJsonValue,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });

    console.log(`[Form] Submission imported to RawImportRecord: ${result.rawImportRecord?.id}`);
    return { submission, rawImportRecord: result.rawImportRecord, isDuplicate: result.isDuplicate };
  }

  private extractLeadData(fields: FormField[], data: Record<string, unknown>) {
    const result: { firstName?: string; lastName?: string; email?: string; phone?: string } = {};

    for (const field of fields) {
      const value = data[field.id] || data[field.label];
      if (!value) continue;

      const label = field.label.toLowerCase();
      const type = field.type.toLowerCase();

      if (type === 'email' || label.includes('email')) {
        result.email = String(value);
      } else if (type === 'phone' || label.includes('phone') || label.includes('mobile')) {
        result.phone = String(value);
      } else if (label.includes('first name') || label === 'name') {
        result.firstName = String(value);
      } else if (label.includes('last name') || label.includes('surname')) {
        result.lastName = String(value);
      } else if (label.includes('full name')) {
        const parts = String(value).split(' ');
        result.firstName = parts[0];
        result.lastName = parts.slice(1).join(' ');
      }
    }

    return result;
  }

  private generateEmbedCode(): string {
    return uuidv4().replace(/-/g, '').substring(0, 12);
  }

  getEmbedScript(formId: string, baseUrl: string): string {
    return `
<script>
(function() {
  var iframe = document.createElement('iframe');
  iframe.src = '${baseUrl}/embed/form/${formId}';
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.frameBorder = '0';
  document.currentScript.parentNode.insertBefore(iframe, document.currentScript);
})();
</script>
    `.trim();
  }
}

export const formService = new FormService();
