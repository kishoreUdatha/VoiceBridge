/**
 * Voice Lead Integration Service - Single Responsibility Principle
 * Handles lead creation, CRM integration, webhooks, and notifications from voice sessions
 */

import { prisma } from '../config/database';
import { webhookService, WEBHOOK_EVENTS } from './webhook.service';
import { notificationChannelService } from './notification-channel.service';
import { calendarService } from './calendar.service';
import { dripCampaignService } from './drip-campaign.service';


/**
 * Create or update lead from voice session
 */
export async function createLeadFromSession(session: any) {
  const qualification = session.qualification as any;
  const agent = session.agent;

  try {
    // Check if auto-create is disabled
    if (agent.autoCreateLeads === false) {
      console.log('[VoiceLeadIntegration] autoCreateLeads disabled for agent:', agent.id);
      return;
    }

    // Check if lead already linked to session
    if (session.leadId) {
      await updateExistingLeadWithSessionData(session.leadId, session);
      return;
    }

    const phone = qualification.phone || session.visitorPhone;
    if (!phone || phone === 'unknown') {
      console.log('[VoiceLeadIntegration] No phone number available for lead creation');
      return;
    }

    // Deduplication: Check for existing lead by phone
    let lead = null;
    if (agent.deduplicateByPhone !== false) {
      lead = await prisma.lead.findFirst({
        where: {
          organizationId: agent.organizationId,
          phone: phone,
        },
      });
    }

    if (lead) {
      console.log(`[VoiceLeadIntegration] Found existing lead ${lead.id} for phone ${phone}, updating...`);
      await updateExistingLeadWithSessionData(lead.id, session);
    } else {
      lead = await createNewLeadWithCRMData(session, qualification, agent);
    }

    // Link session to lead
    if (lead) {
      await prisma.voiceSession.update({
        where: { id: session.id },
        data: { leadId: lead.id },
      });
    }

    return lead;
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error creating/updating lead from session:', error);
  }
}

/**
 * Create a new lead with all CRM data
 */
async function createNewLeadWithCRMData(session: any, qualification: any, agent: any) {
  const leadData: any = {
    organizationId: agent.organizationId,
    firstName: qualification.firstName || qualification.name || session.visitorName || 'Voice Lead',
    lastName: qualification.lastName,
    phone: qualification.phone || session.visitorPhone || 'unknown',
    email: qualification.email || session.visitorEmail,
    source: 'CHATBOT',
    sourceDetails: `Voice AI - ${agent.name}`,
    customFields: qualification,
  };

  // Apply default stage if configured
  if (agent.defaultStageId) {
    leadData.stageId = agent.defaultStageId;
  }

  const lead = await prisma.lead.create({
    data: leadData,
  });

  console.log(`[VoiceLeadIntegration] Created new lead ${lead.id} from voice session ${session.id}`);

  // Assign to default counselor if configured
  if (agent.defaultAssigneeId) {
    try {
      await prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedToId: agent.defaultAssigneeId,
          assignedById: agent.defaultAssigneeId,
        },
      });
      console.log(`[VoiceLeadIntegration] Assigned lead ${lead.id} to ${agent.defaultAssigneeId}`);
    } catch (error) {
      console.error('[VoiceLeadIntegration] Error assigning lead:', error);
    }
  }

  // Create call log, notes, and activities
  await createCallLogForSession(lead.id, session, agent);
  await createLeadNoteForSession(lead.id, session);
  await createActivityForSession(lead.id, session, agent);
  await scheduleFollowUpForSession(lead.id, session, agent);

  // Create appointment if enabled
  const appointment = await createAppointmentFromSession(lead.id, session, agent);

  // Trigger integrations
  await triggerLeadCreatedWebhook(lead, session, agent);
  await sendLeadNotifications(lead, session, agent, appointment);
  await syncToCalendar(appointment, lead, agent);
  await enrollInDripCampaigns(lead.id, 'voice_session');

  return lead;
}

/**
 * Update existing lead with voice session data
 */
export async function updateExistingLeadWithSessionData(leadId: string, session: any) {
  const agent = session.agent;
  const qualification = session.qualification as any;

  try {
    // Update lead's custom fields with new qualification data
    if (qualification && Object.keys(qualification).length > 0) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      const existingFields = (lead?.customFields as object) || {};

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          customFields: { ...existingFields, ...qualification },
        },
      });
    }

    // Create call log, notes, activities
    await createCallLogForSession(leadId, session, agent);
    await createLeadNoteForSession(leadId, session);
    await createActivityForSession(leadId, session, agent);
    await scheduleFollowUpForSession(leadId, session, agent);
    await createAppointmentFromSession(leadId, session, agent);

    // Trigger lead.updated webhook
    if (agent.triggerWebhookOnLead !== false) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead) {
        await webhookService.trigger({
          organizationId: agent.organizationId,
          event: WEBHOOK_EVENTS.LEAD_UPDATED,
          data: {
            lead: {
              id: lead.id,
              firstName: lead.firstName,
              lastName: lead.lastName,
              phone: lead.phone,
              email: lead.email,
              customFields: lead.customFields,
            },
            session: {
              id: session.id,
              agentId: agent.id,
              agentName: agent.name,
              duration: session.duration,
              sentiment: session.sentiment,
              summary: session.summary,
            },
            source: 'voice_ai',
          },
        });
      }
    }

    console.log(`[VoiceLeadIntegration] Updated existing lead ${leadId} with voice session data`);
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error updating existing lead:', error);
  }
}

/**
 * Create call log entry for voice session
 */
export async function createCallLogForSession(leadId: string, session: any, agent: any) {
  try {
    const systemUser = await getSystemUser(agent.organizationId);
    if (!systemUser) {
      console.log('[VoiceLeadIntegration] No system user found for call log, skipping');
      return;
    }

    const transcriptText = session.transcripts
      ?.map((t: any) => `${t.role}: ${t.content}`)
      .join('\n') || '';

    await prisma.callLog.create({
      data: {
        organizationId: agent.organizationId,
        leadId,
        callerId: systemUser.id,
        phoneNumber: session.visitorPhone || 'unknown',
        direction: 'INBOUND',
        callType: 'AI',
        status: 'COMPLETED',
        duration: session.duration || 0,
        transcript: transcriptText,
        notes: session.summary,
        startedAt: session.createdAt,
        endedAt: session.endedAt || new Date(),
      },
    });

    console.log(`[VoiceLeadIntegration] Created call log for lead ${leadId}`);
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error creating call log:', error);
  }
}

/**
 * Create lead note with AI conversation summary
 */
export async function createLeadNoteForSession(leadId: string, session: any) {
  try {
    if (!session.summary) return;

    const systemUser = await getSystemUser(session.agent.organizationId);
    if (!systemUser) {
      console.log('[VoiceLeadIntegration] No system user found for note, skipping');
      return;
    }

    await prisma.leadNote.create({
      data: {
        leadId,
        userId: systemUser.id,
        content: `**AI Voice Conversation Summary**\n\n${session.summary}\n\n**Sentiment:** ${session.sentiment || 'neutral'}\n**Duration:** ${session.duration || 0} seconds`,
        isPinned: true,
      },
    });

    console.log(`[VoiceLeadIntegration] Created lead note for lead ${leadId}`);
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error creating lead note:', error);
  }
}

/**
 * Create activity for voice interaction
 */
export async function createActivityForSession(leadId: string, session: any, agent: any) {
  try {
    const systemUser = await getSystemUser(agent.organizationId);

    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: systemUser?.id,
        type: 'CALL_MADE',
        title: 'AI Voice Conversation Completed',
        description: session.summary || `Voice session duration: ${session.duration || 0} seconds`,
        metadata: {
          sessionId: session.id,
          agentName: agent.name,
          sentiment: session.sentiment,
          duration: session.duration,
          visitorName: session.visitorName,
          visitorPhone: session.visitorPhone,
        },
      },
    });

    console.log(`[VoiceLeadIntegration] Created activity for lead ${leadId}`);
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error creating activity:', error);
  }
}

/**
 * Schedule follow-up based on sentiment and outcome
 */
export async function scheduleFollowUpForSession(leadId: string, session: any, agent: any) {
  try {
    const sentiment = session.sentiment || 'neutral';

    // Only create follow-ups for positive or neutral sentiment
    if (sentiment === 'negative') {
      console.log('[VoiceLeadIntegration] Negative sentiment - skipping follow-up');
      return;
    }

    const systemUser = await getSystemUser(agent.organizationId);
    if (!systemUser) return;

    const assigneeId = agent.defaultAssigneeId || systemUser.id;

    // Schedule follow-up: positive = 1 day, neutral = 3 days
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + (sentiment === 'positive' ? 1 : 3));

    await prisma.followUp.create({
      data: {
        leadId,
        assigneeId,
        createdById: systemUser.id,
        scheduledAt,
        message: sentiment === 'positive'
          ? 'Follow up on positive AI voice conversation'
          : 'Follow up on AI voice conversation',
        notes: session.summary,
        status: 'UPCOMING',
      },
    });

    console.log(`[VoiceLeadIntegration] Scheduled follow-up for lead ${leadId} on ${scheduledAt.toISOString()}`);
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error scheduling follow-up:', error);
  }
}

/**
 * Create appointment from voice session if scheduling data is available
 */
export async function createAppointmentFromSession(leadId: string, session: any, agent: any) {
  try {
    console.log(`[VoiceLeadIntegration] Checking appointment creation for agent ${agent.id}, appointmentEnabled: ${agent.appointmentEnabled}`);

    if (!agent.appointmentEnabled) {
      console.log('[VoiceLeadIntegration] Appointment booking is disabled for this agent. Enable it in agent settings.');
      return;
    }

    const qualification = session.qualification as any;
    console.log('[VoiceLeadIntegration] Session qualification data:', JSON.stringify(qualification, null, 2));

    const schedulingData = qualification?.appointmentTime ||
                          qualification?.preferredDate ||
                          qualification?.preferredTime ||
                          qualification?.appointmentDate ||
                          qualification?.meetingTime ||
                          qualification?.scheduledDate ||
                          qualification?.scheduledTime;

    if (!schedulingData) {
      console.log('[VoiceLeadIntegration] No scheduling data found in qualification. Fields checked: appointmentTime, preferredDate, preferredTime, appointmentDate, meetingTime, scheduledDate, scheduledTime');
      return;
    }

    console.log(`[VoiceLeadIntegration] Found scheduling data: ${schedulingData}`);

    const scheduledAt = parseSchedulingData(schedulingData);

    const appointment = await prisma.appointment.create({
      data: {
        organizationId: agent.organizationId,
        leadId,
        voiceSessionId: session.id,
        title: qualification.appointmentType || agent.appointmentType || 'Voice AI Scheduled Appointment',
        description: `Appointment scheduled during AI voice conversation with ${agent.name}`,
        appointmentType: agent.appointmentType || 'consultation',
        scheduledAt,
        duration: agent.appointmentDuration || 30,
        timezone: agent.appointmentTimezone || 'Asia/Kolkata',
        locationType: 'PHONE',
        locationDetails: qualification.phone || session.visitorPhone,
        contactName: qualification.firstName || qualification.name || session.visitorName || 'Unknown',
        contactPhone: qualification.phone || session.visitorPhone || 'unknown',
        contactEmail: qualification.email || session.visitorEmail,
        status: 'SCHEDULED',
        notes: session.summary,
      },
    });

    console.log(`[VoiceLeadIntegration] Created appointment ${appointment.id} for lead ${leadId} scheduled at ${scheduledAt.toISOString()}`);

    // Create activity for appointment
    const systemUser = await getSystemUser(agent.organizationId);
    if (systemUser) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: systemUser.id,
          type: 'FOLLOWUP_SCHEDULED',
          title: 'Appointment Scheduled via AI Voice',
          description: `Appointment scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString()}`,
          metadata: {
            appointmentId: appointment.id,
            scheduledAt: scheduledAt.toISOString(),
            duration: agent.appointmentDuration || 30,
          },
        },
      });
    }

    return appointment;
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error creating appointment:', error);
  }
}

/**
 * Trigger webhook when lead is created
 */
export async function triggerLeadCreatedWebhook(lead: any, session: any, agent: any) {
  try {
    if (agent.triggerWebhookOnLead === false) return;

    await webhookService.trigger({
      organizationId: agent.organizationId,
      event: WEBHOOK_EVENTS.LEAD_CREATED,
      data: {
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          sourceDetails: lead.sourceDetails,
          customFields: lead.customFields,
          createdAt: lead.createdAt,
        },
        session: {
          id: session.id,
          agentId: agent.id,
          agentName: agent.name,
          duration: session.duration,
          sentiment: session.sentiment,
          summary: session.summary,
        },
        source: 'voice_ai',
      },
    });

    console.log(`[VoiceLeadIntegration] Triggered lead.created webhook for lead ${lead.id}`);

    // Also trigger session.ended webhook
    await webhookService.trigger({
      organizationId: agent.organizationId,
      event: WEBHOOK_EVENTS.SESSION_ENDED,
      data: {
        sessionId: session.id,
        agentId: agent.id,
        agentName: agent.name,
        leadId: lead.id,
        duration: session.duration,
        sentiment: session.sentiment,
        summary: session.summary,
        qualification: session.qualification,
      },
    });
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error triggering webhook:', error);
  }
}

/**
 * Send notifications to Slack/Teams channels
 */
export async function sendLeadNotifications(lead: any, session: any, agent: any, appointment?: any) {
  try {
    await notificationChannelService.notifyLeadCreated(agent.organizationId, lead, session);

    await notificationChannelService.notifyCallCompleted(agent.organizationId, {
      id: session.id,
      phoneNumber: session.visitorPhone,
      duration: session.duration,
      sentiment: session.sentiment,
      outcome: session.status,
      summary: session.summary,
    }, lead);

    if (appointment) {
      await notificationChannelService.notifyAppointmentBooked(agent.organizationId, appointment, lead);
    }

    console.log(`[VoiceLeadIntegration] Sent notifications for lead ${lead.id}`);
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error sending notifications:', error);
  }
}

/**
 * Sync appointment to Google Calendar
 */
export async function syncToCalendar(appointment: any, lead: any, _agent: any) {
  if (!appointment) return;

  try {
    const eventId = await calendarService.syncAppointmentToCalendar(appointment, lead);
    if (eventId) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notes: `${appointment.notes || ''}\n\nCalendar Event ID: ${eventId}`.trim() },
      });
      console.log(`[VoiceLeadIntegration] Synced appointment ${appointment.id} to calendar: ${eventId}`);
    }
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error syncing to calendar:', error);
  }
}

/**
 * Auto-enroll lead in matching drip campaigns
 */
export async function enrollInDripCampaigns(leadId: string, eventType: 'created' | 'voice_session') {
  try {
    const enrolledIn = await dripCampaignService.checkAndEnrollLead(leadId, {
      type: eventType,
    });

    if (enrolledIn.length > 0) {
      console.log(`[VoiceLeadIntegration] Auto-enrolled lead ${leadId} in drip campaigns: ${enrolledIn.join(', ')}`);
    }
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error enrolling in drip campaigns:', error);
  }
}

/**
 * Helper: Get system user for organization
 */
async function getSystemUser(organizationId: string) {
  return await prisma.user.findFirst({
    where: {
      organizationId,
      role: {
        name: { in: ['ADMIN', 'MANAGER'] },
      },
    },
    select: { id: true },
  });
}

/**
 * Helper: Parse scheduling data to Date - handles natural language date/time
 */
function parseSchedulingData(schedulingData: any): Date {
  const now = new Date();
  let scheduledAt = new Date();

  if (typeof schedulingData !== 'string') {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(10, 0, 0, 0);
    return scheduledAt;
  }

  const input = schedulingData.toLowerCase().trim();

  // Extract time from input (e.g., "3pm", "10:00", "10 am", "15:00")
  const extractTime = (str: string): { hours: number; minutes: number } | null => {
    // Match patterns like "3pm", "3 pm", "3:00pm", "15:00", "10:30 am"
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\d{1,2})\s*(am|pm)/i,
      /(\d{1,2})\s*o'?\s*clock/i,
    ];

    for (const pattern of timePatterns) {
      const match = str.match(pattern);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2] && !isNaN(parseInt(match[2])) ? parseInt(match[2], 10) : 0;
        const meridiem = match[3]?.toLowerCase() || match[2]?.toLowerCase();

        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;

        return { hours, minutes };
      }
    }

    // Check for words like "morning", "afternoon", "evening"
    if (str.includes('morning')) return { hours: 10, minutes: 0 };
    if (str.includes('afternoon')) return { hours: 14, minutes: 0 };
    if (str.includes('evening')) return { hours: 18, minutes: 0 };
    if (str.includes('noon') || str.includes('lunch')) return { hours: 12, minutes: 0 };

    return null;
  };

  // Day name to offset
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const getDayOffset = (dayName: string): number => {
    const targetDay = dayNames.indexOf(dayName);
    if (targetDay === -1) return -1;
    const currentDay = now.getDay();
    let offset = targetDay - currentDay;
    if (offset <= 0) offset += 7; // Next occurrence
    return offset;
  };

  try {
    // Parse relative days
    if (input.includes('tomorrow')) {
      scheduledAt.setDate(now.getDate() + 1);
    } else if (input.includes('today')) {
      scheduledAt = new Date(now);
    } else if (input.includes('day after tomorrow')) {
      scheduledAt.setDate(now.getDate() + 2);
    } else if (input.includes('next week')) {
      scheduledAt.setDate(now.getDate() + 7);
    } else if (input.includes('this week')) {
      scheduledAt.setDate(now.getDate() + 2);
    } else {
      // Check for day names
      for (const day of dayNames) {
        if (input.includes(day)) {
          const offset = getDayOffset(day);
          if (offset > 0) {
            scheduledAt.setDate(now.getDate() + offset);
            break;
          }
        }
      }

      // Try parsing as a date string if no relative date found
      if (scheduledAt.toDateString() === now.toDateString()) {
        const parsed = new Date(schedulingData);
        if (!isNaN(parsed.getTime()) && parsed > now) {
          scheduledAt = parsed;
        } else {
          // Default to tomorrow if parsing fails
          scheduledAt.setDate(now.getDate() + 1);
        }
      }
    }

    // Extract and apply time
    const time = extractTime(input);
    if (time) {
      scheduledAt.setHours(time.hours, time.minutes, 0, 0);
    } else {
      // Default to 10 AM if no time specified
      scheduledAt.setHours(10, 0, 0, 0);
    }

    // Ensure scheduled time is in the future
    if (scheduledAt <= now) {
      scheduledAt.setDate(scheduledAt.getDate() + 1);
    }

    console.log(`[VoiceLeadIntegration] Parsed scheduling data "${schedulingData}" to ${scheduledAt.toISOString()}`);
  } catch (error) {
    console.error('[VoiceLeadIntegration] Error parsing scheduling data:', error);
    scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(10, 0, 0, 0);
  }

  return scheduledAt;
}

export const voiceLeadIntegrationService = {
  createLeadFromSession,
  updateExistingLeadWithSessionData,
  createCallLogForSession,
  createLeadNoteForSession,
  createActivityForSession,
  scheduleFollowUpForSession,
  createAppointmentFromSession,
  triggerLeadCreatedWebhook,
  sendLeadNotifications,
  syncToCalendar,
  enrollInDripCampaigns,
};

export default voiceLeadIntegrationService;
