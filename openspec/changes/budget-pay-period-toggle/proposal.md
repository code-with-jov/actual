## Why

Pay period budgeting is fully implemented in the engine and desktop/mobile pages, but enabling and disabling it is buried in the Settings page — far from the Budget page where the feature actually surfaces. Users must navigate away from their budget to toggle pay periods on or off. This creates friction that discourages use and makes the feature feel disconnected from the context where it matters.

## What Changes

- **Remove the enable/disable checkbox** from `PayPeriodSettings` in Settings. The frequency and start date configuration remain there.
- **Add a pay period toggle button** to the desktop `MonthPicker` (left of the Today button), using the `SvgLoadBalancer` icon. It is visually distinct when active vs inactive.
- **Add a "Enable/Disable pay period budgeting" menu item** to the mobile `BudgetPageMenuModal`.
- **New `useTogglePayPeriods` hook** encapsulates defaults logic and pref writes, shared by both desktop and mobile toggle handlers.
- **Sensible defaults on first enable**: if `payPeriodStartDate` is unset, default to the first day of the current month; if `payPeriodFrequency` is unset, default to `'monthly'`.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `pay-period-ui`: The pay period enable/disable control moves from Settings to the Budget page, making it accessible in-context on both desktop and mobile.

## Impact

- `packages/desktop-client/src/components/settings/PayPeriodSettings.tsx` — remove checkbox, `enabled` state, `handleToggle`, `validationError` state, and "Disable pay periods" button
- `packages/desktop-client/src/components/budget/MonthPicker.tsx` — add `onTogglePayPeriods` + `payPeriodsActive` props; render `SvgLoadBalancer` button before Today button
- `packages/desktop-client/src/components/budget/BudgetPageHeader.tsx` — thread new props down to `MonthPicker`
- `packages/desktop-client/src/components/budget/DynamicBudgetTable.tsx` — read prefs + feature flag, call `useTogglePayPeriods`, pass to `BudgetPageHeader`
- `packages/desktop-client/src/hooks/useTogglePayPeriods.ts` — **new file**
- `packages/desktop-client/src/modals/modalsSlice.ts` — add `onTogglePayPeriods` to `budget-page-menu` options type
- `packages/desktop-client/src/components/modals/BudgetPageMenuModal.tsx` — add `toggle-pay-periods` menu item
- `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx` — call hook, pass to `onOpenBudgetPageMenu`
- No engine, server, data-model, or feature flag changes

## Non-Goals

- Promoting the `payPeriodsEnabled` feature flag to GA (stays experimental, default `false`)
- Moving the frequency or start date configuration out of Settings
- Changes to pay period engine (`pay-periods.ts`, `months.ts`)
- Visual redesign of the MonthPicker beyond adding the toggle button
