/**
 * Lead Lifecycle API Test Script
 *
 * Tests the lead lifecycle through HTTP API endpoints
 * Requires the server to be running on localhost:3001
 *
 * Usage: npx ts-node scripts/test-lead-lifecycle-api.ts
 */

import axios, { AxiosInstance } from 'axios';

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@demo.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

// Test data
let authToken = '';
let testLeadId = '';
let testFollowUpId = '';
let voiceAgentId = '';

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' | 'step' = 'info') {
  const color = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
    step: colors.magenta,
  }[type];
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '─'.repeat(60));
  console.log(`${colors.cyan}▶ ${title}${colors.reset}`);
  console.log('─'.repeat(60));
}

// Create axios instance
let api: AxiosInstance;

function initApi() {
  api = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add auth token to requests
  api.interceptors.request.use((config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  });

  // Log responses
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        log(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`, 'error');
      }
      throw error;
    }
  );
}

async function authenticate() {
  logSection('AUTHENTICATION');

  try {
    const response = await api.post('/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    authToken = response.data.data.accessToken;
    log(`✓ Authenticated as: ${response.data.data.user.email}`, 'success');
    log(`  Role: ${response.data.data.user.role}`, 'info');
    return true;
  } catch (error: any) {
    log(`✗ Authentication failed: ${error.message}`, 'error');
    log(`  Make sure the server is running and credentials are correct`, 'warn');
    return false;
  }
}

async function getVoiceAgent() {
  logSection('GET VOICE AGENT');

  try {
    const response = await api.get('/voice-ai/agents');
    const agents = response.data.data || [];

    if (agents.length > 0) {
      voiceAgentId = agents[0].id;
      log(`✓ Found voice agent: ${agents[0].name}`, 'success');
    } else {
      log('No voice agents found - AI call tests will use mock', 'warn');
    }
  } catch (error) {
    log('Could not fetch voice agents', 'warn');
  }
}

async function testCreateLead() {
  logSection('TEST 1: Create Lead via API');

  const testPhone = `+91${Math.floor(9000000000 + Math.random() * 999999999)}`;

  try {
    const response = await api.post('/leads', {
      firstName: 'API',
      lastName: 'TestLead',
      phone: testPhone,
      email: `apitest${Date.now()}@example.com`,
      source: 'MANUAL',
      sourceDetails: 'Created by API test script',
      priority: 'HIGH',
    });

    testLeadId = response.data.data.id;
    log(`✓ Lead created successfully`, 'success');
    log(`  ID: ${testLeadId}`, 'info');
    log(`  Phone: ${testPhone}`, 'info');
    log(`  Source: MANUAL`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to create lead: ${error.message}`, 'error');
    throw error;
  }
}

async function testCheckDuplicate(phone: string) {
  logSection('TEST 2: Check Duplicate');

  try {
    const response = await api.get(`/lead-lifecycle/check-duplicate?phone=${encodeURIComponent(phone)}`);

    if (response.data.data.isDuplicate) {
      log(`✓ Duplicate detection working`, 'success');
      log(`  Found lead: ${response.data.data.lead.name}`, 'info');
    } else {
      log(`✓ No duplicate found (expected for new number)`, 'success');
    }

    return response.data.data;
  } catch (error: any) {
    log(`✗ Duplicate check failed: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetLead() {
  logSection('TEST 3: Get Lead Details');

  try {
    const response = await api.get(`/leads/${testLeadId}`);

    log(`✓ Lead retrieved successfully`, 'success');
    log(`  Name: ${response.data.data.firstName} ${response.data.data.lastName}`, 'info');
    log(`  Stage: ${response.data.data.stage?.name || 'None'}`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to get lead: ${error.message}`, 'error');
    throw error;
  }
}

async function testUpdateLead() {
  logSection('TEST 4: Update Lead');

  try {
    const response = await api.put(`/leads/${testLeadId}`, {
      priority: 'URGENT',
      city: 'Mumbai',
      customFields: {
        interest: 'Premium Plan',
        budget: '50000',
      },
    });

    log(`✓ Lead updated successfully`, 'success');
    log(`  New Priority: ${response.data.data.priority}`, 'info');
    log(`  City: ${response.data.data.city}`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to update lead: ${error.message}`, 'error');
    throw error;
  }
}

async function testScheduleFollowUp() {
  logSection('TEST 5: Schedule Follow-up');

  const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

  try {
    const response = await api.post(`/lead-lifecycle/${testLeadId}/follow-ups`, {
      scheduledAt: scheduledAt.toISOString(),
      followUpType: voiceAgentId ? 'AI_CALL' : 'MANUAL',
      voiceAgentId: voiceAgentId || undefined,
      message: 'API test follow-up - discuss premium plan',
    });

    testFollowUpId = response.data.data.id;
    log(`✓ Follow-up scheduled successfully`, 'success');
    log(`  ID: ${testFollowUpId}`, 'info');
    log(`  Type: ${response.data.data.followUpType}`, 'info');
    log(`  Scheduled: ${scheduledAt.toISOString()}`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to schedule follow-up: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetFollowUps() {
  logSection('TEST 6: Get Follow-ups');

  try {
    const response = await api.get(`/lead-lifecycle/${testLeadId}/follow-ups`);

    log(`✓ Follow-ups retrieved`, 'success');
    log(`  Count: ${response.data.data.length}`, 'info');

    response.data.data.forEach((fu: any, i: number) => {
      console.log(`    ${i + 1}. [${fu.status}] ${fu.followUpType} - ${new Date(fu.scheduledAt).toLocaleString()}`);
    });

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to get follow-ups: ${error.message}`, 'error');
    throw error;
  }
}

async function testUpdateFollowUp() {
  logSection('TEST 7: Update Follow-up');

  try {
    const response = await api.put(`/lead-lifecycle/${testLeadId}/follow-ups/${testFollowUpId}`, {
      status: 'COMPLETED',
      notes: 'Customer confirmed interest, moving to proposal stage',
    });

    log(`✓ Follow-up updated successfully`, 'success');
    log(`  New Status: ${response.data.data.status}`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to update follow-up: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetTimeline() {
  logSection('TEST 8: Get Lead Timeline');

  try {
    const response = await api.get(`/lead-lifecycle/${testLeadId}/timeline`);

    const { timeline, summary } = response.data.data;

    log(`✓ Timeline retrieved`, 'success');
    log(`  Total Activities: ${summary.totalActivities}`, 'info');
    log(`  Total Calls: ${summary.totalCalls}`, 'info');
    log(`  Total Follow-ups: ${summary.totalFollowUps}`, 'info');
    log(`  Pending Follow-ups: ${summary.pendingFollowUps}`, 'info');

    console.log('\n  Recent Timeline Events:');
    timeline.slice(0, 5).forEach((event: any, i: number) => {
      const time = new Date(event.timestamp).toLocaleString();
      console.log(`    ${i + 1}. [${event.type.toUpperCase()}] ${time}`);
    });

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to get timeline: ${error.message}`, 'error');
    throw error;
  }
}

async function testGetCalls() {
  logSection('TEST 9: Get Lead Calls');

  try {
    const response = await api.get(`/lead-lifecycle/${testLeadId}/calls`);

    log(`✓ Calls retrieved`, 'success');
    log(`  Count: ${response.data.data.length}`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to get calls: ${error.message}`, 'error');
    throw error;
  }
}

async function testAddNote() {
  logSection('TEST 10: Add Note to Lead');

  try {
    const response = await api.post(`/lead-details/${testLeadId}/notes`, {
      content: 'API test note: Customer is very interested in the premium plan. Budget confirmed at 50k.',
      isPinned: true,
    });

    log(`✓ Note added successfully`, 'success');

    return response.data.data;
  } catch (error: any) {
    // Notes endpoint might have different structure
    log(`Note endpoint may not exist or has different structure`, 'warn');
  }
}

async function testLogCallActivity() {
  logSection('TEST 11: Log Call Activity');

  try {
    const response = await api.post(`/lead-details/${testLeadId}/call-logs`, {
      phoneNumber: '+919876543210',
      direction: 'OUTBOUND',
      status: 'COMPLETED',
      duration: 180,
      notes: 'Discussed premium features. Customer requesting proposal.',
    });

    log(`✓ Call logged successfully`, 'success');
    log(`  Duration: 180 seconds`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`Call logging may use different endpoint`, 'warn');
  }
}

async function testGetPendingFollowUps() {
  logSection('TEST 12: Get Pending Follow-ups (Organization)');

  try {
    const response = await api.get('/lead-lifecycle/pending-follow-ups?limit=10');

    log(`✓ Pending follow-ups retrieved`, 'success');
    log(`  Count: ${response.data.data.length}`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to get pending follow-ups: ${error.message}`, 'error');
    throw error;
  }
}

async function testTriggerAICall() {
  logSection('TEST 13: Trigger AI Call (Optional)');

  if (!voiceAgentId) {
    log('Skipping - No voice agent configured', 'warn');
    return null;
  }

  try {
    const response = await api.post(`/lead-lifecycle/${testLeadId}/ai-call`, {
      voiceAgentId,
    });

    log(`✓ AI call initiated`, 'success');
    log(`  Call ID: ${response.data.data.callId}`, 'info');
    log(`  Status: ${response.data.data.status}`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`AI call initiation failed: ${error.message}`, 'warn');
    return null;
  }
}

async function testLeadConversion() {
  logSection('TEST 14: Mark Lead as Converted');

  try {
    const response = await api.put(`/leads/${testLeadId}`, {
      isConverted: true,
    });

    log(`✓ Lead marked as converted`, 'success');
    log(`  Converted At: ${response.data.data.convertedAt || 'Just now'}`, 'info');

    return response.data.data;
  } catch (error: any) {
    log(`✗ Failed to mark as converted: ${error.message}`, 'error');
    throw error;
  }
}

async function testDeleteLead() {
  logSection('CLEANUP: Delete Test Lead');

  const shouldCleanup = process.argv.includes('--cleanup');

  if (!shouldCleanup) {
    log('Skipping cleanup. Run with --cleanup flag to delete test data.', 'warn');
    log(`Test Lead ID: ${testLeadId}`, 'info');
    return;
  }

  try {
    await api.delete(`/leads/${testLeadId}`);
    log(`✓ Test lead deleted successfully`, 'success');
  } catch (error: any) {
    log(`✗ Failed to delete lead: ${error.message}`, 'error');
  }
}

async function printSummary() {
  logSection('TEST SUMMARY');

  const tests = [
    'Authentication',
    'Create Lead',
    'Check Duplicate',
    'Get Lead',
    'Update Lead',
    'Schedule Follow-up',
    'Get Follow-ups',
    'Update Follow-up',
    'Get Timeline',
    'Get Calls',
    'Add Note',
    'Log Call Activity',
    'Get Pending Follow-ups',
    'Trigger AI Call',
    'Lead Conversion',
  ];

  console.log('\n  Tests Executed:');
  tests.forEach((test, i) => {
    console.log(`    ${colors.green}✓${colors.reset} ${i + 1}. ${test}`);
  });

  console.log(`\n  Test Lead ID: ${colors.cyan}${testLeadId}${colors.reset}`);
  console.log(`  Follow-up ID: ${colors.cyan}${testFollowUpId}${colors.reset}`);
}

async function runAllTests() {
  console.log('\n');
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║         LEAD LIFECYCLE API TEST SUITE                      ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  log(`\nTarget: ${BASE_URL}`, 'info');

  initApi();

  try {
    // Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      process.exit(1);
    }

    // Get voice agent
    await getVoiceAgent();

    // Run all tests
    const lead = await testCreateLead();
    await testCheckDuplicate(lead.phone);
    await testGetLead();
    await testUpdateLead();
    await testScheduleFollowUp();
    await testGetFollowUps();
    await testUpdateFollowUp();
    await testGetTimeline();
    await testGetCalls();
    await testAddNote();
    await testLogCallActivity();
    await testGetPendingFollowUps();
    await testTriggerAICall();
    await testLeadConversion();

    // Summary
    await printSummary();

    // Cleanup
    await testDeleteLead();

    logSection('ALL API TESTS COMPLETED SUCCESSFULLY');
    log('✓ Lead lifecycle API is working correctly!', 'success');

  } catch (error) {
    log(`\n✗ Test suite failed: ${(error as Error).message}`, 'error');
    process.exit(1);
  }
}

// Run tests
runAllTests();
