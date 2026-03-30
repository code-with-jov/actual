## 1. Update `getPayPeriodLabel` function signature and picker format

- [x] 1.1 Change the third parameter of `getPayPeriodLabel` from `short: boolean` to `format: 'picker' | 'short' | 'summary'` and add an optional `locale?` parameter
- [x] 1.2 Implement the `'picker'` format branch: call `generatePayPeriods`, group periods by start-date calendar month, find the target period's 1-based position within its month group, and return `{monthLetter}{withinMonthCount}` (e.g., `J1`)
- [x] 1.3 Derive the month letter as the first character of the start month's locale-aware `MMM` abbreviation via `date-fns`

## 2. Add `getPayPeriodLabel` `'short'` format (mobile)

- [x] 2.1 Add a `'short'` branch before the `'summary'` block that returns `${formatDate(startDate)} - ${formatDate(endDate)}` with no `(PP${periodNumber})` suffix
- [x] 2.2 Update JSDoc to document the `'short'` format: `'{startDate} - {endDate}'` — e.g. `'Jan 5 - Jan 18'`

## 3. Update `getPayPeriodLabel` summary format

- [x] 3.1 Implement the `'summary'` format branch: format start/end dates as `MMM d`, and return `{startDate} - {endDate} (PP{globalN})` (e.g., `Jan 5 - Jan 18 (PP1)`)
- [x] 3.2 Remove the now-unused `Pay Period ${periodNumber} (…)` long-format string

## 4. Update call sites

- [x] 4.1 Update `MonthPicker.tsx`: pass `format='picker'` (and `locale`) to `getPayPeriodLabel` instead of `short=true`
- [x] 4.2 Update both `BudgetSummary.tsx` files (envelope and tracking): pass `format='summary'` instead of `short=false`
- [x] 4.3 In `BudgetPage.tsx` (mobile, category group row label): change `'summary'` → `'short'`
- [x] 4.4 In `BudgetPage.tsx` (mobile, `MonthSelector` header label): change `'summary'` → `'short'`
- [x] 4.5 In `CategoryPage.tsx` (mobile, category page header): change `'summary'` → `'short'`

## 5. Update unit tests

- [x] 5.1 Update `pay-periods.test.ts` label assertions to expect new formats (`J1`, `Jan 5 - Jan 18 (PP1)`, etc.)
- [x] 5.2 Add unit test cases for: within-month count increments correctly, cross-month period uses start month, monthly frequency (one period per month → always `{L}1`)

## 6. Update E2E tests

- [x] 6.1 Update `pay-periods.test.ts` E2E assertions for MonthPicker column headers (expect `J1` style labels)
- [x] 6.2 Update BudgetSummary E2E assertions to expect date-range format (e.g., `Jan 5 - Jan 18 (PP1)`)
- [x] 6.3 Update any mobile Playwright test assertions that match `/PP\d+/` in heading text — the heading no longer includes the period number

## 7. Add new E2E test coverage

### 7.1 Desktop (`pay-periods.test.ts`)

- [x] 7.1.1 `'budget summary panel renders expected fields when pay periods are active'` — verify the budget summary panel shows Available funds, Overspent, Budgeted, and For next month fields while pay periods are active
- [x] 7.1.2 `'clicking on spent amounts opens the transactions page and back returns to budget'` — verify clicking a spent cell routes to `/accounts` and the Back button returns to `/budget`
- [x] 7.1.3 `'settings page retains frequency selector and start date input'` — regression: confirm the frequency selector and start date input are still present on the settings page

### 7.2 Mobile (new file `pay-periods.mobile.test.ts`)

**`'Mobile Pay Periods (enabled)'` suite** (pay periods configured biweekly from 2024-01-01, enabled):

- [x] 7.2.1 `'budget heading shows pay period short label when pay periods are enabled'` — heading matches `MMM d - MMM d` short format with no `(PPX)` suffix
- [x] 7.2.2 `'next period arrow advances mobile budget view by one pay period'` — tapping next changes the displayed label
- [x] 7.2.3 `'previous period arrow retreats mobile budget view by one pay period'` — tapping next then previous returns to the initial label
- [x] 7.2.4 `'Today button is hidden when on the current pay period'` — Today button is absent when already on the current period
- [x] 7.2.5 `'Today button appears after navigating away and returns to the current period'` — Today button appears after 2 next-taps; tapping it returns to the current period
- [x] 7.2.6 `'clicking the pay period label in the header opens the month menu modal'` — tapping the header label opens a dialog whose heading matches the pay period date range
- [x] 7.2.7 `'clicking the To Budget button opens the budget summary modal'` — budget summary modal opens with "Budget Summary" heading
- [x] 7.2.8 `'CategoryPage header shows pay period label when opening a spent cell'` — opening a category's spent page shows the short date range in the heading, no `(PPX)` suffix
- [x] 7.2.9 `'clicking on a spent amount opens the transactions page and back returns to budget'` — tapping a spent cell navigates to the transactions view and Back returns to the budget page

**`'Mobile Pay Periods (disabled)'` suite:**

- [x] 7.2.10 `'calendar month labels are unchanged when pay periods are disabled'` — heading matches standard `"Month 'YY"` format; no `(PPX)` text present

### 7.3 Page model update (`mobile-budget-menu-modal.ts`)

- [x] 7.3.1 Add `actionsButton` locator and `showActions()` method; update existing action methods (`copyLastMonthBudget`, `setTo3MonthAverage`, etc.) to call `showActions()` before clicking their button, to match the current Actions sub-menu structure

## 8. Fix mobile navigation with pay periods active

- [x] 8.1 In `BudgetPage.tsx` (`MonthSelector`): pass `payPeriodConfig` as the third argument to `monthUtils.subMonths(monthBounds.end, 1, payPeriodConfig)` in the `nextEnabled` calculation so that pay period IDs are resolved correctly without throwing

## 9. Shared utility: `resolveMonthToDateFilter`

The `getCategoryMonthFilter` in `CategoryTransactions.tsx` uses `{ date: { $transform: '$month', $eq: month } }`. When `month` is a pay period ID (e.g. `2026-13`), the `$month` transform extracts a `YYYY-MM` portion from each date — which never equals a period ID — so the transaction list is always empty.

- [ ] 9.1 Add `resolveMonthToDateFilter(month: string, config?: PayPeriodConfig)` to `packages/loot-core/src/shared/pay-periods.ts`:
  - When `isPayPeriod(month)` and `config` is provided: call `generatePayPeriods` to find the period's `startDate` and `endDate`, return `{ date: { $gte: startDate, $lte: endDate } }`
  - Otherwise: return `{ date: { $transform: '$month', $eq: month } }`
- [ ] 9.2 Export `resolveMonthToDateFilter` from `packages/loot-core/src/shared/pay-periods.ts`
- [ ] 9.3 Add `payPeriodConfig?: PayPeriodConfig` to `CategoryTransactionsProps` and `TransactionListWithPreviewsProps` in `CategoryTransactions.tsx`
- [ ] 9.4 Pass `payPeriodConfig` from `CategoryPage` (already computed there) into `<CategoryTransactions>`
- [ ] 9.5 Update `getCategoryMonthFilter` to accept `config?: PayPeriodConfig` and call `resolveMonthToDateFilter(month, config)` instead of the inline date filter; update its call site in `TransactionListWithPreviews`
- [ ] 9.6 Add unit tests for `resolveMonthToDateFilter` in `pay-periods.test.ts`:
  - Calendar month returns `{ date: { $transform: '$month', $eq: month } }`
  - Pay period month with config returns `{ date: { $gte: startDate, $lte: endDate } }` with correct dates
  - Pay period month without config falls back to `$transform: '$month'` filter (no crash, best-effort)

## 10. Fix current-period background highlight

`monthUtils.isCurrentMonth(month)` is used in `BudgetTableHeader`, `ExpenseGroupHeader`, and `ExpenseCategoryListItem` for the "current month" background colour. When `month` is a pay period ID, `isCurrentMonth` compares it against the return of `monthUtils.currentMonth()` (always a calendar string like `2026-03`), so the highlight never fires while a pay period is active.

- [ ] 10.1 Add `isCurrentPeriod(month: string, config?: PayPeriodConfig): boolean` to `packages/loot-core/src/shared/pay-periods.ts`:
  - When `isPayPeriod(month)` and `config` provided: resolve the current calendar date's pay period ID via `generatePayPeriods`, compare against `month`
  - Otherwise: delegate to `monthUtils.isCurrentMonth(month)`
- [ ] 10.2 Add `payPeriodConfig?: PayPeriodConfig` to `BudgetTableProps` in `BudgetTable.tsx`; pass it from `BudgetPage` (already has it)
- [ ] 10.3 Thread `payPeriodConfig` through `BudgetTable` → `BudgetTableHeader`, `BudgetGroups` → `ExpenseGroupList` → `ExpenseGroupListItem` → `ExpenseGroupHeader`, and `ExpenseCategoryList` → `ExpenseCategoryListItem`
- [ ] 10.4 Replace each `monthUtils.isCurrentMonth(month)` call in those components with `isCurrentPeriod(month, payPeriodConfig)`
- [ ] 10.5 Add unit tests for `isCurrentPeriod`: correctly identifies current pay period; falls back correctly for calendar months; returns false for non-current periods
