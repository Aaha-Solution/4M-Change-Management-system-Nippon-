import { test, expect } from '@playwright/test';

test.describe('L2 Validation Workflow E2E Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login as admin, submit a new L2 validation log, and verify it is saved in the database', async ({ page }) => {
    // 1. Log in
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Click "L2" in the Level expandable menu (expand Level first if needed)
    const l2NavBtn = page.locator('nav button:has-text("L2")');
    const isL2Visible = await l2NavBtn.isVisible();
    if (!isL2Visible) {
      await page.locator('nav button:has-text("Level")').click();
    }
    await expect(l2NavBtn).toBeVisible();
    await l2NavBtn.click();

    // Verify L2 page is visible
    await expect(page.locator('h4').first()).toContainText('Add L2 Validation Log');

    // 3. Fill in the L2 Validation Log form
    const uniqueChangeNo = `4M-E2EL2-${Date.now().toString().substring(8)}`;
    await page.fill('label:has-text("4M Change No") + input', uniqueChangeNo);
    await page.fill('label:has-text("Requested Date") + input', '01 June');
    await page.fill('label:has-text("Change Request By") + input', 'Kumar Selvam');
    
    // Status Select
    await page.locator('label:has-text("Approver Validation Status") + select').selectOption('Accepted');

    // Remarks
    const uniqueRemarks = `E2E L2 validation comments: checks passed successfully at ${Date.now()}`;
    await page.fill('label:has-text("Remarks") + textarea', uniqueRemarks);

    // Submit L2 validation log
    await page.click('button:has-text("Save Validation Log")');

    // Verify success toast message is shown
    await expect(page.locator(`text=Successfully saved L2 validation log for ${uniqueChangeNo}`)).toBeVisible();

    // Verify the newly created L2 log is listed in the L2 logs table
    const tableBody = page.locator('tbody').last();
    await expect(tableBody).toContainText(uniqueChangeNo);
    await expect(tableBody).toContainText(uniqueRemarks);
  });
});
