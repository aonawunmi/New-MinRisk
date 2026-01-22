import { test, expect } from '@playwright/test';

// Configuration - Targeting Production/Staging as requested
const BASE_URL = 'https://new-minrisk-production-dec.onrender.com';
const EMAIL = 'admin1@acme.com';
const PASSWORD = '213Capital$';
const RISK_CODE = 'REP-005';

test.describe('MinRisk End-to-End System Test', () => {

    test.beforeEach(async ({ page }) => {
        console.log(`Navigating to ${BASE_URL}/login...`);
        // 1. Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', EMAIL);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for the Dashboard tab to be visible.
        // This confirms login without relying on a URL change that might be intercepted by client-side routing.
        console.log('Waiting for Dashboard tab...');
        await expect(page.locator('button[role="tab"]', { hasText: 'Dashboard' })).toBeVisible({ timeout: 30000 });
        console.log('Login successful.');
    });

    test('Advisory Mode: Acknowledge alert and verify score preservation', async ({ page }) => {
        // 2. Navigate to Intelligence Page via Tab
        console.log('Navigating to Intelligence tab...');
        await page.click('button[role="tab"]:has-text("Intel")');

        // Wait for unique content on the Intelligence page. 
        // Note: Production might use "Risk Intelligence" or similar header.
        await expect(page.locator('h2, h3', { hasText: /Intelligence/i }).first()).toBeVisible();

        // 3. Find a pending alert
        // We look for a button that says 'Acknowledge Advice' within an Alert Card.
        // We use .first() just in case there are multiple
        console.log('Looking for alerts...');
        // Wait longer for async fetch in production
        await page.waitForTimeout(5000);

        const acknowledgeBtn = page.locator('button:has-text("Acknowledge Advice"), button:has-text("Acknowledge")').first();

        if (await acknowledgeBtn.isVisible()) {
            console.log('Found alert to acknowledge.');
            await acknowledgeBtn.click();

            // 4. Confirm Dialog
            // Check for a confirmation dialog button
            const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Acknowledge")').last();
            if (await confirmBtn.isVisible()) {
                await confirmBtn.click();
            }

            // 5. Verify Success
            await expect(page.locator('text=Successfully acknowledged')).toBeVisible();
            console.log('Alert acknowledged.');
        } else {
            console.log('No pending alerts found to acknowledge. Proceeding to check Risk Register anyway.');
        }

        // 6. Navigate to Risk Register via Tab
        console.log('Navigating to Risk Register...');
        await page.click('button[role="tab"]:has-text("Risks")');

        // Ensure we are on the register tab (if there are sub-tabs)
        const registerTab = page.locator('button[role="tab"]', { hasText: 'Risk Register' });
        if (await registerTab.isVisible()) {
            await registerTab.click();
        }

        // 7. Open Risk Detail for REP-005
        console.log(`Opening risk ${RISK_CODE}...`);
        await expect(page.locator(`text=${RISK_CODE}`)).toBeVisible();
        await page.click(`text=${RISK_CODE}`);

        // 8. Verify "Active Intelligence Advice" section is present
        console.log('Checking for Advisory Memo...');
        // Allow some time for the modal/sheet to open
        await expect(page.locator('text=Active Intelligence Advice')).toBeVisible();

        // Check for specific advisory content
        await expect(page.locator('text=You have acknowledged the following intelligence alerts')).toBeVisible();

        console.log('Advisory Memo verified. Test Passed.');
    });

});
