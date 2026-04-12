## Why

The pay period budgeting feature (weekly/biweekly/monthly) has been reviewed across four dimensions: security, architecture, tech debt, and integration quality. Several high- and medium-severity issues were identified that should be addressed before the feature is considered production-ready. The most critical are: SQL string interpolation instead of parameterized queries, missing server-side input validation on configuration values, unbounded while loops in period generation, untranslated UI strings, and duplicated config construction logic across multiple components.

## What Changes

**Security hardening:**

- Parameterize the SQL query in `createCategory` (`base.ts`) to use `?` placeholders instead of string interpolation for `start`, `end`, and `cat.id`
- Add server-side validation for `payPeriodStartDate` (YYYY-MM-DD format) and `payPeriodFrequency` (enum allowlist) in `preferences/app.ts`
- Add iteration guards to all while loops in `_generatePayPeriods` to prevent runaway computation from invalid Date inputs
- Validate config early in `_generatePayPeriods` — reject invalid/empty `startDate` before entering loops

**i18n fix:**

- Wrap `FREQUENCY_OPTIONS` labels in `t()` in `PayPeriodSettings.tsx`

**DRY / maintainability:**

- Extract duplicated `payPeriodConfig` construction into a shared `usePayPeriodConfigFromPrefs()` hook, replacing identical patterns in `budget/index.tsx`, `mobile/budget/BudgetPage.tsx`, and `mobile/budget/CategoryPage.tsx`
- Wire `resolveStartMonth()` into budget page startup to prevent stale `budget.startMonth` values after toggling pay periods

**Performance:**

- Replace `memoizeOne` in `generatePayPeriods` with a multi-slot `Map`-based cache keyed by `${year}-${frequency}-${startDate}` to avoid cache thrashing on cross-year navigation

**Robustness:**

- Add `isPayPeriod()` guards or JSDoc warnings to `getMonthIndex()`, `getYearStart()`, `getYearEnd()` in `months.ts`
- Add missing unit tests for edge cases: DST transitions, Feb 29 leap year rollover, empty/invalid startDate, invalid frequency, cross-year memoization

## Capabilities

### Modified Capabilities

- `pay-period-engine`: Input validation, loop guards, multi-slot memoization
- `pay-period-ui`: Translated frequency labels, shared config hook, stale startMonth resolution
- `pay-period-budget-integration`: Parameterized SQL queries

## Impact

- `packages/loot-core/src/server/budget/base.ts` — parameterized SQL in `createCategory`
- `packages/loot-core/src/server/preferences/app.ts` — input validation for pay period prefs
- `packages/loot-core/src/shared/pay-periods.ts` — loop guards, multi-slot cache, config validation
- `packages/loot-core/src/shared/months.ts` — guards on `getMonthIndex`/`getYearStart`/`getYearEnd`, wire `resolveStartMonth`
- `packages/desktop-client/src/components/settings/PayPeriodSettings.tsx` — translated frequency labels
- `packages/desktop-client/src/components/budget/index.tsx` — use shared hook, call `resolveStartMonth`
- `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx` — use shared hook
- `packages/desktop-client/src/components/mobile/budget/CategoryPage.tsx` — use shared hook
- `packages/loot-core/src/shared/pay-periods.test.ts` — new edge case tests
- No API changes, no database schema changes, no breaking changes
