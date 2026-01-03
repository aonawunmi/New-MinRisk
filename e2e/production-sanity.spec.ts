import { test, expect } from '@playwright/test';

const BASE_URL = 'https://new-minrisk-production-dec.onrender.com';
const EMAIL = 'admin1@acme.com';
const PASSWORD = 'TestPass123!';

test('Production Sanity Check', async ({ page }) => {
    console.log(`1. Navigating to Login: ${BASE_URL}/login`);
    await page.goto(`${BASE_URL}/login`);

    console.log('2. Attempting Login...');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for ANY indicator of success
    console.log('3. Waiting for Dashboard...');
    try {
        await expect(page.locator('button[role="tab"]', { hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });
        console.log('   SUCCESS: Dashboard tab found.');
    } catch (e) {
        console.log('   FAIL: Dashboard tab not found. Current URL:', page.url());
        // Check for error messages
        if (await page.locator('.text-red-700').isVisible()) {
            const error = await page.locator('.text-red-700').textContent();
            console.log('   Login Error Message:', error);
        }
        throw e;
    }

    console.log('4. Checking Deployment Version (Advisory Mode features)...');
    // Navigate to Intel tab to check for new button text "Acknowledge" vs "Apply"
    await page.click('button[role="tab"]:has-text("Intel")');
    await expect(page.locator('h2, h3', { hasText: /Intelligence/i }).first()).toBeVisible();

    // Check if we see "Acknowledge" (New) or "Apply" (Old)
    const newButton = page.locator('button:has-text("Acknowledge Advice"), button:has-text("Acknowledge")');
    const oldButton = page.locator('button:has-text("Apply to Risk")');

    // Short timeout just to check presence
    try {
        if (await newButton.first().isVisible({ timeout: 5000 })) {
            console.log('   STATUS: New "Acknowledge" button found. DEPLOYMENT IS LIVE.');
        } else if (await oldButton.first().isVisible({ timeout: 5000 })) {
            console.log('   STATUS: Old "Apply" button found. DEPLOYMENT IS NOT YET LIVE.');
        } else {
            console.log('   STATUS: No buttons found. No alerts?');
        }
    } catch (e) {
        console.log('   STATUS: Check timed out.');
    }

    console.log('5. Listing available Risks for valid testing...');
    await page.click('button[role="tab"]:has-text("Risks")');
    await page.waitForTimeout(2000); // Wait for list

    const riskRows = page.locator('tr');
    const count = await riskRows.count();
    console.log(`   Found ${count} rows in Risk Register.`);

    if (count > 0) {
        const text = await riskRows.first().textContent();
        console.log('   First Risk Row Text:', text);
    }
});
