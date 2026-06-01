import { test, expect } from '@playwright/test';

test.describe('L1 Change Request E2E Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login as admin, submit a new L1 change request, and verify it is saved in the database', async ({ page }) => {
    // 1. Log in
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Click "L1" in the Level expandable menu (expand Level first if needed)
    const l1NavBtn = page.locator('nav button:has-text("L1")');
    const isL1Visible = await l1NavBtn.isVisible();
    if (!isL1Visible) {
      await page.locator('nav button:has-text("Level")').click();
    }
    await expect(l1NavBtn).toBeVisible();
    await l1NavBtn.click();

    // Verify L1 page is visible
    await expect(page.locator('h3')).toContainText('New L1 Change Request');

    // 3. Fill in the L1 form
    // Select Unit
    await page.locator('label:has-text("Unit") + select').selectOption('Unit 1');
    
    // Check some Change In checkboxes
    await page.locator('label:has-text("Machine") input[type="checkbox"]').check();
    await page.locator('label:has-text("Method") input[type="checkbox"]').check();

    // Select Department
    await page.locator('label:has-text("Change Request Dept") + select').selectOption('PED');

    // Select Requester Name
    await page.locator('label:has-text("Change Request By") + select').selectOption('Kumar Selvam');

    // Process details
    await page.fill('input[placeholder="e.g. Welding Line A"]', 'Assembly Line 5');
    await page.fill('input[placeholder="e.g. Line 3 / Bay B"]', 'Bay 12');
    await page.fill('input[placeholder="e.g. MFG-MC-1042"]', 'MCH-8822');

    // Extract the generated Change No from the UI
    const subheaderText = await page.locator('p:has-text("Change No:")').textContent();
    const changeNoMatch = subheaderText.match(/4M-2026-\d+/);
    const changeNo = changeNoMatch ? changeNoMatch[0] : '';

    // Context & Description
    const uniqueContext = `L1 Automation Context ${Date.now()}`;
    await page.fill('textarea[placeholder^="Brief description of WHY this change is needed"]', uniqueContext);
    await page.fill('textarea[placeholder^="Describe the change"]', 'This is a long detailed description for the L1 automation test. We are verifying database integration.');

    // Timeline
    await page.locator('label:has-text("Change Improvement Area") + select').selectOption('Quality');
    await page.locator('label:has-text("Permanent / Temporary Change") + select').selectOption('Temporary');
    await page.fill('label:has-text("Implement / Change Date Start") + input', '01/06/2026');
    await page.fill('label:has-text("Part Traceability Details (From Changes)") + textarea', 'LOT-100: Initial batch of 100 parts trace.');
    await page.fill('label:has-text("Change Date Close") + input', '05/06/2026');
    await page.fill('label:has-text("Part Traceability Details (To Changes)") + textarea', 'LOT-110: Closure batch of 110 parts trace.');

    // Risk Analysis
    await page.fill('label:has-text("Risk Analysis") + textarea', 'Potential minor startup latency on line 5.');
    await page.fill('label:has-text("Update in SOP / WI / Control Plan / FMEA") + textarea', 'SOP and WI needs to be updated for line 5 operation.');
    await page.fill('label:has-text("User Dept HOD Approval") + textarea', 'Approved by HOD Ramanan.');
    await page.locator('label:has-text("Customer Approval Required") + select').selectOption('No');
    await page.fill('label:has-text("Effectiveness Monitoring") + textarea', 'Measured by cycle time checks over 3 days.');

    // Submit L1 Request
    await page.click('button[type="submit"]');

    // Verify redirected back to dashboard overview and toast message is shown
    await expect(page.locator('h2')).toContainText('Overview');
    await expect(page.locator('text=Successfully submitted L1 Change Request')).toBeVisible();

    // Verify the newly created L1 request is listed in the dashboard changes table
    const tableBody = page.locator('tbody').first();
    await expect(tableBody).toContainText(changeNo);
  });
});
