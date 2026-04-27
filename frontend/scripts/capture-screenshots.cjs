const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const CREDENTIALS = {
  email: 'info@ghanasyamedu.com',
  password: 'Ghana@1112U'
};

const SCREENSHOTS_DIR = path.join(__dirname, '../public/screenshots');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureScreenshots() {
  console.log('Starting screenshot capture...');

  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Create screenshots directory
    const fs = require('fs');
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // 1. Go to login page
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png') });
    console.log('Login page captured');

    // 2. Login
    console.log('Logging in...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"]', CREDENTIALS.email);
    await page.type('input[type="password"], input[name="password"]', CREDENTIALS.password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Logged in successfully');

    // 3. Capture Dashboard
    console.log('Capturing dashboard...');
    await wait(2000); // Wait for dashboard to load
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-dashboard.png') });
    console.log('Dashboard captured');

    // 4. Navigate to Leads page
    console.log('Navigating to leads...');
    await page.goto(`${BASE_URL}/leads`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-leads.png') });
    console.log('Leads page captured');

    // 5. Navigate to Pipeline/Kanban
    console.log('Navigating to pipeline...');
    await page.goto(`${BASE_URL}/pipeline`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-pipeline.png') });
    console.log('Pipeline page captured');

    // 6. Navigate to Analytics/Reports
    console.log('Navigating to analytics...');
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-analytics.png') });
    console.log('Analytics page captured');

    // 7. Navigate to Team
    console.log('Navigating to team...');
    await page.goto(`${BASE_URL}/team`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-team.png') });
    console.log('Team page captured');

    // 8. Navigate to Calling
    console.log('Navigating to calling...');
    await page.goto(`${BASE_URL}/calling`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-calling.png') });
    console.log('Calling page captured');

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
