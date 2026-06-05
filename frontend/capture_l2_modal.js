import { chromium } from '@playwright/test';
import path from 'path';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to home...');
    await page.goto('http://localhost:5173/');

    console.log('Logging in...');
    await page.fill('#email', 'admin@cms.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    console.log('Waiting for dashboard redirection...');
    await page.waitForURL('**/dashboard');

    console.log('Navigating to L2 Validation tab...');
    const l2NavBtn = page.locator('nav button:has-text("L2")');
    const isL2Visible = await l2NavBtn.isVisible();
    if (!isL2Visible) {
      console.log('Clicking on Level in sidebar to expand...');
      await page.locator('nav button:has-text("Level")').click();
      await page.waitForTimeout(500);
    }
    await l2NavBtn.click();
    await page.waitForTimeout(1000);

    console.log('Taking screenshot before click...');
    await page.screenshot({ path: 'f:/Change Management System/frontend/test-results/l2_pre_click.png' });

    console.log('Clicking the eye icon on 4M-2026-1 row...');
    // Find the row for 4M-2026-1
    const row = page.locator('tr', { hasText: '4M-2026-1' });
    // Click the eye button inside that row
    const eyeBtn = row.locator('button').filter({ has: page.locator('svg') });
    await eyeBtn.first().click();
    
    console.log('Waiting for modal to appear...');
    await page.waitForTimeout(1000);

    console.log('Taking screenshot after eye click...');
    await page.screenshot({ path: 'f:/Change Management System/frontend/test-results/l2_post_click.png' });

    console.log('Success! Screenshots saved.');
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await browser.close();
  }
}

run();
