/**
 * Admission Notification Service
 *
 * Handles all notifications related to admissions across multiple channels:
 * - Push notifications (Firebase)
 * - Email (SMTP)
 * - WhatsApp (Exotel)
 */

import { prisma } from '../config/database';
import { pushNotificationService } from './push-notification.service';
import { emailService } from '../integrations/email.service';
import { exotelService } from '../integrations/exotel.service';
import { config } from '../config';

interface AdmissionWithDetails {
  id: string;
  admissionNumber: string;
  organizationId: string;
  totalFee: number | { toNumber?: () => number };
  donationAmount: number | { toNumber?: () => number };
  paidAmount: number | { toNumber?: () => number };
  pendingAmount: number | { toNumber?: () => number };
  commissionAmount: number | { toNumber?: () => number };
  commissionPercent: number | { toNumber?: () => number };
  paymentStatus: string;
  academicYear: string;
  courseName?: string | null;
  branch?: string | null;
  closedById: string;
  lead?: {
    firstName: string;
    lastName?: string | null;
    phone: string;
    email?: string | null;
    fatherName?: string | null;
    fatherMobile?: string | null;
  };
  university?: {
    name: string;
    shortName?: string | null;
  };
  closedBy?: {
    firstName: string;
    lastName?: string | null;
  };
}

interface PaymentDetails {
  id: string;
  amount: number | { toNumber?: () => number };
  paymentNumber: number;
  paymentType: string;
  paymentMode?: string | null;
  referenceNumber?: string | null;
  receivedById?: string | null;
}

class AdmissionNotificationService {
  /**
   * Convert Prisma Decimal to number
   */
  private toNumber(value: number | { toNumber?: () => number } | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toNumber === 'function') return value.toNumber();
    return Number(value) || 0;
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Get student name from admission
   */
  private getStudentName(admission: AdmissionWithDetails): string {
    if (!admission.lead) return 'Student';
    const firstName = admission.lead.firstName || '';
    const lastName = admission.lead.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Student';
  }

  /**
   * Get student contact info
   */
  private getStudentContact(admission: AdmissionWithDetails): { phone: string; email: string | null; name: string } {
    return {
      phone: admission.lead?.phone || '',
      email: admission.lead?.email || null,
      name: this.getStudentName(admission),
    };
  }

  /**
   * Get managers and admins for an organization
   */
  private async getManagersAndAdmins(organizationId: string): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { name: { in: ['ADMIN', 'MANAGER', 'admin', 'manager'] } },
      },
      select: { id: true },
    });
    return users.map(u => u.id);
  }

  /**
   * Get managers' email addresses
   */
  private async getManagerEmails(organizationId: string): Promise<Array<{ email: string; name: string }>> {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        role: { name: { in: ['ADMIN', 'MANAGER', 'admin', 'manager'] } },
      },
      select: { email: true, firstName: true, lastName: true },
    });
    return users.map(u => ({
      email: u.email,
      name: `${u.firstName} ${u.lastName || ''}`.trim(),
    }));
  }

  // ==================== 1. NEW ADMISSION CREATED ====================

  /**
   * Notify when a new admission is created
   */
  async notifyAdmissionCreated(admission: AdmissionWithDetails, organizationId: string): Promise<void> {
    const studentName = this.getStudentName(admission);
    const universityName = admission.university?.name || 'University';
    const totalFee = this.toNumber(admission.totalFee);
    const donationAmount = this.toNumber(admission.donationAmount);
    const totalDue = totalFee + donationAmount;

    try {
      // 1. Push notification to closedBy user and managers
      const managerIds = await this.getManagersAndAdmins(organizationId);
      const allRecipients = [...new Set([admission.closedById, ...managerIds])];

      await pushNotificationService.sendToUsers(allRecipients, {
        title: 'New Admission',
        body: `${studentName} admitted to ${universityName}`,
        type: 'ADMISSION_CREATED',
        data: {
          admissionId: admission.id,
          screen: 'AdmissionDetail',
        },
      });
      console.log(`[AdmissionNotification] Push sent for new admission ${admission.admissionNumber}`);
    } catch (error) {
      console.error('[AdmissionNotification] Push notification failed:', error);
    }

    try {
      // 2. Email to managers with admission details
      const managers = await this.getManagerEmails(organizationId);
      for (const manager of managers) {
        await emailService.sendEmail({
          to: manager.email,
          subject: `New Admission: ${studentName} - ${universityName}`,
          body: this.getAdmissionEmailText(admission, studentName, universityName, totalDue),
          html: this.getAdmissionEmailHtml(admission, studentName, universityName, totalDue),
          userId: 'system',
          organizationId,
        });
      }
      console.log(`[AdmissionNotification] Email sent to ${managers.length} managers for admission ${admission.admissionNumber}`);
    } catch (error) {
      console.error('[AdmissionNotification] Email notification failed:', error);
    }

    try {
      // 3. WhatsApp to student (welcome message)
      const student = this.getStudentContact(admission);
      if (student.phone) {
        const message = `Welcome ${student.name}! Your admission at ${universityName} is confirmed.

Admission No: ${admission.admissionNumber}
${admission.courseName ? `Course: ${admission.courseName}` : ''}
Total Fee: ${this.formatCurrency(totalDue)}

Thank you for choosing us. Contact us for any queries.`;

        await exotelService.sendWhatsApp({ to: student.phone, message });
        console.log(`[AdmissionNotification] WhatsApp sent to student for admission ${admission.admissionNumber}`);
      }
    } catch (error) {
      console.error('[AdmissionNotification] WhatsApp notification failed:', error);
    }
  }

  private getAdmissionEmailText(
    admission: AdmissionWithDetails,
    studentName: string,
    universityName: string,
    totalDue: number
  ): string {
    return `
New Admission Recorded

Student: ${studentName}
University: ${universityName}
Admission Number: ${admission.admissionNumber}
Course: ${admission.courseName || 'N/A'}
Branch: ${admission.branch || 'N/A'}
Academic Year: ${admission.academicYear}

Fee Details:
- Total Fee: ${this.formatCurrency(this.toNumber(admission.totalFee))}
- Donation: ${this.formatCurrency(this.toNumber(admission.donationAmount))}
- Total Due: ${this.formatCurrency(totalDue)}

Commission: ${this.formatCurrency(this.toNumber(admission.commissionAmount))} (${this.toNumber(admission.commissionPercent)}%)

Closed By: ${admission.closedBy?.firstName || ''} ${admission.closedBy?.lastName || ''}
    `.trim();
  }

  private getAdmissionEmailHtml(
    admission: AdmissionWithDetails,
    studentName: string,
    universityName: string,
    totalDue: number
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">New Admission Recorded</h2>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Student</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${studentName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>University</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${universityName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Admission No</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${admission.admissionNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Course</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${admission.courseName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Academic Year</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${admission.academicYear}</td>
          </tr>
        </table>

        <h3 style="color: #059669;">Fee Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Total Fee</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${this.formatCurrency(this.toNumber(admission.totalFee))}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Donation</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${this.formatCurrency(this.toNumber(admission.donationAmount))}</td>
          </tr>
          <tr style="background: #ecfdf5;">
            <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Total Due</strong></td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;"><strong>${this.formatCurrency(totalDue)}</strong></td>
          </tr>
        </table>

        <p style="color: #6b7280; font-size: 14px;">
          Commission: ${this.formatCurrency(this.toNumber(admission.commissionAmount))} (${this.toNumber(admission.commissionPercent)}%)
          <br>
          Closed By: ${admission.closedBy?.firstName || ''} ${admission.closedBy?.lastName || ''}
        </p>
      </div>
    `;
  }

  // ==================== 2. PAYMENT RECEIVED ====================

  /**
   * Notify when a payment is received (partial payment)
   */
  async notifyPaymentReceived(
    admission: AdmissionWithDetails,
    payment: PaymentDetails,
    organizationId: string
  ): Promise<void> {
    const studentName = this.getStudentName(admission);
    const paymentAmount = this.toNumber(payment.amount);
    const pendingAmount = this.toNumber(admission.pendingAmount);

    try {
      // 1. Push notification to receivedBy user and managers
      const managerIds = await this.getManagersAndAdmins(organizationId);
      const recipients = payment.receivedById
        ? [...new Set([payment.receivedById, ...managerIds])]
        : managerIds;

      await pushNotificationService.sendToUsers(recipients, {
        title: 'Payment Received',
        body: `${this.formatCurrency(paymentAmount)} received from ${studentName}`,
        type: 'ADMISSION_PAYMENT',
        data: {
          admissionId: admission.id,
          paymentId: payment.id,
          screen: 'AdmissionDetail',
        },
      });
      console.log(`[AdmissionNotification] Push sent for payment on admission ${admission.admissionNumber}`);
    } catch (error) {
      console.error('[AdmissionNotification] Push notification failed:', error);
    }

    try {
      // 2. Email to student (payment receipt)
      const student = this.getStudentContact(admission);
      if (student.email) {
        await emailService.sendEmail({
          to: student.email,
          subject: `Payment Receipt - ${this.formatCurrency(paymentAmount)}`,
          body: this.getPaymentReceiptText(admission, payment, studentName, paymentAmount, pendingAmount),
          html: this.getPaymentReceiptHtml(admission, payment, studentName, paymentAmount, pendingAmount),
          userId: 'system',
          organizationId,
        });
        console.log(`[AdmissionNotification] Payment receipt email sent to ${student.email}`);
      }
    } catch (error) {
      console.error('[AdmissionNotification] Email notification failed:', error);
    }

    try {
      // 3. WhatsApp to student (payment confirmation)
      const student = this.getStudentContact(admission);
      if (student.phone) {
        const message = `Payment Received!

Dear ${student.name},

We have received your payment of ${this.formatCurrency(paymentAmount)}.

Admission No: ${admission.admissionNumber}
Payment #${payment.paymentNumber}
${payment.referenceNumber ? `Reference: ${payment.referenceNumber}` : ''}

${pendingAmount > 0 ? `Pending Amount: ${this.formatCurrency(pendingAmount)}` : 'All dues cleared!'}

Thank you.`;

        await exotelService.sendWhatsApp({ to: student.phone, message });
        console.log(`[AdmissionNotification] WhatsApp payment confirmation sent to student`);
      }
    } catch (error) {
      console.error('[AdmissionNotification] WhatsApp notification failed:', error);
    }
  }

  private getPaymentReceiptText(
    admission: AdmissionWithDetails,
    payment: PaymentDetails,
    studentName: string,
    paymentAmount: number,
    pendingAmount: number
  ): string {
    return `
Payment Receipt

Dear ${studentName},

Thank you for your payment. Here are the details:

Admission Number: ${admission.admissionNumber}
Payment Amount: ${this.formatCurrency(paymentAmount)}
Payment #${payment.paymentNumber}
Payment Mode: ${payment.paymentMode || 'N/A'}
${payment.referenceNumber ? `Reference: ${payment.referenceNumber}` : ''}

Total Paid: ${this.formatCurrency(this.toNumber(admission.paidAmount) + paymentAmount)}
Pending Amount: ${this.formatCurrency(pendingAmount)}

This is an auto-generated receipt.
    `.trim();
  }

  private getPaymentReceiptHtml(
    admission: AdmissionWithDetails,
    payment: PaymentDetails,
    studentName: string,
    paymentAmount: number,
    pendingAmount: number
  ): string {
    const totalPaid = this.toNumber(admission.paidAmount) + paymentAmount;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Payment Receipt</h2>

        <p>Dear ${studentName},</p>
        <p>Thank you for your payment. Here are the details:</p>

        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #047857;">Amount Paid: ${this.formatCurrency(paymentAmount)}</h3>
          <p style="margin: 0; color: #6b7280;">Payment #${payment.paymentNumber}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Admission No</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${admission.admissionNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Payment Mode</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${payment.paymentMode || 'N/A'}</td>
          </tr>
          ${payment.referenceNumber ? `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Reference</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${payment.referenceNumber}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Total Paid</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${this.formatCurrency(totalPaid)}</td>
          </tr>
          <tr>
            <td style="padding: 10px;"><strong>Pending Amount</strong></td>
            <td style="padding: 10px; text-align: right; color: ${pendingAmount > 0 ? '#dc2626' : '#059669'};"><strong>${this.formatCurrency(pendingAmount)}</strong></td>
          </tr>
        </table>

        <p style="color: #9ca3af; font-size: 12px;">This is an auto-generated receipt.</p>
      </div>
    `;
  }

  // ==================== 3. FULL PAYMENT COMPLETE ====================

  /**
   * Notify when full payment is complete (enrollment confirmed)
   */
  async notifyPaymentComplete(admission: AdmissionWithDetails, organizationId: string): Promise<void> {
    const studentName = this.getStudentName(admission);
    const universityName = admission.university?.name || 'University';
    const totalPaid = this.toNumber(admission.totalFee) + this.toNumber(admission.donationAmount);

    try {
      // 1. Push notification to managers
      const managerIds = await this.getManagersAndAdmins(organizationId);

      await pushNotificationService.sendToUsers(managerIds, {
        title: 'Full Payment Complete',
        body: `${studentName} completed payment for ${universityName}`,
        type: 'ADMISSION_PAYMENT_COMPLETE',
        data: {
          admissionId: admission.id,
          screen: 'AdmissionDetail',
        },
      });
      console.log(`[AdmissionNotification] Push sent for full payment on admission ${admission.admissionNumber}`);
    } catch (error) {
      console.error('[AdmissionNotification] Push notification failed:', error);
    }

    try {
      // 2. Email to student (enrollment confirmation)
      const student = this.getStudentContact(admission);
      if (student.email) {
        await emailService.sendEmail({
          to: student.email,
          subject: `Enrollment Confirmed - ${universityName}`,
          body: this.getEnrollmentConfirmationText(admission, studentName, universityName, totalPaid),
          html: this.getEnrollmentConfirmationHtml(admission, studentName, universityName, totalPaid),
          userId: 'system',
          organizationId,
        });
        console.log(`[AdmissionNotification] Enrollment confirmation email sent to ${student.email}`);
      }
    } catch (error) {
      console.error('[AdmissionNotification] Email notification failed:', error);
    }

    try {
      // 3. WhatsApp to student (congratulations)
      const student = this.getStudentContact(admission);
      if (student.phone) {
        const message = `Congratulations ${student.name}!

Your enrollment at ${universityName} is now complete!

Admission No: ${admission.admissionNumber}
${admission.courseName ? `Course: ${admission.courseName}` : ''}
Total Paid: ${this.formatCurrency(totalPaid)}

All dues have been cleared. We wish you all the best for your academic journey!`;

        await exotelService.sendWhatsApp({ to: student.phone, message });
        console.log(`[AdmissionNotification] WhatsApp enrollment confirmation sent to student`);
      }
    } catch (error) {
      console.error('[AdmissionNotification] WhatsApp notification failed:', error);
    }
  }

  private getEnrollmentConfirmationText(
    admission: AdmissionWithDetails,
    studentName: string,
    universityName: string,
    totalPaid: number
  ): string {
    return `
Enrollment Confirmation

Dear ${studentName},

Congratulations! Your enrollment at ${universityName} is now complete.

Admission Details:
- Admission Number: ${admission.admissionNumber}
- Course: ${admission.courseName || 'N/A'}
- Branch: ${admission.branch || 'N/A'}
- Academic Year: ${admission.academicYear}
- Total Paid: ${this.formatCurrency(totalPaid)}

All your dues have been cleared. We wish you all the best for your academic journey!

Best regards,
The Admissions Team
    `.trim();
  }

  private getEnrollmentConfirmationHtml(
    admission: AdmissionWithDetails,
    studentName: string,
    universityName: string,
    totalPaid: number
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Congratulations!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your enrollment is complete</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <p>Dear ${studentName},</p>
          <p>Your enrollment at <strong>${universityName}</strong> has been confirmed.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Admission Details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Admission No:</td>
                <td style="padding: 5px 0;"><strong>${admission.admissionNumber}</strong></td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Course:</td>
                <td style="padding: 5px 0;">${admission.courseName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Academic Year:</td>
                <td style="padding: 5px 0;">${admission.academicYear}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6b7280;">Total Paid:</td>
                <td style="padding: 5px 0; color: #059669;"><strong>${this.formatCurrency(totalPaid)}</strong></td>
              </tr>
            </table>
          </div>

          <p style="color: #374151;">We wish you all the best for your academic journey!</p>

          <p style="color: #6b7280; margin-top: 30px;">
            Best regards,<br>
            The Admissions Team
          </p>
        </div>
      </div>
    `;
  }

  // ==================== 4. COMMISSION RECEIVED ====================

  /**
   * Notify when commission is marked as received
   */
  async notifyCommissionReceived(admission: AdmissionWithDetails, organizationId: string): Promise<void> {
    const studentName = this.getStudentName(admission);
    const commissionAmount = this.toNumber(admission.commissionAmount);

    try {
      // 1. Push notification to closedBy user (who earned the commission)
      await pushNotificationService.sendToUser(admission.closedById, {
        title: 'Commission Received',
        body: `Commission of ${this.formatCurrency(commissionAmount)} received for ${studentName}`,
        type: 'ADMISSION_COMMISSION',
        data: {
          admissionId: admission.id,
          screen: 'AdmissionDetail',
        },
      });
      console.log(`[AdmissionNotification] Push sent for commission on admission ${admission.admissionNumber}`);
    } catch (error) {
      console.error('[AdmissionNotification] Push notification failed:', error);
    }

    try {
      // 2. Email to admin (commission record)
      const admins = await this.getManagerEmails(organizationId);
      const adminEmails = admins.filter(a => a.email);

      for (const admin of adminEmails) {
        await emailService.sendEmail({
          to: admin.email,
          subject: `Commission Received - ${admission.admissionNumber}`,
          body: `Commission Payment Record

Admission: ${admission.admissionNumber}
Student: ${studentName}
Commission Amount: ${this.formatCurrency(commissionAmount)}
Commission %: ${this.toNumber(admission.commissionPercent)}%
Closed By: ${admission.closedBy?.firstName || ''} ${admission.closedBy?.lastName || ''}

This commission has been marked as received.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Commission Payment Record</h2>

              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Admission No</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${admission.admissionNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Student</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${studentName}</td>
                </tr>
                <tr style="background: #f5f3ff;">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Commission Amount</strong></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>${this.formatCurrency(commissionAmount)}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Commission %</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${this.toNumber(admission.commissionPercent)}%</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Closed By</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${admission.closedBy?.firstName || ''} ${admission.closedBy?.lastName || ''}</td>
                </tr>
              </table>

              <p style="color: #059669;">This commission has been marked as received.</p>
            </div>
          `,
          userId: 'system',
          organizationId,
        });
      }
      console.log(`[AdmissionNotification] Commission record email sent to ${adminEmails.length} admins`);
    } catch (error) {
      console.error('[AdmissionNotification] Email notification failed:', error);
    }
  }

  // ==================== 5. ADMISSION CANCELLED ====================

  /**
   * Notify when an admission is cancelled
   */
  async notifyAdmissionCancelled(
    admission: AdmissionWithDetails,
    reason: string | undefined,
    organizationId: string
  ): Promise<void> {
    const studentName = this.getStudentName(admission);
    const universityName = admission.university?.name || 'University';

    try {
      // 1. Push notification to closedBy user and managers
      const managerIds = await this.getManagersAndAdmins(organizationId);
      const allRecipients = [...new Set([admission.closedById, ...managerIds])];

      await pushNotificationService.sendToUsers(allRecipients, {
        title: 'Admission Cancelled',
        body: `${studentName}'s admission has been cancelled`,
        type: 'ADMISSION_CANCELLED',
        data: {
          admissionId: admission.id,
          screen: 'AdmissionDetail',
        },
      });
      console.log(`[AdmissionNotification] Push sent for cancellation of admission ${admission.admissionNumber}`);
    } catch (error) {
      console.error('[AdmissionNotification] Push notification failed:', error);
    }

    try {
      // 2. Email to student (cancellation notice)
      const student = this.getStudentContact(admission);
      if (student.email) {
        const paidAmount = this.toNumber(admission.paidAmount);
        await emailService.sendEmail({
          to: student.email,
          subject: `Admission Cancellation Notice - ${admission.admissionNumber}`,
          body: `
Dear ${student.name},

This is to inform you that your admission has been cancelled.

Admission Details:
- Admission Number: ${admission.admissionNumber}
- University: ${universityName}
- Course: ${admission.courseName || 'N/A'}
${reason ? `\nReason: ${reason}` : ''}

${paidAmount > 0 ? `Amount Paid: ${this.formatCurrency(paidAmount)}\nPlease contact us regarding the refund process.` : ''}

For any queries, please contact our admissions team.

Regards,
The Admissions Team
          `.trim(),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #dc2626; margin: 0;">Admission Cancellation Notice</h2>
              </div>

              <p>Dear ${student.name},</p>
              <p>This is to inform you that your admission has been cancelled.</p>

              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;">Admission No</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${admission.admissionNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;">University</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${universityName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;">Course</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${admission.courseName || 'N/A'}</td>
                </tr>
                ${reason ? `
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb;">Reason</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${reason}</td>
                </tr>
                ` : ''}
              </table>

              ${paidAmount > 0 ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Amount Paid:</strong> ${this.formatCurrency(paidAmount)}</p>
                <p style="margin: 10px 0 0 0;">Please contact us regarding the refund process.</p>
              </div>
              ` : ''}

              <p style="color: #6b7280;">For any queries, please contact our admissions team.</p>

              <p style="margin-top: 30px;">
                Regards,<br>
                The Admissions Team
              </p>
            </div>
          `,
          userId: 'system',
          organizationId,
        });
        console.log(`[AdmissionNotification] Cancellation email sent to ${student.email}`);
      }
    } catch (error) {
      console.error('[AdmissionNotification] Email notification failed:', error);
    }

    try {
      // 3. WhatsApp to student
      const student = this.getStudentContact(admission);
      if (student.phone) {
        const paidAmount = this.toNumber(admission.paidAmount);
        const message = `Dear ${student.name},

Your admission (${admission.admissionNumber}) at ${universityName} has been cancelled.
${reason ? `\nReason: ${reason}` : ''}
${paidAmount > 0 ? `\nPlease contact us regarding refund of ${this.formatCurrency(paidAmount)}.` : ''}

Contact us for any queries.`;

        await exotelService.sendWhatsApp({ to: student.phone, message });
        console.log(`[AdmissionNotification] WhatsApp cancellation notice sent to student`);
      }
    } catch (error) {
      console.error('[AdmissionNotification] WhatsApp notification failed:', error);
    }
  }

  // ==================== 6. PAYMENT REMINDER ====================

  /**
   * Send payment reminder for pending amounts
   */
  async sendPaymentReminder(admission: AdmissionWithDetails, organizationId: string): Promise<void> {
    const studentName = this.getStudentName(admission);
    const universityName = admission.university?.name || 'University';
    const pendingAmount = this.toNumber(admission.pendingAmount);

    if (pendingAmount <= 0) {
      console.log(`[AdmissionNotification] No pending amount for admission ${admission.admissionNumber}, skipping reminder`);
      return;
    }

    try {
      // WhatsApp to student (primary channel for reminders)
      const student = this.getStudentContact(admission);
      if (student.phone) {
        const message = `Reminder: Payment Pending

Dear ${student.name},

This is a friendly reminder that you have a pending fee amount.

Admission No: ${admission.admissionNumber}
University: ${universityName}
Pending Amount: ${this.formatCurrency(pendingAmount)}

Please make the payment at your earliest convenience to complete your enrollment.

Contact us if you have any questions.`;

        await exotelService.sendWhatsApp({ to: student.phone, message });
        console.log(`[AdmissionNotification] Payment reminder WhatsApp sent for admission ${admission.admissionNumber}`);
      }
    } catch (error) {
      console.error('[AdmissionNotification] WhatsApp reminder failed:', error);

      // Fallback to SMS if WhatsApp fails
      try {
        const student = this.getStudentContact(admission);
        if (student.phone) {
          await exotelService.sendSMS({
            to: student.phone,
            body: `Reminder: ${this.formatCurrency(pendingAmount)} pending for admission ${admission.admissionNumber}. Please pay to complete enrollment.`,
          });
          console.log(`[AdmissionNotification] SMS fallback reminder sent for admission ${admission.admissionNumber}`);
        }
      } catch (smsError) {
        console.error('[AdmissionNotification] SMS fallback also failed:', smsError);
      }
    }

    // Also send push to closedBy user
    try {
      await pushNotificationService.sendToUser(admission.closedById, {
        title: 'Payment Reminder Sent',
        body: `Reminder sent to ${studentName} for ${this.formatCurrency(pendingAmount)}`,
        type: 'ADMISSION_PAYMENT_REMINDER',
        data: {
          admissionId: admission.id,
          screen: 'AdmissionDetail',
        },
      });
    } catch (error) {
      console.error('[AdmissionNotification] Push notification for reminder failed:', error);
    }
  }

  // ==================== BULK REMINDER CHECK ====================

  /**
   * Check and send payment reminders for all pending admissions
   * Called by job queue scheduler
   *
   * Note: After adding lastPaymentReminderAt and paymentReminderCount to the schema,
   * run: npx prisma generate && npx prisma db push
   */
  async checkAndSendPaymentReminders(): Promise<{ sent: number; failed: number }> {
    console.log('[AdmissionNotification] Starting payment reminder check...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find admissions with pending payments that haven't received a reminder recently
    // Using raw query to handle the new fields that may not be in Prisma client yet
    const pendingAdmissions = await prisma.admission.findMany({
      where: {
        status: 'ACTIVE',
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        pendingAmount: { gt: 0 },
        // Either never reminded or reminded more than 7 days ago
        OR: [
          { lastPaymentReminderAt: null },
          { lastPaymentReminderAt: { lt: sevenDaysAgo } },
        ],
      } as any, // Cast to any to support new fields before prisma generate
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        university: {
          select: { name: true, shortName: true },
        },
        closedBy: {
          select: { firstName: true, lastName: true },
        },
      },
      take: 50, // Process 50 at a time
    });

    console.log(`[AdmissionNotification] Found ${pendingAdmissions.length} admissions needing reminders`);

    let sent = 0;
    let failed = 0;

    for (const admission of pendingAdmissions) {
      try {
        await this.sendPaymentReminder(admission as unknown as AdmissionWithDetails, admission.organizationId);

        // Update reminder timestamp (cast to any to support new fields before prisma generate)
        await prisma.admission.update({
          where: { id: admission.id },
          data: {
            lastPaymentReminderAt: new Date(),
            paymentReminderCount: { increment: 1 },
          } as any,
        });

        sent++;
      } catch (error) {
        console.error(`[AdmissionNotification] Failed to send reminder for ${admission.admissionNumber}:`, error);
        failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[AdmissionNotification] Reminder check complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }
}

export const admissionNotificationService = new AdmissionNotificationService();
export default admissionNotificationService;
