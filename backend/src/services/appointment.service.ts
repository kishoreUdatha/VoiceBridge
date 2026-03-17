/**
 * Appointment Service - Single Responsibility Principle
 * Handles appointment booking and management
 */

import { PrismaClient } from '@prisma/client';
import { exotelService } from '../integrations/exotel.service';

const prisma = new PrismaClient();

export type LocationType = 'PHONE' | 'VIDEO' | 'IN_PERSON' | 'OTHER';

export interface BookAppointmentData {
  organizationId: string;
  leadId?: string;
  callId?: string;
  title: string;
  description?: string;
  appointmentType?: string;
  scheduledAt: Date;
  duration?: number;
  locationType?: LocationType;
  locationDetails?: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
}

/**
 * Book a new appointment
 */
export async function bookAppointment(data: BookAppointmentData) {
  return prisma.appointment.create({ data });
}

/**
 * Book appointment from a call
 */
export async function bookFromCall(callId: string, appointmentDetails: {
  scheduledAt: Date;
  title?: string;
  duration?: number;
  locationType?: LocationType;
  locationDetails?: string;
}) {
  const call = await prisma.outboundCall.findUnique({
    where: { id: callId },
    include: { agent: true },
  });

  if (!call) throw new Error('Call not found');

  const qualification = call.qualification as any || {};

  return bookAppointment({
    organizationId: call.agent.organizationId,
    leadId: call.generatedLeadId || undefined,
    callId,
    title: appointmentDetails.title || `Appointment with ${qualification.name || 'Customer'}`,
    scheduledAt: appointmentDetails.scheduledAt,
    duration: appointmentDetails.duration || 30,
    locationType: appointmentDetails.locationType || 'PHONE',
    locationDetails: appointmentDetails.locationDetails,
    contactName: qualification.name || 'Customer',
    contactPhone: call.phoneNumber,
    contactEmail: qualification.email,
  });
}

/**
 * Get appointments with filters
 */
export async function getAppointments(organizationId: string, options: {
  fromDate?: Date;
  toDate?: Date;
  status?: string;
}) {
  const where: any = { organizationId };

  if (options.status) where.status = options.status;
  if (options.fromDate || options.toDate) {
    where.scheduledAt = {};
    if (options.fromDate) where.scheduledAt.gte = options.fromDate;
    if (options.toDate) where.scheduledAt.lte = options.toDate;
  }

  return prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
  });
}

/**
 * Get appointment by ID
 */
export async function getAppointmentById(id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!appointment) return null;

  // Fetch lead if linked
  let lead = null;
  if (appointment.leadId) {
    lead = await prisma.lead.findUnique({
      where: { id: appointment.leadId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
  }

  return { ...appointment, lead };
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(id: string, status: string) {
  const updateData: any = { status };

  if (status === 'CONFIRMED') updateData.confirmedAt = new Date();
  if (status === 'CANCELLED') updateData.cancelledAt = new Date();
  if (status === 'COMPLETED') updateData.completedAt = new Date();

  return prisma.appointment.update({ where: { id }, data: updateData });
}

/**
 * Reschedule appointment
 */
export async function rescheduleAppointment(id: string, newTime: Date) {
  return prisma.appointment.update({
    where: { id },
    data: {
      scheduledAt: newTime,
      status: 'SCHEDULED',
      reminderSent: false,
    },
  });
}

/**
 * Send reminders for upcoming appointments
 */
export async function sendReminders() {
  const reminderWindow = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      reminderSent: false,
      scheduledAt: { lte: reminderWindow, gte: new Date() },
    },
  });

  for (const apt of upcomingAppointments) {
    try {
      const message = `Reminder: You have an appointment "${apt.title}" scheduled for ${apt.scheduledAt.toLocaleString()}. Location: ${apt.locationDetails || apt.locationType}`;

      await exotelService.sendSMS({
        to: apt.contactPhone,
        body: message,
      });

      await prisma.appointment.update({
        where: { id: apt.id },
        data: { reminderSent: true },
      });
    } catch (error) {
      console.error(`Failed to send reminder for appointment ${apt.id}:`, error);
    }
  }
}

/**
 * Get upcoming appointments for a lead
 */
export async function getLeadAppointments(leadId: string) {
  return prisma.appointment.findMany({
    where: {
      leadId,
      scheduledAt: { gte: new Date() },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(id: string, reason?: string) {
  return prisma.appointment.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      notes: reason,
    },
  });
}

/**
 * Get appointment statistics
 */
export async function getAppointmentStats(organizationId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      createdAt: { gte: startDate },
    },
    select: { status: true },
  });

  return {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === 'SCHEDULED').length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
    noShow: appointments.filter(a => a.status === 'NO_SHOW').length,
  };
}

export const appointmentService = {
  bookAppointment,
  bookFromCall,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  rescheduleAppointment,
  sendReminders,
  getLeadAppointments,
  cancelAppointment,
  getAppointmentStats,
};

export default appointmentService;
