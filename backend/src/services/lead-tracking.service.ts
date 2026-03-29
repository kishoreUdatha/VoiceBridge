import { prisma } from '../config/database';
import crypto from 'crypto';
import { adInteractionService } from './ad-interaction.service';


// Lead sources
export const LEAD_SOURCES = {
  FACEBOOK_AD: 'facebook_ad',
  INSTAGRAM_AD: 'instagram_ad',
  YOUTUBE_AD: 'youtube_ad',
  GOOGLE_AD: 'google_ad',
  LANDING_PAGE: 'landing_page',
  WEBSITE: 'website',
  TRACKING_PIXEL: 'tracking_pixel',
  FORM_EMBED: 'form_embed',
  MANUAL: 'manual',
  API: 'api',
} as const;

interface TrackingData {
  visitorId?: string;
  organizationId: string;
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPage?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  country?: string;
  city?: string;
  // Ad click IDs
  gclid?: string;
  fbclid?: string;
  utmId?: string;
}

interface CaptureLeadParams {
  organizationId: string;
  source: string;
  // Contact info
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  // UTM params
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  // Additional data
  referrer?: string;
  landingPage?: string;
  formId?: string;
  adId?: string;
  adSetId?: string;
  campaignId?: string;
  customFields?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  // For ad interaction linking
  visitorId?: string;
  gclid?: string;
  fbclid?: string;
}

interface FacebookLeadData {
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      field: string;
      value: {
        form_id: string;
        leadgen_id: string;
        created_time: number;
        page_id: string;
        ad_id?: string;
        adgroup_id?: string;
        campaign_id?: string;
      };
    }>;
  }>;
}

class LeadTrackingService {
  /**
   * Generate a unique visitor ID
   */
  generateVisitorId(): string {
    return 'vid_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return 'sid_' + crypto.randomBytes(12).toString('hex') + '_' + Date.now().toString(36);
  }

  /**
   * Generate enhanced tracking pixel with engagement tracking
   * Includes: scroll depth, time on page, video interactions, session management
   */
  generateEnhancedTrackingPixel(organizationId: string, baseUrl: string): string {
    const pixelCode = `
<!-- CRM Enhanced Lead Tracking Pixel -->
<script>
(function() {
  var orgId = '${organizationId}';
  var endpoint = '${baseUrl}/api/tracking';

  // Generate or get visitor ID
  var visitorId = localStorage.getItem('crm_vid');
  if (!visitorId) {
    visitorId = 'vid_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('crm_vid', visitorId);
  }

  // Generate session ID (new for each page load/tab)
  var sessionId = 'sid_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

  // Get UTM params and ad click IDs
  var params = new URLSearchParams(window.location.search);
  var trackingData = {
    organizationId: orgId,
    visitorId: visitorId,
    sessionId: sessionId,
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    content: params.get('utm_content') || '',
    term: params.get('utm_term') || '',
    utmId: params.get('utm_id') || '',
    gclid: params.get('gclid') || '',
    fbclid: params.get('fbclid') || '',
    ttclid: params.get('ttclid') || '',
    twclid: params.get('twclid') || '',
    liclid: params.get('li_fat_id') || '',
    referrer: document.referrer,
    landingPage: window.location.href,
    userAgent: navigator.userAgent
  };

  // Store click IDs for form submissions
  if (trackingData.gclid || trackingData.fbclid || trackingData.ttclid || trackingData.twclid) {
    sessionStorage.setItem('crm_utm', JSON.stringify(trackingData));
  }

  // Track initial page view / impression
  var img = new Image();
  img.src = endpoint + '/pixel?data=' + encodeURIComponent(JSON.stringify(trackingData));

  // ==================== ENGAGEMENT TRACKING ====================

  // Track scroll depth
  var scrollMilestones = [25, 50, 75, 100];
  var scrollReported = {};

  function getScrollPercent() {
    var h = document.documentElement,
        b = document.body,
        st = 'scrollTop',
        sh = 'scrollHeight';
    return Math.round((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight) * 100);
  }

  function checkScroll() {
    var percent = getScrollPercent();
    for (var i = 0; i < scrollMilestones.length; i++) {
      var milestone = scrollMilestones[i];
      if (percent >= milestone && !scrollReported[milestone]) {
        scrollReported[milestone] = true;
        sendEngagement({ scrollDepth: milestone });
      }
    }
  }

  window.addEventListener('scroll', (function() {
    var timeout;
    return function() {
      clearTimeout(timeout);
      timeout = setTimeout(checkScroll, 100);
    };
  })());

  // Track time on page
  var startTime = Date.now();
  var timeCheckpoints = [15, 30, 60, 120, 300]; // seconds
  var timeReported = {};

  setInterval(function() {
    var seconds = Math.floor((Date.now() - startTime) / 1000);
    for (var i = 0; i < timeCheckpoints.length; i++) {
      var checkpoint = timeCheckpoints[i];
      if (seconds >= checkpoint && !timeReported[checkpoint]) {
        timeReported[checkpoint] = true;
        sendEngagement({ timeOnPage: checkpoint });
      }
    }
  }, 5000);

  // Track video interactions (YouTube, TikTok embeds, HTML5 video)
  function trackVideos() {
    // Track HTML5 videos
    document.querySelectorAll('video').forEach(function(video) {
      if (video.dataset.crmTracked) return;
      video.dataset.crmTracked = 'true';

      var videoStarted = false;
      var videoMilestones = [25, 50, 75, 100];
      var videoReported = {};

      video.addEventListener('play', function() {
        if (!videoStarted) {
          videoStarted = true;
          sendEngagement({ videoEvent: 'start', videoId: video.id || 'html5-video' });
        }
      });

      video.addEventListener('timeupdate', function() {
        if (video.duration > 0) {
          var percent = Math.floor((video.currentTime / video.duration) * 100);
          for (var i = 0; i < videoMilestones.length; i++) {
            var milestone = videoMilestones[i];
            if (percent >= milestone && !videoReported[milestone]) {
              videoReported[milestone] = true;
              sendEngagement({
                videoWatchTime: Math.floor(video.currentTime),
                videoPercentage: milestone,
                videoId: video.id || 'html5-video'
              });
            }
          }
        }
      });

      video.addEventListener('ended', function() {
        sendEngagement({ videoEvent: 'complete', videoId: video.id || 'html5-video' });
      });
    });

    // Track YouTube embeds
    if (window.YT && window.YT.Player) {
      document.querySelectorAll('iframe[src*="youtube.com"]').forEach(function(iframe) {
        if (iframe.dataset.crmTracked) return;
        iframe.dataset.crmTracked = 'true';
        // YouTube tracking requires iframe API - notify of presence
        sendEngagement({ videoDetected: 'youtube', videoId: iframe.src });
      });
    }
  }

  // Run video tracking on load and mutations
  trackVideos();
  var observer = new MutationObserver(trackVideos);
  observer.observe(document.body, { childList: true, subtree: true });

  // Send engagement event
  function sendEngagement(data) {
    var payload = Object.assign({}, trackingData, data);
    navigator.sendBeacon ?
      navigator.sendBeacon(endpoint + '/impression', JSON.stringify(payload)) :
      fetch(endpoint + '/impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
  }

  // Send final engagement data on page unload
  window.addEventListener('beforeunload', function() {
    var finalData = {
      type: 'session_end',
      timeOnPage: Math.floor((Date.now() - startTime) / 1000),
      scrollDepth: getScrollPercent(),
      finalUrl: window.location.href
    };
    sendEngagement(finalData);
  });

  // ==================== LEAD CAPTURE ====================

  // Expose enhanced lead capture function
  window.CRMCaptureLead = function(leadData) {
    var utm = JSON.parse(sessionStorage.getItem('crm_utm') || '{}');
    var payload = Object.assign({}, leadData, {
      organizationId: orgId,
      visitorId: visitorId,
      sessionId: sessionId,
      utmSource: utm.source,
      utmMedium: utm.medium,
      utmCampaign: utm.campaign,
      utmContent: utm.content,
      utmTerm: utm.term,
      gclid: utm.gclid,
      fbclid: utm.fbclid,
      ttclid: utm.ttclid,
      twclid: utm.twclid,
      referrer: document.referrer,
      landingPage: window.location.href,
      timeOnPage: Math.floor((Date.now() - startTime) / 1000),
      scrollDepth: getScrollPercent()
    });

    return fetch(endpoint + '/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r) { return r.json(); });
  };

  // Auto-capture forms with data-crm-capture attribute
  document.querySelectorAll('form[data-crm-capture]').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      var formData = new FormData(form);
      var data = {};
      formData.forEach(function(value, key) { data[key] = value; });
      window.CRMCaptureLead(data);
    });
  });
})();
</script>
<!-- End CRM Enhanced Lead Tracking Pixel -->`;

    return pixelCode;
  }

  /**
   * Generate tracking pixel code for an organization
   */
  generateTrackingPixel(organizationId: string, baseUrl: string): string {
    const pixelCode = `
<!-- CRM Lead Tracking Pixel -->
<script>
(function() {
  var orgId = '${organizationId}';
  var endpoint = '${baseUrl}/api/tracking/pixel';

  // Generate or get visitor ID
  var visitorId = localStorage.getItem('crm_vid');
  if (!visitorId) {
    visitorId = 'vid_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('crm_vid', visitorId);
  }

  // Get UTM params and ad click IDs
  var params = new URLSearchParams(window.location.search);
  var utmSource = params.get('utm_source') || '';
  var utmMedium = params.get('utm_medium') || '';
  var utmCampaign = params.get('utm_campaign') || '';
  var utmContent = params.get('utm_content') || '';
  var utmTerm = params.get('utm_term') || '';
  var utmId = params.get('utm_id') || '';
  var gclid = params.get('gclid') || '';
  var fbclid = params.get('fbclid') || '';

  // Track page view
  var data = {
    organizationId: orgId,
    visitorId: visitorId,
    source: utmSource || 'direct',
    medium: utmMedium,
    campaign: utmCampaign,
    content: utmContent,
    term: utmTerm,
    referrer: document.referrer,
    landingPage: window.location.href,
    userAgent: navigator.userAgent,
    gclid: gclid,
    fbclid: fbclid,
    utmId: utmId
  };

  // Send tracking data
  var img = new Image();
  img.src = endpoint + '?data=' + encodeURIComponent(JSON.stringify(data));

  // Store UTM params and click IDs for form submissions
  if (utmSource || gclid || fbclid) sessionStorage.setItem('crm_utm', JSON.stringify({
    source: utmSource, medium: utmMedium, campaign: utmCampaign, content: utmContent, term: utmTerm,
    gclid: gclid, fbclid: fbclid, utmId: utmId
  }));

  // Expose lead capture function
  window.CRMCaptureLead = function(leadData) {
    var utm = JSON.parse(sessionStorage.getItem('crm_utm') || '{}');
    var payload = Object.assign({}, leadData, {
      organizationId: orgId,
      visitorId: visitorId,
      utmSource: utm.source,
      utmMedium: utm.medium,
      utmCampaign: utm.campaign,
      utmContent: utm.content,
      utmTerm: utm.term,
      gclid: utm.gclid,
      fbclid: utm.fbclid,
      referrer: document.referrer,
      landingPage: window.location.href
    });

    return fetch('${baseUrl}/api/tracking/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r) { return r.json(); });
  };
})();
</script>
<!-- End CRM Lead Tracking Pixel -->`;

    return pixelCode;
  }

  /**
   * Generate embeddable lead capture form
   */
  generateLeadCaptureForm(organizationId: string, baseUrl: string, options: {
    title?: string;
    fields?: string[];
    buttonText?: string;
    successMessage?: string;
    theme?: 'light' | 'dark';
  } = {}): string {
    const {
      title = 'Get in Touch',
      fields = ['firstName', 'lastName', 'email', 'phone'],
      buttonText = 'Submit',
      successMessage = 'Thank you! We will contact you soon.',
      theme = 'light',
    } = options;

    const formCode = `
<!-- CRM Lead Capture Form -->
<div id="crm-lead-form-${organizationId}" class="crm-lead-form crm-theme-${theme}">
  <style>
    .crm-lead-form { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 24px; border-radius: 12px; }
    .crm-theme-light { background: #fff; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .crm-theme-dark { background: #1f2937; color: #fff; }
    .crm-lead-form h3 { margin: 0 0 20px; font-size: 24px; font-weight: 600; }
    .crm-lead-form input { width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    .crm-theme-dark input { background: #374151; border-color: #4b5563; color: #fff; }
    .crm-lead-form button { width: 100%; padding: 14px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
    .crm-lead-form button:hover { background: #1d4ed8; }
    .crm-lead-form button:disabled { background: #9ca3af; cursor: not-allowed; }
    .crm-lead-form .success { text-align: center; padding: 20px; color: #059669; }
    .crm-lead-form .error { color: #dc2626; font-size: 14px; margin-bottom: 12px; }
  </style>
  <h3>${title}</h3>
  <form id="crm-form-${organizationId}">
    ${fields.includes('firstName') ? '<input type="text" name="firstName" placeholder="First Name" required>' : ''}
    ${fields.includes('lastName') ? '<input type="text" name="lastName" placeholder="Last Name">' : ''}
    ${fields.includes('email') ? '<input type="email" name="email" placeholder="Email Address" required>' : ''}
    ${fields.includes('phone') ? '<input type="tel" name="phone" placeholder="Phone Number">' : ''}
    ${fields.includes('company') ? '<input type="text" name="company" placeholder="Company">' : ''}
    ${fields.includes('message') ? '<textarea name="message" placeholder="Message" rows="3" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #ddd;border-radius:8px;resize:vertical;"></textarea>' : ''}
    <div class="error" style="display:none;"></div>
    <button type="submit">${buttonText}</button>
  </form>
  <div class="success" style="display:none;">${successMessage}</div>
</div>
<script>
(function() {
  var form = document.getElementById('crm-form-${organizationId}');
  var container = document.getElementById('crm-lead-form-${organizationId}');

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var btn = form.querySelector('button');
    var errorDiv = form.querySelector('.error');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    errorDiv.style.display = 'none';

    var formData = new FormData(form);
    var data = {
      organizationId: '${organizationId}',
      source: 'form_embed',
      firstName: formData.get('firstName') || '',
      lastName: formData.get('lastName') || '',
      email: formData.get('email') || '',
      phone: formData.get('phone') || '',
      customFields: {}
    };

    if (formData.get('company')) data.customFields.company = formData.get('company');
    if (formData.get('message')) data.customFields.message = formData.get('message');

    // Add UTM params if available
    var utm = JSON.parse(sessionStorage.getItem('crm_utm') || '{}');
    if (utm.source) {
      data.utmSource = utm.source;
      data.utmMedium = utm.medium;
      data.utmCampaign = utm.campaign;
    }
    data.landingPage = window.location.href;
    data.referrer = document.referrer;

    fetch('${baseUrl}/api/tracking/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(r) { return r.json(); })
    .then(function(result) {
      if (result.success) {
        form.style.display = 'none';
        container.querySelector('.success').style.display = 'block';
      } else {
        throw new Error(result.message || 'Failed to submit');
      }
    })
    .catch(function(err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.textContent = '${buttonText}';
    });
  });
})();
</script>
<!-- End CRM Lead Capture Form -->`;

    return formCode;
  }

  /**
   * Track page view from pixel
   */
  async trackPageView(data: TrackingData) {
    try {
      const visitorId = data.visitorId || this.generateVisitorId();

      // Store visitor tracking data
      await prisma.visitorTracking.create({
        data: {
          organizationId: data.organizationId,
          visitorId,
          source: data.source,
          medium: data.medium,
          campaign: data.campaign,
          content: data.content,
          term: data.term,
          gclid: data.gclid,
          fbclid: data.fbclid,
          utmId: data.utmId,
          referrer: data.referrer,
          landingPage: data.landingPage,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
        },
      });

      // If click IDs are present, create an AdInteraction record
      if (data.gclid || data.fbclid) {
        await adInteractionService.trackAdClick({
          organizationId: data.organizationId,
          visitorId,
          gclid: data.gclid,
          fbclid: data.fbclid,
          utmSource: data.source,
          utmMedium: data.medium,
          utmCampaign: data.campaign,
          utmContent: data.content,
          utmTerm: data.term,
          landingPage: data.landingPage,
          referrer: data.referrer,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          deviceType: data.deviceType,
          browser: data.browser,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to track page view:', error);
      return { success: false };
    }
  }

  /**
   * Capture lead from any source
   */
  async captureLead(params: CaptureLeadParams) {
    const {
      organizationId,
      source,
      email,
      phone,
      firstName,
      lastName,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
      landingPage,
      formId,
      adId,
      adSetId,
      campaignId,
      customFields,
      ipAddress,
      userAgent,
      visitorId,
      gclid,
      fbclid,
    } = params;

    // Validate - need at least email or phone
    if (!email && !phone) {
      throw new Error('Email or phone is required');
    }

    // Check for duplicate lead
    const existingLead = await prisma.lead.findFirst({
      where: {
        organizationId,
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter(c => Object.keys(c).length > 0),
      },
    });

    if (existingLead) {
      // Update existing lead with new tracking info
      const existingCustomFields = existingLead.customFields as Record<string, unknown> || {};
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          updatedAt: new Date(),
          customFields: {
            ...existingCustomFields,
            lastVisit: {
              source,
              utmSource,
              utmMedium,
              utmCampaign,
              landingPage,
              timestamp: new Date().toISOString(),
            },
          },
        },
      });

      return {
        success: true,
        leadId: existingLead.id,
        isNew: false,
        message: 'Lead already exists, updated tracking info',
      };
    }

    // Determine lead source for display
    let displaySource = source;
    if (utmSource) {
      if (utmSource.includes('facebook') || utmSource.includes('fb')) displaySource = 'Facebook Ad';
      else if (utmSource.includes('instagram') || utmSource.includes('ig')) displaySource = 'Instagram Ad';
      else if (utmSource.includes('youtube') || utmSource.includes('yt')) displaySource = 'YouTube Ad';
      else if (utmSource.includes('google')) displaySource = 'Google Ad';
      else displaySource = utmSource;
    } else if (source === 'form_embed') {
      displaySource = 'Website Form';
    } else if (source === 'landing_page') {
      displaySource = 'Landing Page';
    }

    // Get default stage
    const defaultStage = await prisma.leadStage.findFirst({
      where: { organizationId, isDefault: true },
    });

    // Create new lead
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        email,
        phone: phone || '',
        firstName: firstName || 'Unknown',
        lastName,
        source: 'WEBSITE', // Default source for tracking captures
        stageId: defaultStage?.id,
        customFields: {
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          gclid,
          fbclid,
          referrer,
          landingPage,
          formId,
          adId,
          adSetId,
          campaignId,
          capturedAt: new Date().toISOString(),
          ipAddress,
          displaySource, // Store original display source
          ...customFields,
        },
      },
    });

    // Create activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'LEAD_CREATED',
        title: 'Lead captured',
        description: `Lead captured from ${displaySource}`,
        metadata: {
          source,
          utmCampaign,
          landingPage,
        },
      },
    });

    // Convert ad interaction to lead if visitor came from ad click
    if (visitorId) {
      try {
        await adInteractionService.convertToLead({
          visitorId,
          organizationId,
          leadId: lead.id,
        });
      } catch (error) {
        console.error('Failed to convert ad interaction:', error);
        // Don't fail the lead capture if ad interaction conversion fails
      }
    }

    return {
      success: true,
      leadId: lead.id,
      isNew: true,
      message: 'Lead captured successfully',
    };
  }

  /**
   * Handle Facebook/Instagram Lead Ads webhook
   */
  async handleFacebookLeadWebhook(organizationId: string, data: FacebookLeadData, accessToken: string) {
    const results: any[] = [];

    for (const entry of data.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          const leadgenId = change.value.leadgen_id;
          const adId = change.value.ad_id;
          const campaignId = change.value.campaign_id;

          try {
            // Fetch lead data from Facebook Graph API
            const leadData = await this.fetchFacebookLeadData(leadgenId, accessToken);

            if (leadData) {
              const result = await this.captureLead({
                organizationId,
                source: 'facebook_ad',
                email: leadData.email,
                phone: leadData.phone,
                firstName: leadData.first_name,
                lastName: leadData.last_name,
                utmSource: 'facebook',
                utmMedium: 'paid',
                adId,
                campaignId,
                customFields: leadData.custom_fields,
              });

              results.push(result);
            }
          } catch (error: any) {
            console.error('Failed to process Facebook lead:', error);
            results.push({ success: false, error: error.message, leadgenId });
          }
        }
      }
    }

    return { processed: results.length, results };
  }

  /**
   * Fetch lead data from Facebook Graph API
   */
  private async fetchFacebookLeadData(leadgenId: string, accessToken: string) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch lead from Facebook');
      }

      const data = await response.json() as { field_data?: Array<{ name: string; values?: string[] }> };

      // Parse field data
      const fields: Record<string, string> = {};
      for (const field of data.field_data || []) {
        fields[field.name] = field.values?.[0] || '';
      }

      return {
        email: fields.email,
        phone: fields.phone_number || fields.phone,
        first_name: fields.first_name,
        last_name: fields.last_name,
        custom_fields: fields,
      };
    } catch (error) {
      console.error('Error fetching Facebook lead:', error);
      return null;
    }
  }

  /**
   * Get lead sources breakdown
   */
  async getLeadSourcesAnalytics(organizationId: string, dateRange: { start: Date; end: Date }) {
    const leads = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = leads.reduce((sum, l) => sum + l._count.id, 0);

    return {
      total,
      sources: leads.map(l => ({
        source: l.source || 'Unknown',
        count: l._count.id,
        percentage: total > 0 ? ((l._count.id / total) * 100).toFixed(1) : 0,
      })),
    };
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(organizationId: string, dateRange: { start: Date; end: Date }) {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        customFields: { path: ['utmCampaign'], not: 'null' },
      },
      select: {
        id: true,
        customFields: true,
        createdAt: true,
        convertedAt: true,
      },
    });

    // Group by campaign
    const campaignMap = new Map<string, { leads: number; conversions: number }>();

    for (const lead of leads) {
      const data = lead.customFields as any;
      const campaign = data?.utmCampaign || 'Unknown';

      const current = campaignMap.get(campaign) || { leads: 0, conversions: 0 };
      current.leads++;
      if (lead.convertedAt) current.conversions++;
      campaignMap.set(campaign, current);
    }

    return Array.from(campaignMap.entries()).map(([campaign, stats]) => ({
      campaign,
      leads: stats.leads,
      conversions: stats.conversions,
      conversionRate: stats.leads > 0 ? ((stats.conversions / stats.leads) * 100).toFixed(1) : 0,
    }));
  }
}

export const leadTrackingService = new LeadTrackingService();
