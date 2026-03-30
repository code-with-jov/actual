## Why

The current pay period labels (`PP 1`, `PP 26`, `Pay Period 1 (Jan 5 – Jan 18)`) are functional but not intuitive — they expose an internal sequential number rather than a meaningful calendar position. Users think in terms of "which week/fortnight of February am I in", not "pay period 7 of 26".

## What Changes

- **MonthPicker short label**: Change from `PP 1` to a month-initial + within-month count format (e.g., `J1`, `J2`, `F1`). The letter is the first letter of the period's start month; the number is the count of periods that have started in that same calendar month up to and including this one.
- **BudgetSummary long label**: Change from `Pay Period 1 (Jan 5 – Jan 18)` to `Jan 5 - Jan 18 (PP1)` — date range first for immediate readability, global period number in parentheses as secondary context.
- **`getPayPeriodLabel` function**: Update both format branches to produce the new labels. The short format now requires a `generatePayPeriods` lookup (currently skipped); the long format reorders its output.
- **New `'short'` format for mobile**: Add a `'short'` format that returns just `{startDate} - {endDate}` (e.g. `Jan 5 - Jan 18`) with no `(PPX)` suffix. The mobile header bar has constrained horizontal space and the period-number suffix causes truncation on small screens.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `pay-period-ui`: The pay period display name requirement changes. Short format becomes `{monthLetter}{withinMonthCount}` (e.g., `J1`); long format becomes `{startDate} - {endDate} (PP{globalN})` (e.g., `Jan 5 - Jan 18 (PP1)`); mobile short format becomes `{startDate} - {endDate}` (e.g., `Jan 5 - Jan 18`).

## Impact

- `packages/loot-core/src/shared/pay-periods.ts` — `getPayPeriodLabel` function (all three format branches); new `resolveMonthToDateFilter` and `isCurrentPeriod` utilities
- `packages/loot-core/src/shared/pay-periods.test.ts` — label assertion updates; new utility unit tests
- `packages/desktop-client/e2e/pay-periods.test.ts` — E2E label assertions
- `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx` — switch two `getPayPeriodLabel` calls from `'summary'` to `'short'`; thread `payPeriodConfig` into `BudgetTable`
- `packages/desktop-client/src/components/mobile/budget/CategoryPage.tsx` — switch one `getPayPeriodLabel` call from `'summary'` to `'short'`; pass `payPeriodConfig` into `CategoryTransactions`
- `packages/desktop-client/src/components/mobile/budget/CategoryTransactions.tsx` — update `getCategoryMonthFilter` to use `resolveMonthToDateFilter`
- `packages/desktop-client/src/components/mobile/budget/BudgetTable.tsx` — thread `payPeriodConfig`; update `isCurrentMonth` calls
- `packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx` — update `isCurrentMonth` call
- `packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx` — update `isCurrentMonth` call
- No API or data-model changes; purely display and filtering correctness
