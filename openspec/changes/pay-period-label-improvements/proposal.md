## Why

The current pay period labels (`PP 1`, `PP 26`, `Pay Period 1 (Jan 5 – Jan 18)`) are functional but not intuitive — they expose an internal sequential number rather than a meaningful calendar position. Users think in terms of "which week/fortnight of February am I in", not "pay period 7 of 26".

## What Changes

- **MonthPicker short label**: Change from `PP 1` to a month-initial + within-month count format (e.g., `J1`, `J2`, `F1`). The letter is the first letter of the period's start month; the number is the count of periods that have started in that same calendar month up to and including this one.
- **BudgetSummary long label**: Change from `Pay Period 1 (Jan 5 – Jan 18)` to `Jan 5 - Jan 18 (PP1)` — date range first for immediate readability, global period number in parentheses as secondary context.
- **`getPayPeriodLabel` function**: Update both format branches to produce the new labels. The short format now requires a `generatePayPeriods` lookup (currently skipped); the long format reorders its output.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `pay-period-ui`: The pay period display name requirement changes. Short format becomes `{monthLetter}{withinMonthCount}` (e.g., `J1`); long format becomes `{startDate} - {endDate} (PP{globalN})` (e.g., `Jan 5 - Jan 18 (PP1)`).

## Impact

- `packages/loot-core/src/shared/pay-periods.ts` — `getPayPeriodLabel` function (both format branches)
- `packages/loot-core/src/shared/pay-periods.test.ts` — label assertion updates
- `packages/desktop-client/e2e/pay-periods.test.ts` — E2E label assertions
- No API or data-model changes; purely display formatting
