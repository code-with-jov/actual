## Why

Three mobile E2E tests in `pay-periods.mobile.test.ts` are failing because pay period month IDs (e.g., `'2026-17'`) are passed into modal components and a transition guard that all call `monthUtils.format()` or `monthUtils.prevMonth()` without a `PayPeriodConfig`, causing `_parse` to throw and React's error boundary to display "Fatal Error". Additionally, the budget-page menu modal does not close after the user toggles pay periods off, leaving a second `<h1>` in the DOM and triggering a Playwright strict-mode violation.

## What Changes

- `EnvelopeBudgetMonthMenuModal`: compute `displayMonth` using `getPayPeriodLabel` when the month is a pay period ID, falling back to `monthUtils.format` for calendar months.
- `EnvelopeBudgetSummaryModal`: pass `payPeriodConfig` to `prevMonth()` so the previous pay period ID can be resolved to a calendar date before calling `formatMonth`.
- `BudgetPageMenuModal`: close the modal (`state.close()`) after `onTogglePayPeriods` is called.
- `BudgetPage.tsx` – `MonthSelector`: guard the `periodLabel` fallback so it does not call `monthUtils.format` with a pay period ID when `payPeriodConfig` is `undefined` during the brief transition after disabling.
- `modalsSlice.ts`: add optional `payPeriodConfig?: PayPeriodConfig` to both `envelope-budget-month-menu` and `envelope-budget-summary` modal option types.
- `BudgetPage.tsx` – modal dispatch: pass `payPeriodConfig` when opening `envelope-budget-month-menu` and `envelope-budget-summary` modals.

## Capabilities

### New Capabilities

_(none — this is a bug fix)_

### Modified Capabilities

- `pay-period-ui`: modal display components and MonthSelector must handle pay period IDs correctly; `BudgetPageMenuModal` must close after toggling pay periods.

## Impact

- `packages/desktop-client/src/components/modals/EnvelopeBudgetMonthMenuModal.tsx`
- `packages/desktop-client/src/components/modals/EnvelopeBudgetSummaryModal.tsx`
- `packages/desktop-client/src/components/modals/BudgetPageMenuModal.tsx`
- `packages/desktop-client/src/modals/modalsSlice.ts`
- `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx`
- No new dependencies; uses existing `getPayPeriodLabel` / `isPayPeriod` from `loot-core/shared/pay-periods`.
