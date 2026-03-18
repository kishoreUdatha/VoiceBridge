import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';
import { Prisma } from '@prisma/client';

interface CreateLandingPageInput {
  organizationId: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  content: Record<string, unknown>;
  styles?: Record<string, unknown>;
  seoSettings?: Record<string, unknown>;
  formId?: string;
}

interface UpdateLandingPageInput {
  name?: string;
  slug?: string;
  title?: string;
  description?: string;
  content?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  seoSettings?: Record<string, unknown>;
  formId?: string;
  isPublished?: boolean;
}

export class LandingPageService {
  async create(input: CreateLandingPageInput) {
    // Check if slug is unique within the organization
    const existing = await prisma.landingPage.findUnique({
      where: {
        organizationId_slug: {
          organizationId: input.organizationId,
          slug: input.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictError('A landing page with this slug already exists');
    }

    return prisma.landingPage.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        slug: input.slug,
        title: input.title,
        description: input.description,
        content: input.content as Prisma.InputJsonValue,
        styles: (input.styles || {}) as Prisma.InputJsonValue,
        seoSettings: (input.seoSettings || {}) as Prisma.InputJsonValue,
        formId: input.formId,
      },
    });
  }

  async findById(id: string, organizationId: string) {
    const page = await prisma.landingPage.findFirst({
      where: { id, organizationId },
    });

    if (!page) {
      throw new NotFoundError('Landing page not found');
    }

    return page;
  }

  async findBySlug(organizationSlug: string, pageSlug: string) {
    const organization = await prisma.organization.findUnique({
      where: { slug: organizationSlug },
    });

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    const page = await prisma.landingPage.findFirst({
      where: {
        organizationId: organization.id,
        slug: pageSlug,
        isPublished: true,
      },
    });

    if (!page) {
      throw new NotFoundError('Landing page not found');
    }

    return page;
  }

  async findAll(organizationId: string) {
    return prisma.landingPage.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, organizationId: string, input: UpdateLandingPageInput) {
    const page = await this.findById(id, organizationId);

    // Check slug uniqueness if changing
    if (input.slug && input.slug !== page.slug) {
      const existing = await prisma.landingPage.findUnique({
        where: {
          organizationId_slug: {
            organizationId,
            slug: input.slug,
          },
        },
      });

      if (existing) {
        throw new ConflictError('A landing page with this slug already exists');
      }
    }

    const updateData: Record<string, unknown> = { ...input };
    if (input.isPublished && !page.publishedAt) {
      updateData.publishedAt = new Date();
    }

    return prisma.landingPage.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await prisma.landingPage.delete({ where: { id } });
  }

  async publish(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    return prisma.landingPage.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  async unpublish(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    return prisma.landingPage.update({
      where: { id },
      data: { isPublished: false },
    });
  }
}

export const landingPageService = new LandingPageService();
