import { ContactListType, ContactStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';


interface CreateContactListParams {
  organizationId: string;
  name: string;
  description?: string;
  type?: ContactListType;
  filterCriteria?: any;
  tags?: string[];
  createdById?: string;
}

interface AddContactParams {
  listId: string;
  leadId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  customFields?: any;
}

interface ImportContactsParams {
  listId: string;
  contacts: Array<{
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    customFields?: any;
  }>;
}

class ContactListService {
  /**
   * Create a new contact list
   */
  async createList(params: CreateContactListParams) {
    const {
      organizationId,
      name,
      description,
      type = 'STATIC',
      filterCriteria,
      tags = [],
      createdById,
    } = params;

    const list = await prisma.contactList.create({
      data: {
        organizationId,
        name,
        description,
        type,
        filterCriteria,
        tags,
        createdById,
      },
    });

    // If dynamic list, populate initial contacts
    if (type === 'DYNAMIC' && filterCriteria) {
      await this.refreshDynamicList(list.id, organizationId, filterCriteria);
    }

    return list;
  }

  /**
   * Get contact lists for organization
   */
  async getLists(
    organizationId: string,
    options: {
      type?: ContactListType;
      search?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { type, search, isActive = true, page = 1, limit = 20 } = options;

    const where: any = { organizationId, isActive };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [lists, total] = await Promise.all([
      prisma.contactList.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { contacts: true },
          },
        },
      }),
      prisma.contactList.count({ where }),
    ]);

    return {
      data: lists.map((list: typeof lists[0]) => ({
        ...list,
        contactCount: list._count.contacts,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get contact list by ID
   */
  async getListById(id: string, organizationId: string) {
    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { contacts: true },
        },
      },
    });

    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    return {
      ...list,
      contactCount: list._count.contacts,
    };
  }

  /**
   * Update contact list
   */
  async updateList(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      description?: string;
      filterCriteria?: any;
      tags?: string[];
      isActive?: boolean;
    }
  ) {
    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
    });

    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    const updated = await prisma.contactList.update({
      where: { id },
      data,
    });

    // Refresh if dynamic list criteria changed
    if (list.type === 'DYNAMIC' && data.filterCriteria) {
      await this.refreshDynamicList(id, organizationId, data.filterCriteria);
    }

    return updated;
  }

  /**
   * Delete contact list
   */
  async deleteList(id: string, organizationId: string) {
    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
    });

    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    await prisma.contactList.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Add contact to list
   */
  async addContact(params: AddContactParams) {
    const { listId, leadId, email, phone, firstName, lastName, customFields } = params;

    // Check if contact already exists
    if (leadId) {
      const existing = await prisma.contactListMember.findFirst({
        where: { listId, leadId },
      });
      if (existing) {
        throw new AppError('Contact already in list', 400);
      }
    } else if (email) {
      const existing = await prisma.contactListMember.findFirst({
        where: { listId, email },
      });
      if (existing) {
        throw new AppError('Contact with this email already in list', 400);
      }
    }

    const contact = await prisma.contactListMember.create({
      data: {
        listId,
        leadId,
        email,
        phone,
        firstName,
        lastName,
        customFields: customFields || {},
      },
    });

    // Update list count
    await this.updateListCounts(listId);

    return contact;
  }

  /**
   * Add multiple contacts to list
   */
  async addContacts(params: ImportContactsParams) {
    const { listId, contacts } = params;

    const results = {
      added: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const contact of contacts) {
      try {
        // Skip if already exists
        if (contact.email) {
          const existing = await prisma.contactListMember.findFirst({
            where: { listId, email: contact.email },
          });
          if (existing) {
            results.skipped++;
            continue;
          }
        }

        await prisma.contactListMember.create({
          data: {
            listId,
            email: contact.email,
            phone: contact.phone,
            firstName: contact.firstName,
            lastName: contact.lastName,
            customFields: contact.customFields || {},
          },
        });
        results.added++;
      } catch (error: any) {
        results.errors.push(`${contact.email || contact.phone}: ${error.message}`);
      }
    }

    // Update list count
    await this.updateListCounts(listId);

    return results;
  }

  /**
   * Get contacts in list
   */
  async getContacts(
    listId: string,
    organizationId: string,
    options: {
      status?: ContactStatus;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, search, page = 1, limit = 50 } = options;

    // Verify list belongs to org
    const list = await prisma.contactList.findFirst({
      where: { id: listId, organizationId },
    });
    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    const where: any = { listId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contactListMember.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { addedAt: 'desc' },
      }),
      prisma.contactListMember.count({ where }),
    ]);

    return {
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update contact in list
   */
  async updateContact(
    contactId: string,
    listId: string,
    organizationId: string,
    data: {
      status?: ContactStatus;
      firstName?: string;
      lastName?: string;
      customFields?: any;
    }
  ) {
    // Verify list belongs to org
    const list = await prisma.contactList.findFirst({
      where: { id: listId, organizationId },
    });
    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    const contact = await prisma.contactListMember.findFirst({
      where: { id: contactId, listId },
    });
    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    const updated = await prisma.contactListMember.update({
      where: { id: contactId },
      data: {
        ...data,
        unsubscribedAt: data.status === 'UNSUBSCRIBED' ? new Date() : undefined,
        bouncedAt: data.status === 'BOUNCED' ? new Date() : undefined,
      },
    });

    await this.updateListCounts(listId);

    return updated;
  }

  /**
   * Remove contact from list
   */
  async removeContact(contactId: string, listId: string, organizationId: string) {
    // Verify list belongs to org
    const list = await prisma.contactList.findFirst({
      where: { id: listId, organizationId },
    });
    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    await prisma.contactListMember.delete({ where: { id: contactId } });
    await this.updateListCounts(listId);

    return { success: true };
  }

  /**
   * Bulk remove contacts from list
   */
  async removeContacts(listId: string, organizationId: string, contactIds: string[]) {
    // Verify list belongs to org
    const list = await prisma.contactList.findFirst({
      where: { id: listId, organizationId },
    });
    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    await prisma.contactListMember.deleteMany({
      where: { id: { in: contactIds }, listId },
    });
    await this.updateListCounts(listId);

    return { success: true, removed: contactIds.length };
  }

  /**
   * Unsubscribe contact
   */
  async unsubscribeContact(listId: string, email: string) {
    const contact = await prisma.contactListMember.findFirst({
      where: { listId, email },
    });

    if (contact) {
      await prisma.contactListMember.update({
        where: { id: contact.id },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: new Date(),
        },
      });
      await this.updateListCounts(listId);
    }

    return { success: true };
  }

  /**
   * Refresh dynamic list based on criteria
   */
  private async refreshDynamicList(listId: string, organizationId: string, criteria: any) {
    // Build lead query from criteria
    const leadWhere: any = { organizationId };

    if (criteria.source) leadWhere.source = criteria.source;
    if (criteria.stageId) leadWhere.stageId = criteria.stageId;
    if (criteria.tags && criteria.tags.length > 0) {
      leadWhere.tags = { hasSome: criteria.tags };
    }

    // Get matching leads
    const leads = await prisma.lead.findMany({
      where: leadWhere,
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });

    // Clear existing contacts
    await prisma.contactListMember.deleteMany({ where: { listId } });

    // Add matching leads
    for (const lead of leads) {
      await prisma.contactListMember.create({
        data: {
          listId,
          leadId: lead.id,
          email: lead.email,
          phone: lead.phone,
          firstName: lead.firstName,
          lastName: lead.lastName || '',
        },
      });
    }

    await this.updateListCounts(listId);
  }

  /**
   * Update list contact counts
   */
  private async updateListCounts(listId: string) {
    const [total, active] = await Promise.all([
      prisma.contactListMember.count({ where: { listId } }),
      prisma.contactListMember.count({ where: { listId, status: 'ACTIVE' } }),
    ]);

    await prisma.contactList.update({
      where: { id: listId },
      data: {
        contactCount: total,
        activeCount: active,
      },
    });
  }

  /**
   * Get list stats
   */
  async getListStats(listId: string, organizationId: string) {
    const list = await prisma.contactList.findFirst({
      where: { id: listId, organizationId },
    });
    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    const [
      total,
      active,
      unsubscribed,
      bounced,
      recentlyAdded,
    ] = await Promise.all([
      prisma.contactListMember.count({ where: { listId } }),
      prisma.contactListMember.count({ where: { listId, status: 'ACTIVE' } }),
      prisma.contactListMember.count({ where: { listId, status: 'UNSUBSCRIBED' } }),
      prisma.contactListMember.count({ where: { listId, status: 'BOUNCED' } }),
      prisma.contactListMember.count({
        where: {
          listId,
          addedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      active,
      unsubscribed,
      bounced,
      recentlyAdded,
      healthScore: total > 0 ? Math.round((active / total) * 100) : 100,
    };
  }

  /**
   * Export list contacts
   */
  async exportContacts(listId: string, organizationId: string) {
    const list = await prisma.contactList.findFirst({
      where: { id: listId, organizationId },
    });
    if (!list) {
      throw new AppError('Contact list not found', 404);
    }

    const contacts = await prisma.contactListMember.findMany({
      where: { listId },
      orderBy: { addedAt: 'desc' },
    });

    return contacts.map(c => ({
      email: c.email,
      phone: c.phone,
      firstName: c.firstName,
      lastName: c.lastName,
      status: c.status,
      addedAt: c.addedAt,
      customFields: c.customFields,
    }));
  }
}

export const contactListService = new ContactListService();
