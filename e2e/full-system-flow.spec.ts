import { test, expect } from '@playwright/test';

// Increase timeout for production environment latency
test.setTimeout(180000);

const BASE_URL = 'https://new-minrisk-production-dec.onrender.com';
const EMAIL = 'admin1@acme.com';
const PASSWORD = 'TestPass123!';
const RISK_TITLE = `E2E Test Risk ${Date.now()}`;
const CONTROL_NAME = `E2E Test Control ${Date.now()}`;

test.describe('Full System End-to-End Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Listen to browser console logs
        page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`PAGE ERROR: ${err.message}`));

        // 1. Login
        console.log('Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', EMAIL);
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await expect(page.locator('button[role="tab"]', { hasText: 'Dashboard' })).toBeVisible({ timeout: 45000 });
        console.log('Login successful.');
    });

    test('Full Cycle: Create Risk -> Create Control -> Verify Linkage', async ({ page }) => {

        await test.step('Setup Master Data (Admin)', async () => {
            // ... Seeding Logic (Same as before) ...
            console.log('0. Checking Master Data Configuration...');
            const adminTab = page.locator('button[role="tab"]', { hasText: 'Admin' });
            if (await adminTab.isVisible()) {
                await adminTab.click();
                await page.click('button:has-text("Risk Configuration")');

                console.log('   Waiting for configuration to load...');
                await expect(page.locator('text=Loading configuration...')).not.toBeVisible({ timeout: 30000 });

                // Force Seed Division using Enter key
                console.log('   Ensuring Test Division exists...');
                await page.fill('input[placeholder="Enter division name..."]', 'Test Division');
                await page.press('input[placeholder="Enter division name..."]', 'Enter');

                // Force Seed Department using Enter key
                console.log('   Ensuring Test Department exists...');
                await page.fill('input[placeholder="Enter department name..."]', 'Test Department');
                await page.press('input[placeholder="Enter department name..."]', 'Enter');

                await expect(page.locator('text=Test Division')).toBeVisible();
                await expect(page.locator('text=Test Department')).toBeVisible();

                console.log('   Saving Configuration...');
                await page.click('button:has-text("Save Configuration")');
                await expect(page.locator('text=Configuration saved successfully!')).toBeVisible({ timeout: 30000 });
                console.log('   Configuration Saved.');
            }
        });

        await test.step('Create Risk', async () => {
            console.log('1. Navigating to Risk Register...');
            await page.click('button[role="tab"]:has-text("Risks")');
            await expect(page.locator('text=Loading risks...')).not.toBeVisible({ timeout: 30000 });

            const registerTab = page.locator('button[role="tab"]', { hasText: 'Risk Register' });
            if (await registerTab.isVisible()) {
                await registerTab.click();
            }

            console.log('2. Creating new Risk...');
            const addRiskBtn = page.locator('button', { hasText: 'Add Risk' });
            await expect(addRiskBtn).toBeVisible();
            await addRiskBtn.click();

            await expect(page.locator('text=Add New Risk')).toBeVisible();

            await page.fill('#risk_title', RISK_TITLE);

            // Select Category
            console.log('   Selecting Category...');
            const categoryBtn = page.locator('div.space-y-2')
                .filter({ has: page.locator('label', { hasText: 'Risk Category' }) })
                .locator('button[role="combobox"]');

            await expect(categoryBtn).toBeEnabled({ timeout: 10000 });
            await categoryBtn.click();
            await page.locator('div[role="option"]').first().click();

            // Select Sub-Category
            console.log('   Selecting Sub-Category...');
            await page.waitForTimeout(1000);
            const subCatBtn = page.locator('div.space-y-2')
                .filter({ has: page.locator('label', { hasText: 'Risk Sub-Category' }) })
                .locator('button[role="combobox"]');
            await subCatBtn.click();
            await page.locator('div[role="option"]').first().click();

            // Select Division
            console.log('   Selecting Division...');
            const divBtn = page.locator('div.space-y-2')
                .filter({ has: page.locator('label', { hasText: 'Division' }) })
                .locator('button[role="combobox"]');
            await expect(divBtn).toBeEnabled();
            await divBtn.click();
            const testDiv = page.locator('div[role="option"]', { hasText: 'Test Division' });
            if (await testDiv.isVisible()) {
                await testDiv.click();
            } else {
                await page.locator('div[role="option"]').first().click();
            }

            // Select Department
            console.log('   Selecting Department...');
            const deptBtn = page.locator('div.space-y-2')
                .filter({ has: page.locator('label', { hasText: 'Department' }) })
                .locator('button[role="combobox"]');
            await expect(deptBtn).toBeEnabled();
            await deptBtn.click();
            const testDept = page.locator('div[role="option"]', { hasText: 'Test Department' });
            if (await testDept.isVisible()) {
                await testDept.click();
            } else {
                await page.locator('div[role="option"]').first().click();
            }

            await page.fill('#risk_description', 'This is an automated E2E test risk description.');

            // Select Owner
            console.log('   Selecting Owner...');
            // Capture the exact button by label to re-use for logging
            const ownerBtnLocator = page.locator('div.space-y-2')
                .filter({ has: page.locator('label', { hasText: 'Risk Owner' }) })
                .locator('button[role="combobox"]');

            if (await ownerBtnLocator.isVisible()) {
                await ownerBtnLocator.click();

                // Try to match 'admin1' or 'Admin' first
                const adminOption = page.locator('div[role="option"]', { hasText: 'admin1@acme.com' });
                if (await adminOption.isVisible()) {
                    await adminOption.click();
                    console.log('   Selected admin1 as owner.');
                } else {
                    // Fallback to first option
                    console.log('   Admin user not found in dropdown, picking first available...');
                    const firstOption = page.locator('div[role="option"]').first();
                    if (await firstOption.isVisible()) {
                        await firstOption.click();
                    } else {
                        console.log('No users found in Owner dropdown. Pressing Escape.');
                        await page.keyboard.press('Escape');
                    }
                }
            }

            // Set Inherent Scores
            console.log('   Setting Scores...');
            await page.click('button#likelihood_inherent');
            await page.click('div[role="option"]:has-text("3")');
            await page.click('button#impact_inherent');
            await page.click('div[role="option"]:has-text("3")');

            console.log('   Submitting Risk Form...');
            const createBtn = page.locator('button:has-text("Create Risk")');
            await expect(createBtn).toBeEnabled();

            await createBtn.click();

            console.log('3. Verifying Risk Creation...');
            try {
                // Increase timeout for slow creation
                await expect(page.locator('text=Add New Risk')).not.toBeVisible({ timeout: 45000 });
                await expect(page.locator(`text=${RISK_TITLE}`)).toBeVisible({ timeout: 30000 });
                console.log(`   Risk "${RISK_TITLE}" created successfully.`);
            } catch (e) {
                console.log('Verification Failed! Logging Form State...');

                // Re-locate for logging
                const currentCat = await categoryBtn.textContent();
                const currentDiv = await divBtn.textContent();
                const currentDept = await deptBtn.textContent();
                const currentOwner = await ownerBtnLocator.innerText();

                console.log('Form Values Captured:');
                console.log(`- Category: "${currentCat}"`);
                console.log(`- Division: "${currentDiv}"`);
                console.log(`- Department: "${currentDept}"`);
                console.log(`- Owner: "${currentOwner}"`);

                // Capture Validation Errors via Role=Alert
                const alertTexts = await page.locator('div[role="alert"]').allTextContents();
                console.log('Alert Messages:', alertTexts);

                const validationErrors = await page.locator('.text-destructive').allTextContents();
                console.log('Text-Destructive Messages:', validationErrors);

                const toasts = await page.locator('li[data-sonner-toast]').allTextContents();
                console.log('Toast Messages:', toasts);

                await page.screenshot({ path: 'submission_failed.png', fullPage: true });
                throw e;
            }
        });

        await test.step('Create Control', async () => {
            // ... Same as before ...
            console.log('4. Navigating to Control Register...');
            await page.click('button[role="tab"]:has-text("Controls")');

            const controlRegTab = page.locator('button[role="tab"]', { hasText: 'Control Register' });
            if (await controlRegTab.isVisible()) {
                await controlRegTab.click();
            }

            console.log('5. Creating new Control...');
            const addControlBtn = page.locator('button', { hasText: 'Add Control' });
            await expect(addControlBtn).toBeVisible();
            await addControlBtn.click();

            await expect(page.locator('text=Add New Control')).toBeVisible();

            await page.fill('input[placeholder*="Daily reconciliation"]', CONTROL_NAME);

            // Check if "Select a risk" is enabled
            const riskLinkBtn = page.locator('button:has-text("Select a risk")');
            await expect(riskLinkBtn).toBeVisible();
            // await expect(riskLinkBtn).toBeEnabled(); // Might take a second to load risks
            await riskLinkBtn.click();

            const riskOption = page.locator('div[role="option"]', { hasText: RISK_TITLE });
            await expect(riskOption).toBeVisible({ timeout: 10000 });
            await riskOption.click();

            const score3Buttons = page.locator('button:has-text("3")');
            if (await score3Buttons.count() >= 4) {
                await score3Buttons.nth(0).click();
                await score3Buttons.nth(1).click();
                await score3Buttons.nth(2).click();
                await score3Buttons.nth(3).click();
            }
            await page.click('button:has-text("Create Control")');

            await expect(page.locator('text=Add New Control')).not.toBeVisible();
            await expect(page.locator(`text=${CONTROL_NAME}`)).toBeVisible({ timeout: 20000 });
            console.log(`   Control "${CONTROL_NAME}" created successfully.`);
        });

        console.log('Test Complete: SUCCESS');
    });

});
