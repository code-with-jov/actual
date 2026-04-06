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

### D8: Mobile short label format — out of scope, see `mobile-pay-period-enhancements`

The `'short'` format for `getPayPeriodLabel` (omitting the `(PPX)` suffix on mobile) is a standalone display improvement with no dependency on the toggle. It is tracked separately in `mobile-pay-period-enhancements`.

---

### D7: Budget engine must be reconnected on toggle (runtime bug)

**Root cause**: Moving the toggle from Settings to the Budget page exposed a latent initialization gap. When the toggle lived in Settings, navigating away from the Budget page caused it to unmount and remount — `init()` re-ran on every visit, so `payPeriodConfig` was always fresh. With the toggle now on the Budget page, `init()` only runs once on mount. Two subsystems that depended on mount-time initialization are never told to re-initialize when the pref changes:

1. **Server** (`preferences/app.ts`): `saveSyncedPrefs` updates `payPeriodConfig` in sheet meta but never calls `createAllBudgets(updatedConfig)`. Pay period budget sheets (`budget202613`, etc.) are never created. `envelope-budget-month` reads from a sheet that doesn't exist and returns 0 for all values — including `sum-amount-<catId>` (spent).

2. **Client** (`budget/index.tsx`): The `init` effect runs once on mount. When pay periods are toggled, the `bounds` state (regular month IDs from the initial `get-budget-bounds` call) is never refreshed. `getValidMonth` clips any pay period ID to the regular-month `bounds.end`, making navigation to pay period months impossible. The spreadsheet prewarm cache also has no entries for pay period sheets.

**Decision**:

_Server_: No change to `saveSyncedPrefs`. It already updates `sheet.meta().payPeriodConfig` before responding — that is sufficient. `createAllBudgets` must **not** be called here (see rationale below).

_Client_: In `budget/index.tsx`, add a `useEffectEvent` (`onPayPeriodConfigChange`) that re-runs `get-budget-bounds` + `setBounds` + `prewarmAllMonths`, and wire it to a `useEffect` that fires when `payPeriodConfig` changes. Guard with `if (!initialized) return` so it does not double-fire on the initial mount (where `init()` already handles setup). Sheet creation happens inside `getBudgetBounds()` on the server, which already calls `createAllBudgets(payPeriodConfig)`.

**Why `createAllBudgets` belongs in `getBudgetBounds`, not `saveSyncedPrefs`**:
The server handler `getBudgetBounds()` already calls `budget.createAllBudgets(payPeriodConfig)` and returns the resulting bounds. The server worker processes messages sequentially, so `get-budget-bounds` is always queued after `preferences/save` — by the time `getBudgetBounds` runs, `sheet.meta().payPeriodConfig` already holds the updated config. Sheet creation happens exactly where it needs to, with no extra coupling to `saveSyncedPrefs`.

Calling `createAllBudgets` inside `saveSyncedPrefs` blocks the entire pref-save response on full sheet creation. On a fresh file, this means creating ~50+ period sheets before the server responds, which delays the Redux `mergeSyncedPrefs` dispatch, which delays `payPeriodConfig` updating in React, which delays the UI re-rendering with PP labels. The result is a visible UI freeze on the toggle click and Playwright timeouts. Keeping sheet creation in `getBudgetBounds` means the pref save returns immediately, Redux updates immediately, and the UI re-renders instantly.

**Alternative considered — `createAllBudgets` in `saveSyncedPrefs`** (original D7 decision, revised): Previously preferred for self-containment. Rejected after observing it caused blocking UI freezes and Playwright test timeouts on fresh files where many sheets needed creation.

**Alternative considered — eager creation on initial load only, lazy creation on toggle**: The server could create sheets lazily when `envelope-budget-month` is called with an unknown sheet ID. Rejected — requires changes to spreadsheet infrastructure, out of scope.

---

### D7 (mobile): Mobile `BudgetPage.tsx` must also be reconnected on toggle

**Root cause**: The mobile `BudgetPage.tsx` has its own `init()` effect that fetches bounds once on mount. When the toggle fires, `payPeriodConfig.enabled` flips to `true` and `currMonth` returns a pay period ID — but `monthBounds` is stale (regular month range), so `getValidMonth` clips the pay period ID back to the old range end and PP labels never appear.

**Decision**: Mirror the desktop fix in `mobile/budget/BudgetPage.tsx`: add a `useEffectEvent` (`onPayPeriodConfigChange`) guarded by `if (!initialized) return`, then wire it to a `useEffect` on `[payPeriodConfig]`. In addition to re-fetching bounds and prewarming, call `setStartMonthPref(currMonth)` — without this the mobile `MonthSelector` stays on its old calendar-month value because the mobile component does not have the same derived `startMonth` guard that the desktop `budget/index.tsx` uses (D9).

**Playwright locator precision**: In `enablePayPeriodsOnMobileBudgetPage`, use `budgetPage.heading.first()` (not `budgetPage.heading`) to avoid strict mode violation when the menu modal is still animating out and both the modal heading and the budget heading are simultaneously in the DOM.

---

### D9: Mixed-format crash during toggle — `startMonth` + `displayBounds` fix

**Root cause**: The `onPayPeriodConfigChange` effect (D7) introduced a one-render window where three values are in conflicting formats after toggle:

| Value                     | Sync/Async                  | State on first render after toggle |
| ------------------------- | --------------------------- | ---------------------------------- |
| `payPeriodConfig.enabled` | Synchronous (React pref)    | ✓ new value                        |
| `startMonthPref`          | Persisted local pref (lazy) | ✗ old format                       |
| `bounds`                  | Server RPC (async)          | ✗ old format                       |

On that first render, `startMonth` derived from the stale pref produces a calendar ID while `payPeriodConfig` is already in PP mode. `getValidMonthBounds` then produces a mixed-format pair (PP start, calendar end), and `rangeInclusive` throws on mixed-format input — caught by the React error boundary and shown as a Fatal Error dialog.

**Decision**: Fix both mismatches in `budget/index.tsx`, co-located with the state they protect:

1. **Symmetric `startMonth` rule** — replace the one-directional disable-only guard with a single symmetric check: if the persisted pref's format doesn't match the current mode, fall back to `currentMonth` (which is computed from `payPeriodConfig` and is always format-correct):

   ```typescript
   const startMonth =
     startMonthPref && isPayPeriod(startMonthPref) === payPeriodConfig.enabled
       ? startMonthPref
       : currentMonth;
   ```

2. **Derived `displayBounds`** — compute a format-safe view of `bounds` inline, immediately after `bounds` state is declared. If `bounds` is in the old format (hasn't been refreshed by the RPC yet), fall back to `{ start: startMonth, end: startMonth }`. Pass `displayBounds` to the table instead of `bounds`:
   ```typescript
   const displayBounds =
     isPayPeriod(bounds.start) === payPeriodConfig.enabled
       ? bounds
       : { start: startMonth, end: startMonth };
   ```

**Why the fallback to a single-period range is acceptable UX**: The fallback only activates for the one render between the toggle click and the `onPayPeriodConfigChange` RPC returning. In practice this is imperceptible — the user sees a single pay period for a frame, then the full PP range renders as the RPC resolves.

**Alternatives considered**:

- _Fix in `MonthsContext.tsx`_: Import `isPayPeriod` into `MonthsProvider`, rename `bounds` → `rawBounds`, add a mismatch guard before calling `rangeInclusive`. Rejected — `MonthsContext` has no business knowing about pay period toggle semantics; the guard belongs with the state owner.
- _Fix in `getValidMonthBounds`_: Add a format-mismatch early-return. Cleaner than touching `MonthsContext` but still downstream of where the state lives.
- _Transition flag_: Set `isTransitioning = true` during the RPC, render `null` for the table. Rejected — causes a visible flash/blank on every toggle.
- _Eager `setStartMonthPref` in toggle handler_: Call `setStartMonthPref(currentMonth)` synchronously in `togglePayPeriods`. Rejected — `useTogglePayPeriods` has no access to the PP-format `currentMonth`; `bounds` would still be stale.

**No changes required outside `budget/index.tsx`**: `MonthsContext.tsx`, `rangeInclusive`, and `getValidMonthBounds` remain untouched.

### D10: `resolveStartMonth` utility ensures `startMonth` format matches current mode (both directions)

**Decision**: Add `monthUtils.resolveStartMonth(stored, config, fallback)` to `months.ts`. It returns `stored` when its format matches the current mode (both are PP or both are calendar), and `fallback` otherwise. Use it in both `budget/index.tsx` and `mobile/budget/BudgetPage.tsx` to replace their respective `startMonth` derivation expressions.

```typescript
// months.ts — isPayPeriod already imported
export function resolveStartMonth(
  stored: string | undefined | null,
  config: PayPeriodConfig | undefined,
  fallback: string,
): string {
  const ppActive = config?.enabled === true;
  return stored && isPayPeriod(stored) === ppActive ? stored : fallback;
}

// Desktop (budget/index.tsx) — replaces: startMonthPref || currentMonth
const startMonth = monthUtils.resolveStartMonth(
  startMonthPref,
  payPeriodConfig,
  currentMonth,
);

// Mobile (BudgetPage.tsx) — replaces the 4-line conditional block
const startMonth = monthUtils.resolveStartMonth(
  storedStartMonth,
  payPeriodConfig,
  currMonth,
);
```

**Symmetric guard — both directions**:

- **Enable** (PP mode on, pref is calendar `'2026-03'`): `isPayPeriod('2026-03') === true` → false, falls back to `currMonth` (a PP ID) ✓
- **Disable** (PP mode off, pref is `'2026-18'`): `isPayPeriod('2026-18') === false` → false, falls back to `currentMonth` (a calendar ID) ✓

`config?.enabled === true` handles both the desktop pattern (`config` always has `enabled: boolean`) and the mobile pattern (`config` is `undefined` when disabled).

**Why 2 call sites, not 4**: `budget/index.tsx` handles both envelope and tracking budget types internally via a `budgetType` switch. Same for mobile `BudgetPage.tsx`. There are no separate per-budget-type components that read `budget.startMonth`.

**`resolveBounds` stays inline**: The parallel guard on `bounds` state (`displayBounds`) is 3 lines and depends on co-located `startMonth` — not worth extracting.

**Rationale**: Without this guard, a stale pay period ID in `localStorage` survives the toggle and reaches `MonthPicker.tsx`, where `addMonths(stalePPId, n, undefined)` calls `_parse` without a config and throws. The utility is in `months.ts` because `isPayPeriod` is already imported there and the function is a pure month-ID utility with no component knowledge.

**Alternative considered**: `useEffect(() => { if (mismatch) setStartMonthPref(currMonth); }, [...])`. Rejected — on mobile, `startMonth` is in `init()`'s dep array, so the pref write immediately re-triggers initialization (render loop).

---

### D12: `saveSyncedPrefs` must apply optimistic Redux updates before awaiting IPC

**Decision**: In `prefsSlice.ts`, dispatch `mergeSyncedPrefs(prefs)` _before_ the `await Promise.all(...)` IPC call, not after.

```typescript
// Before (pessimistic — Redux only updates after IPC round-trip):
await Promise.all(Object.entries(prefs).map(...send('preferences/save', ...)));
dispatch(mergeSyncedPrefs(prefs));

// After (optimistic — Redux updates immediately):
dispatch(mergeSyncedPrefs(prefs));
await Promise.all(Object.entries(prefs).map(...send('preferences/save', ...)));
```

**Rationale**: Two production bugs stem directly from the pessimistic pattern:

1. **Silent `handleToggle` failure**: `handleToggle` reads `payPeriodStartDate` from Redux (`useSyncedPref` → `useSelector`). If the user fills the start-date input and clicks the enable checkbox before the `payPeriodStartDate` IPC round-trip completes, `handleToggle` sees `undefined`, shows a validation error, and returns early — `showPayPeriods` is never saved to `'true'`. The UI shows the date the user entered, but PP enabling silently fails.

2. **Budget page stale render**: Even when `handleToggle` succeeds, if the user navigates to the budget page before the `showPayPeriods` IPC completes, `payPeriodConfig` is `undefined` on first render. The heading shows the old calendar label and never self-corrects — the `init()` re-run that would fix it only triggers when `startMonth` changes, which requires `payPeriodConfig` to have already updated.

Both bugs are eliminated by updating Redux first: `useSyncedPref` readers see the new value on the same render that the setter was called.

**Risk**: If `preferences/save` fails (local SQLite write — essentially never), Redux holds a value that doesn't match persisted state until the next `load-prefs` on app restart. Acceptable: local pref writes are not expected to fail, and the consequence is a transient stale render, not data loss.

**Scope**: Only `saveSyncedPrefs` is changed. `savePrefs` (local/metadata prefs) and `saveGlobalPrefs` retain their current pessimistic pattern — they are not in this bug's path.

---

### D11: `currentMonth(config)` must honour Playwright mock date when `config.enabled`

**Decision**: In `months.ts`, hoist the `Platform.isPlaywright` / `global.IS_TESTING` guard above the `config?.enabled` branch so that `getCurrentPayPeriod` receives the mocked date instead of `new Date()`.

**Rationale**: The original code entered the `config?.enabled` branch first and called `new Date()` (real date), bypassing the `global.currentMonth` mock entirely. In Playwright tests where `global.currentMonth = '2017-01'`, `currentMonth(payPeriodConfig)` returned a period ID anchored to April 2026, making all heading assertions fail. The fix is a one-line reorder — test mode always wins over `config.enabled`.

**Scope**: No behaviour change in non-test environments.

---

### D13: Envelope modals must receive `payPeriodConfig` to handle PP month IDs

**Root cause**: Two mobile modal components crash at render time when the active month is a pay period ID (MM ≥ 13):

- **`EnvelopeBudgetMonthMenuModal`** (line ~70): `monthUtils.format(month, "MMMM ''yy", locale)` → calls `_parse(month)` → throws because `date-fns` rejects month 13+ in a date string.
- **`EnvelopeBudgetSummaryModal`** (line ~45): `prevMonth(month)` without config → the `config`-less branch calls `_parse(month)` → same throw.

Both crashes surface as the React error boundary's "Fatal Error" dialog, failing the month-menu and budget-summary modal tests.

**Decision**: Add `payPeriodConfig?: PayPeriodConfig` to both modal option types in `modalsSlice.ts`. Pass it from `BudgetPage.tsx` when dispatching those modals. Fix the two crash sites:

1. `EnvelopeBudgetMonthMenuModal`: replace `monthUtils.format(month, "MMMM ''yy", locale)` with `monthUtils.nameForMonth(month, locale, payPeriodConfig)`. `nameForMonth` routes to `getPayPeriodLabel(…, 'summary')` for PP IDs (e.g. "Jan 5 - Jan 18 (PP1)") and to the existing `"MMMM ''yy"` path for calendar months.

2. `EnvelopeBudgetSummaryModal`: replace `formatMonth(prevMonth(month), 'MMM', locale)` with `nameForMonth(prevMonth(month, payPeriodConfig), locale, payPeriodConfig, true)`. The `short=true` flag gives 'MMM' for calendar months (same as before) and 'picker' format for PP months — acceptable since `prevMonthName` is only a display label in "Overspent in …" text, not a spreadsheet key.

**Why `payPeriodConfig` as a prop rather than reading prefs inside the modal**: The modal components are already instantiated with a `month` that encodes the budget mode. Passing `payPeriodConfig` alongside `month` makes the data dependency explicit and keeps the modals stateless. Reading four `useSyncedPref` hooks inside each modal would duplicate the config-assembly logic that `BudgetPage.tsx` already owns.

**Scope**: `envelope-budget-month-menu` and `envelope-budget-summary` only. The tracking-budget equivalents receive calendar months and are unaffected.

---

## Risks / Trade-offs

- **Prop threading depth**: Toggle state threads through `DynamicBudgetTable → BudgetPageHeader → MonthPicker`. This is three levels but each step is a single prop pair — acceptable given existing patterns in the codebase.
- **`BudgetPageMenuModal` type update**: `modalsSlice.ts` defines the `budget-page-menu` options type. Adding optional props (`onTogglePayPeriods?: () => void`, `payPeriodsActive?: boolean`) is a non-breaking change.
- **Default start date**: Setting start date to first day of current month (`${monthUtils.currentMonth()}-01`) may not match the user's actual pay schedule, but it provides a valid default that surfaces pay periods immediately. Users can correct it in Settings.

## Migration Plan

Pure UI change. No data migration, database changes, or backwards-compatibility concerns. The `payPeriodsEnabled` feature flag continues to gate the entire feature.
