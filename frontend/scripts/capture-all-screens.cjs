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

// All main admin pages to capture
const PAGES_TO_CAPTURE = [
  // Core Pages
  { url: '/dashboard', name: '01-dashboard', title: 'Dashboard' },
  { url: '/leads', name: '02-leads', title: 'Leads Management' },
  { url: '/pipeline', name: '03-pipeline', title: 'Sales Pipeline' },
  { url: '/analytics', name: '04-analytics', title: 'Analytics Dashboard' },
  { url: '/team-management', name: '05-team-management', title: 'Team Management' },

  // Voice AI & Calling
  { url: '/voice-ai', name: '06-voice-ai', title: 'Voice AI Agents' },
  { url: '/outbound-calls', name: '07-outbound-calls', title: 'Outbound Calls' },
  { url: '/telecaller-app', name: '08-telecaller-app', title: 'Telecaller Dashboard' },
  { url: '/call-history', name: '09-call-history', title: 'Call History' },

  // Campaigns & Marketing
  { url: '/campaigns', name: '10-campaigns', title: 'Campaigns' },
  { url: '/forms', name: '11-forms', title: 'Form Builder' },
  { url: '/templates', name: '12-templates', title: 'Templates' },

  // Communication
  { url: '/conversations', name: '13-conversations', title: 'Conversations' },
  { url: '/unified-inbox', name: '14-unified-inbox', title: 'Unified Inbox' },
  { url: '/whatsapp/bulk', name: '15-whatsapp-bulk', title: 'Bulk WhatsApp' },

  // Reports & Analytics
  { url: '/reports', name: '16-reports', title: 'Reports' },
  { url: '/analytics/advanced', name: '17-advanced-analytics', title: 'Advanced Analytics' },
  { url: '/analytics/funnel', name: '18-conversion-funnel', title: 'Conversion Funnel' },

  // Settings
  { url: '/settings', name: '19-settings', title: 'Settings' },
  { url: '/settings/pipelines', name: '20-pipeline-settings', title: 'Pipeline Settings' },
  { url: '/settings/workflows', name: '21-workflows', title: 'Workflow Automation' },

  // Advanced Features
  { url: '/qualified-leads', name: '22-qualified-leads', title: 'Qualified Leads' },
  { url: '/assignments', name: '23-lead-distribution', title: 'Lead Distribution' },
  { url: '/users', name: '24-users', title: 'User Management' },
  { url: '/roles', name: '25-roles', title: 'Roles & Permissions' },

  // Integrations
  { url: '/api-keys', name: '26-api-keys', title: 'API Keys' },
  { url: '/settings/integrations', name: '27-integrations', title: 'Integrations' },

  // Billing & Subscription
  { url: '/subscription', name: '28-subscription', title: 'Subscription' },
  { url: '/payments', name: '29-payments', title: 'Payments' },
];

async function captureAllScreenshots() {
  console.log('Starting comprehensive screenshot capture...');
  console.log(`Total pages to capture: ${PAGES_TO_CAPTURE.length}`);

  // Create screenshots directory
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
    // 1. Login first
    console.log('\n[1/2] Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(1000);

    // Take login page screenshot
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '00-login.png') });
    console.log('  Captured: Login Page');

    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"]', CREDENTIALS.email);
    await page.type('input[type="password"], input[name="password"]', CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('  Logged in successfully!\n');
    await wait(2000);

    // 2. Capture all pages
    console.log('[2/2] Capturing all pages...\n');

    for (let i = 0; i < PAGES_TO_CAPTURE.length; i++) {
      const pageInfo = PAGES_TO_CAPTURE[i];
      const progress = `[${i + 1}/${PAGES_TO_CAPTURE.length}]`;

      try {
        console.log(`${progress} Navigating to ${pageInfo.title}...`);
        await page.goto(`${BASE_URL}${pageInfo.url}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        await wait(2000); // Wait for page to fully render

        const screenshotPath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}.png`);
        await page.screenshot({ path: screenshotPath });

        console.log(`  ✓ Captured: ${pageInfo.title}`);
        capturedPages.push({ ...pageInfo, path: screenshotPath });
      } catch (error) {
        console.log(`  ✗ Failed: ${pageInfo.title} - ${error.message}`);
        failedPages.push({ ...pageInfo, error: error.message });
      }
    }

    // Generate metadata file for video creation
    const metadata = {
      capturedAt: new Date().toISOString(),
      totalPages: PAGES_TO_CAPTURE.length + 1, // +1 for login
      captured: capturedPages.length + 1,
      failed: failedPages.length,
      pages: [
        { name: '00-login', title: 'Login Page', path: path.join(SCREENSHOTS_DIR, '00-login.png') },
        ...capturedPages
      ],
      failedPages
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\n========================================');
    console.log('CAPTURE COMPLETE!');
    console.log('========================================');
    console.log(`Total captured: ${capturedPages.length + 1} pages`);
    console.log(`Failed: ${failedPages.length} pages`);
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`Metadata saved to: ${path.join(SCREENSHOTS_DIR, 'metadata.json')}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error during capture:', error);
  } finally {
    await browser.close();
  }
}

captureAllScreenshots();
