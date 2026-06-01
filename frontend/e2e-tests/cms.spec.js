import { test, expect } from '@playwright/test';

test.describe('Change Management System E2E Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set desktop window size so header/sidebar buttons are visible
    await page.setViewportSize({ width: 1280, height: 720 });
    // Navigate to the app before each test
    await page.goto('/');
  });

  test('should display error message on invalid login', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('#email', 'invalid@cms.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message is visible
    const errorAlert = page.locator('form + div, .animate-alert-shake');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Invalid email or password.');
  });

  test('should login successfully as Admin, add a change request, and logout', async ({ page }) => {
    // 1. Log in
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Verify redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify welcome message/overview title
    await expect(page.locator('h2')).toContainText('Overview');
    // Email is always visible in the header
    await expect(page.locator('header span:has-text("admin@cms.com")')).toBeVisible();

    // 2. Click "Request Change" in the header (visible on dashboard tab)
    await page.locator('header button:has-text("Request Change")').click();

    // Verify we are on the creation tab / form is visible
    await expect(page.locator('h2')).toContainText('Request New Change');

    // 3. Fill in the form
    const uniqueTitle = `E2E Test Change Request ${Date.now()}`;
    await page.fill('#form-title', uniqueTitle);
    await page.click('button:has-text("High")');
    await page.click('button[type="submit"]');

    // Form submission should redirect back to overview with a toast showing new CHG ID
    await expect(page.locator('h2')).toContainText('Overview');

    // Verify the toast shows the new change request ID
    await expect(page.locator('text=Created request:')).toBeVisible({ timeout: 4000 });

    // 4. Sign Out
    await page.click('button[title="Sign Out"]');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h2')).toContainText('Welcome Back');
  });

  test('should remember email and check state if Remember Me is checked', async ({ page }) => {
    // Clear localStorage to start clean
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Check pre-fill is empty initially
    await expect(page.locator('#email')).toHaveValue('');
    await expect(page.locator('#rememberMe')).not.toBeChecked();

    // Log in with Remember Me checked
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.check('#rememberMe');
    await page.click('button[type="submit"]');

    // Redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Sign out
    await page.click('button[title="Sign Out"]');
    await expect(page).toHaveURL(/\/$/);

    // Verify email is pre-filled and checkbox is checked
    await expect(page.locator('#email')).toHaveValue('admin@cms.com');
    await expect(page.locator('#rememberMe')).toBeChecked();
  });

  test('should NOT remember email if Remember Me is unchecked', async ({ page }) => {
    // Clear localStorage to start clean
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Log in with Remember Me UNCHECKED
    await page.fill('#email', 'manager@cms.com');
    await page.fill('#password', 'manager123');
    await expect(page.locator('#rememberMe')).not.toBeChecked();
    await page.click('button[type="submit"]');

    // Redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Sign out
    await page.click('button[title="Sign Out"]');
    await expect(page).toHaveURL(/\/$/);

    // Verify email is empty and checkbox is unchecked
    await expect(page.locator('#email')).toHaveValue('');
    await expect(page.locator('#rememberMe')).not.toBeChecked();
  });

  test('should edit user details successfully as Admin', async ({ page }) => {
    // 1. Log in
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Verify redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Navigate to "Users" tab
    await page.click('button:has-text("Users")');
    await expect(page.locator('h3', { hasText: 'User Management' })).toBeVisible();

    // 3. Find the user row for Priya Venkat (priya.v@plant.com)
    const row = page.locator('tr', { hasText: 'priya.v@plant.com' });
    await expect(row).toBeVisible();

    // Click the edit button inside this row (Edit Account title button)
    await row.locator('button[title="Edit Account"]').click();

    // 4. Verify the Edit User Modal is visible
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit User Account' });
    await expect(modal).toBeVisible();

    // 5. Change Full Name, Department, and Status
    await modal.locator('label:has-text("Full Name") + input').fill('Priya Venkat Edited');
    await modal.locator('label:has-text("Status") + select').selectOption('Inactive');

    // Save changes
    await modal.locator('button:has-text("Save Changes")').click();

    // 6. Verify success toast and table updates
    await expect(page.locator('text=User updated successfully.')).toBeVisible();
    await expect(row).toContainText('Priya Venkat Edited');
    await expect(row).toContainText('Inactive');

    // 7. Clean up: Re-edit to active state
    await row.locator('button[title="Edit Account"]').click();
    await modal.locator('label:has-text("Full Name") + input').fill('Priya Venkat');
    await modal.locator('label:has-text("Status") + select').selectOption('Active');
    await modal.locator('button:has-text("Save Changes")').click();
    await expect(page.locator('text=User updated successfully.')).toBeVisible();
  });

  test('should perform full Admin workflow across all tabs', async ({ page }) => {
    // 1. Log in as Admin
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Add a new change request via the header button (visible on dashboard tab)
    await page.locator('header button:has-text("Request Change")').click();
    await expect(page.locator('h2')).toContainText('Request New Change');

    const uniqueTitle = `E2E Refactor Admin Workflow ${Date.now()}`;
    await page.fill('#form-title', uniqueTitle);
    await page.click('button:has-text("High")');
    await page.click('button[type="submit"]');

    // Confirm redirected to Dashboard Overview
    await expect(page.locator('h2')).toContainText('Overview');

    // Get the new change ID from the toast message (format: "Created request: CHG-XXXX")
    const toastLocator = page.locator('text=Created request:');
    await expect(toastLocator).toBeVisible({ timeout: 4000 });
    const toastText = await toastLocator.textContent();
    const changeIdMatch = toastText.match(/(CHG-\d+|4M-\d+-\d+)/);
    const changeId = changeIdMatch ? changeIdMatch[1] : 'CHG-0000';
    console.log(`Created Change Request ID: ${changeId}`);
    // Verify the change ID is in the AllRequests table
    await page.locator('nav button:has-text("All Requests")').click();
    const tableBody = page.locator('tbody').first();
    await expect(tableBody).toContainText(changeId);

    // 3. Go to L2 Approvals and save validation
    // Ensure the Level submenu is expanded (click Level only if L2 button is not yet visible)
    const l2NavBtn = page.locator('nav button:has-text("L2")');
    const isL2Visible = await l2NavBtn.isVisible();
    if (!isL2Visible) {
      await page.locator('nav button:has-text("Level")').click();
    }
    await expect(l2NavBtn).toBeVisible();
    await l2NavBtn.click();
    
    // Fill out the validation form for this change ID
    await page.fill('label:has-text("4M Change No") + input', changeId);
    await page.fill('label:has-text("Requested Date") + input', '01 June');
    await page.fill('label:has-text("Change Request By") + input', 'Admin User');
    await page.locator('label:has-text("Approver Validation Status") + select').selectOption('Accepted');
    await page.fill('label:has-text("Remarks") + textarea', 'L2 validation successfully completed for E2E flow.');
    await page.click('button:has-text("Save Validation Log")');

    // Verify success toast message is shown
    await expect(page.locator(`text=Successfully saved L2 validation log for ${changeId}`)).toBeVisible();


    // 4. Go to Effectiveness tab and log observation
    await page.locator('nav button:has-text("Effectiveness")').click();
    await expect(page.locator('h3', { hasText: 'Effectiveness Monitoring' })).toBeVisible();

    // Fill out the observation form
    await page.locator('div.space-y-1:has-text("4M Change No") select').selectOption(changeId);
    await page.fill('input[type="month"]', '2026-05');
    await page.fill('textarea[placeholder="Enter evaluation remarks/results..."]', 'Observed system performance. Response times normalized and DB replication is stable.');
    // Note: Attachment input is readOnly (populated via file upload), so we skip it
    await page.locator('div.space-y-1:has-text("Effectiveness Status") select').selectOption('Effectiveness Ok');
    await page.locator('div.space-y-1:has-text("QA Approval Decision") select').selectOption('Approved');
    await page.click('button:has-text("Add Log Entry")');

    // Verify it is listed in the logs table
    const logsTable = page.locator('tbody').last();
    await expect(logsTable).toContainText(changeId);


    // 5. Go to Reports tab
    await page.locator('nav button:has-text("Reports")').click();
    await expect(page.locator('h3', { hasText: 'Reporting Analytics' })).toBeVisible();
    await expect(page.locator('h5:has-text("Total Logged Changes") + p')).toBeVisible();

    // 6. Go to Users tab and add a custom role, department, and user
    await page.locator('nav button:has-text("Users")').click();
    await expect(page.locator('h3', { hasText: 'User Management' })).toBeVisible();

    // Add role
    await page.locator('button:has-text("+")').nth(0).click();
    const roleModal = page.locator('div.fixed').filter({ hasText: 'Create Custom Role' });
    await roleModal.locator('input').fill('Support Specialist');
    await roleModal.locator('button:has-text("Add Role")').click();

    // Add department
    await page.locator('button:has-text("+")').nth(1).click();
    const deptModal = page.locator('div.fixed').filter({ hasText: 'Create Custom Department' });
    await deptModal.locator('input').fill('Customer Support');
    await deptModal.locator('button:has-text("Add Department")').click();

    // Create user account
    await page.locator('div.space-y-1:has-text("Full Name *") input').fill('Workflow Test User');
    await page.locator('div.space-y-1:has-text("Email Address *") input').fill('wf.test.user@cms.com');
    await page.locator('div.space-y-1:has-text("Password *") input').fill('password123');
    await page.locator('div.space-y-1:has-text("Role *") select').selectOption('Support Specialist');
    await page.locator('div.space-y-1:has-text("Department *") select').selectOption('Customer Support');
    await page.click('button:has-text("Create Account")');

    // Verify user is in list
    const userRow = page.locator('tr', { hasText: 'wf.test.user@cms.com' });
    await expect(userRow).toBeVisible();

    // Clean up user
    await userRow.locator('button[title="Delete Account"]').click();
    await page.click('button:has-text("Delete User")');

    // Clean up role
    await page.locator('button:has-text("+")').nth(0).click();
    const roleRow = page.locator('div:has-text("Support Specialist")').last();
    await roleRow.locator('button[title="Remove role option"]').click();
    await page.click('button:has-text("Cancel")');

    // Clean up department
    await page.locator('button:has-text("+")').nth(1).click();
    const deptRow = page.locator('div:has-text("Customer Support")').last();
    await deptRow.locator('button[title="Remove department option"]').click();
    await page.click('button:has-text("Cancel")');

    // 7. Go to Settings tab
    await page.locator('nav button:has-text("Settings")').click();
    await expect(page.locator('h3', { hasText: 'System Settings' })).toBeVisible();
    await expect(page.locator('main span:has-text("admin@cms.com")')).toBeVisible();

    // 8. Log out
    await page.click('button[title="Sign Out"]');
    await expect(page).toHaveURL(/\/$/);
  });

});
