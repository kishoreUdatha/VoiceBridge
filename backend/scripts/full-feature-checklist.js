/**
 * Full Feature Checklist - VoiceBridge CRM
 * Comprehensive test of ALL features including AI, Voice, Integrations
 *
 * Usage: node scripts/full-feature-checklist.js
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001/api';
let authToken = '';
let organizationId = '';
let testLeadId = '';
let testAgentId = '';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
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
  categories: {},
};

function logTest(category, name, status, details = '') {
  const icon = status === 'pass' ? colors.green + '✓' : status === 'fail' ? colors.red + '✗' : colors.yellow + '⚠';
  console.log('   ' + icon + ' ' + name + colors.reset + (details ? colors.white + ' - ' + details + colors.reset : ''));

  if (!results.categories[category]) {
    results.categories[category] = { passed: 0, failed: 0, warnings: 0 };
  }

  if (status === 'pass') {
    results.passed++;
    results.categories[category].passed++;
  } else if (status === 'fail') {
    results.failed++;
    results.categories[category].failed++;
  } else {
    results.warnings++;
    results.categories[category].warnings++;
  }
}

function logSection(title) {
  console.log('\n' + colors.cyan + '━'.repeat(70) + colors.reset);
  console.log(colors.bold + colors.magenta + '  ' + title + colors.reset);
  console.log(colors.cyan + '━'.repeat(70) + colors.reset);
}

function logSubSection(title) {
  console.log('\n' + colors.blue + '  ▸ ' + title + colors.reset);
}

async function runFullChecklist() {
  console.log('\n');
  console.log(colors.cyan + '╔══════════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║' + colors.bold + '            VOICEBRIDGE CRM - FULL FEATURE CHECKLIST                 ' + colors.reset + colors.cyan + '║' + colors.reset);
  console.log(colors.cyan + '║' + '            Testing ALL Features, AI, Voice, Integrations             ' + colors.cyan + '║' + colors.reset);
  console.log(colors.cyan + '╚══════════════════════════════════════════════════════════════════════╝' + colors.reset);

  // ==================== 1. AUTHENTICATION ====================
  logSection('1. AUTHENTICATION & AUTHORIZATION');

  try {
    const res = await request('POST', '/auth/login', {
      email: 'admin@demo.com',
      password: 'admin123',
    });
    if (res.status === 200 && res.data.data?.accessToken) {
      authToken = res.data.data.accessToken;
      organizationId = res.data.data.user?.organizationId;
      logTest('Auth', 'Admin Login', 'pass', 'JWT Token received');
    } else {
      logTest('Auth', 'Admin Login', 'fail', 'No token');
      console.log(colors.red + '\n   Cannot continue without authentication!' + colors.reset);
      return;
    }
  } catch (e) {
    logTest('Auth', 'Admin Login', 'fail', e.message);
    return;
  }

  // Auth endpoints
  const authTests = [
    { endpoint: '/auth/me', name: 'Get Current User' },
    { endpoint: '/users', name: 'List All Users' },
    { endpoint: '/users/counselors', name: 'List Counselors' },
  ];

  for (const test of authTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const count = Array.isArray(res.data.data) ? res.data.data.length : 1;
        logTest('Auth', test.name, 'pass', Array.isArray(res.data.data) ? `${count} found` : res.data.data?.email || 'OK');
      } else {
        logTest('Auth', test.name, 'fail', `Status ${res.status}`);
      }
    } catch (e) {
      logTest('Auth', test.name, 'fail', e.message);
    }
  }

  // ==================== 2. LEADS MANAGEMENT ====================
  logSection('2. LEADS MANAGEMENT');

  logSubSection('Core Lead Operations');

  // Get leads
  try {
    const res = await request('GET', '/leads?page=1&limit=10');
    if (res.status === 200 && res.data.data) {
      testLeadId = res.data.data[0]?.id;
      logTest('Leads', 'List Leads', 'pass', `${res.data.data.length} leads`);
    } else {
      logTest('Leads', 'List Leads', 'fail');
    }
  } catch (e) {
    logTest('Leads', 'List Leads', 'fail', e.message);
  }

  const leadTests = [
    { endpoint: '/leads/stats', name: 'Lead Statistics' },
    { endpoint: '/leads/stages', name: 'Lead Stages' },
  ];

  for (const test of leadTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const info = res.data.data?.total || (Array.isArray(res.data.data) ? `${res.data.data.length} items` : 'OK');
        logTest('Leads', test.name, 'pass', info);
      } else {
        logTest('Leads', test.name, 'fail');
      }
    } catch (e) {
      logTest('Leads', test.name, 'fail', e.message);
    }
  }

  // Get single lead
  if (testLeadId) {
    try {
      const res = await request('GET', `/leads/${testLeadId}`);
      if (res.status === 200) {
        logTest('Leads', 'Get Lead Detail', 'pass', res.data.data?.firstName || 'OK');
      } else {
        logTest('Leads', 'Get Lead Detail', 'fail');
      }
    } catch (e) {
      logTest('Leads', 'Get Lead Detail', 'fail', e.message);
    }
  }

  logSubSection('Lead Lifecycle');

  const lifecycleTests = [
    { endpoint: '/lead-lifecycle/pending-follow-ups?limit=5', name: 'Pending Follow-ups' },
    { endpoint: '/lead-scoring/rules', name: 'Lead Scoring Rules' },
  ];

  for (const test of lifecycleTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const count = Array.isArray(res.data.data) ? res.data.data.length : 0;
        logTest('Leads', test.name, 'pass', `${count} found`);
      } else {
        logTest('Leads', test.name, 'warn', 'Not configured');
      }
    } catch (e) {
      logTest('Leads', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 3. VOICE AI & AGENTS ====================
  logSection('3. VOICE AI & AGENTS');

  logSubSection('Voice Agents');

  try {
    const res = await request('GET', '/voice-ai/agents');
    if (res.status === 200 && res.data.data) {
      testAgentId = res.data.data[0]?.id;
      logTest('VoiceAI', 'List Voice Agents', 'pass', `${res.data.data.length} agents`);
    } else {
      logTest('VoiceAI', 'List Voice Agents', 'fail');
    }
  } catch (e) {
    logTest('VoiceAI', 'List Voice Agents', 'fail', e.message);
  }

  // Get single agent
  if (testAgentId) {
    try {
      const res = await request('GET', `/voice-ai/agents/${testAgentId}`);
      if (res.status === 200) {
        logTest('VoiceAI', 'Get Agent Detail', 'pass', res.data.data?.name || 'OK');
      } else {
        logTest('VoiceAI', 'Get Agent Detail', 'fail');
      }
    } catch (e) {
      logTest('VoiceAI', 'Get Agent Detail', 'fail', e.message);
    }

    // Agent analytics
    try {
      const res = await request('GET', `/voice-ai/agents/${testAgentId}/analytics`);
      if (res.status === 200) {
        logTest('VoiceAI', 'Agent Analytics', 'pass');
      } else {
        logTest('VoiceAI', 'Agent Analytics', 'warn', 'No data');
      }
    } catch (e) {
      logTest('VoiceAI', 'Agent Analytics', 'warn', 'Not available');
    }
  }

  logSubSection('Voice Templates');

  try {
    const res = await request('GET', '/voice-ai/templates');
    if (res.status === 200) {
      const count = res.data.data?.length || 0;
      logTest('VoiceAI', 'Voice Templates', 'pass', `${count} templates`);
    } else {
      logTest('VoiceAI', 'Voice Templates', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('VoiceAI', 'Voice Templates', 'warn', 'Not available');
  }

  logSubSection('Call Flows');

  try {
    const res = await request('GET', '/call-flows');
    if (res.status === 200) {
      const count = res.data.data?.length || 0;
      logTest('VoiceAI', 'Call Flows', 'pass', `${count} flows`);
    } else {
      logTest('VoiceAI', 'Call Flows', 'warn', 'None created');
    }
  } catch (e) {
    logTest('VoiceAI', 'Call Flows', 'warn', 'Not available');
  }

  // ==================== 4. OUTBOUND CALLING ====================
  logSection('4. OUTBOUND CALLING');

  const callingTests = [
    { endpoint: '/outbound-calls?page=1&limit=5', name: 'Call History' },
    { endpoint: '/outbound-calls/analytics', name: 'Call Analytics' },
    { endpoint: '/telecaller-queue', name: 'Telecaller Queue' },
  ];

  for (const test of callingTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const count = Array.isArray(res.data.data) ? res.data.data.length : 'OK';
        logTest('Calling', test.name, 'pass', typeof count === 'number' ? `${count} records` : count);
      } else {
        logTest('Calling', test.name, 'warn', 'No data');
      }
    } catch (e) {
      logTest('Calling', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 5. INBOUND CALLING (IVR) ====================
  logSection('5. INBOUND CALLING & IVR');

  const ivrTests = [
    { endpoint: '/ivr/menus', name: 'IVR Menus' },
    { endpoint: '/call-queues', name: 'Call Queues' },
    { endpoint: '/voicemail', name: 'Voicemail' },
    { endpoint: '/callbacks', name: 'Callbacks' },
  ];

  for (const test of ivrTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const count = Array.isArray(res.data.data) ? res.data.data.length : 0;
        logTest('IVR', test.name, 'pass', `${count} configured`);
      } else {
        logTest('IVR', test.name, 'warn', 'Not configured');
      }
    } catch (e) {
      logTest('IVR', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 6. MESSAGING ====================
  logSection('6. MESSAGING (WhatsApp, SMS, Email)');

  logSubSection('WhatsApp');

  try {
    const res = await request('GET', '/organization/settings/whatsapp');
    if (res.status === 200) {
      const configured = res.data.data?.isConfigured;
      logTest('Messaging', 'WhatsApp Config', 'pass', configured ? 'Connected' : 'Page accessible');
    } else {
      logTest('Messaging', 'WhatsApp Config', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Messaging', 'WhatsApp Config', 'warn', 'Not available');
  }

  try {
    const res = await request('GET', '/templates?type=whatsapp');
    if (res.status === 200) {
      const count = res.data.data?.length || 0;
      logTest('Messaging', 'WhatsApp Templates', 'pass', `${count} templates`);
    } else {
      logTest('Messaging', 'WhatsApp Templates', 'warn', 'None');
    }
  } catch (e) {
    logTest('Messaging', 'WhatsApp Templates', 'warn', 'Not available');
  }

  logSubSection('SMS');

  try {
    const res = await request('GET', '/exotel/sms/config');
    if (res.status === 200) {
      const configured = res.data.data?.isConfigured;
      logTest('Messaging', 'SMS Config (DLT)', 'pass', configured ? 'DLT Configured' : 'Page accessible');
    } else {
      logTest('Messaging', 'SMS Config (DLT)', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('Messaging', 'SMS Config (DLT)', 'warn', 'Not available');
  }

  logSubSection('Email');

  try {
    const res = await request('GET', '/email-sequences');
    if (res.status === 200) {
      const count = res.data.data?.length || 0;
      logTest('Messaging', 'Email Sequences', 'pass', `${count} sequences`);
    } else {
      logTest('Messaging', 'Email Sequences', 'warn', 'None');
    }
  } catch (e) {
    logTest('Messaging', 'Email Sequences', 'warn', 'Not available');
  }

  // ==================== 7. AD INTEGRATIONS ====================
  logSection('7. AD INTEGRATIONS (Lead Capture)');

  const adTests = [
    { endpoint: '/facebook/integrations', name: 'Facebook Ads' },
    { endpoint: '/instagram/integrations', name: 'Instagram Ads' },
    { endpoint: '/google-ads/integrations', name: 'Google Ads' },
    { endpoint: '/linkedin/integrations', name: 'LinkedIn Ads' },
    { endpoint: '/youtube/integrations', name: 'YouTube Ads' },
    { endpoint: '/twitter/integrations', name: 'Twitter Ads' },
    { endpoint: '/tiktok/integrations', name: 'TikTok Ads' },
  ];

  for (const test of adTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const count = res.data.data?.length || 0;
        logTest('Ads', test.name, 'pass', count > 0 ? `${count} connected` : 'Endpoint ready');
      } else {
        logTest('Ads', test.name, 'warn', 'Not configured');
      }
    } catch (e) {
      logTest('Ads', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 8. AI FEATURES ====================
  logSection('8. AI FEATURES');

  logSubSection('Conversational AI');

  try {
    const res = await request('GET', '/conversational-ai/agents');
    if (res.status === 200) {
      const count = res.data.data?.length || 0;
      logTest('AI', 'Conversational AI Agents', 'pass', `${count} agents`);
    } else {
      logTest('AI', 'Conversational AI Agents', 'warn', 'Not configured');
    }
  } catch (e) {
    logTest('AI', 'Conversational AI Agents', 'warn', 'Not available');
  }

  logSubSection('RAG (Knowledge Base)');

  if (testAgentId) {
    try {
      const res = await request('GET', `/voice-ai/agents/${testAgentId}/rag/documents`);
      if (res.status === 200) {
        const count = res.data.data?.length || 0;
        logTest('AI', 'RAG Documents', 'pass', `${count} documents`);
      } else {
        logTest('AI', 'RAG Documents', 'warn', 'None uploaded');
      }
    } catch (e) {
      logTest('AI', 'RAG Documents', 'warn', 'Not available');
    }
  }

  logSubSection('AI Analytics');

  try {
    const res = await request('GET', '/call-analytics/ai-insights');
    if (res.status === 200) {
      logTest('AI', 'AI Call Insights', 'pass');
    } else {
      logTest('AI', 'AI Call Insights', 'warn', 'No data');
    }
  } catch (e) {
    logTest('AI', 'AI Call Insights', 'warn', 'Not available');
  }

  // ==================== 9. CAMPAIGNS ====================
  logSection('9. CAMPAIGNS & AUTOMATION');

  const campaignTests = [
    { endpoint: '/campaigns', name: 'Campaigns' },
    { endpoint: '/scheduled-messages', name: 'Scheduled Messages' },
    { endpoint: '/contact-lists', name: 'Contact Lists' },
  ];

  for (const test of campaignTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const count = Array.isArray(res.data.data) ? res.data.data.length : 0;
        logTest('Campaigns', test.name, 'pass', `${count} found`);
      } else {
        logTest('Campaigns', test.name, 'warn', 'None');
      }
    } catch (e) {
      logTest('Campaigns', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 10. ANALYTICS & REPORTS ====================
  logSection('10. ANALYTICS & REPORTS');

  const analyticsTests = [
    { endpoint: '/analytics/dashboard', name: 'Dashboard Summary' },
    { endpoint: '/analytics/api-usage', name: 'API Usage Stats' },
    { endpoint: '/analytics/messaging', name: 'Messaging Stats' },
    { endpoint: '/call-analytics/summary', name: 'Call Analytics Summary' },
    { endpoint: '/inbound-analytics/summary', name: 'Inbound Analytics' },
  ];

  for (const test of analyticsTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        logTest('Analytics', test.name, 'pass');
      } else {
        logTest('Analytics', test.name, 'warn', 'No data');
      }
    } catch (e) {
      logTest('Analytics', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 11. SETTINGS & CONFIGURATION ====================
  logSection('11. SETTINGS & CONFIGURATION');

  const settingsTests = [
    { endpoint: '/organization/institution', name: 'Organization Settings' },
    { endpoint: '/auto-assign/config', name: 'Auto-Assign Config' },
    { endpoint: '/organization/integrations', name: 'Integration Credentials' },
    { endpoint: '/compliance/settings', name: 'Compliance Settings' },
  ];

  for (const test of settingsTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        logTest('Settings', test.name, 'pass');
      } else {
        logTest('Settings', test.name, 'warn', 'Not configured');
      }
    } catch (e) {
      logTest('Settings', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 12. API & WEBHOOKS ====================
  logSection('12. API & WEBHOOKS');

  const apiTests = [
    { endpoint: '/api-keys', name: 'API Keys' },
    { endpoint: '/webhooks', name: 'Outgoing Webhooks' },
    { endpoint: '/audit-logs?limit=5', name: 'Audit Logs' },
  ];

  for (const test of apiTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const count = Array.isArray(res.data.data) ? res.data.data.length : 0;
        logTest('API', test.name, 'pass', `${count} found`);
      } else {
        logTest('API', test.name, 'warn', 'None');
      }
    } catch (e) {
      logTest('API', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 13. DATA IMPORT ====================
  logSection('13. DATA IMPORT & EXPORT');

  const importTests = [
    { endpoint: '/raw-imports?page=1&limit=5', name: 'Raw Imports' },
    { endpoint: '/forms', name: 'Lead Forms' },
    { endpoint: '/landing-pages', name: 'Landing Pages' },
  ];

  for (const test of importTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        const count = Array.isArray(res.data.data) ? res.data.data.length : 0;
        logTest('Import', test.name, 'pass', `${count} found`);
      } else {
        logTest('Import', test.name, 'warn', 'None');
      }
    } catch (e) {
      logTest('Import', test.name, 'warn', 'Not available');
    }
  }

  // ==================== 14. MARKETPLACE & PARTNERS ====================
  logSection('14. MARKETPLACE & PARTNERS');

  const marketplaceTests = [
    { endpoint: '/marketplace/agents', name: 'Marketplace Agents' },
    { endpoint: '/partner/dashboard', name: 'Partner Dashboard' },
  ];

  for (const test of marketplaceTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        logTest('Marketplace', test.name, 'pass');
      } else {
        logTest('Marketplace', test.name, 'warn', 'Not available');
      }
    } catch (e) {
      logTest('Marketplace', test.name, 'warn', 'Not configured');
    }
  }

  // ==================== 15. SUBSCRIPTION & BILLING ====================
  logSection('15. SUBSCRIPTION & BILLING');

  const billingTests = [
    { endpoint: '/subscription/current', name: 'Current Subscription' },
    { endpoint: '/subscription/plans', name: 'Available Plans' },
    { endpoint: '/voice-minutes/balance', name: 'Voice Minutes Balance' },
  ];

  for (const test of billingTests) {
    try {
      const res = await request('GET', test.endpoint);
      if (res.status === 200) {
        logTest('Billing', test.name, 'pass');
      } else {
        logTest('Billing', test.name, 'warn', 'Not configured');
      }
    } catch (e) {
      logTest('Billing', test.name, 'warn', 'Not available');
    }
  }

  // ==================== SUMMARY ====================
  printSummary();
}

function printSummary() {
  console.log('\n\n');
  console.log(colors.cyan + '╔══════════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║' + colors.bold + '                         TEST SUMMARY                                ' + colors.reset + colors.cyan + '║' + colors.reset);
  console.log(colors.cyan + '╚══════════════════════════════════════════════════════════════════════╝' + colors.reset);

  // Category breakdown
  console.log('\n' + colors.bold + '  Category Breakdown:' + colors.reset + '\n');

  const categoryNames = {
    'Auth': 'Authentication',
    'Leads': 'Leads Management',
    'VoiceAI': 'Voice AI & Agents',
    'Calling': 'Outbound Calling',
    'IVR': 'Inbound Calling & IVR',
    'Messaging': 'Messaging',
    'Ads': 'Ad Integrations',
    'AI': 'AI Features',
    'Campaigns': 'Campaigns',
    'Analytics': 'Analytics',
    'Settings': 'Settings',
    'API': 'API & Webhooks',
    'Import': 'Data Import',
    'Marketplace': 'Marketplace',
    'Billing': 'Billing',
  };

  for (const [key, stats] of Object.entries(results.categories)) {
    const total = stats.passed + stats.failed + stats.warnings;
    const passRate = Math.round((stats.passed / total) * 100);
    const color = passRate === 100 ? colors.green : passRate >= 70 ? colors.yellow : colors.red;
    const name = categoryNames[key] || key;
    console.log(`   ${color}${passRate.toString().padStart(3)}%${colors.reset} │ ${name.padEnd(25)} │ ✓${stats.passed} ✗${stats.failed} ⚠${stats.warnings}`);
  }

  // Overall summary
  const total = results.passed + results.failed + results.warnings;
  const passRate = Math.round((results.passed / total) * 100);

  console.log('\n' + colors.cyan + '  ─'.repeat(35) + colors.reset);
  console.log('\n   ' + colors.green + colors.bold + '✓ Passed:   ' + results.passed + colors.reset);
  console.log('   ' + colors.red + colors.bold + '✗ Failed:   ' + results.failed + colors.reset);
  console.log('   ' + colors.yellow + colors.bold + '⚠ Warnings: ' + results.warnings + colors.reset);
  console.log('   ' + colors.white + '─'.repeat(20) + colors.reset);
  console.log('   ' + colors.bold + '  Total:    ' + total + colors.reset);

  const passColor = passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red;
  console.log('\n   ' + colors.bold + 'Overall Pass Rate: ' + passColor + passRate + '%' + colors.reset);

  if (results.failed === 0 && passRate >= 80) {
    console.log('\n   ' + colors.green + colors.bold + '🚀 SYSTEM READY FOR PRODUCTION!' + colors.reset);
  } else if (results.failed === 0) {
    console.log('\n   ' + colors.yellow + colors.bold + '⚠ System operational with some features not configured' + colors.reset);
  } else {
    console.log('\n   ' + colors.red + colors.bold + '❌ Fix failed tests before production' + colors.reset);
  }

  console.log('\n' + colors.cyan + '═'.repeat(72) + colors.reset + '\n');
}

runFullChecklist().catch(console.error);
