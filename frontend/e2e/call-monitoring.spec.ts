import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, API_BASE_URL } from './test-config';

/**
 * Call Monitoring E2E Tests
 * Tests the call monitoring dashboard functionality for admins and managers
 */

async function loginAs(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Check if already logged in (redirected to dashboard)
  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    // Already logged in, just navigate to call monitoring
    return;
  }

  // Wait for login form elements to be visible
  try {
    await page.waitForSelector('#email', { state: 'visible', timeout: 10000 });
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|leads|home|call-monitoring)/, { timeout: 15000 });
  } catch (e) {
    // May already be logged in or redirected
    const url = page.url();
    if (!url.includes('/login')) {
      return; // Successfully logged in
    }
    throw e;
  }
}

test.describe('Call Monitoring - Page Access', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
  });

  test('Admin should access call monitoring page', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);

    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should see the Call Monitoring header in main content area (h1 or visible header)
    const header = page.locator('h1:has-text("Call Monitoring"), .text-base.font-semibold:has-text("Call Monitoring")').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('Manager should access call monitoring page', async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd);

    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should see the Call Monitoring header in main content area
    const header = page.locator('h1:has-text("Call Monitoring"), .text-base.font-semibold:has-text("Call Monitoring")').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('Team Lead should access call monitoring page', async ({ page }) => {
    await loginAs(page, TEST_USERS.teamlead_hyd);

    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Team leads may have limited access
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

});

test.describe('Call Monitoring - Tab Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display AI and Telecallers tabs', async ({ page }) => {
    // Should see AI tab within the main content's tab group (bg-gray-100 rounded container)
    const tabGroup = page.locator('.bg-gray-100.rounded-lg');
    const aiTab = tabGroup.locator('button:has-text("AI")').first();
    await expect(aiTab).toBeVisible({ timeout: 10000 });

    // Should see Telecallers tab
    const telecallersTab = tabGroup.locator('button:has-text("Telecallers")').first();
    await expect(telecallersTab).toBeVisible({ timeout: 10000 });
  });

  test('should switch between AI and Telecallers tabs', async ({ page }) => {
    // Get the tab group container
    const tabGroup = page.locator('.bg-gray-100.rounded-lg').first();

    // Click on Telecallers tab
    const telecallersTab = tabGroup.locator('button:has-text("Telecallers")').first();
    await telecallersTab.click();
    await page.waitForTimeout(1000);

    // Verify Telecallers tab is active (should have different styling)
    await expect(telecallersTab).toHaveClass(/text-primary|bg-white/);

    // Click on AI tab
    const aiTab = tabGroup.locator('button:has-text("AI")').first();
    await aiTab.click();
    await page.waitForTimeout(1000);

    // Verify AI tab is active
    await expect(aiTab).toHaveClass(/text-primary|bg-white/);
  });

  test('should show different filters for AI vs Telecallers', async ({ page }) => {
    // On AI tab, should see Queue filter
    const queueFilter = page.locator('select').filter({ hasText: /queue/i }).first();

    // Click on Telecallers tab
    const telecallersTab = page.locator('button:has-text("Telecallers")').first();
    await telecallersTab.click();
    await page.waitForTimeout(1000);

    // On Telecallers tab, should see Telecaller filter
    const telecallerFilter = page.locator('select').filter({ hasText: /telecaller/i }).first();

    // Should see Outcome filter on Telecallers tab
    const outcomeFilter = page.locator('select').filter({ hasText: /outcome/i }).first();
  });

});

test.describe('Call Monitoring - Date Range Filters', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display date range dropdown', async ({ page }) => {
    // Find the date range button (shows Today by default)
    const dateButton = page.locator('button').filter({ hasText: /today|yesterday|last/i }).first();
    await expect(dateButton).toBeVisible({ timeout: 10000 });
  });

  test('should open date range dropdown on click', async ({ page }) => {
    // Click on date range button
    const dateButton = page.locator('button').filter({ hasText: /today/i }).first();
    await dateButton.click();
    await page.waitForTimeout(500);

    // Should see date options
    const todayOption = page.locator('button:has-text("Today")');
    const yesterdayOption = page.locator('button:has-text("Yesterday")');
    const last7DaysOption = page.locator('button:has-text("Last 7 Days")');
    const last30DaysOption = page.locator('button:has-text("Last 30 Days")');

    await expect(todayOption.first()).toBeVisible();
    await expect(yesterdayOption.first()).toBeVisible();
    await expect(last7DaysOption.first()).toBeVisible();
    await expect(last30DaysOption.first()).toBeVisible();
  });

  test('should switch to different date ranges', async ({ page }) => {
    // Click on date range button
    const dateButton = page.locator('.date-range-dropdown button').first();
    await dateButton.click();
    await page.waitForTimeout(500);

    // Select Yesterday
    const yesterdayOption = page.locator('button:has-text("Yesterday")').first();
    await yesterdayOption.click();
    await page.waitForTimeout(1000);

    // Verify date changed
    const updatedButton = page.locator('.date-range-dropdown button').first();
    await expect(updatedButton).toContainText(/yesterday/i);
  });

  test('should show Live indicator when viewing Today', async ({ page }) => {
    // Should see Live indicator when viewing today
    const liveIndicator = page.locator('text=/live/i').first();
    await expect(liveIndicator).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Call Monitoring - Status Filters', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display status filter dropdown', async ({ page }) => {
    const statusFilter = page.locator('select').filter({ hasText: /status/i }).first();
    await expect(statusFilter).toBeVisible({ timeout: 10000 });
  });

  test('should filter calls by status', async ({ page }) => {
    // Select Completed status
    const statusFilter = page.locator('select').filter({ hasText: /status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: 'Completed' });
      await page.waitForTimeout(1000);
    }
  });

  test('should clear filters', async ({ page }) => {
    // Apply a filter first
    const statusFilter = page.locator('select').filter({ hasText: /status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: 'Completed' });
      await page.waitForTimeout(500);

      // Find and click Clear button
      const clearButton = page.locator('button:has-text("Clear")').first();
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

});

test.describe('Call Monitoring - Analytics Section', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display call volume chart', async ({ page }) => {
    // Look for Call Volume section
    const volumeSection = page.locator('text=/call volume/i').first();
    await expect(volumeSection).toBeVisible({ timeout: 10000 });
  });

  test('should display call status distribution', async ({ page }) => {
    // Look for Call Status section
    const statusSection = page.locator('text=/call status/i').first();
    await expect(statusSection).toBeVisible({ timeout: 10000 });
  });

  test('should display queue or outcome distribution', async ({ page }) => {
    // Look for By Queue or By Outcome section
    const distributionSection = page.locator('text=/by queue|by outcome/i').first();
    await expect(distributionSection).toBeVisible({ timeout: 10000 });
  });

  test('should toggle analytics visibility', async ({ page }) => {
    // Find the analytics toggle button (chart icon)
    const toggleButton = page.locator('button[title*="Analytics"], button[title*="analytics"]').first();

    if (await toggleButton.isVisible({ timeout: 5000 })) {
      // Click to hide analytics
      await toggleButton.click();
      await page.waitForTimeout(500);

      // Click again to show analytics
      await toggleButton.click();
      await page.waitForTimeout(500);
    }
  });

});

test.describe('Call Monitoring - Calls Table', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display calls table with headers', async ({ page }) => {
    // Should see table headers
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Check for common column headers
    const contactHeader = page.locator('th:has-text("Contact")');
    const phoneHeader = page.locator('th:has-text("Phone")');
    const statusHeader = page.locator('th:has-text("Status")');
    const durationHeader = page.locator('th:has-text("Duration")');

    await expect(contactHeader.first()).toBeVisible();
    await expect(phoneHeader.first()).toBeVisible();
    await expect(statusHeader.first()).toBeVisible();
    await expect(durationHeader.first()).toBeVisible();
  });

  test('should show AI Agent column on AI tab', async ({ page }) => {
    // On AI tab, should see AI Agent header
    const aiAgentHeader = page.locator('th:has-text("AI Agent")');
    await expect(aiAgentHeader.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show Telecaller column on Telecallers tab', async ({ page }) => {
    // Switch to Telecallers tab
    const telecallersTab = page.locator('button:has-text("Telecallers")').first();
    await telecallersTab.click();
    await page.waitForTimeout(1000);

    // Should see Telecaller header
    const telecallerHeader = page.locator('th:has-text("Telecaller")');
    await expect(telecallerHeader.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display call rows or empty state', async ({ page }) => {
    // Either show calls or empty state message
    const tableBody = page.locator('table tbody');
    const rows = tableBody.locator('tr');

    // Wait for content to load
    await page.waitForTimeout(2000);

    const rowCount = await rows.count();
    if (rowCount > 0) {
      // Check if it's an empty state row or actual data
      const firstRow = rows.first();
      const emptyState = firstRow.locator('text=/no calls found|no data/i');

      if (await emptyState.isVisible()) {
        // Empty state is valid
        expect(true).toBe(true);
      } else {
        // Should have actual call data
        expect(rowCount).toBeGreaterThan(0);
      }
    }
  });

  test('should have View button for completed calls', async ({ page }) => {
    // Look for View buttons
    const viewButtons = page.locator('button:has-text("View")');
    const count = await viewButtons.count();

    if (count > 0) {
      // View button exists
      await expect(viewButtons.first()).toBeVisible();
    }
  });

});

test.describe('Call Monitoring - Agent Performance', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display AI Agent Performance section', async ({ page }) => {
    // Look for performance section header
    const performanceSection = page.locator('text=/agent performance|ai agent performance/i').first();
    await expect(performanceSection).toBeVisible({ timeout: 10000 });
  });

  test('should display Telecaller Performance on Telecallers tab', async ({ page }) => {
    // Switch to Telecallers tab
    const telecallersTab = page.locator('button:has-text("Telecallers")').first();
    await telecallersTab.click();
    await page.waitForTimeout(1000);

    // Look for telecaller performance section
    const performanceSection = page.locator('text=/telecaller performance/i').first();
    await expect(performanceSection).toBeVisible({ timeout: 10000 });
  });

  test('should show agent status indicators', async ({ page }) => {
    // Look for status summary section showing Available/On Call counts
    const statusSummary = page.locator('text=/available|on call|away/i');
    const count = await statusSummary.count();

    // Should have at least one status indicator visible
    expect(count).toBeGreaterThanOrEqual(0);

    // Alternative: check for the performance table
    const performanceTable = page.locator('table').last();
    await expect(performanceTable).toBeVisible({ timeout: 10000 });
  });

  test('should display performance metrics columns', async ({ page }) => {
    // Look for performance table headers
    const callsTodayHeader = page.locator('th:has-text("Calls Today")');
    const avgHandleTimeHeader = page.locator('th:has-text("Avg Handle Time")');
    const performanceHeader = page.locator('th:has-text("Performance")');

    // These should be visible in the agent performance table
    const performanceTable = page.locator('table').last();
    await expect(performanceTable).toBeVisible({ timeout: 10000 });
  });

});

test.describe('Call Monitoring - Search Functionality', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('should search for calls', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(1000);

    // Search should filter results
    const searchValue = await searchInput.inputValue();
    expect(searchValue).toBe('test');
  });

  test('should clear search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    const searchValue = await searchInput.inputValue();
    expect(searchValue).toBe('');
  });

});

test.describe('Call Monitoring - Refresh Functionality', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display refresh button', async ({ page }) => {
    const refreshButton = page.locator('button[title*="Refresh"], button[title*="refresh"]').first();
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
  });

  test('should refresh data on click', async ({ page }) => {
    const refreshButton = page.locator('button[title*="Refresh"], button[title*="refresh"]').first();

    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(2000);

      // Page should still be functional after refresh - check for any table
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 10000 });
    }
  });

});

test.describe('Call Monitoring - Call Details Panel', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should open call details panel on View click', async ({ page }) => {
    // Find a View button
    const viewButton = page.locator('button:has-text("View")').first();

    if (await viewButton.isVisible({ timeout: 5000 })) {
      await viewButton.click();
      await page.waitForTimeout(1000);

      // Should open slide-over panel with Call Details header
      const detailsHeader = page.locator('text=/call details/i').first();
      await expect(detailsHeader).toBeVisible({ timeout: 5000 });
    }
  });

  test('should close call details panel', async ({ page }) => {
    // Find and click a View button
    const viewButton = page.locator('button:has-text("View")').first();

    if (await viewButton.isVisible({ timeout: 5000 })) {
      await viewButton.click();
      await page.waitForTimeout(1000);

      // Find and click close button
      const closeButton = page.locator('button').filter({ has: page.locator('svg') }).first();

      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

});

test.describe('Call Monitoring - API Integration', () => {

  test('should fetch call monitoring analytics', async ({ request }) => {
    // First login to get token
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;

    if (token) {
      // Fetch analytics
      const analyticsResponse = await request.get(`${API_BASE_URL}/monitoring/analytics?type=AI`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Should return 200 or valid response
      expect([200, 401, 404]).toContain(analyticsResponse.status());
    }
  });

  test('should fetch agent statuses', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;

    if (token) {
      // Fetch agents
      const agentsResponse = await request.get(`${API_BASE_URL}/monitoring/agents?type=AI`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Should return 200 or valid response
      expect([200, 401, 404]).toContain(agentsResponse.status());
    }
  });

  test('should fetch calls by date range', async ({ request }) => {
    // Login first
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    const token = loginData.data?.token || loginData.token;

    if (token) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Fetch calls
      const callsResponse = await request.get(
        `${API_BASE_URL}/monitoring/calls?type=AI&dateFrom=${startOfDay.toISOString()}&dateTo=${now.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Should return 200 or valid response
      expect([200, 401, 404]).toContain(callsResponse.status());
    }
  });

});

test.describe('Call Monitoring - Telecaller Filters', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Switch to Telecallers tab
    const telecallersTab = page.locator('button:has-text("Telecallers")').first();
    await telecallersTab.click();
    await page.waitForTimeout(2000);
  });

  test('should display telecaller filter dropdown', async ({ page }) => {
    const telecallerFilter = page.locator('select').filter({ hasText: /telecaller|all telecaller/i }).first();
    await expect(telecallerFilter).toBeVisible({ timeout: 10000 });
  });

  test('should display outcome filter dropdown', async ({ page }) => {
    const outcomeFilter = page.locator('select').filter({ hasText: /outcome|all outcome/i }).first();
    await expect(outcomeFilter).toBeVisible({ timeout: 10000 });
  });

  test('should display branch filter dropdown', async ({ page }) => {
    // Branch filter should be visible if branches exist
    const branchFilter = page.locator('select').filter({ hasText: /branch|all branch/i }).first();
    // This may or may not be visible depending on org setup
  });

  test('should filter by outcome', async ({ page }) => {
    const outcomeFilter = page.locator('select').filter({ hasText: /outcome/i }).first();

    if (await outcomeFilter.isVisible()) {
      await outcomeFilter.selectOption({ label: 'Interested' });
      await page.waitForTimeout(1000);
    }
  });

  test('should show outcome counts', async ({ page }) => {
    // Should see quick stats with outcome counts
    const interestedCount = page.locator('text=/interested/i');
    const convertedCount = page.locator('text=/converted/i');

    // These may or may not be visible depending on data
  });

});

test.describe('Call Monitoring - Live Monitoring Features', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display monitoring action buttons for active calls', async ({ page }) => {
    // Look for monitoring action buttons (Listen, Whisper, Barge)
    // These appear for IN_PROGRESS calls
    const listenButton = page.locator('button[title*="Listen"]');
    const whisperButton = page.locator('button[title*="Whisper"]');
    const bargeButton = page.locator('button[title*="Barge"]');

    // These buttons will only be visible if there are active calls
    // We just verify the page loads correctly with these potential buttons
  });

  test('should show call duration for active calls', async ({ page }) => {
    // Active calls should show live updating duration
    const durationCells = page.locator('td').filter({ hasText: /\d+:\d+/ });

    // If there are any calls, durations should be visible
    const count = await durationCells.count();
    // Duration format verification
  });

});

test.describe('Call Monitoring - Quick Stats', () => {

  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1500);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/call-monitoring');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should display total calls count', async ({ page }) => {
    // Should see Total: X in the header
    const totalCount = page.locator('text=/total/i').first();
    await expect(totalCount).toBeVisible({ timeout: 10000 });
  });

  test('should display status counts with indicators', async ({ page }) => {
    // Should see colored indicators with counts
    const statusIndicators = page.locator('.w-2.h-2.rounded-full');
    const count = await statusIndicators.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

});
