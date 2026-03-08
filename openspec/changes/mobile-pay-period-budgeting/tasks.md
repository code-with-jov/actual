## 1. `BudgetPage.tsx` — Pay period config and provider

- [ ] 1.1 Add `useFeatureFlag('payPeriodsEnabled')` import and call
- [ ] 1.2 Add three `useSyncedPref` reads: `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate`
- [ ] 1.3 Add `useMemo` to build `payPeriodConfig` from those prefs (identical shape to desktop `index.tsx:47–60`)
- [ ] 1.4 Wrap the `<Page>` return in `<PayPeriodProvider config={payPeriodConfig.enabled ? payPeriodConfig : undefined}>` (import `PayPeriodProvider` from `../budget/PayPeriodContext`)
- [ ] 1.5 Fix `currMonth`: `const currMonth = monthUtils.currentMonth(payPeriodConfig)`
- [ ] 1.6 Fix `onPrevMonth`: replace `monthUtils.subMonths(startMonth, 1)` with `monthUtils.subMonths(startMonth, 1, payPeriodConfig)`
- [ ] 1.7 Fix `onNextMonth`: replace `monthUtils.addMonths(startMonth, 1)` with `monthUtils.addMonths(startMonth, 1, payPeriodConfig)`
- [ ] 1.8 Fix `onCurrentMonth`: replace `currMonth` (already fixed by 1.5) and pass `payPeriodConfig` to `prewarmMonth` call if needed
- [ ] 1.9 Fix "today" button visibility check (line ~573): replace `!monthUtils.isCurrentMonth(startMonth)` with `startMonth !== monthUtils.currentMonth(payPeriodConfig)`
- [ ] 1.10 Fix `onOpenBudgetMonthNotesModal` label: when `isPayPeriod(month)`, use `getPayPeriodLabel(month, payPeriodConfig, 'summary', datefnsLocale)` instead of `monthUtils.format(month, "MMMM ''yy", locale)`; add `isPayPeriod` import from `loot-core/shared/pay-periods` and `getPayPeriodLabel` import
- [ ] 1.11 Pass `payPeriodConfig` to `MonthSelector` as a new prop

## 2. `MonthSelector` (in `BudgetPage.tsx`) — Period label and bounds

- [ ] 2.1 Add `payPeriodConfig?: PayPeriodConfig` to `MonthSelector`'s props (import `PayPeriodConfig` type from `loot-core/types/prefs`)
- [ ] 2.2 Replace the period label in the center button: when `isPayPeriod(month) && payPeriodConfig?.enabled`, render `getPayPeriodLabel(month, payPeriodConfig, 'summary', datefnsLocale)`; otherwise keep `monthUtils.format(month, "MMMM ''yy", locale)` — add `datefnsLocale` via the date-fns locale object from `useLocale()` (match the pattern in `MonthPicker.tsx`)
- [ ] 2.3 Replace `prevEnabled` / `nextEnabled` bounds check when pay periods are enabled:
  - Compute `prevPeriodId = monthUtils.prevMonth(month, payPeriodConfig)`
  - Compute `prevPeriodStart = monthUtils.bounds(prevPeriodId, payPeriodConfig).start`
  - Compute `calendarBoundsStart = monthUtils.bounds(monthBounds.start).start`
  - `prevEnabled = prevPeriodStart >= calendarBoundsStart`
  - Mirror for `nextEnabled` using `monthUtils.nextMonth` and `monthUtils.bounds(monthBounds.end).end`
  - Fall back to the existing string comparison for calendar months

## 3. `CategoryPage.tsx` — Pay period config, provider, and header label

- [ ] 3.1 Add `useFeatureFlag('payPeriodsEnabled')` import and call
- [ ] 3.2 Add three `useSyncedPref` reads: `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate`
- [ ] 3.3 Add `useMemo` to build `payPeriodConfig` (same shape as task 1.3)
- [ ] 3.4 Wrap the `<Page>` return in `<PayPeriodProvider config={payPeriodConfig.enabled ? payPeriodConfig : undefined}>` (same import as task 1.4)
- [ ] 3.5 Fix `month` initialization: `const month = searchParams.get('month') || monthUtils.currentMonth(payPeriodConfig)` (ensures fallback uses correct current period)
- [ ] 3.6 Fix the header label: replace `monthUtils.format(month, "MMMM ''yy", locale)` with a branch — when `isPayPeriod(month) && payPeriodConfig?.enabled`, use `getPayPeriodLabel(month, payPeriodConfig, 'summary', datefnsLocale)`; import `isPayPeriod` and `getPayPeriodLabel` from `loot-core/shared/pay-periods`

## 4. `CategoryTransactions.tsx` — Date-range filter for pay periods

- [ ] 4.1 Add `usePayPeriodConfig` import from `../budget/PayPeriodContext` (relative path from `mobile/budget/`)
- [ ] 4.2 Add `isPayPeriod` import from `loot-core/shared/pay-periods`
- [ ] 4.3 Add `bounds` import from `loot-core/shared/months` (or use `monthUtils.bounds`)
- [ ] 4.4 In `TransactionListWithPreviews`, call `const payPeriodConfig = usePayPeriodConfig()`
- [ ] 4.5 Update `getCategoryMonthFilter` to accept an optional `config?: PayPeriodConfig` parameter and implement the branch:
  - If `isPayPeriod(month) && config?.enabled`:
    - Compute `const { start, end } = monthUtils.bounds(month, config)`
    - Convert YYYYMMDD integers to date strings: `const toDateStr = (n: number) => { const s = String(n); return \`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}\` }`
    - Return `{ category: category.id, date: { $gte: toDateStr(start), $lte: toDateStr(end) } }`
  - Otherwise return the existing `{ category: category.id, date: { $transform: '$month', $eq: month } }`
- [ ] 4.6 Pass `payPeriodConfig` to `getCategoryMonthFilter` at its call site in `baseTransactionsQuery`

## 5. Verification

- [ ] 5.1 Run `yarn typecheck` — fix any type errors introduced
- [ ] 5.2 Run `yarn lint:fix` — fix any lint issues
- [ ] 5.3 Manual test with pay periods enabled: navigate mobile budget, verify prev/next arrows work, period label shows `"Jan 5 - Jan 18 (PP1)"` style, "Today" button hides when on current period, tapping Spent shows correct transactions
- [ ] 5.4 Manual test with pay periods disabled: verify calendar month navigation and labels are unchanged
