## 1. Types and Preferences

- [ ] 1.1 Add `payPeriodsEnabled` to `FeatureFlag` type in `loot-core/src/types/prefs.ts`
- [ ] 1.2 Add `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate` to `SyncedPrefs` in `loot-core/src/types/prefs.ts`
- [ ] 1.3 Define `PayPeriodConfig` type: `{ enabled: boolean; payFrequency: 'weekly' | 'biweekly' | 'monthly'; startDate: string }`

## 2. Core Pay Period Engine (`pay-periods.ts`)

- [ ] 2.1 Create `loot-core/src/shared/pay-periods.ts` with `PayPeriodConfig` type and `isPayPeriod(id)` function
- [ ] 2.2 Implement `generatePayPeriods(year, config)` — calculates all period start/end dates for a year, projects cadence backward from `startDate` to find first period starting in January, returns `{ monthId, startDate, endDate, label }[]`
- [ ] 2.3 Add assertion in `generatePayPeriods` that period count does not exceed 87 (ID space limit)
- [ ] 2.4 Apply `memoize-one` to `generatePayPeriods` with cache key on `(year, payFrequency, startDate)`
- [ ] 2.5 Implement `getPayPeriodFromDate(date, config)` — finds the period containing a given date, handling year-boundary case (date in Jan may belong to prior year's last period)
- [ ] 2.6 Implement `getCurrentPayPeriod(date, config)` as an alias for `getPayPeriodFromDate`
- [ ] 2.7 Implement `nextPayPeriod(monthId, config)` — increments MM, wraps to `nextYear-13` when MM exceeds the last period of that year
- [ ] 2.8 Implement `prevPayPeriod(monthId, config)` — decrements MM, wraps to `prevYear-<last>` when MM falls below 13
- [ ] 2.9 Implement `addPayPeriods(monthId, n, config)` — applies `nextPayPeriod` or `prevPayPeriod` n times, handling year boundaries
- [ ] 2.10 Implement `generatePayPeriodRange(start, end, config)` — returns array of period IDs from start to end inclusive
- [ ] 2.11 Implement `getPayPeriodLabel(monthId, config, short?)` — returns `'PP 1'` (short) or `'Pay Period 1 (Jan 5 – Jan 18)'` (long)

## 3. Fix `months.ts` — Pay Period Awareness

- [ ] 3.1 Modify `_parse(value, config?)` — when value is a pay period ID and config is provided, return the period's actual start date from `generatePayPeriods`; when value is a pay period ID and config is absent, throw a descriptive error
- [ ] 3.2 Modify `bounds(month, config?)` — dispatch to pay period bounds via `generatePayPeriods` when `isPayPeriod(month)` and config provided
- [ ] 3.3 Modify `prevMonth(month, config?)` — dispatch to `prevPayPeriod` when `isPayPeriod(month)` and config provided
- [ ] 3.4 Modify `nextMonth(month, config?)` — dispatch to `nextPayPeriod` when `isPayPeriod(month)` and config provided
- [ ] 3.5 Modify `addMonths(month, n, config?)` — dispatch to `addPayPeriods` when `isPayPeriod(month)` and config provided
- [ ] 3.6 Modify `monthFromDate(date, config?)` — return `getPayPeriodFromDate(date, config)` when `config?.enabled` is true
- [ ] 3.7 Modify `currentMonth(config?)` — return `getCurrentPayPeriod(new Date(), config)` when `config?.enabled` is true
- [ ] 3.8 Modify `rangeInclusive(start, end, config?)` — enumerate period IDs via `generatePayPeriodRange` when both IDs are pay periods; throw on mixed calendar+period inputs
- [ ] 3.9 Modify `nameForMonth(month, locale, config?)` — return pay period label from `getPayPeriodLabel` when `isPayPeriod(month)` and config provided
- [ ] 3.10 Modify `isBefore(m1, m2, config?)` and `isAfter` — ensure pay period IDs compare correctly via period start dates

## 4. Tests — Engine and `months.ts`

- [ ] 4.1 Write unit tests for `isPayPeriod` boundary values (12, 13, 99)
- [ ] 4.2 Write unit tests for `generatePayPeriods` — biweekly (26 periods), weekly (52/53), monthly (12 periods with date-based boundaries)
- [ ] 4.3 Write unit tests for year-based numbering: `2024-13` is always period 1 regardless of start date configuration timing
- [ ] 4.4 Write unit tests for `getPayPeriodFromDate` — including year-boundary case (Jan date in prior year's last period)
- [ ] 4.5 Write unit tests for period navigation (`nextPayPeriod`, `prevPayPeriod`, `addPayPeriods`) including year boundary wrap
- [ ] 4.6 Write unit tests for `_parse` — throws on pay period ID without config; returns correct date with config
- [ ] 4.7 Write unit tests for `bounds` — pay period returns actual period dates; calendar month unchanged
- [ ] 4.8 Write unit tests for `monthFromDate` and `currentMonth` — enabled vs disabled config
- [ ] 4.9 Write unit tests for `rangeInclusive` — period range, mixed-input error

## 5. Server: Preferences and Config Loading

- [ ] 5.1 Add `loadPayPeriodConfig()` function to `loot-core/src/server/preferences/app.ts` — reads `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate` from DB, returns `PayPeriodConfig`
- [ ] 5.2 Call `loadPayPeriodConfig()` in the budget-open flow (`budgetfiles/app.ts` or equivalent) and thread config through the call chain
- [ ] 5.3 Update `saveSyncedPrefs` to return the updated config when pay period prefs change, so callers can reload

## 6. Server: Budget Engine Integration

- [ ] 6.1 Update `getBudgetRange(start, end, config?)` in `base.ts` — when config enabled, use `generatePayPeriodRange` and period-aware buffer counts (3 periods before, 12 periods after) instead of calendar months
- [ ] 6.2 Update `createBudget(months, config?)` in `base.ts` — pass config to `bounds(month, config)` and `prevMonth(month, config)` calls; no other structural change needed since `sheetForMonth` already works with period IDs
- [ ] 6.3 Update `createAllBudgets(config?)` in `base.ts` — pass config through to `getBudgetRange` and `createBudget`
- [ ] 6.4 Update `handleTransactionChange` in `base.ts` — pass config to `monthFromDate(date, config)` for period-aware transaction routing
- [ ] 6.5 Update `handleAccountChange` and `handleCategoryMappingChange` in `base.ts` — ensure `createdMonths` set contains period IDs when pay periods are enabled
- [ ] 6.6 Write integration tests for `createBudget` with pay period IDs — verify correct sheet names and SQL bounds
- [ ] 6.7 Write integration tests for `handleTransactionChange` year-boundary routing

## 7. Frontend: Context and Hook

- [ ] 7.1 Create `PayPeriodContext` and `PayPeriodProvider` in `desktop-client/src/contexts/PayPeriodContext.tsx`
- [ ] 7.2 Create `usePayPeriodConfig()` hook that reads from `PayPeriodContext`
- [ ] 7.3 In `budget/index.tsx`: read `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate` via `useSyncedPref`; read `payPeriodsEnabled` via `useFeatureFlag`; construct `PayPeriodConfig`; wrap children in `PayPeriodProvider`

## 8. Frontend: Budget Page Navigation

- [ ] 8.1 Update `startMonth` initialization in `budget/index.tsx` — use `monthUtils.currentMonth(config)` so it returns a period ID when enabled
- [ ] 8.2 Update previous/next navigation handlers to use `prevMonth(month, config)` and `nextMonth(month, config)`
- [ ] 8.3 Update "go to current period" button to use `currentMonth(config)`
- [ ] 8.4 Update `prewarmMonth` and `prewarmAllMonths` calls in `budget/index.tsx` to pass config
- [ ] 8.5 Update budget bounds range (`getBudgetRange` equivalent on frontend) to use period IDs when enabled

## 9. Frontend: Budget Column Display

- [ ] 9.1 Update `MonthPicker` / period picker component to display pay period labels using `getPayPeriodLabel` when config is active
- [ ] 9.2 Update budget column header to display short period label (`PP 1`) when in pay period mode
- [ ] 9.3 Update budget summary (income, spent, to-budget) to scope totals to the pay period date range when enabled

## 10. Frontend: Settings UI

- [ ] 10.1 Create `PayPeriodSettings` component in `desktop-client/src/components/settings/` with toggle, frequency selector, and date picker
- [ ] 10.2 Wire `PayPeriodSettings` to synced prefs: save `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate` on confirm
- [ ] 10.3 Add validation: start date required before enabling; frequency required before enabling
- [ ] 10.4 Add `PayPeriodSettings` to the budget settings page, gated on `payPeriodsEnabled` feature flag
- [ ] 10.5 Add frequency change warning: inform user that changing frequency will reset period numbering for the affected year

## 11. End-to-End Verification

- [ ] 11.1 Manual smoke test: enable biweekly, set a start date, verify period columns appear correctly in desktop budget
- [ ] 11.2 Verify transaction routing: add a transaction on a known date, confirm it appears in the correct period column
- [ ] 11.3 Verify year-boundary: add a transaction in early January that belongs to a prior-year period; confirm it routes to the correct `2024-XX` sheet
- [ ] 11.4 Verify disabling pay periods restores calendar month view with intact data
- [ ] 11.5 Verify settings save and sync: change frequency on one "device", confirm preference reflected on reload
