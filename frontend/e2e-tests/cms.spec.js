import { test, expect } from '@playwright/test';

test.describe('Change Management System E2E Flow', () => {
  
  test.beforeEach(async ({ page }) => {
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
    await expect(page.locator('h2')).toContainText('Dashboard Overview');
    await expect(page.locator('header').locator('text=admin@cms.com')).toBeVisible();

    // 2. Click "Request Change"
    await page.locator('header').locator('text=Request Change').click();

    // Verify we are on the creation tab / form is visible
    await expect(page.locator('h2')).toContainText('Request New Change');

    // 3. Fill in the form
    const uniqueTitle = `E2E Test Change Request ${Date.now()}`;
    await page.fill('#form-title', uniqueTitle);
    await page.click('button:has-text("High")');
    await page.click('button[type="submit"]');

    // Form submission should redirect back to overview
    await expect(page.locator('h2')).toContainText('Dashboard Overview');

    // Verify the new change request is listed in the table
    const tableBody = page.locator('tbody').first();
    await expect(tableBody).toContainText(uniqueTitle);
    await expect(tableBody).toContainText('High');

    // 4. Sign Out
    await page.click('button:has-text("Sign Out")');

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
    await page.click('button:has-text("Sign Out")');
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
    await page.click('button:has-text("Sign Out")');
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

});
