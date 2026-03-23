## 1. Extend modal option types

- [ ] 1.1 In `modalsSlice.ts`, import `PayPeriodConfig` from `loot-core/types/prefs`
- [ ] 1.2 Add optional `payPeriodConfig?: PayPeriodConfig` to the `envelope-budget-month-menu` options type
- [ ] 1.3 Add optional `payPeriodConfig?: PayPeriodConfig` to the `envelope-budget-summary` options type

## 2. Pass payPeriodConfig when dispatching modals

- [ ] 2.1 In `BudgetPage.tsx`, update `onOpenBudgetMonthMenu` to include `payPeriodConfig: payPeriodConfig.enabled ? payPeriodConfig : undefined` in the modal options; add `payPeriodConfig` to the `useCallback` dependency array
- [ ] 2.2 In `BudgetPage.tsx`, update `onShowBudgetSummary` (the `envelope-budget-summary` branch) to include `payPeriodConfig: payPeriodConfig.enabled ? payPeriodConfig : undefined` in the modal options; add `payPeriodConfig` to the `useCallback` dependency array

## 3. Fix EnvelopeBudgetMonthMenuModal formatting

- [ ] 3.1 Import `{ getPayPeriodLabel, isPayPeriod }` from `loot-core/shared/pay-periods` in `EnvelopeBudgetMonthMenuModal.tsx`
- [ ] 3.2 Accept `payPeriodConfig` from destructured props
- [ ] 3.3 Replace the `displayMonth` assignment with: use `getPayPeriodLabel(month, payPeriodConfig, 'short', locale)` when `isPayPeriod(month) && payPeriodConfig?.enabled`, otherwise fall back to `monthUtils.format(month, "MMMM ''yy", locale)`

## 4. Fix EnvelopeBudgetSummaryModal formatting

- [ ] 4.1 Import `PayPeriodConfig` from `loot-core/types/prefs` in `EnvelopeBudgetSummaryModal.tsx`
- [ ] 4.2 Accept `payPeriodConfig` from destructured props
- [ ] 4.3 Import `{ isPayPeriod }` from `loot-core/shared/pay-periods`
- [ ] 4.4 Import `bounds` from `loot-core/shared/months`
- [ ] 4.5 Update the `prevMonthName` computation: call `prevMonth(month, payPeriodConfig)` to get the previous period ID, then if it is a pay period ID resolve its calendar start date via `bounds(prevPeriodId, payPeriodConfig).start` formatted as `yyyy-MM-dd`, then call `formatMonth` on that date string with `'MMM'`

## 5. Fix BudgetPageMenuModal — close on toggle

- [ ] 5.1 In `BudgetPageMenuModal.tsx`, inside the `({ state }) =>` render prop, wrap the `onTogglePayPeriods` prop passed to `BudgetPageMenu` so that it calls the original callback and then calls `state.close()`

## 6. Guard MonthSelector during pay-period disable transition

- [ ] 6.1 In `BudgetPage.tsx` `MonthSelector`, update the `periodLabel` computation: when `isPayPeriod(month)` is true but `payPeriodConfig` is `undefined` (neither condition branch matches), return `''` instead of calling `monthUtils.format(month, ...)`

## 7. Verify

- [ ] 7.1 Run `yarn typecheck` and fix any type errors
- [ ] 7.2 Run `yarn lint:fix`
- [ ] 7.3 Run the three failing E2E tests and confirm they pass: `yarn workspace @actual-app/web run playwright test pay-periods.mobile.test.ts --browser=chromium`
