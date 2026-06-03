import { test, expect } from '@playwright/test';

test.describe('Change Management System Full Lifecycle E2E Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should execute the entire L1 -> L2 -> L3 -> Effectiveness lifecycle successfully', async ({ page }) => {
    // 1. Log in as Admin
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to L1 and submit a new Change Request
    const l1NavBtn = page.locator('nav button:has-text("L1")');
    const isL1Visible = await l1NavBtn.isVisible();
    if (!isL1Visible) {
      await page.locator('nav button:has-text("Level")').click();
    }
    await expect(l1NavBtn).toBeVisible();
    await l1NavBtn.click();

    // Verify L1 page is visible
    await expect(page.locator('h3')).toContainText('New L1 Change Request');

    // Fill L1 fields
    await page.locator('label:has-text("Unit") + select').selectOption('Unit 1');
    await page.locator('label:has-text("Machine") input[type="checkbox"]').check();
    await page.locator('label:has-text("Method") input[type="checkbox"]').check();
    await page.locator('label:has-text("Change Request Dept") + select').selectOption('PED');
    await page.locator('label:has-text("Change Request By") + select').selectOption('Kumar Selvam');
    
    await page.locator('label:has-text("Process Name") + div select').selectOption('Welding Line A');
    await page.fill('input[placeholder="e.g. Line 3 / Bay B"]', 'Bay 9');
    await page.locator('label:has-text("Machine No") + div select').selectOption('MFG-MC-1042');

    // Extract the generated Change No from the UI
    const subheaderText = await page.locator('p:has-text("Change No:")').textContent();
    const changeNoMatch = subheaderText.match(/4M-2026-\d+/);
    const changeNo = changeNoMatch ? changeNoMatch[0] : '';
    console.log(`[E2E Lifecycle] Generated Change No: ${changeNo}`);

    await page.fill('textarea[placeholder^="Brief description of WHY this change is needed"]', 'Full Flow Test Context');
    await page.fill('textarea[placeholder^="Describe the change"]', 'Full flow E2E description describing the change details.');

    await page.locator('label:has-text("Change Improvement Area") + select').selectOption('Quality');
    await page.locator('label:has-text("Permanent / Temporary Change") + select').selectOption('Temporary');
    await page.fill('label:has-text("Implement / Change Date Start") + input', '01/06/2026');
    await page.fill('label:has-text("Part Traceability Details (From Changes)") + textarea', 'LOT-100: Initial trace.');
    await page.fill('label:has-text("Change Date Close") + input', '05/06/2026');
    await page.fill('label:has-text("Part Traceability Details (To Changes)") + textarea', 'LOT-110: Closure trace.');

    await page.fill('label:has-text("Risk Analysis") + textarea', 'Risk evaluation comments.');
    await page.fill('label:has-text("Update in SOP / WI / Control Plan / FMEA") + textarea', 'SOP comments.');
    await page.fill('label:has-text("User Dept HOD Approval") + textarea', 'HOD approval comments.');
    await page.locator('label:has-text("Customer Approval Required") + select').selectOption('No');
    await page.fill('label:has-text("Effectiveness Monitoring") + textarea', 'Observational checks.');

    // Submit L1
    await page.click('button[type="submit"]');

    // Verify redirect and toast
    await expect(page.locator('h2')).toContainText('Overview');
    await expect(page.locator('text=Successfully submitted L1 Change Request')).toBeVisible();

    // 3. Go to L2 Validation Workflow
    const l2NavBtn = page.locator('nav button:has-text("L2")');
    await l2NavBtn.click();
    await expect(page.locator('h4').first()).toContainText('Add L2 Validation Log');

    // Fill L2 validation form
    await page.fill('label:has-text("4M Change No") + input', changeNo);
    await page.fill('label:has-text("Requested Date") + input', '01 June');
    await page.fill('label:has-text("Change Request By") + input', 'Kumar Selvam');
    await page.locator('label:has-text("Approver Validation Status") + select').selectOption('Accepted');
    await page.fill('label:has-text("Remarks") + textarea', 'L2 validation comments for full lifecycle E2E.');
    await page.click('button:has-text("Save Validation Log")');

    // Verify L2 success toast
    await expect(page.locator(`text=Successfully saved L2 validation log for ${changeNo}`)).toBeVisible();

    // 4. Go to L3 Request Tracker
    const l3NavBtn = page.locator('nav button:has-text("L3")');
    await l3NavBtn.click();
    await expect(page.locator('h4').first()).toContainText('Add L3 Approval Log');

    // Select our newly validated change request row
    const row = page.locator(`tr:has-text("${changeNo}")`).first();
    await expect(row).toBeVisible();
    await row.click();

    // Log Production HOD approval
    await page.selectOption('label:has-text("Acting Department (Admin)") + select', 'Production');
    await page.selectOption('label:has-text("Approval Status") + select', 'Approved');
    await page.click('button:has-text("Save Approval Log")');
    await expect(page.locator(`text=Successfully saved Production approval log for ${changeNo}`)).toBeVisible();

    // Select our change row again for Unit Head sign-off
    await row.click();
    await page.selectOption('label:has-text("Acting Department (Admin)") + select', 'Unit Head');
    await page.selectOption('label:has-text("Approval Status") + select', 'Approved');
    await page.click('button:has-text("Save Approval Log")');
    await expect(page.locator(`text=Successfully saved Unit Head approval log for ${changeNo}`)).toBeVisible();

    // 5. Go to Effectiveness tab
    await page.locator('nav button:has-text("Effectiveness")').click();
    await expect(page.locator('h3', { hasText: 'Effectiveness Monitoring' })).toBeVisible();

    // Select our approved change ID in the dropdown
    await page.locator('div.space-y-1:has-text("4M Change No") select').selectOption(changeNo);
    await page.fill('input[type="month"]', '2026-06');
    await page.fill('textarea[placeholder="Enter evaluation remarks/results..."]', 'System operates correctly post implementation.');
    await page.locator('div.space-y-1:has-text("Effectiveness Status") select').selectOption('Effectiveness Ok');
    await page.locator('div.space-y-1:has-text("QA Approval Decision") select').selectOption('Approved');
    await page.click('button:has-text("Add Log Entry")');

    // Verify it is listed in the logs table
    const logsTable = page.locator('tbody').last();
    await expect(logsTable).toContainText(changeNo);
  });
});
