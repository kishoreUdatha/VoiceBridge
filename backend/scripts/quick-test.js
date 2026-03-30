/**
 * Quick Backend API Test
 * Run: node scripts/quick-test.js
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001/api';
let authToken = '';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}BACKEND API FUNCTIONALITY TEST${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  let passed = 0;
  let failed = 0;
  let testLeadId = '';

  // Test 1: Authentication
  console.log('1. Testing Authentication...');
  try {
    const res = await request('POST', '/auth/login', {
      email: 'admin@demo.com',
      password: 'admin123',
    });
    if (res.status === 200 && res.data.data?.accessToken) {
      authToken = res.data.data.accessToken;
      console.log(`   ${colors.green}✓ Login successful${colors.reset}`);
      passed++;
    } else {
      console.log(`   ${colors.red}✗ Login failed: ${res.status}${colors.reset}`);
      failed++;
      return;
    }
  } catch (e) {
    console.log(`   ${colors.red}✗ Login error: ${e.message}${colors.reset}`);
    failed++;
    return;
  }

  // Test 2: Get Leads
  console.log('2. Testing Get Leads...');
  try {
    const res = await request('GET', '/leads?page=1&limit=10');
    if (res.status === 200) {
      console.log(`   ${colors.green}✓ Get leads successful (${res.data.data?.length || 0} leads)${colors.reset}`);
      passed++;
    } else {
      console.log(`   ${colors.red}✗ Get leads failed: ${res.status}${colors.reset}`);
      failed++;
    }
  } catch (e) {
    console.log(`   ${colors.red}✗ Get leads error: ${e.message}${colors.reset}`);
    failed++;
  }

  // Test 3: Create Lead
  console.log('3. Testing Create Lead...');
  try {
    const res = await request('POST', '/leads', {
      firstName: 'Test',
      lastName: 'APILead',
      phone: `+91${Math.floor(9000000000 + Math.random() * 999999999)}`,
      email: `test${Date.now()}@example.com`,
      source: 'MANUAL',
      priority: 'HIGH',
    });
    if (res.status === 201 && res.data.data?.id) {
      testLeadId = res.data.data.id;
      console.log(`   ${colors.green}✓ Create lead successful (ID: ${testLeadId.slice(0, 8)}...)${colors.reset}`);
      passed++;
    } else {
      console.log(`   ${colors.red}✗ Create lead failed: ${res.status} - ${JSON.stringify(res.data)}${colors.reset}`);
      failed++;
    }
  } catch (e) {
    console.log(`   ${colors.red}✗ Create lead error: ${e.message}${colors.reset}`);
    failed++;
  }

  // Test 4: Get Lead by ID
  if (testLeadId) {
    console.log('4. Testing Get Lead by ID...');
    try {
      const res = await request('GET', `/leads/${testLeadId}`);
      if (res.status === 200) {
        console.log(`   ${colors.green}✓ Get lead by ID successful${colors.reset}`);
        passed++;
      } else {
        console.log(`   ${colors.red}✗ Get lead failed: ${res.status}${colors.reset}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ${colors.red}✗ Get lead error: ${e.message}${colors.reset}`);
      failed++;
    }
  }

  // Test 5: Update Lead
  if (testLeadId) {
    console.log('5. Testing Update Lead...');
    try {
      const res = await request('PUT', `/leads/${testLeadId}`, {
        priority: 'URGENT',
        notes: 'Updated via API test',
      });
      if (res.status === 200) {
        console.log(`   ${colors.green}✓ Update lead successful${colors.reset}`);
        passed++;
      } else {
        console.log(`   ${colors.red}✗ Update lead failed: ${res.status}${colors.reset}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ${colors.red}✗ Update lead error: ${e.message}${colors.reset}`);
      failed++;
    }
  }

  // Test 6: Get Lead Stats
  console.log('6. Testing Get Lead Stats...');
  try {
    const res = await request('GET', '/leads/stats');
    if (res.status === 200) {
      console.log(`   ${colors.green}✓ Get stats successful (Total: ${res.data.data?.total || 0})${colors.reset}`);
      passed++;
    } else {
      console.log(`   ${colors.red}✗ Get stats failed: ${res.status}${colors.reset}`);
      failed++;
    }
  } catch (e) {
    console.log(`   ${colors.red}✗ Get stats error: ${e.message}${colors.reset}`);
    failed++;
  }

  // Test 7: Get Counselors
  console.log('7. Testing Get Counselors...');
  try {
    const res = await request('GET', '/users/counselors');
    if (res.status === 200) {
      console.log(`   ${colors.green}✓ Get counselors successful (${res.data.data?.length || 0} counselors)${colors.reset}`);
      passed++;
    } else {
      console.log(`   ${colors.red}✗ Get counselors failed: ${res.status}${colors.reset}`);
      failed++;
    }
  } catch (e) {
    console.log(`   ${colors.red}✗ Get counselors error: ${e.message}${colors.reset}`);
    failed++;
  }

  // Test 8: Get Voice Agents
  console.log('8. Testing Get Voice Agents...');
  try {
    const res = await request('GET', '/voice-ai/agents');
    if (res.status === 200) {
      console.log(`   ${colors.green}✓ Get voice agents successful (${res.data.data?.length || 0} agents)${colors.reset}`);
      passed++;
    } else {
      console.log(`   ${colors.red}✗ Get voice agents failed: ${res.status}${colors.reset}`);
      failed++;
    }
  } catch (e) {
    console.log(`   ${colors.red}✗ Get voice agents error: ${e.message}${colors.reset}`);
    failed++;
  }

  // Test 9: Add Note to Lead
  if (testLeadId) {
    console.log('9. Testing Add Note...');
    try {
      const res = await request('POST', `/lead-details/${testLeadId}/notes`, {
        content: 'Test note from API',
        isPinned: false,
      });
      if (res.status === 201 || res.status === 200) {
        console.log(`   ${colors.green}✓ Add note successful${colors.reset}`);
        passed++;
      } else {
        console.log(`   ${colors.red}✗ Add note failed: ${res.status}${colors.reset}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ${colors.red}✗ Add note error: ${e.message}${colors.reset}`);
      failed++;
    }
  }

  // Test 10: Create Follow-up
  if (testLeadId) {
    console.log('10. Testing Create Follow-up...');
    try {
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await request('POST', `/lead-details/${testLeadId}/follow-ups`, {
        scheduledAt,
        message: 'Test follow-up',
        followUpType: 'MANUAL',
      });
      if (res.status === 201 || res.status === 200) {
        console.log(`   ${colors.green}✓ Create follow-up successful${colors.reset}`);
        passed++;
      } else {
        console.log(`   ${colors.red}✗ Create follow-up failed: ${res.status}${colors.reset}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ${colors.red}✗ Create follow-up error: ${e.message}${colors.reset}`);
      failed++;
    }
  }

  // Test 11: Create Task
  if (testLeadId) {
    console.log('11. Testing Create Task...');
    try {
      const res = await request('POST', `/lead-details/${testLeadId}/tasks`, {
        title: 'Test task from API',
        description: 'Test description',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (res.status === 201 || res.status === 200) {
        console.log(`   ${colors.green}✓ Create task successful${colors.reset}`);
        passed++;
      } else {
        console.log(`   ${colors.red}✗ Create task failed: ${res.status}${colors.reset}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ${colors.red}✗ Create task error: ${e.message}${colors.reset}`);
      failed++;
    }
  }

  // Test 12: Mark Lead as Converted
  if (testLeadId) {
    console.log('12. Testing Mark Lead as Converted...');
    try {
      const res = await request('PUT', `/leads/${testLeadId}`, {
        isConverted: true,
      });
      if (res.status === 200 && res.data.data?.isConverted) {
        console.log(`   ${colors.green}✓ Lead conversion successful${colors.reset}`);
        passed++;
      } else {
        console.log(`   ${colors.red}✗ Lead conversion failed: ${res.status}${colors.reset}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ${colors.red}✗ Lead conversion error: ${e.message}${colors.reset}`);
      failed++;
    }
  }

  // Test 13: Get Dashboard Stats
  console.log('13. Testing Get Dashboard Stats...');
  try {
    const res = await request('GET', '/dashboard/stats');
    if (res.status === 200) {
      console.log(`   ${colors.green}✓ Get dashboard stats successful${colors.reset}`);
      passed++;
    } else {
      console.log(`   ${colors.yellow}⚠ Dashboard stats: ${res.status}${colors.reset}`);
    }
  } catch (e) {
    console.log(`   ${colors.yellow}⚠ Dashboard stats not available${colors.reset}`);
  }

  // Test 14: Delete Lead (cleanup)
  if (testLeadId) {
    console.log('14. Testing Delete Lead (cleanup)...');
    try {
      const res = await request('DELETE', `/leads/${testLeadId}`);
      if (res.status === 200 || res.status === 204) {
        console.log(`   ${colors.green}✓ Delete lead successful${colors.reset}`);
        passed++;
      } else {
        console.log(`   ${colors.red}✗ Delete lead failed: ${res.status}${colors.reset}`);
        failed++;
      }
    } catch (e) {
      console.log(`   ${colors.red}✗ Delete lead error: ${e.message}${colors.reset}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  if (failed === 0) {
    console.log(`${colors.green}All backend functionalities are working correctly!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}Some tests failed. Please check the issues above.${colors.reset}\n`);
  }
}

runTests().catch(console.error);
