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

// Key admin pages - fast loading ones
const PAGES_TO_CAPTURE = [
  { url: '/dashboard', name: '01-dashboard', title: 'Dashboard', wait: 3000 },
  { url: '/leads', name: '02-leads', title: 'Leads Management', wait: 3000 },
  { url: '/pipeline', name: '03-pipeline', title: 'Sales Pipeline', wait: 3000 },
  { url: '/analytics', name: '04-analytics', title: 'Analytics Dashboard', wait: 3000 },
  { url: '/users', name: '05-users', title: 'User Management', wait: 2000 },
  { url: '/roles', name: '06-roles', title: 'Roles & Permissions', wait: 2000 },
  { url: '/voice-ai', name: '07-voice-ai', title: 'Voice AI Agents', wait: 3000 },
  { url: '/outbound-calls', name: '08-outbound-calls', title: 'Outbound Calls', wait: 3000 },
  { url: '/telecaller-app', name: '09-telecaller-app', title: 'Telecaller Dashboard', wait: 2000 },
  { url: '/call-history', name: '10-call-history', title: 'Call History', wait: 2000 },
  { url: '/campaigns', name: '11-campaigns', title: 'Campaigns', wait: 2000 },
  { url: '/reports', name: '12-reports', title: 'Reports', wait: 2000 },
  { url: '/settings', name: '13-settings', title: 'Settings', wait: 2000 },
  { url: '/subscription', name: '14-subscription', title: 'Subscription', wait: 2000 },
  { url: '/api-keys', name: '15-api-keys', title: 'API Keys', wait: 2000 },
];

async function captureScreenshots() {
  console.log('Starting key screen capture...');
  console.log(`Pages to capture: ${PAGES_TO_CAPTURE.length}\n`);

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',  // Use new headless mode for speed
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const capturedPages = [];
  const failedPages = [];

  try {
    // Login
    console.log('Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await wait(2000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '00-login.png') });
    console.log('✓ Captured: Login Page');
    capturedPages.push({ name: '00-login', title: 'Login Page' });

    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
    await page.type('input[type="email"], input[name="email"]', CREDENTIALS.email, { delay: 50 });
    await page.type('input[type="password"], input[name="password"]', CREDENTIALS.password, { delay: 50 });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 })
    ]);

    console.log('✓ Logged in!\n');
    await wait(3000);

    // Capture all pages
    for (let i = 0; i < PAGES_TO_CAPTURE.length; i++) {
      const pageInfo = PAGES_TO_CAPTURE[i];
      const progress = `[${i + 1}/${PAGES_TO_CAPTURE.length}]`;

      try {
        console.log(`${progress} ${pageInfo.title}...`);

        // Navigate using domcontentloaded (faster)
        await page.goto(`${BASE_URL}${pageInfo.url}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });

        // Wait for content to render
        await wait(pageInfo.wait || 2000);

        const screenshotPath = path.join(SCREENSHOTS_DIR, `${pageInfo.name}.png`);
        await page.screenshot({ path: screenshotPath });

        console.log(`  ✓ Captured`);
        capturedPages.push({ ...pageInfo, path: screenshotPath });
      } catch (error) {
        console.log(`  ✗ Failed: ${error.message.split('\n')[0]}`);
        failedPages.push({ ...pageInfo, error: error.message });
      }
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
    console.log(`Failed: ${failedPages.length} pages`);
    console.log(`Location: ${SCREENSHOTS_DIR}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
