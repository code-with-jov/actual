## 1. Security: SQL Parameterization

- [ ] 1.1 Refactor `createCategory` in `packages/loot-core/src/server/budget/base.ts` — replace string-interpolated SQL `WHERE t.date >= ${start} AND t.date <= ${end} AND category = '${cat.id}'` with parameterized query using `?` placeholders: `WHERE t.date >= ? AND t.date <= ? AND category = ? AND a.offbudget = 0`, passing `[start, end, cat.id]` as the parameter array
- [ ] 1.2 Run `packages/loot-core/src/server/budget/pay-periods.test.ts` to verify budget creation still works with parameterized queries

## 2. Security: Input Validation

- [ ] 2.1 In `loadPayPeriodConfig()` in `packages/loot-core/src/server/preferences/app.ts` — add validation:
  - Validate `startDate` matches `/^\d{4}-\d{2}-\d{2}$/`; if invalid, force `enabled = false`
  - Validate `payFrequency` is in `['weekly', 'biweekly', 'monthly']`; if invalid, default to `'monthly'`
  - Log a warning via `logger` when validation overrides a value
- [ ] 2.2 In `_generatePayPeriods()` in `packages/loot-core/src/shared/pay-periods.ts` — add early return: if `isNaN(refDate.getTime())`, return empty array
- [ ] 2.3 Add `MAX_ITERATIONS = 1000` guard to all 6 while loops in `_generatePayPeriods` (biweekly: 4 loops at lines 52-58, 76-78; weekly: 2 loops at lines 92-97) — break and log warning if limit exceeded

## 3. i18n: Translate Frequency Labels

- [ ] 3.1 In `packages/desktop-client/src/components/settings/PayPeriodSettings.tsx` — move `FREQUENCY_OPTIONS` inside the `PayPeriodSettings` component function body (so `t()` is available from the existing `useTranslation()` call) and wrap display labels in `t()`:
  - `['weekly', t('Weekly')]`
  - `['biweekly', t('Biweekly (every 2 weeks)')]`
  - `['monthly', t('Monthly')]`

## 4. DRY: Extract Shared Config Hook

- [ ] 4.1 Create `packages/desktop-client/src/hooks/usePayPeriodConfigFromPrefs.ts` — a new hook that encapsulates reading `showPayPeriods`, `payPeriodFrequency`, `payPeriodStartDate` synced prefs + `payPeriodsEnabled` feature flag and returns a memoized `PayPeriodConfig` object
- [ ] 4.2 Replace inline config construction in `packages/desktop-client/src/components/budget/index.tsx` (lines 42-59) with `usePayPeriodConfigFromPrefs()`
- [ ] 4.3 Replace inline config construction in `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx` (lines 92-109) with `usePayPeriodConfigFromPrefs()`
- [ ] 4.4 Replace inline config construction in `packages/desktop-client/src/components/mobile/budget/CategoryPage.tsx` (lines 31-48) with `usePayPeriodConfigFromPrefs()`

## 5. Bug Fix: Wire `resolveStartMonth`

- [ ] 5.1 In `packages/desktop-client/src/components/budget/index.tsx` (line 68) — replace `const startMonth = startMonthPref || currentMonth` with `const startMonth = monthUtils.resolveStartMonth(startMonthPref, payPeriodConfig, currentMonth) || currentMonth`
- [ ] 5.2 In `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx` (line 112) — apply the same `resolveStartMonth` fix

## 6. Performance: Multi-Slot Memoization

- [ ] 6.1 In `packages/loot-core/src/shared/pay-periods.ts` — replace `memoizeOne` with a `Map<string, PayPeriod[]>`-based cache:
  - Key: `${year}-${config.payFrequency}-${config.startDate}`
  - Cap at 5 entries (evict oldest on overflow)
  - Export the same `generatePayPeriods(year, config)` signature
  - Remove `memoize-one` import if no longer used elsewhere in this file

## 7. Robustness: Guard Calendar-Only Functions

- [ ] 7.1 In `packages/loot-core/src/shared/months.ts` — add `isPayPeriod()` guard to `getMonthIndex()` (line 487): throw error if pay period ID is passed
- [ ] 7.2 Add same guard to `getYearStart()` (line 518) and `getYearEnd()` (line 522)

## 8. Tests: Edge Cases

- [ ] 8.1 Add test in `packages/loot-core/src/shared/pay-periods.test.ts`: `_generatePayPeriods` returns empty array when `startDate` is empty string
- [ ] 8.2 Add test: `_generatePayPeriods` returns empty array when `startDate` is `'invalid'`
- [ ] 8.3 Add test: monthly config with `startDate='2024-02-29'` generates periods for 2025 without crashing (Feb 29 → Feb 28 rollover)
- [ ] 8.4 Add test: `payFrequency` set to `'quarterly'` (invalid) returns empty array
- [ ] 8.5 Add test: cross-year cache — calling `generatePayPeriods(2024, config)` then `generatePayPeriods(2025, config)` then `generatePayPeriods(2024, config)` returns the correct (cached) result on the third call
- [ ] 8.6 Add test in `packages/loot-core/src/shared/months.ts` test file: `getMonthIndex('2024-15')` throws error
- [ ] 8.7 Add test: `getYearStart('2024-15')` throws error
- [ ] 8.8 Add test: `resolveStartMonth` is called correctly — pay period ID with disabled config returns fallback

## 9. Validation

- [ ] 9.1 Run `yarn typecheck` and fix any type errors
- [ ] 9.2 Run `yarn lint:fix` and fix any lint issues
- [ ] 9.3 Run `yarn test` and verify all new and existing tests pass
