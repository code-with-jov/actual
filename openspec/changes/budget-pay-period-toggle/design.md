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

### D7: Budget engine must be reconnected on toggle (runtime bug)

**Root cause**: Moving the toggle from Settings to the Budget page exposed a latent initialization gap. When the toggle lived in Settings, navigating away from the Budget page caused it to unmount and remount — `init()` re-ran on every visit, so `payPeriodConfig` was always fresh. With the toggle now on the Budget page, `init()` only runs once on mount. Two subsystems that depended on mount-time initialization are never told to re-initialize when the pref changes:

1. **Server** (`preferences/app.ts`): `saveSyncedPrefs` updates `payPeriodConfig` in sheet meta but never calls `createAllBudgets(updatedConfig)`. Pay period budget sheets (`budget202613`, etc.) are never created. `envelope-budget-month` reads from a sheet that doesn't exist and returns 0 for all values — including `sum-amount-<catId>` (spent).

2. **Client** (`budget/index.tsx`): The `init` effect runs once on mount. When pay periods are toggled, the `bounds` state (regular month IDs from the initial `get-budget-bounds` call) is never refreshed. `getValidMonth` clips any pay period ID to the regular-month `bounds.end`, making navigation to pay period months impossible. The spreadsheet prewarm cache also has no entries for pay period sheets.

**Decision**:

*Server*: In `saveSyncedPrefs`, after setting `sheet.meta().payPeriodConfig`, call `await budget.createAllBudgets(updatedConfig)`. This creates any missing pay period budget sheets before the response returns to the client.

*Client*: In `budget/index.tsx`, add a `useEffectEvent` (`onPayPeriodConfigChange`) that re-runs `get-budget-bounds` + `setBounds` + `prewarmAllMonths`, and wire it to a `useEffect` that fires when `payPeriodConfig` changes. Guard with `if (!initialized) return` so it does not double-fire on the initial mount (where `init()` already handles setup).

**Why `createAllBudgets` in `saveSyncedPrefs` rather than a separate handler**:
`saveSyncedPrefs` is the single point where pay period prefs land on the server. Calling `createAllBudgets` there ensures sheets are ready before the pref-save response returns, so the client's subsequent `get-budget-bounds` call finds them. A separate handler (e.g., `refresh-budget-for-pay-periods`) would require an extra round trip from the client and a new handler registration.

**Alternative considered — client triggers `get-budget-bounds` and relies on it calling `createAllBudgets`**: The client already calls `get-budget-bounds` → `createAllBudgets` on mount. We could make the client call it again after toggle (without the server fix). This avoids touching `preferences/app.ts`, but introduces a race: if `payPeriodConfig` in the server meta is updated by `saveSyncedPrefs` and then `get-budget-bounds` is called immediately, the server would call `createAllBudgets(payPeriodConfig)` with the new config — which should work. However, this relies on sequencing (pref save must complete before `get-budget-bounds`) which is guaranteed since the client awaits the pref save. Both approaches are valid; we prefer the server fix because it makes `saveSyncedPrefs` self-contained: any caller that changes a pay period pref gets sheets created automatically, not just the Budget page.

**Alternative considered — eager creation on initial load only, lazy creation on toggle**: The server could create sheets lazily when `envelope-budget-month` is called with an unknown sheet ID. This avoids the explicit trigger entirely but requires `sheet.getCellValue` to handle a missing sheet by creating it on the fly — a larger change to the spreadsheet infrastructure. Not worth it for this scope.

**Performance note**: On first enable, `useTogglePayPeriods` writes up to three prefs sequentially (`payPeriodStartDate`, `payPeriodFrequency`, `showPayPeriods`). Each triggers `saveSyncedPrefs` → `createAllBudgets`. The first two calls do minimal work because `payPeriodConfig.enabled` is still false until `showPayPeriods` is written — `getBudgetRange` without an enabled config generates regular month ranges that are already in `createdMonths`. Only the final `showPayPeriods = 'true'` call generates and creates new pay period sheets. Acceptable for the scope of this change.

---

## Risks / Trade-offs

- **Prop threading depth**: Toggle state threads through `DynamicBudgetTable → BudgetPageHeader → MonthPicker`. This is three levels but each step is a single prop pair — acceptable given existing patterns in the codebase.
- **`BudgetPageMenuModal` type update**: `modalsSlice.ts` defines the `budget-page-menu` options type. Adding optional props (`onTogglePayPeriods?: () => void`, `payPeriodsActive?: boolean`) is a non-breaking change.
- **Default start date**: Setting start date to first day of current month (`${monthUtils.currentMonth()}-01`) may not match the user's actual pay schedule, but it provides a valid default that surfaces pay periods immediately. Users can correct it in Settings.

## Migration Plan

Pure UI change. No data migration, database changes, or backwards-compatibility concerns. The `payPeriodsEnabled` feature flag continues to gate the entire feature.
