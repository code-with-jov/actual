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

## 9. Verification

- [x] 9.1 Run `yarn typecheck` — fix any type errors introduced
- [x] 9.2 Run `yarn lint:fix` — fix any lint issues
- [ ] 9.3 Manual test — feature flag OFF: verify toggle button does not appear on desktop MonthPicker; verify no new menu item on mobile
- [ ] 9.4 Manual test — feature flag ON, first enable: verify defaults are applied (start date = first of current month, frequency = monthly), pay periods activate
- [ ] 9.5 Manual test — feature flag ON, toggle ON then OFF: verify calendar months restore correctly, Settings still shows frequency + start date
- [ ] 9.6 Manual test — desktop: verify `SvgLoadBalancer` button appears left of Today, color changes active/inactive
- [ ] 9.7 Manual test — mobile: verify "Enable/Disable pay period budgeting" appears in budget page menu
- [ ] 9.8 Verify Settings page no longer shows enable/disable checkbox but retains frequency + start date
