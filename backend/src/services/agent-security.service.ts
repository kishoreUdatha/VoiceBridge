/**
 * Agent Security Service
 * Enforces security settings for voice agents
 */

import { prisma } from '../config/database';
import { VoiceAgent } from '@prisma/client';
import OpenAI from 'openai';
import { config } from '../config';

// OpenAI client for moderation API
const openai = config.openai?.apiKey
  ? new OpenAI({ apiKey: config.openai.apiKey })
  : null;

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore: Map<string, { count: number; resetAt: Date }> = new Map();

export interface SecurityCheckResult {
  allowed: boolean;
  error?: string;
  errorCode?: 'AUTH_REQUIRED' | 'RATE_LIMITED' | 'IP_BLOCKED' | 'DOMAIN_BLOCKED' | 'CONTENT_BLOCKED';
}

export interface SecurityContext {
  ipAddress?: string;
  domain?: string;
  userId?: string;
  sessionToken?: string;
  isAuthenticated?: boolean;
}

class AgentSecurityService {
  /**
   * Perform all security checks for an agent
   */
  async checkSecurity(
    agent: VoiceAgent,
    context: SecurityContext
  ): Promise<SecurityCheckResult> {
    // Check authentication if required
    if (agent.authenticationRequired && !context.isAuthenticated) {
      return {
        allowed: false,
        error: 'Authentication required to use this agent',
        errorCode: 'AUTH_REQUIRED',
      };
    }

    // Check IP whitelist
    const ipWhitelist = (agent.ipWhitelist as string[]) || [];
    if (ipWhitelist.length > 0 && context.ipAddress) {
      if (!this.isIpAllowed(context.ipAddress, ipWhitelist)) {
        return {
          allowed: false,
          error: 'Your IP address is not authorized to access this agent',
          errorCode: 'IP_BLOCKED',
        };
      }
    }

    // Check domain whitelist (for widget embedding)
    const allowedDomains = (agent.allowedDomains as string[]) || [];
    if (allowedDomains.length > 0 && context.domain) {
      if (!this.isDomainAllowed(context.domain, allowedDomains)) {
        return {
          allowed: false,
          error: 'This domain is not authorized to embed this agent',
          errorCode: 'DOMAIN_BLOCKED',
        };
      }
    }

    // Check rate limiting
    if (agent.rateLimitingEnabled) {
      const rateLimitKey = this.getRateLimitKey(agent.id, context);
      const isAllowed = this.checkRateLimit(
        rateLimitKey,
        agent.rateLimitRequests,
        agent.rateLimitBurst
      );
      if (!isAllowed) {
        return {
          allowed: false,
          error: 'Rate limit exceeded. Please try again later.',
          errorCode: 'RATE_LIMITED',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if content passes content filtering
   * Uses OpenAI Moderation API for accurate detection, with regex fallback
   */
  async checkContent(
    agent: VoiceAgent,
    content: string
  ): Promise<SecurityCheckResult> {
    if (!agent.contentFilteringEnabled) {
      return { allowed: true };
    }

    const categories = (agent.contentFilterCategories as string[]) || [];
    const lowerContent = content.toLowerCase();

    // First, try OpenAI Moderation API for accurate ML-based filtering
    if (openai) {
      try {
        const moderation = await openai.moderations.create({
          input: content,
        });

        const result = moderation.results[0];
        if (result.flagged) {
          // Map OpenAI categories to our categories
          const flaggedCategories: string[] = [];

          if (result.categories.sexual || result.categories['sexual/minors']) {
            flaggedCategories.push('sexual');
          }
          if (result.categories.hate || result.categories['hate/threatening']) {
            if (categories.includes('hate_speech')) {
              return {
                allowed: false,
                error: 'Content contains hate speech',
                errorCode: 'CONTENT_BLOCKED',
              };
            }
            flaggedCategories.push('hate');
          }
          if (result.categories.violence || result.categories['violence/graphic']) {
            if (categories.includes('violence')) {
              return {
                allowed: false,
                error: 'Content contains violent language',
                errorCode: 'CONTENT_BLOCKED',
              };
            }
            flaggedCategories.push('violence');
          }
          if (result.categories.harassment || result.categories['harassment/threatening']) {
            if (categories.includes('harassment') || categories.includes('profanity')) {
              return {
                allowed: false,
                error: 'Content contains harassment or inappropriate language',
                errorCode: 'CONTENT_BLOCKED',
              };
            }
            flaggedCategories.push('harassment');
          }
          if (result.categories['self-harm'] || result.categories['self-harm/intent'] || result.categories['self-harm/instructions']) {
            flaggedCategories.push('self-harm');
          }

          // Log the flagged content for review
          console.log(`[AgentSecurity] Content flagged by OpenAI moderation:`, {
            agentId: agent.id,
            categories: flaggedCategories,
            contentPreview: content.substring(0, 50),
          });
        }

        return { allowed: true };
      } catch (error) {
        console.error('[AgentSecurity] OpenAI moderation API error, falling back to regex:', error);
        // Fall through to regex-based filtering
      }
    }

    // Fallback: Simple keyword-based filtering
    const profanityPatterns = /\b(fuck|shit|damn|ass|bitch|bastard|crap|hell)\b/i;
    const violencePatterns = /\b(kill|murder|attack|bomb|shoot|stab|hurt|destroy|die)\b/i;
    const hatePatterns = /\b(hate|racist|sexist|homophobic|slur|discrimination)\b/i;

    if (categories.includes('profanity') && profanityPatterns.test(lowerContent)) {
      return {
        allowed: false,
        error: 'Content contains inappropriate language',
        errorCode: 'CONTENT_BLOCKED',
      };
    }

    if (categories.includes('violence') && violencePatterns.test(lowerContent)) {
      return {
        allowed: false,
        error: 'Content contains violent language',
        errorCode: 'CONTENT_BLOCKED',
      };
    }

    if (categories.includes('hate_speech') && hatePatterns.test(lowerContent)) {
      return {
        allowed: false,
        error: 'Content contains hate speech',
        errorCode: 'CONTENT_BLOCKED',
      };
    }

    return { allowed: true };
  }

  /**
   * Check if IP is in whitelist (supports CIDR notation)
   */
  private isIpAllowed(ip: string, whitelist: string[]): boolean {
    for (const allowed of whitelist) {
      if (allowed === ip) return true;
      // Support CIDR notation (e.g., 192.168.1.0/24)
      if (allowed.includes('/')) {
        if (this.isIpInCidr(ip, allowed)) return true;
      }
      // Support wildcard (e.g., 192.168.1.*)
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '\\d+');
        if (new RegExp(`^${pattern}$`).test(ip)) return true;
      }
    }
    return false;
  }

  /**
   * Check if IP is in CIDR range
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    const ipInt = this.ipToInt(ip);
    const rangeInt = this.ipToInt(range);
    return (ipInt & mask) === (rangeInt & mask);
  }

  /**
   * Convert IP to integer
   */
  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Check if domain is allowed
   */
  private isDomainAllowed(domain: string, allowedDomains: string[]): boolean {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    for (const allowed of allowedDomains) {
      const normalizedAllowed = allowed.toLowerCase().replace(/^www\./, '');
      // Exact match
      if (normalizedDomain === normalizedAllowed) return true;
      // Wildcard subdomain (e.g., *.example.com)
      if (normalizedAllowed.startsWith('*.')) {
        const baseDomain = normalizedAllowed.slice(2);
        if (normalizedDomain === baseDomain || normalizedDomain.endsWith('.' + baseDomain)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get rate limit key for a request
   */
  private getRateLimitKey(agentId: string, context: SecurityContext): string {
    // Use userId if authenticated, otherwise use IP
    if (context.userId) {
      return `rate:${agentId}:user:${context.userId}`;
    }
    return `rate:${agentId}:ip:${context.ipAddress || 'unknown'}`;
  }

  /**
   * Check rate limit using sliding window
   */
  private checkRateLimit(key: string, maxRequests: number, burstLimit: number): boolean {
    const now = new Date();
    const windowMs = 60000; // 1 minute window

    let entry = rateLimitStore.get(key);
    if (!entry || entry.resetAt < now) {
      // Start new window
      entry = { count: 1, resetAt: new Date(now.getTime() + windowMs) };
      rateLimitStore.set(key, entry);
      return true;
    }

    // Check burst limit (immediate requests)
    if (entry.count >= burstLimit) {
      return false;
    }

    // Check rate limit
    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(agentId: string, context: SecurityContext): void {
    const key = this.getRateLimitKey(agentId, context);
    const now = new Date();
    const windowMs = 60000;

    let entry = rateLimitStore.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 1, resetAt: new Date(now.getTime() + windowMs) };
    } else {
      entry.count++;
    }
    rateLimitStore.set(key, entry);
  }

  /**
   * Get agent security settings
   */
  async getSecuritySettings(agentId: string) {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      select: {
        authenticationRequired: true,
        rateLimitingEnabled: true,
        rateLimitRequests: true,
        rateLimitBurst: true,
        contentFilteringEnabled: true,
        contentFilterCategories: true,
        dataRetentionDays: true,
        anonymizeUserData: true,
        gdprComplianceEnabled: true,
        allowedDomains: true,
        ipWhitelist: true,
        sessionTimeoutMinutes: true,
      },
    });
    return agent;
  }

  /**
   * Calculate security score for an agent
   */
  calculateSecurityScore(agent: VoiceAgent): number {
    let score = 0;
    const maxScore = 100;

    // Authentication (20 points)
    if (agent.authenticationRequired) score += 20;

    // Rate limiting (20 points)
    if (agent.rateLimitingEnabled) score += 20;

    // Content filtering (20 points)
    if (agent.contentFilteringEnabled) score += 20;

    // GDPR compliance (15 points)
    if (agent.gdprComplianceEnabled) score += 15;

    // Data anonymization (10 points)
    if (agent.anonymizeUserData) score += 10;

    // IP/Domain restrictions (10 points)
    const ipWhitelist = (agent.ipWhitelist as string[]) || [];
    const allowedDomains = (agent.allowedDomains as string[]) || [];
    if (ipWhitelist.length > 0 || allowedDomains.length > 0) score += 10;

    // Data retention (5 points for <= 90 days)
    if (agent.dataRetentionDays <= 90) score += 5;

    return Math.min(score, maxScore);
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimitStore(): void {
    const now = new Date();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

export const agentSecurityService = new AgentSecurityService();

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  agentSecurityService.cleanupRateLimitStore();
}, 5 * 60 * 1000);
