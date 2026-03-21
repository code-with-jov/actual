## 1. `useTogglePayPeriods.ts` — New hook

- [x] 1.1 Create `packages/desktop-client/src/hooks/useTogglePayPeriods.ts`
- [x] 1.2 Import `useSyncedPref` from `@desktop-client/hooks/useSyncedPref`
- [x] 1.3 Import `* as monthUtils` from `loot-core/shared/months`
- [x] 1.4 Read `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate` via `useSyncedPref`
- [x] 1.5 Derive `payPeriodsActive: boolean` as `showPayPeriods === 'true'`
- [x] 1.6 Implement `togglePayPeriods()`:
  - When enabling (currently inactive): if `payPeriodStartDate` is empty, set it to `${monthUtils.currentMonth()}-01`; if `payPeriodFrequency` is empty, set it to `'monthly'`; then `setShowPayPeriods('true')`
  - When disabling: `setShowPayPeriods('false')`
- [x] 1.7 Export `function useTogglePayPeriods(): { payPeriodsActive: boolean; togglePayPeriods: () => void }`

## 2. `PayPeriodSettings.tsx` — Remove enable/disable UI

- [x] 2.1 Remove `useState` import if it becomes unused (only used for `validationError` and `frequencyWarning`)
- [x] 2.2 Remove `showPayPeriods` `useSyncedPref` read and its setter (no longer needed here)
- [x] 2.3 Remove `enabled` derived constant
- [x] 2.4 Remove `validationError` state and `setValidationError`
- [x] 2.5 Remove `handleToggle` function
- [x] 2.6 Remove the `Checkbox` and its wrapping `View` + `label` from JSX
- [x] 2.7 Remove the `validationError` conditional `Text` block from JSX
- [x] 2.8 Remove the "Disable pay periods" `Button` block (`{enabled && <Button ...>}`)
- [x] 2.9 Update `frequencyWarning` check: replace `if (enabled)` with `if (showPayPeriods === 'true')` — but since `showPayPeriods` is now removed, read it directly: re-add a read-only `const [showPayPeriods] = useSyncedPref('showPayPeriods')` just for the warning, OR simplify by removing the frequency warning guard entirely (the warning is harmless to always show on frequency change)
  - **Decision**: Keep the `showPayPeriods` read (read-only, no setter needed) and keep the guard `if (showPayPeriods === 'true')` to preserve the existing warning behavior
- [x] 2.10 Keep `Checkbox`, `FormField`, `FormLabel` imports only if still used; remove unused imports
- [x] 2.11 Remove unused `Trans` usages if `handleToggle` label was the only user; keep `Trans` if still used elsewhere in the component

## 3. `MonthPicker.tsx` — Add toggle button

- [x] 3.1 Import `SvgLoadBalancer` from `@actual-app/components/icons/v1`
- [x] 3.2 Import `theme` from `@actual-app/components/theme`
- [x] 3.3 Import `useTranslation` (already imported — verify)
- [x] 3.4 Add `onTogglePayPeriods?: () => void` to `MonthPickerProps`
- [x] 3.5 Add `payPeriodsActive?: boolean` to `MonthPickerProps`
- [x] 3.6 Destructure new props in the component signature
- [x] 3.7 In the JSX inner flex row, add a new `Link` button as the **first child** (before the Today calendar button):
  - `variant="button"`, `buttonVariant="bare"`
  - `aria-label={t('Toggle pay period budgeting')}`
  - `onPress={onTogglePayPeriods}`
  - Same padding/marginRight as Today button (`padding: '3px 3px'`, `marginRight: '12px'`)
  - Wrap `SvgLoadBalancer` in a `<View title={payPeriodsActive ? t('Disable pay periods') : t('Enable pay periods')}>`
  - `SvgLoadBalancer` style: `width: 16, height: 16, color: payPeriodsActive ? theme.pageTextPositive : theme.pageTextSubdued`
- [x] 3.8 Conditionally render the button only when `onTogglePayPeriods` is defined: `{onTogglePayPeriods && <Link ...>}`

## 4. `BudgetPageHeader.tsx` — Thread new props

- [x] 4.1 Add `onTogglePayPeriods?: () => void` to `BudgetPageHeaderProps`
- [x] 4.2 Add `payPeriodsActive?: boolean` to `BudgetPageHeaderProps`
- [x] 4.3 Destructure new props in the component
- [x] 4.4 Pass `onTogglePayPeriods` and `payPeriodsActive` to `<MonthPicker>`

## 5. `DynamicBudgetTable.tsx` — Read flag, call hook, pass down

- [x] 5.1 Import `useTogglePayPeriods` from `@desktop-client/hooks/useTogglePayPeriods`
- [x] 5.2 Import `useFeatureFlag` from `@desktop-client/hooks/useFeatureFlag`
- [x] 5.3 Call `const isPayPeriodsEnabled = useFeatureFlag('payPeriodsEnabled')` in `DynamicBudgetTable`
- [x] 5.4 Call `const { payPeriodsActive, togglePayPeriods } = useTogglePayPeriods()` in `DynamicBudgetTable`
- [x] 5.5 Pass to `<BudgetPageHeader>`:
  - `onTogglePayPeriods={isPayPeriodsEnabled ? togglePayPeriods : undefined}`
  - `payPeriodsActive={isPayPeriodsEnabled ? payPeriodsActive : undefined}`

## 6. `modalsSlice.ts` — Extend `budget-page-menu` options type

- [x] 6.1 Locate the `budget-page-menu` modal definition in the `Modal` union type
- [x] 6.2 Add `onTogglePayPeriods?: () => void` to its `options` object
- [x] 6.3 Add `payPeriodsActive?: boolean` to its `options` object

## 7. `BudgetPageMenuModal.tsx` — Add toggle menu item

- [x] 7.1 Add `onTogglePayPeriods` and `payPeriodsActive` to `BudgetPageMenuModalProps` destructuring
- [x] 7.2 Pass them through to `<BudgetPageMenu>`
- [x] 7.3 Add to `BudgetPageMenuProps`: `onTogglePayPeriods?: () => void` and `payPeriodsActive?: boolean`
- [x] 7.4 Destructure in `BudgetPageMenu`
- [x] 7.5 Add `'toggle-pay-periods'` case to `onMenuSelect` switch: call `onTogglePayPeriods?.()`
- [x] 7.6 In the `items` array, conditionally add the menu item when `onTogglePayPeriods` is defined:
  ```
  ...(onTogglePayPeriods
    ? [{
        name: 'toggle-pay-periods',
        text: payPeriodsActive
          ? t('Disable pay period budgeting')
          : t('Enable pay period budgeting'),
      }]
    : [])
  ```
- [x] 7.7 Read `useTranslation` (already imported — verify)

## 8. `mobile/budget/BudgetPage.tsx` — Wire up toggle

- [x] 8.1 Import `useTogglePayPeriods` from `@desktop-client/hooks/useTogglePayPeriods`
- [x] 8.2 Call `const { payPeriodsActive, togglePayPeriods } = useTogglePayPeriods()` inside `BudgetPage`
- [x] 8.3 In `onOpenBudgetPageMenu`, add to the modal options:
  - `onTogglePayPeriods: isPayPeriodsEnabled ? togglePayPeriods : undefined`
  - `payPeriodsActive: isPayPeriodsEnabled ? payPeriodsActive : undefined`

## 10. Budget engine reconnection on toggle (Bug fix — D7)

### 10.1 Server: `packages/loot-core/src/server/preferences/app.ts`

- [x] 10.1.1 Add `import * as budget from '../budget/base'` (after existing imports, maintaining alphabetical order within the `../` group)
- [x] 10.1.2 In `saveSyncedPrefs`, after `sheet.get().meta().payPeriodConfig = updatedConfig`, add `await budget.createAllBudgets(updatedConfig)` so pay period budget sheets are created before the response returns to the client

### 10.2 Client: `packages/desktop-client/src/components/budget/index.tsx`

- [x] 10.2.1 Add a `useEffectEvent` named `onPayPeriodConfigChange` that:
  - Guards with `if (!initialized) return` to skip the initial mount (where `init()` already handles setup)
  - Calls `get-budget-bounds` via `send`
  - Calls `setBounds({ start, end })` with the returned pay period bounds
  - Calls `prewarmAllMonths(budgetType, spreadsheet, { start, end }, startMonth, payPeriodConfig)`
- [x] 10.2.2 Add a `useEffect` with `[payPeriodConfig]` as its dependency array that calls `onPayPeriodConfigChange()`

### 10.3 Verification

- [x] 10.3.1 Run `yarn typecheck` — fix any type errors introduced by the two new files touched
- [x] 10.3.2 Run `yarn lint:fix`
- [ ] 10.3.3 Manual test — toggle ON: navigate to the current pay period after enabling; verify `sum-amount-*` (spent) values are populated for all categories
- [ ] 10.3.4 Manual test — toggle ON then OFF: verify bounds reset to regular months and spent values remain correct on the regular-month view
- [ ] 10.3.5 Manual test — toggle ON while on a pay period month already selected: verify spent still populates (no double-init race)

---

## 11. Playwright test updates

### 11.1 `pay-periods.test.ts` — Remove stale Settings-checkbox tests

- [x] 11.1.1 Remove the `enable` option branch from `configurePayPeriods` (the `if (enable)` block and the `enable = true` default) — the helper should only set frequency and start date
- [x] 11.1.2 Delete test: `shows validation error when enabling pay periods without a start date` — checkbox no longer exists in Settings
- [x] 11.1.3 Delete test: `can enable pay periods with frequency and start date configured` — this checked `checkbox.isChecked()` in Settings; the toggle is now on the Budget page
- [x] 11.1.4 Add helper `enablePayPeriodsOnBudgetPage(page: Page)` that clicks the `aria-label="Toggle pay period budgeting"` button in MonthPicker and waits for PP-format header labels to appear
- [x] 11.1.5 Update `Budget page with pay periods enabled` `beforeEach`: replace `configurePayPeriods(page, { enable: true })` with `configurePayPeriods(page, { frequencyLabel: 'Biweekly (every 2 weeks)', startDate: '2024-01-01' })`, navigate to the Budget page, then call `enablePayPeriodsOnBudgetPage(page)`

### 11.2 `pay-periods.test.ts` — New toggle-button tests (desktop)

- [x] 11.2.1 Add test: `toggle button is absent when feature flag is OFF` — navigate to budget page without enabling the flag; assert `page.getByRole('button', { name: 'Toggle pay period budgeting' })` is not visible
- [x] 11.2.2 Add test: `toggle button is visible when feature flag is ON` — enable feature flag, navigate to budget, assert the toggle button is visible
- [x] 11.2.3 Add test: `clicking toggle ON activates pay period labels` — enable flag, configure frequency + start date in settings, navigate to budget, click toggle, assert first budget month header matches `/PP\d+/`
- [x] 11.2.4 Add test: `clicking toggle OFF restores calendar month labels` — from active state, click toggle again, assert header no longer matches `/PP\d+/` and matches regular month format
- [x] 11.2.5 Add test: `spent cells are populated after toggling ON` — after toggling ON (using demo test file), assert that the `category-month-spent` cells in the budget table are not all empty; at least one should contain a non-zero value
- [x] 11.2.6 Add test: `clicking a spent cell after toggling ON opens the transactions page` — from active state, click first `category-month-spent` cell, `waitForURL(/\/accounts/)`, assert `account-name` heading shows "All Accounts", click Back, assert `/budget` and budget table visible

### 11.3 `pay-periods.test.ts` — Settings page regression

- [x] 11.3.1 Add test: `settings page has no enable/disable checkbox after enabling the feature flag` — enable flag, navigate to settings, assert `payPeriodSettings.getByRole('checkbox', { name: /enable pay period/i })` does not exist
- [x] 11.3.2 Add test: `settings page retains frequency selector and start date input` — enable flag, navigate to settings, assert `#pay-period-frequency` and `#pay-period-start-date` are visible

### 11.4 `pay-periods.mobile.test.ts` — Remove stale Settings-checkbox setup

- [x] 11.4.1 Remove the `enable` option branch from the local `configurePayPeriods` copy in the mobile test file — same change as 11.1.1 but applied to the duplicate helper
- [x] 11.4.2 Add helper `enablePayPeriodsOnMobileBudgetPage(page: Page, budgetPage: MobileBudgetPage)` that calls `budgetPage.openBudgetPageMenu()`, clicks `getByText('Enable pay period budgeting')`, and waits for PP-format labels in the heading
- [x] 11.4.3 Update `Mobile Pay Periods (enabled)` `beforeEach`: remove `enable: true` from `configurePayPeriods` call; after navigating to the budget page, call `enablePayPeriodsOnMobileBudgetPage(page, budgetPage)`

### 11.5 `pay-periods.mobile.test.ts` — New mobile toggle tests

- [x] 11.5.1 Add test: `budget page menu has no toggle item when feature flag is OFF` — open budget page menu without enabling the flag, assert `getByText(/pay period budgeting/i)` is not visible in the menu
- [x] 11.5.2 Add test: `budget page menu shows "Enable pay period budgeting" when flag is ON and periods are inactive` — enable flag, configure settings (no enable), open budget page menu, assert "Enable pay period budgeting" item is visible
- [x] 11.5.3 Add test: `tapping enable in mobile menu activates pay period labels` — enable flag, configure settings, open budget page menu, tap "Enable pay period budgeting", assert heading matches `/PP\d+/`
- [x] 11.5.4 Add test: `budget page menu shows "Disable pay period budgeting" when periods are active` — from active state, open budget page menu, assert "Disable pay period budgeting" item is visible
- [x] 11.5.5 Add test: `tapping disable in mobile menu restores calendar month labels` — from active state, open budget page menu, tap "Disable pay period budgeting", assert heading no longer matches `/PP\d+/`

---

## 9. Verification

- [x] 9.1 Run `yarn typecheck` — fix any type errors introduced
- [x] 9.2 Run `yarn lint:fix` — fix any lint issues
- [ ] 9.3 Manual test — feature flag OFF: verify toggle button does not appear on desktop MonthPicker; verify no new menu item on mobile
- [ ] 9.4 Manual test — feature flag ON, first enable: verify defaults are applied (start date = first of current month, frequency = monthly), pay periods activate
- [ ] 9.5 Manual test — feature flag ON, toggle ON then OFF: verify calendar months restore correctly, Settings still shows frequency + start date
- [ ] 9.6 Manual test — desktop: verify `SvgLoadBalancer` button appears left of Today, color changes active/inactive
- [ ] 9.7 Manual test — mobile: verify "Enable/Disable pay period budgeting" appears in budget page menu
- [ ] 9.8 Verify Settings page no longer shows enable/disable checkbox but retains frequency + start date
