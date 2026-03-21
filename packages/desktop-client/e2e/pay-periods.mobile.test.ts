import type { Page } from '@playwright/test';

import * as monthUtils from 'loot-core/shared/months';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import type { MobileBudgetPage } from './page-models/mobile-budget-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import type { SettingsPage } from './page-models/settings-page';

/**
 * Select a frequency via the custom Select component (button → popover menu item).
 * Copied from pay-periods.test.ts — same settings UI, same selectors.
 */
async function selectFrequency(page: Page, frequencyLabel: string) {
  await page.locator('#pay-period-frequency').click();
  await page
    .locator('[data-popover]')
    .getByText(frequencyLabel, { exact: true })
    .click();
}

/**
 * Configure pay period settings on the settings page.
 * Copied from pay-periods.test.ts — same settings UI, same selectors.
 */
async function configurePayPeriods(
  page: Page,
  opts: {
    frequencyLabel?: string;
    startDate?: string;
  } = {},
) {
  const { frequencyLabel = 'Biweekly (every 2 weeks)', startDate } = opts;

  const payPeriodSettings = page.getByTestId('pay-period-settings');
  await payPeriodSettings.waitFor({ state: 'visible' });

  await selectFrequency(page, frequencyLabel);

  if (startDate) {
    await payPeriodSettings.locator('#pay-period-start-date').fill(startDate);
  }
}

/**
 * Enable pay periods via the budget page menu on mobile.
 * Assumes the budget page is already open and the feature flag is ON.
 */
async function enablePayPeriodsOnMobileBudgetPage(
  page: Page,
  budgetPage: MobileBudgetPage,
) {
  await budgetPage.openBudgetPageMenu();
  await page.getByText('Enable pay period budgeting', { exact: true }).click();
  await expect(budgetPage.heading).toHaveText(/PP\d+/, { timeout: 5000 });
}

async function enablePayPeriodsFeatureFlag(settingsPage: SettingsPage) {
  await settingsPage.enableExperimentalFeature('Pay period budgeting');
}

// ── Pay periods enabled ────────────────────────────────────────────────────────

test.describe('Mobile Pay Periods (enabled)', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;
  let budgetPage: MobileBudgetPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({ width: 350, height: 600 });
    await page.goto('/');
    await configurationPage.createTestFile();

    const settingsPage = await navigation.goToSettingsPage();
    await enablePayPeriodsFeatureFlag(settingsPage);
    await configurePayPeriods(page, {
      frequencyLabel: 'Biweekly (every 2 weeks)',
      startDate: '2024-01-01',
    });

    budgetPage = await navigation.goToBudgetPage();
    await enablePayPeriodsOnMobileBudgetPage(page, budgetPage);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  // ── Spec: period label in mobile heading ───────────────────────────────────
  // Covers: MonthSelector periodLabel branch (task 2.2)

  test('budget heading shows pay period summary label when pay periods are enabled', async () => {
    await expect(budgetPage.heading).toHaveText(
      /[A-Z][a-z]+ \d+ - [A-Z][a-z]+ \d+ \(PP\d+\)/,
    );
    await expect(page).toMatchThemeScreenshots();
  });

  // ── Spec: next arrow advances by one pay period ────────────────────────────
  // Covers: onNextMonth with payPeriodConfig (tasks 1.7, 2.3)

  test('next period arrow advances mobile budget view by one pay period', async () => {
    const initialText =
      await budgetPage.selectedBudgetMonthButton.textContent();
    const initialNum = parseInt(initialText!.match(/\(PP(\d+)\)/)![1], 10);

    await budgetPage.nextMonthButton.click();
    await page.waitForTimeout(500);

    const nextText = await budgetPage.selectedBudgetMonthButton.textContent();
    const nextNum = parseInt(nextText!.match(/\(PP(\d+)\)/)![1], 10);

    expect(nextNum === initialNum + 1 || nextNum === 1).toBe(true);
  });

  // ── Spec: previous arrow retreats by one pay period ────────────────────────
  // Covers: onPrevMonth with payPeriodConfig (tasks 1.6, 2.3)

  test('previous period arrow retreats mobile budget view by one pay period', async () => {
    // Advance first so prev is not at the lower bound
    await budgetPage.nextMonthButton.click();
    await page.waitForTimeout(500);

    const advancedText =
      await budgetPage.selectedBudgetMonthButton.textContent();
    const advancedNum = parseInt(advancedText!.match(/\(PP(\d+)\)/)![1], 10);

    await budgetPage.previousMonthButton.click();
    await page.waitForTimeout(500);

    const prevText = await budgetPage.selectedBudgetMonthButton.textContent();
    const prevNum = parseInt(prevText!.match(/\(PP(\d+)\)/)![1], 10);

    expect(prevNum).toBe(advancedNum - 1);
  });

  // ── Spec: "Today" button hidden on current period ──────────────────────────
  // Covers: startMonth !== currentMonth(payPeriodConfig) check (task 1.9)

  test('Today button is hidden when on the current pay period', async () => {
    await expect(page.getByRole('button', { name: 'Today' })).not.toBeVisible();
  });

  // ── Spec: "Today" button visible off current period, navigates back ────────
  // Covers: onCurrentMonth (task 1.8) + visibility check (task 1.9)

  test('Today button appears after navigating away and returns to the current period', async () => {
    await budgetPage.nextMonthButton.click();
    await page.waitForTimeout(300);
    await budgetPage.nextMonthButton.click();
    await page.waitForTimeout(300);

    const todayButton = page.getByRole('button', { name: 'Today' });
    await expect(todayButton).toBeVisible();

    await todayButton.click();
    await page.waitForTimeout(500);

    await expect(budgetPage.heading).toHaveText(
      /[A-Z][a-z]+ \d+ - [A-Z][a-z]+ \d+ \(PP\d+\)/,
    );
    await expect(todayButton).not.toBeVisible();
  });

  // ── Spec: CategoryPage header shows pay period label ──────────────────────
  // Covers: CategoryPage periodLabel branch (task 3.6) + PayPeriodProvider (task 3.4)

  test('CategoryPage header shows pay period label when opening a spent cell', async () => {
    const categoryName = await budgetPage.getCategoryNameForRow(0);
    const accountPage = await budgetPage.openSpentPage(categoryName);

    // CategoryPage renders: "{categoryName}({periodLabel})"
    // where periodLabel is e.g. "Jan 5 - Jan 18 (PP1)"
    await expect(accountPage.heading).toContainText(/\(PP\d+\)/);
    await expect(accountPage.transactionList).toBeVisible();
    await expect(page).toMatchThemeScreenshots();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(budgetPage.budgetTable).toBeVisible();
  });
});

// ── Pay periods disabled (regression) ─────────────────────────────────────────

test.describe('Mobile Pay Periods (disabled)', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({ width: 350, height: 600 });
    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  // ── Spec: calendar month labels unchanged when pay periods off ─────────────
  // Covers: fallback path in MonthSelector (task 2.2) and CategoryPage (task 3.6)

  test('calendar month labels are unchanged when pay periods are disabled', async () => {
    const budgetPage = await navigation.goToBudgetPage();
    const selectedMonth = await budgetPage.getSelectedMonth();
    const expectedLabel = monthUtils.format(
      selectedMonth,
      budgetPage.MONTH_HEADER_DATE_FORMAT,
    );

    await expect(budgetPage.heading).toHaveText(expectedLabel);
    await expect(budgetPage.heading).not.toHaveText(/\(PP\d+\)/);
  });
});

// ── Mobile toggle menu item tests ──────────────────────────────────────────────

test.describe('Mobile Pay Periods toggle menu', () => {
  let page: Page;
  let navigation: MobileNavigation;
  let configurationPage: ConfigurationPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new MobileNavigation(page);
    configurationPage = new ConfigurationPage(page);

    await page.setViewportSize({ width: 350, height: 600 });
    await page.goto('/');
    await configurationPage.createTestFile();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  // ── Spec: No toggle item when feature flag is OFF ───────────────────────────

  test('budget page menu has no toggle item when feature flag is OFF', async () => {
    const budgetPage = await navigation.goToBudgetPage();
    await budgetPage.openBudgetPageMenu();

    await expect(
      page.getByText(/pay period budgeting/i),
    ).not.toBeVisible();

    await page.keyboard.press('Escape');
  });

  // ── Spec: Enable item present when flag ON and periods inactive ─────────────

  test('budget page menu shows "Enable pay period budgeting" when flag is ON and periods are inactive', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await enablePayPeriodsFeatureFlag(settingsPage);
    await configurePayPeriods(page, {
      frequencyLabel: 'Biweekly (every 2 weeks)',
      startDate: '2024-01-01',
    });

    const budgetPage = await navigation.goToBudgetPage();
    await budgetPage.openBudgetPageMenu();

    await expect(
      page.getByText('Enable pay period budgeting', { exact: true }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
  });

  // ── Spec: Tapping enable activates pay period labels ───────────────────────

  test('tapping enable in mobile menu activates pay period labels', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await enablePayPeriodsFeatureFlag(settingsPage);
    await configurePayPeriods(page, {
      frequencyLabel: 'Biweekly (every 2 weeks)',
      startDate: '2024-01-01',
    });

    const budgetPage = await navigation.goToBudgetPage();
    await enablePayPeriodsOnMobileBudgetPage(page, budgetPage);

    await expect(budgetPage.heading).toHaveText(/PP\d+/);
  });

  // ── Spec: Disable item present when periods are active ─────────────────────

  test('budget page menu shows "Disable pay period budgeting" when periods are active', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await enablePayPeriodsFeatureFlag(settingsPage);
    await configurePayPeriods(page, {
      frequencyLabel: 'Biweekly (every 2 weeks)',
      startDate: '2024-01-01',
    });

    const budgetPage = await navigation.goToBudgetPage();
    await enablePayPeriodsOnMobileBudgetPage(page, budgetPage);

    await budgetPage.openBudgetPageMenu();

    await expect(
      page.getByText('Disable pay period budgeting', { exact: true }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
  });

  // ── Spec: Tapping disable restores calendar month labels ───────────────────

  test('tapping disable in mobile menu restores calendar month labels', async () => {
    const settingsPage = await navigation.goToSettingsPage();
    await enablePayPeriodsFeatureFlag(settingsPage);
    await configurePayPeriods(page, {
      frequencyLabel: 'Biweekly (every 2 weeks)',
      startDate: '2024-01-01',
    });

    const budgetPage = await navigation.goToBudgetPage();
    await enablePayPeriodsOnMobileBudgetPage(page, budgetPage);

    await budgetPage.openBudgetPageMenu();
    await page.getByText('Disable pay period budgeting', { exact: true }).click();

    await expect(budgetPage.heading).not.toHaveText(/PP\d+/);
  });
});
