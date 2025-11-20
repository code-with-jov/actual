import { type Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { type MobileBudgetPage } from './page-models/mobile-budget-page';
import { MobileNavigation } from './page-models/mobile-navigation';
import { SettingsPage } from './page-models/settings-page';

const budgetTypes = ['Envelope', 'Tracking'] as const;

budgetTypes.forEach(budgetType => {
  test.describe(`Mobile Pay Periods [${budgetType}]`, () => {
    let page: Page;
    let navigation: MobileNavigation;
    let budgetPage: MobileBudgetPage;
    let configurationPage: ConfigurationPage;
    let settingsPage: SettingsPage;
    let previousGlobalIsTesting: boolean;

    test.beforeAll(() => {
      // TODO: Hack, properly mock the currentMonth function
      previousGlobalIsTesting = global.IS_TESTING;
      global.IS_TESTING = true;
    });

    test.afterAll(() => {
      // TODO: Hack, properly mock the currentMonth function
      global.IS_TESTING = previousGlobalIsTesting;
    });

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      navigation = new MobileNavigation(page);
      configurationPage = new ConfigurationPage(page);
      settingsPage = new SettingsPage(page);

      await page.setViewportSize({
        width: 350,
        height: 600,
      });

      await page.goto('/');
      await configurationPage.createTestFile();

      budgetPage = await navigation.goToBudgetPage();

      const isBudgetTypeCorrect =
        (await budgetPage.determineBudgetType()) === budgetType;
      if (!isBudgetTypeCorrect) {
        await navigation.goToSettingsPage();
        await settingsPage.useBudgetType(budgetType);
        budgetPage = await navigation.goToBudgetPage();
      }
    });

    test.afterEach(async () => {
      await page.close();
    });

    test.describe('Pay Period Settings', () => {
      test('enables pay periods with weekly frequency', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');
      });

      test('enables pay periods with biweekly frequency', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'biweekly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');
      });

      test('enables pay periods with semimonthly frequency', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'semimonthly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');
      });

      test('enables pay periods with monthly frequency', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'monthly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');
      });

      test('disables pay periods and returns to calendar months', async () => {
        // First enable pay periods
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        let periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');

        // Now disable pay periods
        await navigation.goToSettingsPage();
        await settingsPage.disablePayPeriods();

        budgetPage = await navigation.goToBudgetPage();
        periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).not.toContain('Pay Period');
      });
    });

    test.describe('Pay Period Navigation', () => {
      test.beforeEach(async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-01',
        });
        budgetPage = await navigation.goToBudgetPage();
      });

      test('navigates to next pay period', async () => {
        const initialPeriod = await budgetPage.getCurrentPeriodLabel();
        await budgetPage.goToNextPayPeriod();
        const newPeriod = await budgetPage.getCurrentPeriodLabel();
        expect(newPeriod).not.toBe(initialPeriod);
      });

      test('navigates to previous pay period', async () => {
        const initialPeriod = await budgetPage.getCurrentPeriodLabel();
        await budgetPage.goToPreviousPayPeriod();
        const newPeriod = await budgetPage.getCurrentPeriodLabel();
        expect(newPeriod).not.toBe(initialPeriod);
      });

      test('navigates forward and backward through pay periods', async () => {
        const initialPeriod = await budgetPage.getCurrentPeriodLabel();
        await budgetPage.goToNextPayPeriod();
        const nextPeriod = await budgetPage.getCurrentPeriodLabel();
        expect(nextPeriod).not.toBe(initialPeriod);

        await budgetPage.goToPreviousPayPeriod();
        const backToInitial = await budgetPage.getCurrentPeriodLabel();
        expect(backToInitial).toBe(initialPeriod);
      });
    });

    test.describe('Pay Period Display', () => {
      test('displays weekly pay period label', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toMatch(/Pay Period \d+/);
      });

      test('displays biweekly pay period label', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'biweekly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toMatch(/Pay Period \d+/);
      });

      test('displays semimonthly pay period label', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'semimonthly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toMatch(/Pay Period \d+/);
      });

      test('displays monthly pay period label', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'monthly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toMatch(/Pay Period \d+/);
      });
    });

    test.describe('Budget Interactions with Pay Periods', () => {
      test.beforeEach(async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-01',
        });
        budgetPage = await navigation.goToBudgetPage();
      });

      test('sets budget amount for category in pay period', async () => {
        const categoryName = await budgetPage.getCategoryNameForRow(0);
        const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
        await budgetMenuModal.setAmount('100.00');

        const budgetedButton = await budgetPage.getButtonForBudgeted(
          categoryName,
        );
        await expect(budgetedButton).toHaveText('100.00');
      });

      test('budget amount persists across pay period navigation', async () => {
        const categoryName = await budgetPage.getCategoryNameForRow(0);
        const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
        await budgetMenuModal.setAmount('100.00');

        // Navigate away and back
        await budgetPage.goToNextPayPeriod();
        await budgetPage.goToPreviousPayPeriod();

        const budgetedButton = await budgetPage.getButtonForBudgeted(
          categoryName,
        );
        await expect(budgetedButton).toHaveText('100.00');
      });

      test('copies last period budget in pay period context', async () => {
        const categoryName = await budgetPage.getCategoryNameForRow(0);

        // Set budget in previous period
        await budgetPage.goToPreviousPayPeriod();
        let budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
        await budgetMenuModal.setAmount('150.00');

        // Go to current period and copy last period
        await budgetPage.goToNextPayPeriod();
        budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
        await budgetMenuModal.copyLastMonthBudget();
        await budgetMenuModal.close();

        const budgetedButton = await budgetPage.getButtonForBudgeted(
          categoryName,
        );
        await expect(budgetedButton).toHaveText('150.00');
      });

      test('sets to 3 month average in pay period context', async () => {
        const categoryName = await budgetPage.getCategoryNameForRow(0);

        // Set budgets in previous 3 periods
        for (let i = 0; i < 3; i++) {
          await budgetPage.goToPreviousPayPeriod();
          const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
          await budgetMenuModal.setAmount('90.00');
        }

        // Go back to current period
        for (let i = 0; i < 3; i++) {
          await budgetPage.goToNextPayPeriod();
        }

        // Set to average
        const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
        await budgetMenuModal.setTo3MonthAverage();
        await budgetMenuModal.close();

        const budgetedButton = await budgetPage.getButtonForBudgeted(
          categoryName,
        );
        await expect(budgetedButton).toHaveText('90.00');
      });
    });

    test.describe('Pay Period Frequency Changes', () => {
      test('switches from weekly to biweekly frequency', async () => {
        // Start with weekly
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        let periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');

        // Switch to biweekly
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'biweekly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');
      });

      test('switches from monthly to semimonthly frequency', async () => {
        // Start with monthly
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'monthly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        let periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');

        // Switch to semimonthly
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'semimonthly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');
      });
    });

    test.describe('Pay Period Year Boundary', () => {
      test('navigates across year boundary', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2023-12-25',
        });

        budgetPage = await navigation.goToBudgetPage();

        // Navigate forward multiple times to cross year boundary
        for (let i = 0; i < 10; i++) {
          await budgetPage.goToNextPayPeriod();
        }

        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');
      });
    });

    test.describe('Pay Period Budget Summary', () => {
      test.beforeEach(async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-01',
        });
        budgetPage = await navigation.goToBudgetPage();
      });

      if (budgetType === 'Envelope') {
        test('opens budget summary modal for pay period', async () => {
          const summaryModal = await budgetPage.openEnvelopeBudgetSummary();
          await expect(summaryModal.modal).toBeVisible();
          await summaryModal.close();
        });

        test('budget summary displays correct period context', async () => {
          const categoryName = await budgetPage.getCategoryNameForRow(0);
          const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
          await budgetMenuModal.setAmount('100.00');

          const summaryModal = await budgetPage.openEnvelopeBudgetSummary();
          await expect(summaryModal.modal).toBeVisible();
          await summaryModal.close();
        });
      } else {
        test('opens tracking budget summary modal for pay period', async () => {
          const summaryModal = await budgetPage.openTrackingBudgetSummary();
          await expect(summaryModal.modal).toBeVisible();
          await summaryModal.close();
        });

        test('tracking summary displays correct period context', async () => {
          const categoryName = await budgetPage.getCategoryNameForRow(0);
          const budgetMenuModal = await budgetPage.openBudgetMenu(categoryName);
          await budgetMenuModal.setAmount('100.00');

          const summaryModal = await budgetPage.openTrackingBudgetSummary();
          await expect(summaryModal.modal).toBeVisible();
          await summaryModal.close();
        });
      }
    });

    test.describe('Edge Cases', () => {
      test('handles start date changes', async () => {
        // Set initial start date
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-01',
        });

        budgetPage = await navigation.goToBudgetPage();
        const initialLabel = await budgetPage.getCurrentPeriodLabel();

        // Change start date
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-01-08',
        });

        budgetPage = await navigation.goToBudgetPage();
        const newLabel = await budgetPage.getCurrentPeriodLabel();
        expect(newLabel).toContain('Pay Period');
      });

      test('handles leap year dates', async () => {
        await navigation.goToSettingsPage();
        await settingsPage.configurePayPeriod({
          frequency: 'weekly',
          startDate: '2024-02-29',
        });

        budgetPage = await navigation.goToBudgetPage();
        const periodLabel = await budgetPage.getCurrentPeriodLabel();
        expect(periodLabel).toContain('Pay Period');
      });
    });
  });
});
