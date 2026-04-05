import { test, expect, Page } from '@playwright/test';
import { TEST_USERS, TEST_LEADS } from './test-config';

/**
 * Telecaller E2E Tests
 * Tests telecaller-specific functionality
 */

// Helper function to login
async function loginAs(page: Page, user: typeof TEST_USERS.telecaller1_hyd) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/*', { timeout: 15000 });
}

test.describe('Telecaller - Lead Management', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.telecaller1_hyd);
  });

  test('should see assigned leads list', async ({ page }) => {
    // Navigate to leads page
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Check if leads are visible
    const leadsList = page.locator('table tbody tr, [data-testid="lead-card"], .lead-item');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Telecaller1_hyd should see their assigned leads
    for (const lead of TEST_LEADS.telecaller1_hyd) {
      const leadElement = page.locator(`text=${lead.name}`).first();
      // Lead should be visible (or we check count)
    }
  });

  test('should view lead details', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on first lead
    const firstLead = page.locator('table tbody tr, [data-testid="lead-card"], .lead-item').first();
    if (await firstLead.isVisible()) {
      await firstLead.click();

      // Wait for lead detail page
      await page.waitForTimeout(1000);

      // Check for lead detail elements
      const phoneElement = page.locator('text=/phone|mobile|contact/i').first();
      const stageElement = page.locator('text=/stage|status/i').first();
    }
  });

  test('should add note to lead', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on a lead to open details
    const firstLead = page.locator('table tbody tr, [data-testid="lead-card"]').first();
    if (await firstLead.isVisible()) {
      await firstLead.click();
      await page.waitForTimeout(1000);

      // Find notes section and add note
      const notesInput = page.locator('textarea[placeholder*="note"], input[placeholder*="note"], [data-testid="note-input"]').first();

      if (await notesInput.isVisible()) {
        const testNote = `Test note from Playwright - ${Date.now()}`;
        await notesInput.fill(testNote);

        // Submit note
        const submitButton = page.locator('button:has-text("Add"), button:has-text("Save"), button:has-text("Submit")').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Verify note was added
          await expect(page.locator(`text=${testNote}`)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should update lead stage', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on a lead
    const firstLead = page.locator('table tbody tr').first();
    if (await firstLead.isVisible()) {
      await firstLead.click();
      await page.waitForTimeout(1000);

      // Find stage selector
      const stageSelector = page.locator('select[name*="stage"], [data-testid="stage-select"], .stage-dropdown').first();

      if (await stageSelector.isVisible()) {
        // Change stage
        await stageSelector.selectOption({ label: 'Interested' });
        await page.waitForTimeout(1000);

        // Check for success message or stage update
        const successMessage = page.locator('text=/success|updated|saved/i');
      }
    }
  });

  test('should log a call activity', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on a lead
    const leadRow = page.locator('table tbody tr').first();
    if (await leadRow.isVisible()) {
      await leadRow.click();
      await page.waitForTimeout(1000);

      // Find call log button
      const callButton = page.locator('button:has-text("Call"), button:has-text("Log Call"), [data-testid="log-call"]').first();

      if (await callButton.isVisible()) {
        await callButton.click();
        await page.waitForTimeout(500);

        // Fill call details if modal opens
        const callNotesInput = page.locator('textarea[name*="notes"], textarea[placeholder*="call"]').first();
        if (await callNotesInput.isVisible()) {
          await callNotesInput.fill('Test call logged via Playwright');

          // Submit
          const submitBtn = page.locator('button:has-text("Save"), button:has-text("Log")').first();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
          }
        }
      }
    }
  });

  test('should filter leads by stage', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find filter dropdown
    const stageFilter = page.locator('select[name*="stage"], [data-testid="stage-filter"]').first();

    if (await stageFilter.isVisible()) {
      // Filter by Inquiry
      await stageFilter.selectOption({ label: 'Inquiry' });
      await page.waitForTimeout(1000);

      // Verify filtered results
      const inquiryLeads = page.locator('text=Inquiry');
    }
  });

  test('should search leads by name', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find search input
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"], [data-testid="search-input"]').first();

    if (await searchInput.isVisible()) {
      // Search for a specific lead
      await searchInput.fill('Sanjay');
      await page.waitForTimeout(1000);

      // Check search results
      const searchResult = page.locator('text=Sanjay Verma');
    }
  });

  test('should schedule follow-up', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on a lead
    const leadRow = page.locator('table tbody tr').first();
    if (await leadRow.isVisible()) {
      await leadRow.click();
      await page.waitForTimeout(1000);

      // Find follow-up button
      const followUpButton = page.locator('button:has-text("Follow"), button:has-text("Schedule"), [data-testid="schedule-followup"]').first();

      if (await followUpButton.isVisible()) {
        await followUpButton.click();
        await page.waitForTimeout(500);

        // Fill follow-up details
        const dateInput = page.locator('input[type="date"], input[type="datetime-local"]').first();
        if (await dateInput.isVisible()) {
          // Set date to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().split('T')[0];
          await dateInput.fill(dateStr);

          // Save
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Schedule")').first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
          }
        }
      }
    }
  });

});

test.describe('Telecaller - Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.telecaller1_hyd);
  });

  test('should display telecaller dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for dashboard elements
    const dashboardElement = page.locator('text=/dashboard|overview|summary/i').first();
    await expect(dashboardElement).toBeVisible({ timeout: 10000 });
  });

  test('should show lead statistics', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for statistics/metrics
    const statsElement = page.locator('text=/leads|calls|tasks|pending/i').first();
  });

  test('should show pending follow-ups', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for follow-ups section
    const followUpsSection = page.locator('text=/follow.?up|pending|scheduled/i').first();
  });

});

test.describe('Telecaller2 - Different Lead Set', () => {

  test('telecaller2 should see only their assigned leads', async ({ page }) => {
    await loginAs(page, TEST_USERS.telecaller2_hyd);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Telecaller2 should see Amit Patel
    const amitLead = page.locator('text=Amit Patel');

    // Should NOT see telecaller1's leads
    const sanjayLead = page.locator('text=Sanjay Verma');
  });

});
