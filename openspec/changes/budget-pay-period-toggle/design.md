## Context

The pay period engine and all downstream calculations are fully implemented. The `payPeriodsEnabled` feature flag gates the entire feature and defaults to `false`. When enabled by the user in Experimental settings, the feature is fully functional — it simply lacks a convenient toggle on the Budget page.

`PayPeriodSettings.tsx` currently owns the enable/disable checkbox alongside frequency and start-date config. This change splits that: the checkbox (enable/disable) moves to the Budget page; frequency and start date remain in Settings.

---

## Goals / Non-Goals

**Goals:**

- `useTogglePayPeriods` hook: apply defaults, write prefs, return toggle state to both desktop and mobile
- Desktop: `SvgLoadBalancer` toggle button in `MonthPicker`, left of the Today button, with clear active/inactive visual
- Mobile: "Enable/Disable pay period budgeting" menu item in `BudgetPageMenuModal`
- `PayPeriodSettings`: remove enable/disable UI (checkbox, `handleToggle`, `validationError`, "Disable" button)

**Non-Goals:**

- Graduating the `payPeriodsEnabled` feature flag
- Changing pay period engine or calculation logic
- Redesigning `MonthPicker` layout beyond the added button

---

## Decisions

### D1: `useTogglePayPeriods` hook encapsulates defaults + pref writes

**Decision**: Create `packages/desktop-client/src/hooks/useTogglePayPeriods.ts`. The hook:

1. Reads `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate` via `useSyncedPref`
2. Returns `{ payPeriodsActive: boolean, togglePayPeriods: () => void }`
3. `togglePayPeriods()`: when enabling, if `payPeriodStartDate` is empty set it to the first day of the current calendar month (`monthUtils.currentMonth()` gives `YYYY-MM`; append `-01`); if `payPeriodFrequency` is empty set it to `'monthly'`; then flip `showPayPeriods`

**Rationale**: Avoids duplicating the defaults logic in both `DynamicBudgetTable.tsx` (desktop) and `BudgetPage.tsx` (mobile). Consistent with the hook-heavy pattern already in use (`useSyncedPref`, `useLocalPref`, `useFeatureFlag`).

**Alternative considered**: Inline the logic in each call site. Rejected — two call sites means two places to maintain the defaults logic.

### D2: Desktop toggle lives in `MonthPicker`, not `BudgetPageHeader` or `DynamicBudgetTable`

**Decision**: Add the toggle button directly inside `MonthPicker.tsx`'s inner flex row, as the first element before the Today button. `MonthPicker` receives two new props: `onTogglePayPeriods?: () => void` and `payPeriodsActive?: boolean`.

**Rationale**: `MonthPicker` owns the entire navigation row. Placing the button there keeps the row cohesive and avoids adding a second row or modifying `BudgetPageHeader`'s margin calculations. The props are optional so the picker can be used without pay period support if needed.

**Prop threading chain**: `DynamicBudgetTable` → `BudgetPageHeader` → `MonthPicker`.

### D3: Toggle button uses `SvgLoadBalancer` from `@actual-app/components/icons/v1`

**Decision**: Import `SvgLoadBalancer` from `@actual-app/components/icons/v1`. Render it inside a `Link` (variant `"button"`, buttonVariant `"bare"`) matching the style of the Today and chevron buttons.

Active state visual: when `payPeriodsActive` is true, apply `color: theme.pageTextPositive` (or equivalent accent color). When inactive, use `color: theme.pageTextSubdued`. This follows the existing pattern for toggled icon buttons in the codebase.

**Rationale**: `SvgLoadBalancer` is available in the repository's icon set. The active/inactive color distinction (accent vs subdued) is the simplest and most accessible indicator, consistent with how other toggle states are shown (e.g., `showHiddenCategories` in mobile menu).

### D4: `DynamicBudgetTable` is the gating point for the feature flag

**Decision**: `DynamicBudgetTable` calls `useFeatureFlag('payPeriodsEnabled')` and only passes `onTogglePayPeriods` and `payPeriodsActive` down to `BudgetPageHeader` → `MonthPicker` when the flag is true. When false, the props are not passed and the button is not rendered.

**Rationale**: Centralizes the flag check in one place (matching the existing pattern in `budget/index.tsx`). `MonthPicker` and `BudgetPageHeader` remain unaware of the feature flag.

### D5: Mobile toggle in `BudgetPageMenuModal` as a text menu item

**Decision**: Add a `toggle-pay-periods` case to `BudgetPageMenuModal` with text `t('Enable pay period budgeting')` when inactive and `t('Disable pay period budgeting')` when active. The modal receives `onTogglePayPeriods` and `payPeriodsActive` in its options. `BudgetPage.tsx` passes these from the `useTogglePayPeriods()` hook result.

**Rationale**: Mobile's primary budget page action surface is the `budget-page-menu` modal. Adding a text item here is consistent with "Toggle hidden categories" already in the same menu. No new UI patterns needed.

**Feature flag gating on mobile**: `BudgetPage.tsx` already reads `isPayPeriodsEnabled` via `useFeatureFlag`. The `onOpenBudgetPageMenu` callback only includes `onTogglePayPeriods`/`payPeriodsActive` in the modal options when `isPayPeriodsEnabled` is true.

### D6: `PayPeriodSettings` retains frequency and start date config

**Decision**: Remove: the `Checkbox`, its `label`, the `enabled` derived state, `handleToggle`, `validationError` state, `setValidationError` calls, the validation error `Text`, `frequencyWarning` related to enabling, and the "Disable pay periods" `Button`. Retain: the pay frequency `Select`, the start date `input`, and the `frequencyWarning` shown when frequency changes while periods are active.

**Rationale**: Users still need to configure frequency and start date. The Settings page remains the right place for that configuration. The enable/disable action moving to Budget page does not change the need for this config.

**Note on `frequencyWarning`**: The warning "Changing frequency will reset period numbering" was previously shown when periods are enabled. Since `enabled` state is removed, check `showPayPeriods === 'true'` directly from the pref instead. The warning logic itself is unchanged.

---

## Risks / Trade-offs

- **Prop threading depth**: Toggle state threads through `DynamicBudgetTable → BudgetPageHeader → MonthPicker`. This is three levels but each step is a single prop pair — acceptable given existing patterns in the codebase.
- **`BudgetPageMenuModal` type update**: `modalsSlice.ts` defines the `budget-page-menu` options type. Adding optional props (`onTogglePayPeriods?: () => void`, `payPeriodsActive?: boolean`) is a non-breaking change.
- **Default start date**: Setting start date to first day of current month (`${monthUtils.currentMonth()}-01`) may not match the user's actual pay schedule, but it provides a valid default that surfaces pay periods immediately. Users can correct it in Settings.

## Migration Plan

Pure UI change. No data migration, database changes, or backwards-compatibility concerns. The `payPeriodsEnabled` feature flag continues to gate the entire feature.
