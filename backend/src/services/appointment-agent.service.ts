/**
 * Appointment Agent Service - Single Responsibility Principle
 * Handles appointment booking and management conversations
 */

import { prisma } from '../config/database';
import OpenAI from 'openai';
import { emailService } from '../integrations/email.service';
import { communicationService } from './communication.service';
import { AgentContext, AgentResponse, AppointmentSlot } from './specialized-agent.types';


const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Handle appointment booking conversation
 */
export async function handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
  const agent = await prisma.voiceAgent.findUnique({
    where: { id: context.agentId },
  });

  if (!agent) throw new Error('Agent not found');

  const slotDuration = agent.slotDuration || 30;
  const maxAdvanceBooking = agent.maxAdvanceBooking || 30;

  // Get available slots
  const availableSlots = await getAvailableSlots(context.agentId, 7);

  const systemPrompt = `You are ${agent.name}, an appointment booking assistant.

YOUR ROLE:
- Help customers book appointments/demos/meetings
- Check availability and suggest suitable times
- Confirm bookings and send reminders
- Handle rescheduling and cancellations

AVAILABLE SLOTS (Next 7 days):
${availableSlots.map(s => `- ${s.date}: ${s.times.join(', ')}`).join('\n')}

APPOINTMENT DETAILS:
- Duration: ${slotDuration} minutes
- Max booking: ${maxAdvanceBooking} days in advance

CONVERSATION FLOW:
1. Ask what type of meeting they need
2. Suggest available times
3. Confirm their details (name, email, phone)
4. Book and confirm

When booking is complete, include [BOOKED:date,time] in your response.
When they want to reschedule, include [RESCHEDULE:bookingId].
When they want to cancel, include [CANCEL:bookingId].`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...context.conversationHistory,
    { role: 'user', content: userMessage },
  ];

  if (!openai) {
    return { message: 'AI service unavailable', shouldEnd: true };
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 400,
  });

  const aiMessage = response.choices[0]?.message?.content || '';
  let cleanMessage = aiMessage;
  let action: string | undefined;
  let data: Record<string, any> | undefined;

  // Parse booking action
  const bookingMatch = aiMessage.match(/\[BOOKED:([^,]+),([^\]]+)\]/);
  if (bookingMatch) {
    action = 'appointment_booked';
    data = { date: bookingMatch[1], time: bookingMatch[2] };
    cleanMessage = aiMessage.replace(/\[BOOKED:[^\]]+\]/, '').trim();

    // Create appointment
    await bookAppointment(context, data.date, data.time, slotDuration);
  }

  return {
    message: cleanMessage,
    action,
    data,
    shouldEnd: action === 'appointment_booked',
  };
}

/**
 * Get available appointment slots
 */
export async function getAvailableSlots(agentId: string, days: number = 7): Promise<AppointmentSlot[]> {
  const slots: AppointmentSlot[] = [];
  const now = new Date();

  for (let i = 1; i <= days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split('T')[0];
    slots.push({
      date: dateStr,
      times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    });
  }

  return slots;
}

/**
 * Book an appointment
 */
export async function bookAppointment(
  context: AgentContext,
  date: string,
  time: string,
  duration: number
): Promise<any> {
  const appointment = await prisma.appointment.create({
    data: {
      organizationId: context.organizationId,
      leadId: context.leadId,
      title: 'Scheduled Appointment',
      scheduledAt: new Date(`${date}T${time}:00`),
      duration,
      status: 'SCHEDULED',
      appointmentType: 'DEMO',
      contactName: context.firstName || 'Customer',
      contactPhone: context.phone,
      contactEmail: context.email,
    },
  });

  // Send confirmation
  if (context.email) {
    await emailService.sendEmail({
      to: context.email,
      subject: 'Appointment Confirmed',
      body: `Your appointment is confirmed for ${date} at ${time}.`,
      leadId: context.leadId,
      userId: 'system',
    });
  }

  if (context.phone) {
    await communicationService.sendSms({
      to: context.phone,
      message: `Appointment confirmed: ${date} at ${time}. We look forward to meeting you!`,
      leadId: context.leadId,
      userId: 'system',
    });
  }

  return appointment;
}

/**
 * Send appointment reminders
 */
export async function sendReminders(appointmentId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) return;

  const scheduledAt = new Date(appointment.scheduledAt);
  const formattedDate = scheduledAt.toLocaleDateString();
  const formattedTime = scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Send SMS reminder using contact info from appointment
  if (appointment.contactPhone) {
    await communicationService.sendSms({
      to: appointment.contactPhone,
      message: `Reminder: Your appointment is tomorrow at ${formattedTime}. See you then!`,
      leadId: appointment.leadId || undefined,
      userId: 'system',
    });
  }

  // Send email reminder
  if (appointment.contactEmail) {
    await emailService.sendEmail({
      to: appointment.contactEmail,
      subject: 'Appointment Reminder',
      body: `This is a reminder for your appointment on ${formattedDate} at ${formattedTime}.`,
      leadId: appointment.leadId || undefined,
      userId: 'system',
    });
  }
}

export const appointmentAgentService = {
  handleConversation,
  getAvailableSlots,
  bookAppointment,
  sendReminders,
};

export default appointmentAgentService;
