const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const CREDENTIALS = {
  email: 'info@ghanasyamedu.com',
  password: 'Ghana@1112U'
};

const SCREENSHOTS_DIR = path.join(__dirname, '../public/video-screenshots');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Comprehensive pages including detailed views
const PAGES_TO_CAPTURE = [
  // Login & Dashboard
  { url: '/dashboard', name: '01-dashboard', title: 'Dashboard Overview', wait: 3000 },

  // Lead Management
  { url: '/leads', name: '02-leads-list', title: 'Leads List', wait: 3000 },
  { url: '/leads/new', name: '03-create-lead', title: 'Create New Lead', wait: 2000 },

  // Pipeline & Journey
  { url: '/pipeline', name: '04-pipeline-kanban', title: 'Sales Pipeline Kanban', wait: 3000 },
  { url: '/pipeline/advanced', name: '05-pipeline-advanced', title: 'Advanced Pipeline', wait: 2000 },

  // Voice AI - Agent Creation
  { url: '/voice-ai', name: '06-voice-agents-list', title: 'Voice AI Agents', wait: 3000 },
  { url: '/voice-ai/new', name: '07-voice-agent-new', title: 'Create Voice Agent', wait: 2000 },
  { url: '/voice-ai/create', name: '08-voice-agent-create', title: 'Voice Agent Builder', wait: 2000 },
  { url: '/voice-ai/create-conversational', name: '09-conversational-ai', title: 'Conversational AI Setup', wait: 2000 },

  // Outbound Calls - Detailed
  { url: '/outbound-calls', name: '10-outbound-calls-list', title: 'Outbound Calls Dashboard', wait: 3000 },
  { url: '/outbound-calls/single', name: '11-make-single-call', title: 'Make Single Call', wait: 2000 },
  { url: '/outbound-calls/campaigns/create', name: '12-create-campaign', title: 'Create Call Campaign', wait: 2000 },

  // Telecaller App
  { url: '/telecaller-app', name: '13-telecaller-dashboard', title: 'Telecaller Dashboard', wait: 3000 },
  { url: '/telecaller-queue', name: '14-telecaller-queue', title: 'Telecaller Call Queue', wait: 2000 },
  { url: '/telecaller-call-history', name: '15-telecaller-history', title: 'Telecaller Call History', wait: 2000 },

  // Call History & Analysis
  { url: '/call-history', name: '16-call-history', title: 'Call History', wait: 3000 },
  { url: '/call-monitoring', name: '17-call-monitoring', title: 'Live Call Monitoring', wait: 2000 },

  // Analytics - Detailed
  { url: '/analytics', name: '18-analytics-dashboard', title: 'Analytics Dashboard', wait: 3000 },
  { url: '/analytics/advanced', name: '19-advanced-analytics', title: 'Advanced Analytics', wait: 2000 },
  { url: '/analytics/funnel', name: '20-conversion-funnel', title: 'Conversion Funnel', wait: 2000 },
  { url: '/analytics/agents', name: '21-agent-performance', title: 'Agent Performance', wait: 2000 },
  { url: '/analytics/telecallers', name: '22-telecaller-analytics', title: 'Telecaller Analytics', wait: 2000 },

  // Reports
  { url: '/reports', name: '23-reports-list', title: 'Reports', wait: 2000 },
  { url: '/reports/user-performance', name: '24-user-performance', title: 'User Performance Report', wait: 2000 },
  { url: '/reports/ai-usage', name: '25-ai-usage-report', title: 'AI Usage Report', wait: 2000 },
  { url: '/reports/campaigns', name: '26-campaign-reports', title: 'Campaign Reports', wait: 2000 },

  // Lead Scoring & Intelligence
  { url: '/ai-scoring', name: '27-ai-lead-scoring', title: 'AI Lead Scoring', wait: 2000 },
  { url: '/predictive-analytics', name: '28-predictive-analytics', title: 'Predictive Analytics', wait: 2000 },
  { url: '/customer-journey', name: '29-customer-journey', title: 'Customer Journey', wait: 2000 },

  // Campaigns & Workflows
  { url: '/campaigns', name: '30-campaigns', title: 'Campaigns', wait: 2000 },
  { url: '/workflow-builder', name: '31-workflow-builder', title: 'Workflow Builder', wait: 2000 },

  // Settings - Important ones
  { url: '/settings', name: '32-settings', title: 'Settings', wait: 2000 },
  { url: '/settings/pipelines', name: '33-pipeline-settings', title: 'Pipeline Settings', wait: 2000 },
  { url: '/settings/ai-scripts', name: '34-ai-scripts', title: 'AI Call Scripts', wait: 2000 },
  { url: '/settings/workflows', name: '35-workflow-config', title: 'Workflow Configuration', wait: 2000 },

  // Team Management
  { url: '/team-management', name: '36-team-management', title: 'Team Management', wait: 2000 },
  { url: '/users', name: '37-users', title: 'Users', wait: 2000 },
  { url: '/roles', name: '38-roles', title: 'Roles & Permissions', wait: 2000 },

  // Integrations
  { url: '/api-keys', name: '39-api-keys', title: 'API Keys', wait: 2000 },
  { url: '/settings/integrations', name: '40-integrations', title: 'Integrations', wait: 2000 },
];

async function captureScreenshots() {
  console.log('Starting detailed screenshot capture...');
  console.log(`Pages to capture: ${PAGES_TO_CAPTURE.length}\n`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,  // Show browser for debugging
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const capturedPages = [];
  const failedPages = [];

  try {
    // Login
    console.log('Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(3000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '00-login.png') });
    console.log('[OK] Captured: Login Page');
    capturedPages.push({ name: '00-login', title: 'Login Page' });

    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', { timeout: 10000 });

    // Type credentials
    const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');

    await emailInput.click({ clickCount: 3 });
    await emailInput.type(CREDENTIALS.email, { delay: 30 });
    await passwordInput.click();
    await passwordInput.type(CREDENTIALS.password, { delay: 30 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
    ]);

    console.log('[OK] Logged in!\n');
    await wait(3000);

    // Capture all pages
    for (let i = 0; i < PAGES_TO_CAPTURE.length; i++) {
      const pageInfo = PAGES_TO_CAPTURE[i];
      const progress = `[${i + 1}/${PAGES_TO_CAPTURE.length}]`;

      try {
        console.log(`${progress} ${pageInfo.title}...`);

        await page.goto(`${BASE_URL}${pageInfo.url}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });

        await wait(pageInfo.wait || 2000);

        const screenshotPath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}.png`);
        await page.screenshot({ path: screenshotPath });

        console.log(`  [OK] Captured`);
        capturedPages.push({ ...pageInfo, path: screenshotPath });
      } catch (error) {
        console.log(`  [SKIP] ${error.message.split('\n')[0].substring(0, 50)}`);
        failedPages.push({ ...pageInfo, error: error.message });
      }
    }

    // Try to capture a lead detail page if leads exist
    console.log('\n[EXTRA] Trying to capture lead detail...');
    try {
      await page.goto(`${BASE_URL}/leads`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(2000);

      // Click on first lead row if exists
      const leadRow = await page.$('tbody tr:first-child');
      if (leadRow) {
        await leadRow.click();
        await wait(2000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '41-lead-detail.png') });
        console.log('  [OK] Captured lead detail');
        capturedPages.push({ name: '41-lead-detail', title: 'Lead Detail View' });
      }
    } catch (e) {
      console.log('  [SKIP] Could not capture lead detail');
    }

    // Try to capture a call detail page
    console.log('[EXTRA] Trying to capture call detail...');
    try {
      await page.goto(`${BASE_URL}/outbound-calls`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(2000);

      // Look for a call row to click
      const callRow = await page.$('tbody tr:first-child');
      if (callRow) {
        await callRow.click();
        await wait(2000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '42-call-detail.png') });
        console.log('  [OK] Captured call detail');
        capturedPages.push({ name: '42-call-detail', title: 'Call Detail & Analysis' });
      }
    } catch (e) {
      console.log('  [SKIP] Could not capture call detail');
    }

    // Try to capture campaign detail
    console.log('[EXTRA] Trying to capture campaign detail...');
    try {
      await page.goto(`${BASE_URL}/campaigns`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await wait(2000);

      const campaignRow = await page.$('tbody tr:first-child, [data-campaign-id]');
      if (campaignRow) {
        await campaignRow.click();
        await wait(2000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '43-campaign-detail.png') });
        console.log('  [OK] Captured campaign detail');
        capturedPages.push({ name: '43-campaign-detail', title: 'Campaign Detail' });
      }
    } catch (e) {
      console.log('  [SKIP] Could not capture campaign detail');
    }

    // Save metadata
    const metadata = {
      capturedAt: new Date().toISOString(),
      totalPages: capturedPages.length,
      failed: failedPages.length,
      pages: capturedPages,
      failedPages
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\n========================================');
    console.log('CAPTURE COMPLETE!');
    console.log(`Captured: ${capturedPages.length} pages`);
    console.log(`Failed/Skipped: ${failedPages.length} pages`);
    console.log(`Location: ${SCREENSHOTS_DIR}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
