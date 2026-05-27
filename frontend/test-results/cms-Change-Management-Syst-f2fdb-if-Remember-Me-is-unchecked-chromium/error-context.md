# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cms.spec.js >> Change Management System E2E Flow >> should NOT remember email if Remember Me is unchecked
- Location: e2e-tests\cms.spec.js:90:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Change Management System E2E Flow', () => {
  4   |   
  5   |   test.beforeEach(async ({ page }) => {
  6   |     // Navigate to the app before each test
> 7   |     await page.goto('/');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  8   |   });
  9   | 
  10  |   test('should display error message on invalid login', async ({ page }) => {
  11  |     // Fill in invalid credentials
  12  |     await page.fill('#email', 'invalid@cms.com');
  13  |     await page.fill('#password', 'wrongpassword');
  14  |     await page.click('button[type="submit"]');
  15  | 
  16  |     // Verify error message is visible
  17  |     const errorAlert = page.locator('form + div, .animate-alert-shake');
  18  |     await expect(errorAlert).toBeVisible();
  19  |     await expect(errorAlert).toContainText('Invalid email or password.');
  20  |   });
  21  | 
  22  |   test('should login successfully as Admin, add a change request, and logout', async ({ page }) => {
  23  |     // 1. Log in
  24  |     await page.fill('#email', 'admin@cms.com');
  25  |     await page.fill('#password', 'admin123');
  26  |     await page.click('button[type="submit"]');
  27  | 
  28  |     // Verify redirection to dashboard
  29  |     await expect(page).toHaveURL(/\/dashboard/);
  30  |     
  31  |     // Verify welcome message/overview title
  32  |     await expect(page.locator('h2')).toContainText('Dashboard Overview');
  33  |     await expect(page.locator('header').locator('text=admin@cms.com')).toBeVisible();
  34  | 
  35  |     // 2. Click "Request Change"
  36  |     await page.locator('header').locator('text=Request Change').click();
  37  | 
  38  |     // Verify we are on the creation tab / form is visible
  39  |     await expect(page.locator('h2')).toContainText('Request New Change');
  40  | 
  41  |     // 3. Fill in the form
  42  |     const uniqueTitle = `E2E Test Change Request ${Date.now()}`;
  43  |     await page.fill('#form-title', uniqueTitle);
  44  |     await page.click('button:has-text("High")');
  45  |     await page.click('button[type="submit"]');
  46  | 
  47  |     // Form submission should redirect back to overview
  48  |     await expect(page.locator('h2')).toContainText('Dashboard Overview');
  49  | 
  50  |     // Verify the new change request is listed in the table
  51  |     const tableBody = page.locator('tbody').first();
  52  |     await expect(tableBody).toContainText(uniqueTitle);
  53  |     await expect(tableBody).toContainText('High');
  54  | 
  55  |     // 4. Sign Out
  56  |     await page.click('button:has-text("Sign Out")');
  57  | 
  58  |     // Should redirect back to login
  59  |     await expect(page).toHaveURL(/\/$/);
  60  |     await expect(page.locator('h2')).toContainText('Welcome Back');
  61  |   });
  62  | 
  63  |   test('should remember email and check state if Remember Me is checked', async ({ page }) => {
  64  |     // Clear localStorage to start clean
  65  |     await page.evaluate(() => localStorage.clear());
  66  |     await page.reload();
  67  | 
  68  |     // Check pre-fill is empty initially
  69  |     await expect(page.locator('#email')).toHaveValue('');
  70  |     await expect(page.locator('#rememberMe')).not.toBeChecked();
  71  | 
  72  |     // Log in with Remember Me checked
  73  |     await page.fill('#email', 'admin@cms.com');
  74  |     await page.fill('#password', 'admin123');
  75  |     await page.check('#rememberMe');
  76  |     await page.click('button[type="submit"]');
  77  | 
  78  |     // Redirection to dashboard
  79  |     await expect(page).toHaveURL(/\/dashboard/);
  80  | 
  81  |     // Sign out
  82  |     await page.click('button:has-text("Sign Out")');
  83  |     await expect(page).toHaveURL(/\/$/);
  84  | 
  85  |     // Verify email is pre-filled and checkbox is checked
  86  |     await expect(page.locator('#email')).toHaveValue('admin@cms.com');
  87  |     await expect(page.locator('#rememberMe')).toBeChecked();
  88  |   });
  89  | 
  90  |   test('should NOT remember email if Remember Me is unchecked', async ({ page }) => {
  91  |     // Clear localStorage to start clean
  92  |     await page.evaluate(() => localStorage.clear());
  93  |     await page.reload();
  94  | 
  95  |     // Log in with Remember Me UNCHECKED
  96  |     await page.fill('#email', 'manager@cms.com');
  97  |     await page.fill('#password', 'manager123');
  98  |     await expect(page.locator('#rememberMe')).not.toBeChecked();
  99  |     await page.click('button[type="submit"]');
  100 | 
  101 |     // Redirection to dashboard
  102 |     await expect(page).toHaveURL(/\/dashboard/);
  103 | 
  104 |     // Sign out
  105 |     await page.click('button:has-text("Sign Out")');
  106 |     await expect(page).toHaveURL(/\/$/);
  107 | 
```