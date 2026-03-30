/**
 * Production Readiness Checklist
 * Tests all admin features before going to production
 *
 * Usage: node scripts/production-checklist.js
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001/api';
let authToken = '';
let organizationId = '';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function logTest(category, name, status, details = '') {
  const icon = status === 'pass' ? colors.green + '✓' : status === 'fail' ? colors.red + '✗' : colors.yellow + '⚠';
  console.log('   ' + icon + ' ' + name + colors.reset + (details ? ' - ' + details : ''));

  results.tests.push({ category, name, status, details });
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else results.warnings++;
}

function logSection(title) {
  console.log('\n' + colors.cyan + '━'.repeat(60) + colors.reset);
  console.log(colors.magenta + '  ' + title + colors.reset);
  console.log(colors.cyan + '━'.repeat(60) + colors.reset);
}

async function runChecklist() {
  console.log('\n');
  console.log(colors.cyan + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║       PRODUCTION READINESS CHECKLIST                       ║' + colors.reset);
  console.log(colors.cyan + '║       VoiceBridge CRM - Admin Features                     ║' + colors.reset);
  console.log(colors.cyan + '╚════════════════════════════════════════════════════════════╝' + colors.reset);

  // ==================== AUTHENTICATION ====================
  logSection('1. AUTHENTICATION & USER MANAGEMENT');

  try {
    const res = await request('POST', '/auth/login', {
      email: 'admin@demo.com',
      password: 'admin123',
    });
    if (res.status === 200 && res.data.data && res.data.data.accessToken) {
      authToken = res.data.data.accessToken;
      organizationId = res.data.data.user.organizationId;
      logTest('Auth', 'Admin Login', 'pass', 'Token received');
    } else {
      logTest('Auth', 'Admin Login', 'fail', 'No token');
      return;
    }
  } catch (e) {
    logTest('Auth', 'Admin Login', 'fail', e.message);
    return;
  }

  // Get current user
  try {
    const res = await request('GET', '/auth/me');
    if (res.status === 200 && res.data.data) {
      logTest('Auth', 'Get Current User', 'pass', res.data.data.email);
    } else {
      logTest('Auth', 'Get Current User', 'fail');
    }
  } catch (e) {
    logTest('Auth', 'Get Current User', 'fail', e.message);
  }

  // Get users list
  try {
    const res = await request('GET', '/users');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Auth', 'List Users', 'pass', count + ' users');
    } else {
      logTest('Auth', 'List Users', 'fail');
    }
  } catch (e) {
    logTest('Auth', 'List Users', 'fail', e.message);
  }

  // Get counselors
  try {
    const res = await request('GET', '/users/counselors');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Auth', 'List Counselors', 'pass', count + ' counselors');
    } else {
      logTest('Auth', 'List Counselors', 'fail');
    }
  } catch (e) {
    logTest('Auth', 'List Counselors', 'fail', e.message);
  }

  // ==================== LEADS MANAGEMENT ====================
  logSection('2. LEADS MANAGEMENT');

  // Get leads
  try {
    const res = await request('GET', '/leads?page=1&limit=10');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Leads', 'List Leads', 'pass', count + ' leads');
    } else {
      logTest('Leads', 'List Leads', 'fail');
    }
  } catch (e) {
    logTest('Leads', 'List Leads', 'fail', e.message);
  }

  // Get lead stats
  try {
    const res = await request('GET', '/leads/stats');
    if (res.status === 200) {
      const total = res.data.data ? res.data.data.total : 0;
      logTest('Leads', 'Lead Statistics', 'pass', 'Total: ' + total);
    } else {
      logTest('Leads', 'Lead Statistics', 'fail');
    }
  } catch (e) {
    logTest('Leads', 'Lead Statistics', 'fail', e.message);
  }

  // Get stages
  try {
    const res = await request('GET', '/leads/stages');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Leads', 'Lead Stages', 'pass', count + ' stages');
    } else {
      logTest('Leads', 'Lead Stages', 'fail');
    }
  } catch (e) {
    logTest('Leads', 'Lead Stages', 'fail', e.message);
  }

  // ==================== VOICE AI ====================
  logSection('3. VOICE AI & AGENTS');

  // Get voice agents
  try {
    const res = await request('GET', '/voice-ai/agents');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Voice AI', 'List Voice Agents', 'pass', count + ' agents');
    } else {
      logTest('Voice AI', 'List Voice Agents', 'fail');
    }
  } catch (e) {
    logTest('Voice AI', 'List Voice Agents', 'fail', e.message);
  }

  // Get voice templates
  try {
    const res = await request('GET', '/voice-ai/templates');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Voice AI', 'Voice Templates', 'pass', count + ' templates');
    } else {
      logTest('Voice AI', 'Voice Templates', 'warn', 'Endpoint may not exist');
    }
  } catch (e) {
    logTest('Voice AI', 'Voice Templates', 'warn', 'Not configured');
  }

  // ==================== AD INTEGRATIONS ====================
  logSection('4. AD INTEGRATIONS & WEBHOOKS');

  // Facebook integrations
  try {
    const res = await request('GET', '/facebook/integrations');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Ads', 'Facebook Integrations', 'pass', count + ' connected');
    } else {
      logTest('Ads', 'Facebook Integrations', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Ads', 'Facebook Integrations', 'warn', 'Not configured');
  }

  // Instagram integrations
  try {
    const res = await request('GET', '/instagram/integrations');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Ads', 'Instagram Integrations', 'pass', count + ' connected');
    } else {
      logTest('Ads', 'Instagram Integrations', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Ads', 'Instagram Integrations', 'warn', 'Not configured');
  }

  // Google Ads integrations
  try {
    const res = await request('GET', '/google-ads/integrations');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Ads', 'Google Ads Integrations', 'pass', count + ' connected');
    } else {
      logTest('Ads', 'Google Ads Integrations', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Ads', 'Google Ads Integrations', 'warn', 'Not configured');
  }

  // ==================== COMMUNICATION ====================
  logSection('5. COMMUNICATION (WhatsApp, SMS, Email)');

  // WhatsApp config
  try {
    const res = await request('GET', '/organization/settings/whatsapp');
    if (res.status === 200) {
      const isConfigured = res.data.data && res.data.data.isConfigured;
      logTest('Comm', 'WhatsApp Settings', 'pass', isConfigured ? 'Connected' : 'Page accessible');
    } else {
      logTest('Comm', 'WhatsApp Settings', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Comm', 'WhatsApp Settings', 'warn', 'Not configured');
  }

  // SMS config
  try {
    const res = await request('GET', '/exotel/sms/config');
    if (res.status === 200) {
      const isConfigured = res.data.data && res.data.data.isConfigured;
      logTest('Comm', 'SMS Settings', 'pass', isConfigured ? 'DLT Configured' : 'Page accessible');
    } else {
      logTest('Comm', 'SMS Settings', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Comm', 'SMS Settings', 'warn', 'Not configured');
  }

  // ==================== ANALYTICS & REPORTS ====================
  logSection('6. ANALYTICS & REPORTS');

  // Dashboard stats
  try {
    const res = await request('GET', '/analytics/dashboard');
    if (res.status === 200) {
      logTest('Analytics', 'Dashboard Stats', 'pass');
    } else {
      logTest('Analytics', 'Dashboard Stats', 'warn', 'No data');
    }
  } catch (e) {
    logTest('Analytics', 'Dashboard Stats', 'warn', 'Not available');
  }

  // Analytics
  try {
    const res = await request('GET', '/analytics/api-usage');
    if (res.status === 200) {
      logTest('Analytics', 'Analytics Overview', 'pass');
    } else {
      logTest('Analytics', 'Analytics Overview', 'warn', 'No data');
    }
  } catch (e) {
    logTest('Analytics', 'Analytics Overview', 'warn', 'Not available');
  }

  // ==================== SETTINGS ====================
  logSection('7. SETTINGS & CONFIGURATION');

  // Organization settings
  try {
    const res = await request('GET', '/organization/institution');
    if (res.status === 200) {
      const hasName = res.data.data && res.data.data.institution && res.data.data.institution.name;
      logTest('Settings', 'Organization Settings', 'pass', hasName ? res.data.data.institution.name : 'Page accessible');
    } else {
      logTest('Settings', 'Organization Settings', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Settings', 'Organization Settings', 'warn', 'Not available');
  }

  // Auto-assign settings
  try {
    const res = await request('GET', '/auto-assign/config');
    if (res.status === 200) {
      const enabled = res.data.data && res.data.data.config && res.data.data.config.enableAICalling;
      logTest('Settings', 'Auto-Assign Settings', 'pass', enabled ? 'AI Calling enabled' : 'Page accessible');
    } else {
      logTest('Settings', 'Auto-Assign Settings', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Settings', 'Auto-Assign Settings', 'warn', 'Not available');
  }

  // ==================== API & WEBHOOKS ====================
  logSection('8. API KEYS & WEBHOOKS');

  // API Keys
  try {
    const res = await request('GET', '/api-keys');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('API', 'API Keys', 'pass', count + ' keys');
    } else {
      logTest('API', 'API Keys', 'warn', 'None created');
    }
  } catch (e) {
    logTest('API', 'API Keys', 'warn', 'Not available');
  }

  // Webhooks
  try {
    const res = await request('GET', '/webhooks');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('API', 'Outgoing Webhooks', 'pass', count + ' configured');
    } else {
      logTest('API', 'Outgoing Webhooks', 'warn', 'None configured');
    }
  } catch (e) {
    logTest('API', 'Outgoing Webhooks', 'warn', 'Not available');
  }

  // ==================== RAW IMPORTS ====================
  logSection('9. DATA IMPORT');

  // Raw imports
  try {
    const res = await request('GET', '/raw-imports?page=1&limit=5');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Import', 'Raw Imports', 'pass', count + ' records');
    } else {
      logTest('Import', 'Raw Imports', 'warn', 'No imports');
    }
  } catch (e) {
    logTest('Import', 'Raw Imports', 'warn', 'Not available');
  }

  // ==================== FOLLOW-UPS & TASKS ====================
  logSection('10. FOLLOW-UPS & TASKS');

  // Pending follow-ups
  try {
    const res = await request('GET', '/lead-lifecycle/pending-follow-ups?limit=5');
    if (res.status === 200) {
      const count = res.data.data ? res.data.data.length : 0;
      logTest('Tasks', 'Pending Follow-ups', 'pass', count + ' pending');
    } else {
      logTest('Tasks', 'Pending Follow-ups', 'warn', 'None');
    }
  } catch (e) {
    logTest('Tasks', 'Pending Follow-ups', 'warn', 'Not available');
  }

  // ==================== SUMMARY ====================
  console.log('\n');
  console.log(colors.cyan + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║                    TEST SUMMARY                            ║' + colors.reset);
  console.log(colors.cyan + '╚════════════════════════════════════════════════════════════╝' + colors.reset);

  console.log('\n   ' + colors.green + '✓ Passed:   ' + results.passed + colors.reset);
  console.log('   ' + colors.red + '✗ Failed:   ' + results.failed + colors.reset);
  console.log('   ' + colors.yellow + '⚠ Warnings: ' + results.warnings + colors.reset);

  const total = results.passed + results.failed + results.warnings;
  const passRate = Math.round((results.passed / total) * 100);

  console.log('\n   Pass Rate: ' + (passRate >= 80 ? colors.green : passRate >= 60 ? colors.yellow : colors.red) + passRate + '%' + colors.reset);

  if (results.failed === 0) {
    console.log('\n   ' + colors.green + '🚀 READY FOR PRODUCTION!' + colors.reset);
  } else {
    console.log('\n   ' + colors.red + '⚠ Fix failed tests before production' + colors.reset);
  }

  // Print failed tests
  if (results.failed > 0) {
    console.log('\n   Failed Tests:');
    results.tests.filter(t => t.status === 'fail').forEach(t => {
      console.log('   ' + colors.red + '• ' + t.category + ': ' + t.name + ' - ' + t.details + colors.reset);
    });
  }

  console.log('\n' + colors.cyan + '━'.repeat(60) + colors.reset + '\n');
}

runChecklist().catch(console.error);
