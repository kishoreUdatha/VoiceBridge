/**
 * Webhook Integration Test Script
 * Tests lead capture from social media webhooks
 *
 * Usage: node scripts/test-webhook.js
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001/api';
let authToken = '';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (authToken) {
      options.headers['Authorization'] = 'Bearer ' + authToken;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + 'WEBHOOK INTEGRATION TEST' + colors.reset);
  console.log('='.repeat(60) + '\n');

  // Step 1: Login
  console.log('1. Authenticating...');
  try {
    const res = await request('POST', '/auth/login', {
      email: 'admin@demo.com',
      password: 'admin123',
    });
    if (res.status === 200 && res.data.data && res.data.data.accessToken) {
      authToken = res.data.data.accessToken;
      console.log('   ' + colors.green + '✓ Login successful' + colors.reset + '\n');
    } else {
      console.log('   ' + colors.red + '✗ Login failed' + colors.reset);
      return;
    }
  } catch (e) {
    console.log('   ' + colors.red + '✗ Login error: ' + e.message + colors.reset);
    return;
  }

  // Get organization ID
  let organizationId = '';
  try {
    const res = await request('GET', '/auth/me');
    organizationId = res.data.data && res.data.data.organizationId;
    console.log('   Organization ID: ' + organizationId + '\n');
  } catch (e) {
    console.log('   ' + colors.yellow + 'Could not get org ID' + colors.reset);
  }

  // Step 2: Test Facebook Webhook
  console.log('2. Testing Facebook Lead Webhook...');
  try {
    const timestamp = Date.now();
    const randomPhone = '+91' + Math.floor(9000000000 + Math.random() * 999999999);
    const testLead = {
      organizationId: organizationId,
      firstName: 'Facebook',
      lastName: 'TestLead',
      email: 'fb.test' + timestamp + '@example.com',
      phone: randomPhone,
      campaignName: 'Facebook Test Campaign',
    };

    const res = await request('POST', '/ads/facebook/test-lead', testLead);
    if (res.status === 200 && res.data.success) {
      console.log('   ' + colors.green + '✓ Facebook lead created' + colors.reset);
      console.log('   Lead ID: ' + (res.data.data && res.data.data.id));
      console.log('   Name: ' + testLead.firstName + ' ' + testLead.lastName);
      console.log('   Phone: ' + testLead.phone + '\n');
    } else {
      console.log('   ' + colors.red + '✗ Failed: ' + JSON.stringify(res.data) + colors.reset + '\n');
    }
  } catch (e) {
    console.log('   ' + colors.red + '✗ Error: ' + e.message + colors.reset + '\n');
  }

  // Step 3: Test Instagram Webhook
  console.log('3. Testing Instagram Lead Webhook...');
  try {
    const timestamp = Date.now();
    const randomPhone = '+91' + Math.floor(9000000000 + Math.random() * 999999999);
    const testLead = {
      organizationId: organizationId,
      firstName: 'Instagram',
      lastName: 'TestLead',
      email: 'ig.test' + timestamp + '@example.com',
      phone: randomPhone,
      campaignName: 'Instagram Test Campaign',
    };

    const res = await request('POST', '/ads/instagram/test-lead', testLead);
    if (res.status === 200 && res.data.success) {
      console.log('   ' + colors.green + '✓ Instagram lead created' + colors.reset);
      console.log('   Lead ID: ' + (res.data.data && res.data.data.id));
      console.log('   Name: ' + testLead.firstName + ' ' + testLead.lastName);
      console.log('   Phone: ' + testLead.phone + '\n');
    } else {
      console.log('   ' + colors.red + '✗ Failed: ' + JSON.stringify(res.data) + colors.reset + '\n');
    }
  } catch (e) {
    console.log('   ' + colors.red + '✗ Error: ' + e.message + colors.reset + '\n');
  }

  // Step 4: Verify leads in database
  console.log('4. Verifying leads in database...');
  try {
    const res = await request('GET', '/leads?page=1&limit=5&sortBy=createdAt&sortOrder=desc');
    if (res.status === 200) {
      const leads = res.data.data || [];
      console.log('   ' + colors.green + '✓ Found ' + leads.length + ' recent leads' + colors.reset);
      leads.forEach(function(lead, i) {
        const source = lead.source || 'Unknown';
        console.log('   ' + (i + 1) + '. ' + lead.firstName + ' ' + lead.lastName + ' - Source: ' + source);
      });
    }
  } catch (e) {
    console.log('   ' + colors.red + '✗ Error: ' + e.message + colors.reset);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(colors.green + 'TEST COMPLETE' + colors.reset);
  console.log('='.repeat(60));
  console.log('\nCheck your CRM dashboard to see the test leads!');
  console.log('Go to: /leads to view all leads\n');
}

runTests().catch(console.error);
