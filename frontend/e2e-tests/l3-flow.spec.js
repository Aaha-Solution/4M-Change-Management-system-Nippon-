import { test, expect } from '@playwright/test';

test.describe('L3 Approval Matrix E2E Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login as admin, navigate to L3, select a change request, log approval, and verify details', async ({ page }) => {
    // 1. Log in
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Click "L3" in the Level expandable menu (expand Level first if needed)
    const l3NavBtn = page.locator('nav button:has-text("L3")');
    const isL3Visible = await l3NavBtn.isVisible();
    if (!isL3Visible) {
      await page.locator('nav button:has-text("Level")').click();
    }
    await expect(l3NavBtn).toBeVisible();
    await l3NavBtn.click();

    // Verify L3 page is visible
    await expect(page.locator('h4').first()).toContainText('Add L3 Approval Log');

    // 3. Select a change request row that is L2 validated
    const row = page.locator('tr:has-text("4M-2026-248")').first();
    await expect(row).toBeVisible();
    await row.click();

    // Verify the form is populated with the selected row's data
    await expect(page.locator('input[placeholder="Click a row to select"]').first()).toHaveValue('4M-2026-248');

    // 4. Admin acting department: toggle to Production HOD (Production) and select Approved
    await page.selectOption('label:has-text("Acting Department (Admin)") + select', 'Production');
    
    // Approval Status Select
    await page.selectOption('label:has-text("Approval Status") + select', 'Approved');

    // Save log
    await page.click('button:has-text("Save Approval Log")');

    // Verify success toast message is shown
    await expect(page.locator('text=Successfully saved Production approval log for 4M-2026-248')).toBeVisible();
  });
});
