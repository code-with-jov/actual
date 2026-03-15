import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';
import type { SettingsPage } from './page-models/settings-page';

/**
 * Enable the pay periods experimental feature flag via settings UI.
 */
async function enablePayPeriodsFeatureFlag(settingsPage: SettingsPage) {
  await settingsPage.enableExperimentalFeature('Pay period budgeting');
}

/**
 * Select a frequency via the custom Select component (button → popover menu item).
 */
async function selectFrequency(page: Page, frequencyLabel: string) {
  // Open the frequency dropdown (Select renders as a Button)
  await page.locator('#pay-period-frequency').click();
  // Click the desired item in the popover (scoped to the data-popover element)
  await page.locator('[data-popover]').getByText(frequencyLabel, { exact: true }).click();
}

/**
 * Configure pay period settings on the settings page.
 * Assumes the pay period settings section is already visible.
 */
async function configurePayPeriods(
  page: Page,
  opts: {
    frequencyLabel?: string;
    startDate?: string;
    enable?: boolean;
  } = {},
) {
  const {
    frequencyLabel = 'Biweekly (every 2 weeks)',
    startDate,
    enable = true,
  } = opts;

  const payPeriodSettings = page.getByTestId('pay-period-settings');
  await payPeriodSettings.waitFor({ state: 'visible' });

  // Set frequency
  await selectFrequency(page, frequencyLabel);

  // Set start date if provided
  if (startDate) {
    await payPeriodSettings
      .locator('#pay-period-start-date')
      .fill(startDate);
  }

  // Enable toggle if requested
  if (enable) {
    const checkbox = payPeriodSettings.getByRole('checkbox', {
      name: 'Enable pay period budgeting',
    });
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
  }
}

test.describe('Pay Periods', () => {
  let page: Page;
  let navigation: Navigation;
  let settingsPage: SettingsPage;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.goto('/');
    await configurationPage.createTestFile();
    settingsPage = await navigation.goToSettingsPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  // ── Spec: Settings hidden when feature flag is off ──────────────────────
  // Covers: "Settings hidden when feature flag is off" (pay-period-ui spec §4)

  test('pay period settings are hidden when feature flag is disabled', async () => {
    await expect(page.getByTestId('pay-period-settings')).not.toBeVisible();
  });

  // ── Spec: Settings visible after enabling feature flag ──────────────────
  // Covers: "User enables pay periods" (pay-period-ui spec §4)

  test('pay period settings appear after enabling the feature flag', async () => {
    await enablePayPeriodsFeatureFlag(settingsPage);

    await expect(page.getByTestId('pay-period-settings')).toBeVisible();
    await expect(page).toMatchThemeScreenshots();
  });

  // ── Spec: Frequency selector shows Weekly, Biweekly, Monthly options ───
  // Covers: "Frequency selector shows three options" (pay-period-ui spec §4)

  test('frequency selector exposes Weekly, Biweekly, and Monthly options', async () => {
    await enablePayPeriodsFeatureFlag(settingsPage);

    const payPeriodSettings = page.getByTestId('pay-period-settings');
    await payPeriodSettings.waitFor({ state: 'visible' });

    // Open the custom Select popover
    await page.locator('#pay-period-frequency').click();

    // All three options should be visible in the menu (scoped to the popover)
    const popover = page.locator('[data-popover]');
    await expect(popover.getByText('Weekly', { exact: true })).toBeVisible();
    await expect(popover.getByText('Biweekly (every 2 weeks)', { exact: true })).toBeVisible();
    await expect(popover.getByText('Monthly', { exact: true })).toBeVisible();

    // Close popover by pressing Escape
    await page.keyboard.press('Escape');
  });

  // ── Spec: Start date required before enabling ───────────────────────────
  // Covers: "Start date is required before enabling" (pay-period-ui spec §4)

  test('shows validation error when enabling pay periods without a start date', async () => {
    await enablePayPeriodsFeatureFlag(settingsPage);

    const payPeriodSettings = page.getByTestId('pay-period-settings');
    await payPeriodSettings.waitFor({ state: 'visible' });

    // Attempt to enable without setting a start date
    const checkbox = payPeriodSettings.getByRole('checkbox', {
      name: 'Enable pay period budgeting',
    });
    await checkbox.click();

    // Validation should have blocked enabling
    await expect(checkbox).not.toBeChecked();

    // Error message must be visible
    await expect(
      payPeriodSettings.getByText(/start date is required/i),
    ).toBeVisible();
  });

  // ── Spec: User successfully enables pay periods ─────────────────────────
  // Covers: "User enables pay periods" full happy path (pay-period-ui spec §4)

  test('can enable pay periods with frequency and start date configured', async () => {
    await enablePayPeriodsFeatureFlag(settingsPage);
    await configurePayPeriods(page, {
      frequencyLabel: 'Biweekly (every 2 weeks)',
      startDate: '2024-01-01',
      enable: true,
    });

    const checkbox = page
      .getByTestId('pay-period-settings')
      .getByRole('checkbox', { name: 'Enable pay period budgeting' });

    await expect(checkbox).toBeChecked();
  });

  // ── Spec: Frequency change warning ─────────────────────────────────────
  // Covers: frequency-change warning (pay-period-ui spec §4, task 10.5)

  test('shows frequency change warning when changing frequency while pay periods are enabled', async () => {
    await enablePayPeriodsFeatureFlag(settingsPage);
    await configurePayPeriods(page, {
      frequencyLabel: 'Biweekly (every 2 weeks)',
      startDate: '2024-01-01',
      enable: true,
    });

    // Change frequency while pay periods are active
    await selectFrequency(page, 'Weekly');

    await expect(
      page
        .getByTestId('pay-period-settings')
        .getByText(/changing frequency will reset period numbering/i),
    ).toBeVisible();
  });

  // ── Spec: Budget page with pay periods enabled ──────────────────────────

  test.describe('Budget page with pay periods enabled', () => {
    test.beforeEach(async () => {
      await enablePayPeriodsFeatureFlag(settingsPage);
      await configurePayPeriods(page, {
        frequencyLabel: 'Biweekly (every 2 weeks)',
        startDate: '2024-01-01',
        enable: true,
      });
      await page.getByRole('link', { name: 'Budget', exact: true }).click();
      await page.waitForURL(/\/budget/);
      await page.getByTestId('budget-table').waitFor({ state: 'visible' });
      // Move mouse away to avoid hover artifacts in screenshots
      await page.mouse.move(0, 0);
    });

    // ── Spec: Short label for period header ────────────────────────────
    // Covers: "Short label for period header" (pay-period-ui spec §3)

    test('budget column header shows PP N short label when pay periods are active', async () => {
      const header = page.getByTestId('budget-month-header').first();
      await expect(header).toBeVisible();
      // Short label format: "PP 1", "PP 2", etc.
      await expect(header).toHaveText(/^PP \d+$/);
      await expect(page).toMatchThemeScreenshots();
    });

    // ── Spec: Next arrow advances to next period ───────────────────────
    // Covers: "Next arrow advances to the next pay period" (pay-period-ui spec §2)

    test('next period arrow advances budget view by one pay period', async () => {
      const header = page.getByTestId('budget-month-header').first();
      const initialLabel = await header.textContent();
      const initialNum = parseInt(initialLabel!.replace('PP ', ''), 10);

      await page.getByRole('button', { name: 'Next period' }).first().click();
      await page.waitForTimeout(500);

      const nextLabel = await header.textContent();
      const nextNum = parseInt(nextLabel!.replace('PP ', ''), 10);

      // Should advance by one (or wrap to 1 at year boundary)
      expect(nextNum === initialNum + 1 || nextNum === 1).toBe(true);
    });

    // ── Spec: Previous arrow retreats to prior period ──────────────────
    // Covers: "Previous arrow retreats to the prior pay period" (pay-period-ui spec §2)

    test('previous period arrow retreats budget view by one pay period', async () => {
      // Advance first so we can meaningfully go back
      await page.getByRole('button', { name: 'Next period' }).first().click();
      await page.waitForTimeout(500);

      const header = page.getByTestId('budget-month-header').first();
      const advancedLabel = await header.textContent();
      const advancedNum = parseInt(advancedLabel!.replace('PP ', ''), 10);

      await page
        .getByRole('button', { name: 'Previous period' })
        .first()
        .click();
      await page.waitForTimeout(500);

      const prevLabel = await header.textContent();
      const prevNum = parseInt(prevLabel!.replace('PP ', ''), 10);

      expect(prevNum).toBe(advancedNum - 1);
    });

    // ── Spec: "Today" / "Current period" button ────────────────────────
    // Covers: '"Today" button navigates to current pay period' (pay-period-ui spec §2)

    test('current period button jumps back to the current pay period', async () => {
      // Advance away from current period
      await page.getByRole('button', { name: 'Next period' }).first().click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Next period' }).first().click();
      await page.waitForTimeout(300);

      const header = page.getByTestId('budget-month-header').first();
      const labelAfterAdvance = await header.textContent();

      // Click "go to current period"
      await page
        .getByRole('button', { name: 'Go to current period' })
        .first()
        .click();
      await page.waitForTimeout(500);

      const labelAfterReturn = await header.textContent();

      // Should have changed back from the advanced position
      expect(labelAfterReturn).not.toBe(labelAfterAdvance);
      // And still displays a period label
      await expect(header).toHaveText(/^PP \d+$/);
    });

    // ── Spec: Context updates when preferences change ──────────────────
    // Covers: "Context updates when preferences change" (pay-period-ui spec §1)

    test('changing frequency in settings keeps budget in period mode on next visit', async () => {
      // Confirm period mode is active
      await expect(
        page.getByTestId('budget-month-header').first(),
      ).toHaveText(/^PP \d+$/);

      // Navigate to settings and change frequency
      await navigation.goToSettingsPage();
      const payPeriodSettings = page.getByTestId('pay-period-settings');
      await payPeriodSettings.waitFor({ state: 'visible' });
      await selectFrequency(page, 'Weekly');

      // Return to budget page
      await page.getByRole('link', { name: 'Budget', exact: true }).click();
      await page.waitForURL(/\/budget/);
      await page.getByTestId('budget-table').waitFor({ state: 'visible' });

      // Still in period mode (weekly now, but still PP labels)
      await expect(
        page.getByTestId('budget-month-header').first(),
      ).toHaveText(/^PP \d+$/);
    });
  });
});
