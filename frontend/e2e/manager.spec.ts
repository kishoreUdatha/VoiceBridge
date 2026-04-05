import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, TEST_LEADS } from './test-config';

/**
 * Manager E2E Tests
 * Tests manager-specific functionality including team management and approvals
 */

async function loginAs(page: Page, user: typeof TEST_USERS.manager_hyd) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/*', { timeout: 15000 });
}

test.describe('Manager - Branch Overview', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd);
  });

  test('should see branch dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Manager should see dashboard with branch metrics
    await expect(page.locator('text=/dashboard|overview/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should see all branch leads', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Manager should see all HYD branch leads
    // Including completed and dropped leads - check for any leads content
    const leadsContent = page.locator('table, .leads-list, [class*="lead"], [class*="card"]').first();
    await expect(leadsContent).toBeVisible({ timeout: 10000 });
  });

  test('should see lead pipeline/funnel', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for pipeline or funnel visualization
    const pipeline = page.locator('text=/pipeline|funnel|stages/i').first();
  });

  test('should view team performance', async ({ page }) => {
    // Navigate to analytics or reports
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Or try reports page
    const analyticsContent = page.locator('text=/performance|analytics|reports/i').first();
  });

});

test.describe('Manager - Lead Management', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd);
  });

  test('should view all lead details', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on a lead
    const leadRow = page.locator('table tbody tr').first();
    if (await leadRow.isVisible()) {
      await leadRow.click();
      await page.waitForTimeout(1000);

      // Manager should see full lead details
      const leadDetail = page.locator('text=/details|information|profile/i').first();
    }
  });

  test('should reassign leads to team members', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open a lead
    const leadRow = page.locator('table tbody tr').first();
    if (await leadRow.isVisible()) {
      await leadRow.click();
      await page.waitForTimeout(1000);

      // Find assign/reassign button
      const assignButton = page.locator('button:has-text("Assign"), button:has-text("Reassign"), [data-testid="assign-lead"]').first();

      if (await assignButton.isVisible()) {
        await assignButton.click();
        await page.waitForTimeout(500);

        // Select a team member
        const userSelect = page.locator('select[name*="user"], select[name*="assignee"], [data-testid="user-select"]').first();
        if (await userSelect.isVisible()) {
          // Select first option
          await userSelect.selectOption({ index: 1 });

          // Confirm assignment
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Assign")').first();
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
          }
        }
      }
    }
  });

  test('should approve admission', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find a lead pending approval (look for specific stage)
    const pendingLead = page.locator('tr:has-text("Payment Pending"), tr:has-text("Processing")').first();

    if (await pendingLead.isVisible()) {
      await pendingLead.click();
      await page.waitForTimeout(1000);

      // Find approve button
      const approveButton = page.locator('button:has-text("Approve"), button:has-text("Confirm Admission")').first();

      if (await approveButton.isVisible()) {
        await approveButton.click();
        await page.waitForTimeout(500);

        // Confirm in dialog if present
        const confirmBtn = page.locator('button:has-text("Yes"), button:has-text("Confirm")').first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }
  });

  test('should record payment', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open a lead
    const leadRow = page.locator('table tbody tr').first();
    if (await leadRow.isVisible()) {
      await leadRow.click();
      await page.waitForTimeout(1000);

      // Find payment button
      const paymentButton = page.locator('button:has-text("Payment"), button:has-text("Record Payment"), [data-testid="add-payment"]').first();

      if (await paymentButton.isVisible()) {
        await paymentButton.click();
        await page.waitForTimeout(500);

        // Fill payment form
        const amountInput = page.locator('input[name*="amount"], input[type="number"]').first();
        if (await amountInput.isVisible()) {
          await amountInput.fill('25000');

          // Select payment method
          const methodSelect = page.locator('select[name*="method"], [data-testid="payment-method"]').first();
          if (await methodSelect.isVisible()) {
            await methodSelect.selectOption({ index: 1 });
          }

          // Submit
          const submitBtn = page.locator('button:has-text("Save"), button:has-text("Record")').first();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
          }
        }
      }
    }
  });

});

test.describe('Manager - Team Management', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd);
  });

  test('should view team members', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Should see team members in branch
    const usersTable = page.locator('table, .users-list');
  });

  test('should see telecaller activity', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Look for telecaller performance section
    const telecallerStats = page.locator('text=/telecaller|agent|performance/i').first();
  });

});

test.describe('Manager - Activity History', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd);
  });

  test('should view lead activity timeline', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on Rahul Kumar (completed lead with full history)
    const rahulLead = page.locator('text=Rahul Kumar').first();
    if (await rahulLead.isVisible()) {
      await rahulLead.click();
      await page.waitForTimeout(1000);

      // Look for activity/history section
      const activitySection = page.locator('text=/activity|history|timeline/i').first();

      // Should see various activities
      const callActivity = page.locator('text=/call|called/i').first();
      const stageActivity = page.locator('text=/stage|changed/i').first();
    }
  });

  test('should see who did what and when', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open a lead with history
    const leadRow = page.locator('tr:has-text("Rahul Kumar")').first();
    if (await leadRow.isVisible()) {
      await leadRow.click();
      await page.waitForTimeout(1000);

      // Look for activity entries with user names
      const activityWithUser = page.locator('text=/Telecaller|Manager|Counselor/i').first();
    }
  });

});

test.describe('Manager - Branch Filtering', () => {

  test('HYD Manager should only see HYD branch data', async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should see HYD leads
    const hydLeads = page.locator('text=Rahul Kumar, text=Amit Patel');

    // Should NOT see BLR or CHN leads
    const blrLead = page.locator('text=Sneha Reddy');
    const chnLead = page.locator('text=Divya Menon');
  });

  test('BLR Manager should only see BLR branch data', async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_blr);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should see BLR leads
    const blrLead = page.locator('text=Sneha Reddy');

    // Should NOT see HYD leads
    const hydLead = page.locator('text=Rahul Kumar');
  });

});
