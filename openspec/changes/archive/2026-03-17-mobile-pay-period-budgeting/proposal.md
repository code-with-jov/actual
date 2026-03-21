## Why

The pay period budgeting engine and desktop budget page are fully implemented, but the mobile budget page was never updated to be pay period-aware. A user who configures pay periods on desktop will encounter silent breakage on mobile: navigation throws errors (calling `subMonths`/`addMonths` with a pay period ID and no config), the period label renders garbage (`monthUtils.format` applied to a pay period ID like `2024-13`), the "Today" button is always visible, and tapping a budget cell's Spent amount shows no transactions (the `$transform: '$month'` filter never matches a pay period ID).

## What Changes

- **`mobile/budget/BudgetPage.tsx`**: Read pay period prefs, build `PayPeriodConfig`, wrap the page in `PayPeriodProvider`, and fix all `monthUtils` calls (navigation, current-period detection, label formatting) to pass the config.
- **`mobile/budget/CategoryPage.tsx`**: Build `PayPeriodConfig` from prefs, wrap the page in `PayPeriodProvider`, fix the period label in the page header.
- **`mobile/budget/CategoryTransactions.tsx`**: Call `usePayPeriodConfig()` from context and replace the `$transform: '$month'` filter with a date-range filter when a pay period ID is detected.
- **`MonthSelector`** (sub-component of `BudgetPage`): Accept `payPeriodConfig` as a prop, use `getPayPeriodLabel` for pay period display, and compare adjacent period start dates against calendar bounds integers to enable/disable the prev/next arrows correctly.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `pay-period-ui`: The mobile budget page now fully participates in pay period mode — navigation, period display, "today" detection, and drill-through transaction filtering all become pay-period-aware.

## Impact

- `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx` — pay period prefs, `PayPeriodProvider`, fixed `monthUtils` calls, `MonthSelector` props
- `packages/desktop-client/src/components/mobile/budget/CategoryPage.tsx` — pay period prefs, `PayPeriodProvider`, fixed header label
- `packages/desktop-client/src/components/mobile/budget/CategoryTransactions.tsx` — `usePayPeriodConfig`, date-range filter
- No engine, server, or data-model changes; no new synced preferences

## Non-Goals

- Mobile settings UI for configuring pay periods (pay period config is done on desktop; prefs sync to mobile)
- Changes to `BudgetTable`, `BudgetCell`, or `SpentCell` (spreadsheet bindings already work with pay period sheet IDs)
- Changes to `months.ts` or `pay-periods.ts` engine functions
