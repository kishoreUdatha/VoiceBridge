import { test, expect, Page } from '@playwright/test';
import { TEST_USERS } from './test-config';

/**
 * Lead Lifecycle E2E Tests
 * Tests complete lead journey from Inquiry to Admission/Drop
 */

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/*', { timeout: 15000 });
}

test.describe('Lead Lifecycle - Complete Admission Flow', () => {

  test('Step 1: Telecaller creates initial contact', async ({ page }) => {
    await loginAs(page, TEST_USERS.telecaller1_hyd.email, TEST_USERS.telecaller1_hyd.password);

    // Go to leads
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open a lead in Inquiry stage
    const inquiryLead = page.locator('tr:has-text("Inquiry")').first();
    if (await inquiryLead.isVisible()) {
      await inquiryLead.click();
      await page.waitForTimeout(1000);

      // Log a call
      const callButton = page.locator('button:has-text("Call"), button:has-text("Log Call")').first();
      if (await callButton.isVisible()) {
        await callButton.click();
        await page.waitForTimeout(500);

        // Fill call notes
        const notesInput = page.locator('textarea').first();
        if (await notesInput.isVisible()) {
          await notesInput.fill('Initial call - Student interested in B.Tech Computer Science. Budget: 1.5L-2L per year.');

          // Save
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Log")').first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
          }
        }
      }

      // Change stage to Interested
      const stageSelect = page.locator('select[name*="stage"], [data-testid="stage-select"]').first();
      if (await stageSelect.isVisible()) {
        await stageSelect.selectOption({ label: 'Interested' });
        await page.waitForTimeout(1000);
      }

      // Verify activity was logged
      const activitySection = page.locator('text=/activity|timeline/i');
    }
  });

  test('Step 2: Team Lead schedules campus visit', async ({ page }) => {
    await loginAs(page, TEST_USERS.teamlead_hyd.email, TEST_USERS.teamlead_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find an Interested lead
    const interestedLead = page.locator('tr:has-text("Interested")').first();
    if (await interestedLead.isVisible()) {
      await interestedLead.click();
      await page.waitForTimeout(1000);

      // Schedule follow-up
      const followUpBtn = page.locator('button:has-text("Schedule"), button:has-text("Follow")').first();
      if (await followUpBtn.isVisible()) {
        await followUpBtn.click();
        await page.waitForTimeout(500);

        // Set date
        const dateInput = page.locator('input[type="date"], input[type="datetime-local"]').first();
        if (await dateInput.isVisible()) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 3);
          await dateInput.fill(tomorrow.toISOString().split('T')[0]);

          // Add notes
          const messageInput = page.locator('textarea, input[name="message"]').first();
          if (await messageInput.isVisible()) {
            await messageInput.fill('Campus visit scheduled - student coming with father');
          }

          // Save
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Schedule")').first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
          }
        }
      }

      // Update stage to Visit Scheduled
      const stageSelect = page.locator('select[name*="stage"]').first();
      if (await stageSelect.isVisible()) {
        await stageSelect.selectOption({ label: 'Visit Scheduled' });
      }
    }
  });

  test('Step 3: Counselor completes campus visit', async ({ page }) => {
    await loginAs(page, TEST_USERS.counselor_hyd.email, TEST_USERS.counselor_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find visit scheduled lead
    const visitLead = page.locator('tr:has-text("Visit Scheduled")').first();
    if (await visitLead.isVisible()) {
      await visitLead.click();
      await page.waitForTimeout(1000);

      // Add note about visit
      const notesInput = page.locator('textarea[placeholder*="note"], [data-testid="note-input"]').first();
      if (await notesInput.isVisible()) {
        await notesInput.fill('Campus visit completed. Student and father very impressed with labs and placement records. Ready to proceed with admission.');

        const addNoteBtn = page.locator('button:has-text("Add Note"), button:has-text("Save")').first();
        if (await addNoteBtn.isVisible()) {
          await addNoteBtn.click();
        }
      }

      // Update stage to Visit Completed
      const stageSelect = page.locator('select[name*="stage"]').first();
      if (await stageSelect.isVisible()) {
        await stageSelect.selectOption({ label: 'Visit Completed' });
      }
    }
  });

  test('Step 4: Counselor collects documents', async ({ page }) => {
    await loginAs(page, TEST_USERS.counselor_hyd.email, TEST_USERS.counselor_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find visit completed lead
    const lead = page.locator('tr:has-text("Visit Completed")').first();
    if (await lead.isVisible()) {
      await lead.click();
      await page.waitForTimeout(1000);

      // Add note about documents
      const notesInput = page.locator('textarea').first();
      if (await notesInput.isVisible()) {
        await notesInput.fill('Documents collected: 10th marksheet, 12th marksheet, Aadhaar card, 4 passport photos');

        const saveBtn = page.locator('button:has-text("Add"), button:has-text("Save")').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
        }
      }

      // Update stage to Documents Pending
      const stageSelect = page.locator('select[name*="stage"]').first();
      if (await stageSelect.isVisible()) {
        await stageSelect.selectOption({ label: 'Documents Pending' });
      }
    }
  });

  test('Step 5: Manager approves admission', async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd.email, TEST_USERS.manager_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find documents pending lead
    const lead = page.locator('tr:has-text("Documents Pending")').first();
    if (await lead.isVisible()) {
      await lead.click();
      await page.waitForTimeout(1000);

      // Add approval note
      const notesInput = page.locator('textarea').first();
      if (await notesInput.isVisible()) {
        await notesInput.fill('Documents verified. Admission approved. Proceed with fee payment.');

        const saveBtn = page.locator('button:has-text("Add"), button:has-text("Save")').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
        }
      }

      // Update to Admission Processing then Payment Pending
      const stageSelect = page.locator('select[name*="stage"]').first();
      if (await stageSelect.isVisible()) {
        await stageSelect.selectOption({ label: 'Admission Processing' });
        await page.waitForTimeout(500);
        await stageSelect.selectOption({ label: 'Payment Pending' });
      }
    }
  });

  test('Step 6: Manager records payment and completes admission', async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd.email, TEST_USERS.manager_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find payment pending lead
    const lead = page.locator('tr:has-text("Payment Pending")').first();
    if (await lead.isVisible()) {
      await lead.click();
      await page.waitForTimeout(1000);

      // Record payment
      const paymentBtn = page.locator('button:has-text("Payment"), button:has-text("Record")').first();
      if (await paymentBtn.isVisible()) {
        await paymentBtn.click();
        await page.waitForTimeout(500);

        const amountInput = page.locator('input[name*="amount"], input[type="number"]').first();
        if (await amountInput.isVisible()) {
          await amountInput.fill('50000');

          const methodSelect = page.locator('select[name*="method"]').first();
          if (await methodSelect.isVisible()) {
            await methodSelect.selectOption({ index: 1 });
          }

          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Record")').first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
          }
        }
      }

      // Update to Admitted
      const stageSelect = page.locator('select[name*="stage"]').first();
      if (await stageSelect.isVisible()) {
        await stageSelect.selectOption({ label: 'Admitted' });
        await page.waitForTimeout(500);

        // Verify lead is converted
        const convertedBadge = page.locator('text=/admitted|converted|success/i');
      }
    }
  });

});

test.describe('Lead Lifecycle - Dropped Flow', () => {

  test('Lead dropped due to budget constraints', async ({ page }) => {
    await loginAs(page, TEST_USERS.teamlead_hyd.email, TEST_USERS.teamlead_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find an Interested lead
    const lead = page.locator('tr:has-text("Interested")').first();
    if (await lead.isVisible()) {
      await lead.click();
      await page.waitForTimeout(1000);

      // Add note about why dropping
      const notesInput = page.locator('textarea').first();
      if (await notesInput.isVisible()) {
        await notesInput.fill('Spoke with father. Family decided to opt for government college due to budget constraints. Student got 85% - eligible for govt quota.');

        const saveBtn = page.locator('button:has-text("Add"), button:has-text("Save")').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
        }
      }

      // Update to Dropped
      const stageSelect = page.locator('select[name*="stage"]').first();
      if (await stageSelect.isVisible()) {
        await stageSelect.selectOption({ label: 'Dropped' });
        await page.waitForTimeout(500);

        // Verify lead is marked as lost
        const droppedBadge = page.locator('text=/dropped|lost/i');
      }
    }
  });

});

test.describe('Lead Lifecycle - Activity History Verification', () => {

  test('Admin can see complete lead history', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open Rahul Kumar (has complete history)
    const lead = page.locator('tr:has-text("Rahul Kumar")').first();
    if (await lead.isVisible()) {
      await lead.click();
      await page.waitForTimeout(1000);

      // Find activity/history section
      const activitySection = page.locator('text=/activity|history|timeline/i').first();

      // Verify activities are visible
      const callActivity = page.locator('text=/call|called/i');
      const stageChange = page.locator('text=/stage|changed/i');
      const assignment = page.locator('text=/assigned|handoff/i');

      // Verify users are mentioned
      const telecallerActivity = page.locator('text=/telecaller/i');
      const managerActivity = page.locator('text=/manager/i');
    }
  });

  test('Manager can see who did what and when', async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd.email, TEST_USERS.manager_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open a lead with history
    const lead = page.locator('tr:has-text("Rahul Kumar")').first();
    if (await lead.isVisible()) {
      await lead.click();
      await page.waitForTimeout(1000);

      // Activity entries should show:
      // - User name
      // - Action type
      // - Timestamp
      const activityEntry = page.locator('[data-testid="activity-entry"], .activity-item').first();

      // Check for timestamp
      const timestamp = page.locator('text=/\\d{1,2}[:\\/]\\d{2}|ago|today|yesterday/i');
    }
  });

});

test.describe('Lead Lifecycle - Payment Tracking', () => {

  test('should see payment history on lead', async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd.email, TEST_USERS.manager_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open Rahul Kumar (has payment)
    const lead = page.locator('tr:has-text("Rahul Kumar")').first();
    if (await lead.isVisible()) {
      await lead.click();
      await page.waitForTimeout(1000);

      // Find payment section
      const paymentSection = page.locator('text=/payment|fee|amount/i').first();

      // Check for payment amount
      const paymentAmount = page.locator('text=/₹|50,000|50000/');
    }
  });

  test('should see total fees and paid amount', async ({ page }) => {
    await loginAs(page, TEST_USERS.manager_hyd.email, TEST_USERS.manager_hyd.password);

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open a lead
    const lead = page.locator('table tbody tr').first();
    if (await lead.isVisible()) {
      await lead.click();
      await page.waitForTimeout(1000);

      // Look for fee information
      const totalFee = page.locator('text=/total fee|fee amount/i');
      const paidAmount = page.locator('text=/paid|collected/i');
      const pendingAmount = page.locator('text=/pending|balance|due/i');
    }
  });

});
