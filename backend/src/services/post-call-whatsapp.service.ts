/**
 * Post-Call WhatsApp Service
 * Automatically sends WhatsApp messages with relevant information after AI voice calls
 *
 * Features:
 * - Sends college/course information after education-related calls
 * - Uses pre-approved WhatsApp templates
 * - Extracts relevant data from call transcript
 * - Supports multiple industries (Education, Real Estate, etc.)
 */

import { prisma } from '../config/database';
import { createWhatsAppService, WhatsAppService } from '../integrations/whatsapp.service';

export interface PostCallWhatsAppConfig {
  enabled: boolean;
  sendOnOutcomes: string[]; // e.g., ['INTERESTED', 'CALLBACK_REQUESTED', 'NEEDS_FOLLOWUP']
  delaySeconds: number; // Delay before sending (default: 30 seconds)
  templates: {
    [industry: string]: {
      templateName: string;
      fallbackMessage: string;
    };
  };
}

export interface CollegeInfo {
  collegeName: string;
  courseName?: string;
  duration?: string;
  fee?: string;
  nextBatch?: string;
  brochureUrl?: string;
  websiteUrl?: string;
  contactNumber?: string;
  counselorName?: string;
}

export interface CallData {
  id: string;
  phoneNumber: string;
  organizationId: string;
  agentId: string;
  agentName?: string;
  industry?: string;
  outcome?: string;
  sentiment?: string;
  summary?: string;
  extractedData?: any;
  transcript?: any[];
  qualification?: any;
}

class PostCallWhatsAppService {
  private defaultConfig: PostCallWhatsAppConfig = {
    enabled: true,
    sendOnOutcomes: ['INTERESTED', 'CALLBACK_REQUESTED', 'NEEDS_FOLLOWUP', 'CONVERTED'],
    delaySeconds: 30,
    templates: {
      EDUCATION: {
        templateName: 'college_course_info',
        fallbackMessage: 'Thank you for your interest! We will send you more details shortly.',
      },
      REAL_ESTATE: {
        templateName: 'property_info',
        fallbackMessage: 'Thank you for your interest in our properties! We will share more details soon.',
      },
      HEALTHCARE: {
        templateName: 'appointment_followup',
        fallbackMessage: 'Thank you for speaking with us. We will send you appointment details shortly.',
      },
      FINTECH: {
        templateName: 'financial_info',
        fallbackMessage: 'Thank you for your interest. We will share more information about our services.',
      },
      DEFAULT: {
        templateName: 'general_followup',
        fallbackMessage: 'Thank you for speaking with us today! We will be in touch soon.',
      },
    },
  };

  /**
   * Process completed call and send WhatsApp if applicable
   */
  async processCompletedCall(call: CallData): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    console.log(`[PostCallWhatsApp] Processing call ${call.id} for WhatsApp follow-up`);

    try {
      // Get organization settings
      const config = await this.getOrganizationConfig(call.organizationId);

      if (!config.enabled) {
        console.log(`[PostCallWhatsApp] WhatsApp follow-up disabled for org ${call.organizationId}`);
        return { sent: false, error: 'WhatsApp follow-up disabled' };
      }

      // Check if outcome qualifies for WhatsApp
      if (!config.sendOnOutcomes.includes(call.outcome || '')) {
        console.log(`[PostCallWhatsApp] Outcome ${call.outcome} not in send list`);
        return { sent: false, error: `Outcome ${call.outcome} does not qualify` };
      }

      // Delay before sending (optional)
      if (config.delaySeconds > 0) {
        console.log(`[PostCallWhatsApp] Waiting ${config.delaySeconds} seconds before sending`);
        await this.delay(config.delaySeconds * 1000);
      }

      // Get WhatsApp service
      const whatsappService = createWhatsAppService(call.organizationId);
      const isConfigured = await whatsappService.isConfigured();

      if (!isConfigured) {
        console.log(`[PostCallWhatsApp] WhatsApp not configured for org ${call.organizationId}`);
        return { sent: false, error: 'WhatsApp not configured' };
      }

      // Determine industry and get appropriate template
      const industry = call.industry || 'DEFAULT';
      const templateConfig = config.templates[industry] || config.templates['DEFAULT'];

      // Extract information based on industry
      const messageData = await this.buildMessageData(call, industry);

      // Send WhatsApp message
      const result = await this.sendWhatsAppMessage(
        whatsappService,
        call.phoneNumber,
        templateConfig,
        messageData,
        call
      );

      // Log the message
      await this.logWhatsAppMessage(call, result);

      return result;
    } catch (error: any) {
      console.error(`[PostCallWhatsApp] Error processing call ${call.id}:`, error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send WhatsApp message for education/college information
   */
  async sendCollegeInfo(
    phoneNumber: string,
    organizationId: string,
    collegeInfo: CollegeInfo,
    callId?: string
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    console.log(`[PostCallWhatsApp] Sending college info to ${phoneNumber}`);

    try {
      const whatsappService = createWhatsAppService(organizationId);
      const isConfigured = await whatsappService.isConfigured();

      if (!isConfigured) {
        return { sent: false, error: 'WhatsApp not configured' };
      }

      // Build template parameters for college info
      // Template: college_course_info
      // Parameters: {{1}}=collegeName, {{2}}=recipientName, {{3}}=courseName, {{4}}=duration, {{5}}=fee, {{6}}=nextBatch, {{7}}=collegeName, {{8}}=brochureUrl
      const templateParams = [
        collegeInfo.collegeName,                    // {{1}} - College name in header
        'there',                                     // {{2}} - Recipient name (default)
        collegeInfo.courseName || 'our programs',   // {{3}} - Course name
        collegeInfo.duration || 'Flexible',         // {{4}} - Duration
        collegeInfo.fee || 'Contact for details',   // {{5}} - Fee
        collegeInfo.nextBatch || 'Starting soon',   // {{6}} - Next batch
        collegeInfo.collegeName,                    // {{7}} - Footer college name
      ];

      const result = await whatsappService.sendMessage({
        to: phoneNumber,
        message: this.buildCollegeFallbackMessage(collegeInfo),
        templateName: 'college_course_info',
        templateParams,
      });

      if (result.success) {
        console.log(`[PostCallWhatsApp] College info sent successfully to ${phoneNumber}`);

        // Log to database
        await this.logMessage(organizationId, phoneNumber, 'college_info', result.messageId, callId);
      }

      return {
        sent: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error: any) {
      console.error(`[PostCallWhatsApp] Error sending college info:`, error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send course brochure via WhatsApp
   */
  async sendCourseBrochure(
    phoneNumber: string,
    organizationId: string,
    brochureUrl: string,
    courseName: string,
    collegeName: string,
    callId?: string
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    console.log(`[PostCallWhatsApp] Sending brochure to ${phoneNumber}`);

    try {
      const whatsappService = createWhatsAppService(organizationId);
      const isConfigured = await whatsappService.isConfigured();

      if (!isConfigured) {
        return { sent: false, error: 'WhatsApp not configured' };
      }

      const message = `📄 Here's the ${courseName} brochure from ${collegeName}.\n\nFeel free to reach out if you have any questions!`;

      const result = await whatsappService.sendMessage({
        to: phoneNumber,
        message,
        mediaUrl: brochureUrl,
        mediaType: 'document',
        mediaFilename: `${courseName.replace(/\s+/g, '_')}_Brochure.pdf`,
      });

      if (result.success) {
        await this.logMessage(organizationId, phoneNumber, 'brochure', result.messageId, callId);
      }

      return {
        sent: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error: any) {
      console.error(`[PostCallWhatsApp] Error sending brochure:`, error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send follow-up message after missed call or no answer
   */
  async sendMissedCallFollowup(
    phoneNumber: string,
    organizationId: string,
    agentName: string,
    callId?: string
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    console.log(`[PostCallWhatsApp] Sending missed call follow-up to ${phoneNumber}`);

    try {
      const whatsappService = createWhatsAppService(organizationId);
      const isConfigured = await whatsappService.isConfigured();

      if (!isConfigured) {
        return { sent: false, error: 'WhatsApp not configured' };
      }

      const result = await whatsappService.sendMessage({
        to: phoneNumber,
        message: `Hi! We tried to reach you but couldn't connect. Would you like us to call you back, or can we help you over WhatsApp?\n\nBest regards,\n${agentName}`,
        templateName: 'missed_call_followup',
        templateParams: ['there', agentName],
      });

      if (result.success) {
        await this.logMessage(organizationId, phoneNumber, 'missed_call_followup', result.messageId, callId);
      }

      return {
        sent: result.success,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error: any) {
      console.error(`[PostCallWhatsApp] Error sending missed call follow-up:`, error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Get organization-specific WhatsApp config
   */
  private async getOrganizationConfig(organizationId: string): Promise<PostCallWhatsAppConfig> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });

      const settings = (org?.settings as any) || {};
      const postCallConfig = settings.postCallWhatsApp || {};

      return {
        ...this.defaultConfig,
        ...postCallConfig,
        templates: {
          ...this.defaultConfig.templates,
          ...(postCallConfig.templates || {}),
        },
      };
    } catch (error) {
      console.error('[PostCallWhatsApp] Error loading config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Build message data based on industry and call data
   */
  private async buildMessageData(call: CallData, industry: string): Promise<any> {
    const extractedData = call.extractedData || {};
    const qualification = call.qualification || {};

    switch (industry) {
      case 'EDUCATION':
        return {
          collegeName: extractedData.collegeName || qualification.collegeName || 'Our Institution',
          courseName: extractedData.course || extractedData.courseName || qualification.course || 'our programs',
          duration: extractedData.duration || qualification.duration,
          fee: extractedData.fee || qualification.fee,
          nextBatch: extractedData.nextBatch || qualification.nextBatch,
          recipientName: extractedData.firstName || qualification.name || 'there',
          agentName: call.agentName || 'Our Team',
        };

      case 'REAL_ESTATE':
        return {
          propertyName: extractedData.propertyName || qualification.property,
          location: extractedData.location || qualification.location,
          price: extractedData.price || qualification.budget,
          recipientName: extractedData.firstName || qualification.name || 'there',
          agentName: call.agentName || 'Our Team',
        };

      default:
        return {
          recipientName: extractedData.firstName || qualification.name || 'there',
          agentName: call.agentName || 'Our Team',
          summary: call.summary || 'Thank you for your interest.',
        };
    }
  }

  /**
   * Send WhatsApp message using template or fallback
   */
  private async sendWhatsAppMessage(
    whatsappService: WhatsAppService,
    phoneNumber: string,
    templateConfig: { templateName: string; fallbackMessage: string },
    messageData: any,
    call: CallData
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    // Try sending with template first
    try {
      const templateParams = this.buildTemplateParams(messageData, call.industry || 'DEFAULT');

      const result = await whatsappService.sendMessage({
        to: phoneNumber,
        message: templateConfig.fallbackMessage,
        templateName: templateConfig.templateName,
        templateParams,
      });

      if (result.success) {
        return { sent: true, messageId: result.messageId };
      }

      // If template fails, try sending plain message (only works in 24-hour window)
      console.log(`[PostCallWhatsApp] Template failed, trying fallback message`);

      const fallbackResult = await whatsappService.sendMessage({
        to: phoneNumber,
        message: this.buildFallbackMessage(messageData, call.industry || 'DEFAULT'),
      });

      return {
        sent: fallbackResult.success,
        messageId: fallbackResult.messageId,
        error: fallbackResult.error,
      };
    } catch (error: any) {
      return { sent: false, error: error.message };
    }
  }

  /**
   * Build template parameters based on industry
   */
  private buildTemplateParams(data: any, industry: string): string[] {
    switch (industry) {
      case 'EDUCATION':
        return [
          data.collegeName || 'Our Institution',
          data.recipientName || 'there',
          data.courseName || 'our programs',
          data.duration || 'Flexible duration',
          data.fee || 'Contact for details',
          data.nextBatch || 'Starting soon',
          data.collegeName || 'Our Institution',
        ];

      case 'REAL_ESTATE':
        return [
          data.recipientName || 'there',
          data.propertyName || 'our property',
          data.location || 'prime location',
          data.price || 'competitive price',
          data.agentName || 'Our Team',
        ];

      default:
        return [
          data.recipientName || 'there',
          data.agentName || 'Our Team',
        ];
    }
  }

  /**
   * Build fallback message when template is not available
   */
  private buildFallbackMessage(data: any, industry: string): string {
    switch (industry) {
      case 'EDUCATION':
        return `Hi ${data.recipientName || 'there'}! 🎓

Thank you for your interest in ${data.collegeName || 'our institution'}!

${data.courseName ? `📚 Course: ${data.courseName}` : ''}
${data.duration ? `⏱️ Duration: ${data.duration}` : ''}
${data.fee ? `💰 Fee: ${data.fee}` : ''}
${data.nextBatch ? `📅 Next Batch: ${data.nextBatch}` : ''}

Feel free to ask any questions. We're here to help!

Best regards,
${data.agentName || 'Our Team'}`;

      case 'REAL_ESTATE':
        return `Hi ${data.recipientName || 'there'}! 🏠

Thank you for your interest in ${data.propertyName || 'our properties'}!

${data.location ? `📍 Location: ${data.location}` : ''}
${data.price ? `💰 Price: ${data.price}` : ''}

Would you like to schedule a site visit? Let us know!

Best regards,
${data.agentName || 'Our Team'}`;

      default:
        return `Hi ${data.recipientName || 'there'}!

Thank you for speaking with us today. We appreciate your time!

If you have any questions, feel free to message us here.

Best regards,
${data.agentName || 'Our Team'}`;
    }
  }

  /**
   * Build college-specific fallback message
   */
  private buildCollegeFallbackMessage(info: CollegeInfo): string {
    return `Hi there! 🎓

Thank you for your interest in ${info.collegeName}!

${info.courseName ? `📚 Course: ${info.courseName}` : ''}
${info.duration ? `⏱️ Duration: ${info.duration}` : ''}
${info.fee ? `💰 Fee: ₹${info.fee}` : ''}
${info.nextBatch ? `📅 Next Batch: ${info.nextBatch}` : ''}

${info.brochureUrl ? `📄 Download brochure: ${info.brochureUrl}` : ''}
${info.websiteUrl ? `🌐 Website: ${info.websiteUrl}` : ''}

Feel free to reach out with any questions!

Best regards,
${info.counselorName || info.collegeName}
${info.contactNumber ? `📞 ${info.contactNumber}` : ''}`;
  }

  /**
   * Log WhatsApp message to database
   */
  private async logWhatsAppMessage(call: CallData, result: { sent: boolean; messageId?: string; error?: string }) {
    try {
      await prisma.whatsappLog.create({
        data: {
          leadId: null, // Will be linked if lead exists
          phone: call.phoneNumber,
          message: `Post-call WhatsApp - ${call.industry || 'General'}`,
          direction: 'OUTBOUND',
          status: result.sent ? 'SENT' : 'FAILED',
          providerMsgId: result.messageId,
          sentAt: result.sent ? new Date() : null,
        },
      });
    } catch (error) {
      console.error('[PostCallWhatsApp] Error logging message:', error);
    }
  }

  /**
   * Log message to database
   */
  private async logMessage(
    organizationId: string,
    phoneNumber: string,
    messageType: string,
    messageId?: string,
    callId?: string
  ) {
    try {
      await prisma.whatsappLog.create({
        data: {
          phone: phoneNumber,
          message: `Post-call: ${messageType}`,
          direction: 'OUTBOUND',
          status: messageId ? 'SENT' : 'FAILED',
          providerMsgId: messageId,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[PostCallWhatsApp] Error logging message:', error);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const postCallWhatsAppService = new PostCallWhatsAppService();
export default postCallWhatsAppService;
