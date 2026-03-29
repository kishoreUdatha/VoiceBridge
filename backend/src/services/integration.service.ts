/**
 * Integration Service
 * Handles OAuth flows, API calls, and integration management for Voice AI agents
 */

import { prisma } from '../config/database';
import axios from 'axios';
import * as crypto from 'crypto';


// Encryption key for storing sensitive credentials
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32char!!';
const IV_LENGTH = 16;

// ==================== ENCRYPTION HELPERS ====================

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// ==================== CALENDAR INTEGRATION ====================

export const calendarService = {
  // Get OAuth URL for Google Calendar
  getGoogleAuthUrl(organizationId: string, redirectUri: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
    const state = Buffer.from(JSON.stringify({ organizationId, provider: 'google' })).toString('base64');

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
  },

  // Get OAuth URL for Outlook Calendar
  getOutlookAuthUrl(organizationId: string, redirectUri: string): string {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const scope = encodeURIComponent('Calendars.ReadWrite offline_access');
    const state = Buffer.from(JSON.stringify({ organizationId, provider: 'outlook' })).toString('base64');

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
  },

  // Handle OAuth callback and store tokens
  async handleOAuthCallback(code: string, provider: 'GOOGLE' | 'OUTLOOK', organizationId: string, redirectUri: string) {
    let tokenData: any;

    if (provider === 'GOOGLE') {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
      tokenData = response.data;
    } else if (provider === 'OUTLOOK') {
      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        code,
        client_id: process.env.OUTLOOK_CLIENT_ID,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
      tokenData = response.data;
    }

    // Store the integration
    const integration = await prisma.calendarIntegration.upsert({
      where: {
        organizationId_userId_provider: {
          organizationId,
          userId: null as any,
          provider,
        },
      },
      create: {
        organizationId,
        provider,
        accessToken: encrypt(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
        tokenExpiry: new Date(Date.now() + (tokenData.expires_in * 1000)),
        isActive: true,
      },
      update: {
        accessToken: encrypt(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined,
        tokenExpiry: new Date(Date.now() + (tokenData.expires_in * 1000)),
        isActive: true,
      },
    });

    return integration;
  },

  // Get available calendar slots
  async getAvailableSlots(integrationId: string, date: Date, duration: number = 30) {
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.accessToken) {
      throw new Error('Calendar not connected');
    }

    const accessToken = decrypt(integration.accessToken);

    // Refresh token if expired
    if (integration.tokenExpiry && new Date() > integration.tokenExpiry) {
      await this.refreshToken(integrationId);
    }

    if (integration.provider === 'GOOGLE') {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await axios.get('https://www.googleapis.com/calendar/v3/freeBusy', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          items: [{ id: integration.calendarId || 'primary' }],
        },
      });

      // Parse busy times and return available slots
      const busyTimes = response.data.calendars[integration.calendarId || 'primary'].busy || [];
      return this.calculateAvailableSlots(startOfDay, endOfDay, busyTimes, duration);
    }

    return [];
  },

  // Book an appointment
  async bookAppointment(integrationId: string, details: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail?: string;
    attendeeName?: string;
  }) {
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.accessToken) {
      throw new Error('Calendar not connected');
    }

    const accessToken = decrypt(integration.accessToken);

    if (integration.provider === 'GOOGLE') {
      const event = {
        summary: details.title,
        description: details.description,
        start: { dateTime: details.startTime.toISOString() },
        end: { dateTime: details.endTime.toISOString() },
        attendees: details.attendeeEmail ? [{ email: details.attendeeEmail }] : [],
      };

      const response = await axios.post(
        `https://www.googleapis.com/calendar/v3/calendars/${integration.calendarId || 'primary'}/events`,
        event,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      return response.data;
    }

    return null;
  },

  // Refresh access token
  async refreshToken(integrationId: string) {
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.refreshToken) {
      throw new Error('No refresh token available');
    }

    const refreshToken = decrypt(integration.refreshToken);
    let tokenData: any;

    if (integration.provider === 'GOOGLE') {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      });
      tokenData = response.data;
    }

    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: encrypt(tokenData.access_token),
        tokenExpiry: new Date(Date.now() + (tokenData.expires_in * 1000)),
      },
    });
  },

  // Helper to calculate available slots
  calculateAvailableSlots(startTime: Date, endTime: Date, busyTimes: any[], duration: number) {
    const slots: { start: Date; end: Date }[] = [];
    const workStart = 9; // 9 AM
    const workEnd = 18; // 6 PM

    let current = new Date(startTime);
    current.setHours(workStart, 0, 0, 0);

    const dayEnd = new Date(startTime);
    dayEnd.setHours(workEnd, 0, 0, 0);

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + duration * 60000);

      // Check if slot conflicts with any busy time
      const isAvailable = !busyTimes.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return current < busyEnd && slotEnd > busyStart;
      });

      if (isAvailable && slotEnd <= dayEnd) {
        slots.push({ start: new Date(current), end: slotEnd });
      }

      current = new Date(current.getTime() + 30 * 60000); // 30-minute intervals
    }

    return slots;
  },
};

// ==================== CRM INTEGRATION ====================

export const crmService = {
  // Lookup lead by phone in external CRM
  async lookupLead(integrationId: string, phone: string) {
    const integration = await prisma.crmIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.isActive) {
      return null;
    }

    if (integration.type === 'SALESFORCE') {
      return this.salesforceLookup(integration, phone);
    } else if (integration.type === 'HUBSPOT') {
      return this.hubspotLookup(integration, phone);
    } else if (integration.type === 'CUSTOM') {
      return this.customCrmLookup(integration, phone);
    }

    return null;
  },

  async salesforceLookup(integration: any, phone: string) {
    // Salesforce SOQL query to find lead/contact by phone
    const accessToken = integration.accessToken ? decrypt(integration.accessToken) : null;
    if (!accessToken) return null;

    try {
      const query = encodeURIComponent(`SELECT Id, Name, Phone, Email, Company FROM Lead WHERE Phone = '${phone}'`);
      const response = await axios.get(
        `${integration.instanceUrl}/services/data/v57.0/query?q=${query}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.data.records && response.data.records.length > 0) {
        return response.data.records[0];
      }
    } catch (error) {
      console.error('Salesforce lookup error:', error);
    }
    return null;
  },

  async hubspotLookup(integration: any, phone: string) {
    const apiKey = integration.apiKey ? decrypt(integration.apiKey) : null;
    if (!apiKey) return null;

    try {
      const response = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          filterGroups: [{
            filters: [{ propertyName: 'phone', operator: 'EQ', value: phone }]
          }]
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0];
      }
    } catch (error) {
      console.error('HubSpot lookup error:', error);
    }
    return null;
  },

  async customCrmLookup(integration: any, phone: string) {
    if (!integration.webhookUrl) return null;

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (integration.apiKey) {
        headers['Authorization'] = `Bearer ${decrypt(integration.apiKey)}`;
      }

      const response = await axios.post(integration.webhookUrl, { phone, action: 'lookup' }, { headers });
      return response.data;
    } catch (error) {
      console.error('Custom CRM lookup error:', error);
    }
    return null;
  },

  // Create lead in external CRM
  async createLead(integrationId: string, leadData: any) {
    const integration = await prisma.crmIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.isActive) {
      return null;
    }

    if (integration.type === 'HUBSPOT') {
      return this.hubspotCreateLead(integration, leadData);
    } else if (integration.type === 'CUSTOM') {
      return this.customCrmCreateLead(integration, leadData);
    }

    return null;
  },

  async hubspotCreateLead(integration: any, leadData: any) {
    const apiKey = integration.apiKey ? decrypt(integration.apiKey) : null;
    if (!apiKey) return null;

    try {
      const response = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        {
          properties: {
            firstname: leadData.firstName,
            lastname: leadData.lastName,
            phone: leadData.phone,
            email: leadData.email,
            company: leadData.company,
          }
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      return response.data;
    } catch (error) {
      console.error('HubSpot create lead error:', error);
    }
    return null;
  },

  async customCrmCreateLead(integration: any, leadData: any) {
    if (!integration.webhookUrl) return null;

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (integration.apiKey) {
        headers['Authorization'] = `Bearer ${decrypt(integration.apiKey)}`;
      }

      const response = await axios.post(
        integration.webhookUrl,
        { ...leadData, action: 'create' },
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Custom CRM create lead error:', error);
    }
    return null;
  },
};

// ==================== PAYMENT INTEGRATION ====================

export const paymentService = {
  // Create payment link
  async createPaymentLink(integrationId: string, details: {
    amount: number;
    currency: string;
    description: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
  }) {
    const integration = await prisma.paymentIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration || !integration.isConnected) {
      throw new Error('Payment integration not connected');
    }

    if (integration.provider === 'RAZORPAY') {
      return this.createRazorpayLink(integration, details);
    } else if (integration.provider === 'STRIPE') {
      return this.createStripeLink(integration, details);
    }

    return null;
  },

  async createRazorpayLink(integration: any, details: any) {
    const apiKey = integration.apiKey ? decrypt(integration.apiKey) : null;
    const apiSecret = integration.apiSecret ? decrypt(integration.apiSecret) : null;

    if (!apiKey || !apiSecret) {
      throw new Error('Razorpay credentials not configured');
    }

    try {
      const response = await axios.post(
        'https://api.razorpay.com/v1/payment_links',
        {
          amount: details.amount * 100, // Razorpay uses paise
          currency: details.currency || 'INR',
          description: details.description,
          customer: {
            name: details.customerName,
            contact: details.customerPhone,
            email: details.customerEmail,
          },
          notify: { sms: true, email: !!details.customerEmail },
          callback_url: `${process.env.APP_URL}/api/integrations/payment/callback`,
          callback_method: 'get',
        },
        {
          auth: { username: apiKey, password: apiSecret },
        }
      );

      return {
        paymentLinkId: response.data.id,
        shortUrl: response.data.short_url,
        amount: details.amount,
        currency: details.currency,
      };
    } catch (error: any) {
      console.error('Razorpay create link error:', error.response?.data || error);
      throw new Error('Failed to create payment link');
    }
  },

  async createStripeLink(integration: any, details: any) {
    const apiKey = integration.apiKey ? decrypt(integration.apiKey) : null;

    if (!apiKey) {
      throw new Error('Stripe credentials not configured');
    }

    try {
      const stripe = require('stripe')(apiKey);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: details.currency?.toLowerCase() || 'inr',
            product_data: { name: details.description },
            unit_amount: details.amount * 100,
          },
          quantity: 1,
        }],
        mode: 'payment',
        customer_email: details.customerEmail,
        success_url: `${process.env.APP_URL}/payment/success`,
        cancel_url: `${process.env.APP_URL}/payment/cancel`,
      });

      return {
        paymentLinkId: session.id,
        shortUrl: session.url,
        amount: details.amount,
        currency: details.currency,
      };
    } catch (error) {
      console.error('Stripe create link error:', error);
      throw new Error('Failed to create payment link');
    }
  },

  // Verify webhook signature
  verifyRazorpayWebhook(body: any, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
    return signature === expectedSignature;
  },
};

// ==================== CUSTOM API INTEGRATION ====================

export const customApiService = {
  // Call custom API endpoint
  async callEndpoint(endpointId: string, data: any) {
    const endpoint = await prisma.customApiEndpoint.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint || !endpoint.isActive) {
      return null;
    }

    try {
      const headers: any = { 'Content-Type': 'application/json', ...(endpoint.headers as Record<string, string> || {}) };

      if (endpoint.authType === 'bearer' && endpoint.authValue) {
        headers['Authorization'] = `Bearer ${decrypt(endpoint.authValue)}`;
      } else if (endpoint.authType === 'api_key' && endpoint.authValue) {
        headers['X-API-Key'] = decrypt(endpoint.authValue);
      }

      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(endpoint.url, { headers, params: data });
      } else {
        response = await axios.post(endpoint.url, data, { headers });
      }

      // Update call stats
      await prisma.customApiEndpoint.update({
        where: { id: endpointId },
        data: {
          lastCalledAt: new Date(),
          callCount: { increment: 1 },
          lastError: null,
        },
      });

      return response.data;
    } catch (error: any) {
      // Log error
      await prisma.customApiEndpoint.update({
        where: { id: endpointId },
        data: {
          lastCalledAt: new Date(),
          lastError: error.message,
        },
      });
      throw error;
    }
  },

  // Get endpoints for a trigger
  async getEndpointsForTrigger(voiceAgentId: string, trigger: string) {
    return prisma.customApiEndpoint.findMany({
      where: {
        voiceAgentId,
        trigger,
        isActive: true,
      },
    });
  },
};

// ==================== AGENT INTEGRATION MANAGER ====================

export const agentIntegrationService = {
  // Get all integrations for an agent
  async getAgentIntegrations(voiceAgentId: string) {
    return prisma.agentIntegration.findMany({
      where: { voiceAgentId },
      include: {
        calendarIntegration: true,
        crmIntegration: true,
        paymentIntegration: true,
      },
    });
  },

  // Enable/disable integration for agent
  async toggleIntegration(voiceAgentId: string, integrationType: string, enabled: boolean, config?: any) {
    const existing = await prisma.agentIntegration.findUnique({
      where: {
        voiceAgentId_integrationType: {
          voiceAgentId,
          integrationType: integrationType as any,
        },
      },
    });

    if (existing) {
      return prisma.agentIntegration.update({
        where: { id: existing.id },
        data: { isEnabled: enabled, config: config || existing.config },
      });
    }

    // Get agent to get organizationId
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: voiceAgentId },
    });

    if (!agent) throw new Error('Agent not found');

    return prisma.agentIntegration.create({
      data: {
        voiceAgentId,
        organizationId: agent.organizationId,
        integrationType: integrationType as any,
        isEnabled: enabled,
        config: config || {},
      },
    });
  },

  // Link an integration to an agent
  async linkIntegration(voiceAgentId: string, integrationType: string, integrationId: string, config?: any) {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: voiceAgentId },
    });

    if (!agent) throw new Error('Agent not found');

    const data: any = {
      voiceAgentId,
      organizationId: agent.organizationId,
      integrationType: integrationType as any,
      isEnabled: true,
      config: config || {},
    };

    if (integrationType === 'CALENDAR') {
      data.calendarIntegrationId = integrationId;
    } else if (integrationType === 'CRM') {
      data.crmIntegrationId = integrationId;
    } else if (integrationType === 'PAYMENT') {
      data.paymentIntegrationId = integrationId;
    }

    return prisma.agentIntegration.upsert({
      where: {
        voiceAgentId_integrationType: {
          voiceAgentId,
          integrationType: integrationType as any,
        },
      },
      create: data,
      update: data,
    });
  },
};

export default {
  calendar: calendarService,
  crm: crmService,
  payment: paymentService,
  customApi: customApiService,
  agentIntegration: agentIntegrationService,
  encrypt,
  decrypt,
};
