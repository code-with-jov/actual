## Why

The mobile header bar has constrained horizontal space (logo on left, calendar icon on right). The existing `'summary'` format for pay period labels (`Jan 5 - Jan 18 (PP1)`) causes the label to overflow or truncate on small screens. The `(PPX)` period-number suffix is supplemental — users in pay period mode already know that — so omitting it on mobile is a clean trade-off with no functional loss.

This change is standalone: it applies regardless of how pay periods were enabled (Settings checkbox, or the new toggle button from `budget-pay-period-toggle`).

## What Changes

- **New `'short'` format in `getPayPeriodLabel`**: returns `{startDate} - {endDate}` (e.g. `Jan 5 - Jan 18`) with no `(PPX)` suffix.
- **Three mobile call sites** in `BudgetPage.tsx` (category group rows, `MonthSelector` header) and `CategoryPage.tsx` switch from `'summary'` to `'short'`.

Desktop call sites continue using `'summary'` unchanged.

## Capabilities

### Modified Capabilities

- `pay-period-ui`: Mobile pay period labels no longer include the period-number suffix, preventing truncation on small screens.

## Impact

- `packages/loot-core/src/shared/pay-periods.ts` — add `'short'` format to `getPayPeriodLabel`
- `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx` — switch two `getPayPeriodLabel` calls from `'summary'` to `'short'`
- `packages/desktop-client/src/components/mobile/budget/CategoryPage.tsx` — switch one `getPayPeriodLabel` call from `'summary'` to `'short'`

## Non-Goals

- Changing desktop label format
- Mobile engine reconnection or toggle wiring (those are in `budget-pay-period-toggle`)
- Graduating the `payPeriodsEnabled` feature flag
