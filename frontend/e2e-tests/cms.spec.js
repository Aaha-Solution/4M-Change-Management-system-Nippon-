import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

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

    // 2. Click "L1" in the Level expandable menu
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
    await page.locator('label:has-text("Unit") + select').selectOption('Unit 1');
    await page.locator('label:has-text("Machine") input[type="checkbox"]').check();
    await page.locator('label:has-text("Method") input[type="checkbox"]').check();
    await page.locator('label:has-text("Change Request Dept") + select').selectOption('PED');
    await page.locator('label:has-text("Change Request By") + select').selectOption('Kumar Selvam');
    
    await page.locator('label:has-text("Process Name") + div select').selectOption('Welding Line A');
    await page.fill('input[placeholder="e.g. Line 3 / Bay B"]', 'Bay 12');
    await page.locator('label:has-text("Machine No") + div select').selectOption('MFG-MC-1042');

    await page.fill('textarea[placeholder^="Brief description of WHY this change is needed"]', 'E2E Test Change Request');
    await page.fill('textarea[placeholder^="Describe the change"]', 'This is a long detailed description for the E2E test. We are verifying database integration.');

    // Generate valid future/present dates dynamically
    const today = new Date();
    const formatDate = (date) => {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    };
    const dateStartStr = formatDate(today);
    const dateCloseStr = formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

    await page.locator('label:has-text("Change Improvement Area") + select').selectOption('Quality');
    await page.locator('label:has-text("Permanent / Temporary Change") + select').selectOption('Temporary');
    await page.fill('label:has-text("Implement / Change Date Start") ~ div input', dateStartStr);
    await page.fill('label:has-text("Part Traceability Details (From Changes)") + textarea', 'LOT-100: Initial batch of 100 parts trace.');
    await page.fill('label:has-text("Change Date Close") ~ div input', dateCloseStr);
    await page.fill('label:has-text("Part Traceability Details (To Changes)") + textarea', 'LOT-110: Closure batch of 110 parts trace.');

    await page.fill('label:has-text("Risk Analysis") + textarea', 'Potential minor startup latency on line 5.');
    await page.fill('label:has-text("Update in SOP / WI / Control Plan / FMEA") + textarea', 'SOP and WI needs to be updated for line 5 operation.');
    await page.fill('label:has-text("User Dept HOD Approval") + textarea', 'Approved by HOD Ramananan.');
    await page.locator('label:has-text("Customer Approval Required") + select').selectOption('No');
    await page.fill('label:has-text("Effectiveness Monitoring") + textarea', 'Measured by cycle time checks over 3 days.');

    // Submit L1 Request
    await page.click('button[type="submit"]');

    // Form submission should redirect back to overview with a toast showing new CHG ID
    await expect(page.locator('h2')).toContainText('Overview');

    // Verify the toast shows the new change request ID
    await expect(page.locator('text=Successfully submitted L1 Change Request')).toBeVisible({ timeout: 4000 });

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

    // 2. Add a new change request via the L1 form
    const l1NavBtn = page.locator('nav button:has-text("L1")');
    const isL1Visible = await l1NavBtn.isVisible();
    if (!isL1Visible) {
      await page.locator('nav button:has-text("Level")').click();
    }
    await expect(l1NavBtn).toBeVisible();
    await l1NavBtn.click();

    // Verify L1 page is visible
    await expect(page.locator('h3')).toContainText('New L1 Change Request');

    // Fill in the L1 form
    await page.locator('label:has-text("Unit") + select').selectOption('Unit 1');
    await page.locator('label:has-text("Machine") input[type="checkbox"]').check();
    await page.locator('label:has-text("Method") input[type="checkbox"]').check();
    await page.locator('label:has-text("Change Request Dept") + select').selectOption('PED');
    await page.locator('label:has-text("Change Request By") + select').selectOption('Kumar Selvam');
    
    await page.locator('label:has-text("Process Name") + div select').selectOption('Welding Line A');
    await page.fill('input[placeholder="e.g. Line 3 / Bay B"]', 'Bay 12');
    await page.locator('label:has-text("Machine No") + div select').selectOption('MFG-MC-1042');

    // Extract the generated Change No from the UI
    const subheaderText = await page.locator('p:has-text("Change No:")').textContent();
    const changeNoMatch = subheaderText.match(/4M-2026-\d+/);
    const changeId = changeNoMatch ? changeNoMatch[0] : 'CHG-0000';
    console.log(`Created Change Request ID: ${changeId}`);

    await page.fill('textarea[placeholder^="Brief description of WHY this change is needed"]', 'E2E Refactor Admin Workflow');
    await page.fill('textarea[placeholder^="Describe the change"]', 'This is a long detailed description for the E2E admin workflow. We are verifying database integration.');

    // Generate valid future/present dates dynamically
    const today2 = new Date();
    const formatDate2 = (date) => {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    };
    const dateStartStr2 = formatDate2(today2);
    const dateCloseStr2 = formatDate2(new Date(today2.getTime() + 7 * 24 * 60 * 60 * 1000));

    await page.locator('label:has-text("Change Improvement Area") + select').selectOption('Quality');
    await page.locator('label:has-text("Permanent / Temporary Change") + select').selectOption('Temporary');
    await page.fill('label:has-text("Implement / Change Date Start") ~ div input', dateStartStr2);
    await page.fill('label:has-text("Part Traceability Details (From Changes)") + textarea', 'LOT-100: Initial batch of 100 parts trace.');
    await page.fill('label:has-text("Change Date Close") ~ div input', dateCloseStr2);
    await page.fill('label:has-text("Part Traceability Details (To Changes)") + textarea', 'LOT-110: Closure batch of 110 parts trace.');

    await page.fill('label:has-text("Risk Analysis") + textarea', 'Potential minor startup latency on line 5.');
    await page.fill('label:has-text("Update in SOP / WI / Control Plan / FMEA") + textarea', 'SOP and WI needs to be updated for line 5 operation.');
    await page.fill('label:has-text("User Dept HOD Approval") + textarea', 'Approved by HOD Ramanan.');
    await page.locator('label:has-text("Customer Approval Required") + select').selectOption('No');
    await page.fill('label:has-text("Effectiveness Monitoring") + textarea', 'Measured by cycle time checks over 3 days.');

    // Submit L1 Request
    await page.click('button[type="submit"]');

    // Confirm redirected to Dashboard Overview
    await expect(page.locator('h2')).toContainText('Overview');

    // Verify the toast shows the successful L1 submission
    const toastLocator = page.locator('text=Successfully submitted L1 Change Request');
    await expect(toastLocator).toBeVisible({ timeout: 4000 });
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
    
    // Click on the row matching changeId in the table on the right
    const changeRow = page.locator(`tr:has-text("${changeId}")`).first();
    await expect(changeRow).toBeVisible();
    await changeRow.click();

    // Upload required file attachments for L2 Validation
    await page.setInputFiles('label:has-text("Requester Validation(PED) Attachment") + input', [
      { name: 'ped-weld-test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('ped file content') }
    ]);
    await page.setInputFiles('label:has-text("Approver Set Up Verification(QA) Attachment") + input', [
      { name: 'qa-setup-test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('qa file content') }
    ]);

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
