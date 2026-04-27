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

// Pages with LONG wait times for full loading
const PAGES_TO_CAPTURE = [
  // Dashboard
  { url: '/dashboard', name: '01-dashboard', title: 'Dashboard Overview' },

  // Lead Management
  { url: '/leads', name: '02-leads-list', title: 'Leads List' },
  { url: '/leads/new', name: '03-create-lead', title: 'Create New Lead' },

  // Pipeline
  { url: '/pipeline', name: '04-pipeline-kanban', title: 'Sales Pipeline' },

  // Voice AI - Agent Creation Flow
  { url: '/voice-ai', name: '05-voice-agents', title: 'Voice AI Agents' },
  { url: '/voice-ai/new', name: '06-new-agent-type', title: 'Select Agent Type' },
  { url: '/voice-ai/create', name: '07-agent-builder', title: 'Voice Agent Builder' },
  { url: '/voice-ai/create-conversational', name: '08-conversational-ai', title: 'Conversational AI Wizard' },

  // Outbound Calls - Detailed
  { url: '/outbound-calls', name: '09-outbound-calls', title: 'Outbound Calls' },
  { url: '/outbound-calls/single', name: '10-make-call', title: 'Make Single Call' },
  { url: '/outbound-calls/campaigns/create', name: '11-create-campaign', title: 'Create Campaign' },

  // Telecaller
  { url: '/telecaller-app', name: '12-telecaller-app', title: 'Telecaller Dashboard' },
  { url: '/telecaller-queue', name: '13-telecaller-queue', title: 'Call Queue' },

  // Call History & Monitoring
  { url: '/call-history', name: '14-call-history', title: 'Call History' },
  { url: '/call-monitoring', name: '15-call-monitoring', title: 'Live Call Monitoring' },

  // Analytics
  { url: '/analytics', name: '16-analytics', title: 'Analytics Dashboard' },
  { url: '/analytics/advanced', name: '17-advanced-analytics', title: 'Advanced Analytics' },
  { url: '/analytics/funnel', name: '18-conversion-funnel', title: 'Conversion Funnel' },
  { url: '/analytics/agents', name: '19-agent-performance', title: 'Agent Performance' },
  { url: '/analytics/telecallers', name: '20-telecaller-analytics', title: 'Telecaller Analytics' },

  // Reports
  { url: '/reports', name: '21-reports', title: 'Reports' },
  { url: '/reports/user-performance', name: '22-user-performance', title: 'User Performance' },
  { url: '/reports/ai-usage', name: '23-ai-usage', title: 'AI Usage Report' },

  // Lead Intelligence
  { url: '/ai-scoring', name: '24-ai-scoring', title: 'AI Lead Scoring' },
  { url: '/customer-journey', name: '25-customer-journey', title: 'Customer Journey' },
  { url: '/predictive-analytics', name: '26-predictive', title: 'Predictive Analytics' },

  // Campaigns & Automation
  { url: '/campaigns', name: '27-campaigns', title: 'Campaigns' },
  { url: '/workflow-builder', name: '28-workflows', title: 'Workflow Builder' },

  // Settings
  { url: '/settings', name: '29-settings', title: 'Settings' },
  { url: '/settings/pipelines', name: '30-pipeline-config', title: 'Pipeline Config' },
  { url: '/settings/ai-scripts', name: '31-ai-scripts', title: 'AI Call Scripts' },

  // Team
  { url: '/team-management', name: '32-team', title: 'Team Management' },
  { url: '/users', name: '33-users', title: 'Users' },
  { url: '/roles', name: '34-roles', title: 'Roles' },

  // Integrations
  { url: '/api-keys', name: '35-api-keys', title: 'API Keys' },
  { url: '/settings/integrations', name: '36-integrations', title: 'Integrations' },
];

async function captureScreenshots() {
  console.log('========================================');
  console.log('SLOW SCREENSHOT CAPTURE');
  console.log('Each page waits 5 seconds to fully load');
  console.log('========================================\n');
  console.log(`Pages to capture: ${PAGES_TO_CAPTURE.length}\n`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const capturedPages = [];
  const failedPages = [];

  try {
    // ============ LOGIN ============
    console.log('Step 1: Opening login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('  Waiting 5 seconds for login page to load...');
    await wait(5000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '00-login.png') });
    console.log('  [OK] Captured: Login Page\n');
    capturedPages.push({ name: '00-login', title: 'Login Page' });

    // ============ FILL LOGIN FORM ============
    console.log('Step 2: Logging in...');
    const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      await emailInput.click({ clickCount: 3 });
      await wait(500);
      await emailInput.type(CREDENTIALS.email, { delay: 50 });
      await wait(500);
      await passwordInput.click();
      await wait(500);
      await passwordInput.type(CREDENTIALS.password, { delay: 50 });
      await wait(1000);

      // Click submit
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('  Waiting for login to complete...');
        await wait(5000);
        console.log('  [OK] Logged in!\n');
      }
    } else {
      console.log('  [ERROR] Could not find login form!');
      await browser.close();
      return;
    }

    // ============ CAPTURE ALL PAGES ============
    console.log('Step 3: Capturing all pages (5 second wait each)...\n');

    for (let i = 0; i < PAGES_TO_CAPTURE.length; i++) {
      const pageInfo = PAGES_TO_CAPTURE[i];
      const num = String(i + 1).padStart(2, '0');

      console.log(`[${i + 1}/${PAGES_TO_CAPTURE.length}] ${pageInfo.title}`);
      console.log(`  URL: ${pageInfo.url}`);

      try {
        // Navigate
        await page.goto(`${BASE_URL}${pageInfo.url}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // LONG WAIT - 5 seconds for page to fully render
        console.log('  Waiting 5 seconds for full load...');
        await wait(5000);

        // Take screenshot
        const screenshotPath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}.png`);
        await page.screenshot({ path: screenshotPath });

        console.log(`  [OK] Captured: ${pageInfo.name}.png\n`);
        capturedPages.push({ ...pageInfo, path: screenshotPath });

      } catch (error) {
        console.log(`  [SKIP] Error: ${error.message.substring(0, 60)}\n`);
        failedPages.push({ ...pageInfo, error: error.message });
      }
    }

    // ============ CAPTURE DETAIL PAGES ============
    console.log('\n========================================');
    console.log('CAPTURING DETAIL PAGES');
    console.log('========================================\n');

    // Lead Detail
    console.log('Trying to capture Lead Detail...');
    try {
      await page.goto(`${BASE_URL}/leads`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await wait(5000);

      // Click first lead row
      const leadRow = await page.$('tbody tr:first-child td:first-child');
      if (leadRow) {
        await leadRow.click();
        console.log('  Clicked on lead, waiting 5 seconds...');
        await wait(5000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '37-lead-detail.png') });
        console.log('  [OK] Captured: Lead Detail\n');
        capturedPages.push({ name: '37-lead-detail', title: 'Lead Detail View' });
      }
    } catch (e) {
      console.log('  [SKIP] Could not capture lead detail\n');
    }

    // Call Detail with Analysis
    console.log('Trying to capture Call Detail & Analysis...');
    try {
      await page.goto(`${BASE_URL}/call-history`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await wait(5000);

      const callRow = await page.$('tbody tr:first-child');
      if (callRow) {
        await callRow.click();
        console.log('  Clicked on call, waiting 5 seconds...');
        await wait(5000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '38-call-detail.png') });
        console.log('  [OK] Captured: Call Detail & Analysis\n');
        capturedPages.push({ name: '38-call-detail', title: 'Call Detail & Analysis' });
      }
    } catch (e) {
      console.log('  [SKIP] Could not capture call detail\n');
    }

    // Outbound Call Detail
    console.log('Trying to capture Outbound Call Detail...');
    try {
      await page.goto(`${BASE_URL}/outbound-calls`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await wait(5000);

      const outboundRow = await page.$('tbody tr:first-child');
      if (outboundRow) {
        await outboundRow.click();
        console.log('  Clicked on outbound call, waiting 5 seconds...');
        await wait(5000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '39-outbound-detail.png') });
        console.log('  [OK] Captured: Outbound Call Detail\n');
        capturedPages.push({ name: '39-outbound-detail', title: 'Outbound Call Detail' });
      }
    } catch (e) {
      console.log('  [SKIP] Could not capture outbound call detail\n');
    }

    // ============ SAVE METADATA ============
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

    // ============ SUMMARY ============
    console.log('\n========================================');
    console.log('CAPTURE COMPLETE!');
    console.log('========================================');
    console.log(`Total Captured: ${capturedPages.length} pages`);
    console.log(`Failed/Skipped: ${failedPages.length} pages`);
    console.log(`Location: ${SCREENSHOTS_DIR}`);
    console.log('========================================\n');

    // Keep browser open for review
    console.log('Browser will close in 10 seconds...');
    await wait(10000);

  } catch (error) {
    console.error('Fatal Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
