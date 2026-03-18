import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { VoicemailStatus, Prisma } from '@prisma/client';

interface CreateVoicemailInput {
  organizationId: string;
  callerNumber: string;
  callerName?: string;
  leadId?: string;
  queueId?: string;
  ivrFlowId?: string;
  agentUserId?: string;
  recordingUrl: string;
  duration: number;
}

interface VoicemailFilter {
  organizationId: string;
  status?: VoicemailStatus;
  agentUserId?: string;
  queueId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export class VoicemailService {
  async createVoicemail(input: CreateVoicemailInput) {
    const voicemail = await prisma.voicemail.create({
      data: {
        organizationId: input.organizationId,
        callerNumber: input.callerNumber,
        callerName: input.callerName,
        leadId: input.leadId,
        queueId: input.queueId,
        ivrFlowId: input.ivrFlowId,
        agentUserId: input.agentUserId,
        recordingUrl: input.recordingUrl,
        duration: input.duration,
        status: VoicemailStatus.NEW,
        transcriptionStatus: 'PENDING',
      },
    });

    // Queue transcription job (would integrate with Bull/job queue)
    // await jobQueue.add('transcribe-voicemail', { voicemailId: voicemail.id });

    return voicemail;
  }

  async getVoicemailById(id: string, organizationId: string) {
    const voicemail = await prisma.voicemail.findFirst({
      where: { id, organizationId },
    });

    if (!voicemail) {
      throw new NotFoundError('Voicemail not found');
    }

    return voicemail;
  }

  async getVoicemails(filter: VoicemailFilter, page = 1, limit = 20) {
    const where: Prisma.VoicemailWhereInput = {
      organizationId: filter.organizationId,
      status: { not: VoicemailStatus.DELETED },
    };

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.agentUserId) {
      where.agentUserId = filter.agentUserId;
    }

    if (filter.queueId) {
      where.queueId = filter.queueId;
    }

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) {
        where.createdAt.gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        where.createdAt.lte = filter.dateTo;
      }
    }

    if (filter.search) {
      where.OR = [
        { callerNumber: { contains: filter.search } },
        { callerName: { contains: filter.search, mode: 'insensitive' } },
        { transcript: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [voicemails, total] = await Promise.all([
      prisma.voicemail.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.voicemail.count({ where }),
    ]);

    return { voicemails, total, page, limit };
  }

  async markAsListened(id: string, organizationId: string, userId: string) {
    const voicemail = await this.getVoicemailById(id, organizationId);

    return prisma.voicemail.update({
      where: { id: voicemail.id },
      data: {
        status: VoicemailStatus.LISTENED,
        listenedAt: new Date(),
        listenedById: userId,
      },
    });
  }

  async markAsResponded(id: string, organizationId: string, userId: string) {
    const voicemail = await this.getVoicemailById(id, organizationId);

    return prisma.voicemail.update({
      where: { id: voicemail.id },
      data: {
        status: VoicemailStatus.RESPONDED,
        respondedAt: new Date(),
        respondedById: userId,
      },
    });
  }

  async archive(id: string, organizationId: string) {
    const voicemail = await this.getVoicemailById(id, organizationId);

    return prisma.voicemail.update({
      where: { id: voicemail.id },
      data: { status: VoicemailStatus.ARCHIVED },
    });
  }

  async delete(id: string, organizationId: string) {
    const voicemail = await this.getVoicemailById(id, organizationId);

    return prisma.voicemail.update({
      where: { id: voicemail.id },
      data: { status: VoicemailStatus.DELETED },
    });
  }

  async updateNotes(id: string, organizationId: string, notes: string) {
    const voicemail = await this.getVoicemailById(id, organizationId);

    return prisma.voicemail.update({
      where: { id: voicemail.id },
      data: { notes },
    });
  }

  // === Transcription ===
  async transcribeVoicemail(id: string, transcript: string) {
    return prisma.voicemail.update({
      where: { id },
      data: {
        transcript,
        transcriptionStatus: 'COMPLETED',
        transcribedAt: new Date(),
      },
    });
  }

  async updateTranscriptionStatus(
    id: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  ) {
    return prisma.voicemail.update({
      where: { id },
      data: { transcriptionStatus: status },
    });
  }

  // === Create callback from voicemail ===
  async createCallbackFromVoicemail(
    id: string,
    organizationId: string,
    scheduledAt?: Date
  ) {
    const voicemail = await this.getVoicemailById(id, organizationId);

    // Import callback service to create callback
    const { callbackService } = await import('./callback.service');

    const callback = await callbackService.scheduleCallback({
      organizationId,
      phoneNumber: voicemail.callerNumber,
      contactName: voicemail.callerName ?? undefined,
      leadId: voicemail.leadId ?? undefined,
      source: 'VOICEMAIL',
      voicemailId: voicemail.id,
      scheduledAt,
    });

    // Update voicemail with callback reference
    await prisma.voicemail.update({
      where: { id: voicemail.id },
      data: { callbackId: callback.id },
    });

    return callback;
  }

  // === Statistics ===
  async getStats(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.VoicemailWhereInput = { organizationId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [total, newCount, listenedCount, respondedCount, archivedCount] =
      await Promise.all([
        prisma.voicemail.count({ where }),
        prisma.voicemail.count({
          where: { ...where, status: VoicemailStatus.NEW }
        }),
        prisma.voicemail.count({
          where: { ...where, status: VoicemailStatus.LISTENED }
        }),
        prisma.voicemail.count({
          where: { ...where, status: VoicemailStatus.RESPONDED }
        }),
        prisma.voicemail.count({
          where: { ...where, status: VoicemailStatus.ARCHIVED }
        }),
      ]);

    const avgDuration = await prisma.voicemail.aggregate({
      where,
      _avg: { duration: true },
    });

    return {
      total,
      new: newCount,
      listened: listenedCount,
      responded: respondedCount,
      archived: archivedCount,
      avgDuration: Math.round(avgDuration._avg.duration ?? 0),
    };
  }

  async getNewCount(organizationId: string, agentUserId?: string) {
    const where: Prisma.VoicemailWhereInput = {
      organizationId,
      status: VoicemailStatus.NEW,
    };

    if (agentUserId) {
      where.agentUserId = agentUserId;
    }

    return prisma.voicemail.count({ where });
  }
}

export const voicemailService = new VoicemailService();
